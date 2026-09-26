import { prisma } from "@/lib/db/prisma";
import {
  thamSoKetQua,
  kiemTraDiem,
  layKhoaKemChuongTrinh,
  laKhoaChiDuThi,
  hocVienTinhKetQua,
  chanNeuDaPheDuyet,
} from "@/server/services/kq/dung-chung";
import {
  KhongPhaiKhoaChiDuThiError,
  HocVienKhongThuocKhoaError,
} from "@/server/services/kq/loi-ket-qua";
import { danhGiaHocTap } from "@/server/services/kq/kq-02-tong-hop";

export type DongKetQuaThiInput = { hocVienId: string; diemThi: number | null };

/**
 * KQ-06 (Phương thức 3): cán bộ nhập thẳng điểm thi vào kết quả toàn khóa,
 * làm căn cứ xét cấp chứng chỉ. "Không áp dụng bước tổng hợp điểm chuyên cần
 * vì khóa không có điểm danh/giảng dạy" - tyLeChuyenCan luôn null, đạt chỉ
 * xét theo điểm thi.
 */
export async function nhapKetQuaThi(khoaId: string, danhSach: DongKetQuaThiInput[]) {
  const khoa = await layKhoaKemChuongTrinh(khoaId);
  if (!laKhoaChiDuThi(khoa)) throw new KhongPhaiKhoaChiDuThiError();
  await chanNeuDaPheDuyet(khoaId);

  for (const dong of danhSach) kiemTraDiem(dong.diemThi);

  const thiSinhHopLe = new Set((await hocVienTinhKetQua(khoaId)).map((dk) => dk.hocVienId));
  if (danhSach.some((dong) => !thiSinhHopLe.has(dong.hocVienId))) {
    throw new HocVienKhongThuocKhoaError();
  }

  const thamSo = await thamSoKetQua();

  await prisma.$transaction(
    danhSach.map((dong) => {
      const data = {
        diemTongKet: dong.diemThi,
        tyLeChuyenCan: null,
        ...danhGiaHocTap(
          { diemTongKet: dong.diemThi, hocPhanThieuDiem: [], tyLeChuyenCan: null },
          thamSo,
        ),
        duDieuKienHocPhi: null,
        hoanThanh: null,
      };
      return prisma.ketQuaKhoa.upsert({
        where: { hocVienId_khoaId: { hocVienId: dong.hocVienId, khoaId } },
        update: data,
        create: { hocVienId: dong.hocVienId, khoaId, ...data },
      });
    }),
  );

  return prisma.ketQuaKhoa.findMany({
    where: { khoaId },
    include: { hocVien: true },
    orderBy: { hocVien: { hoTen: "asc" } },
  });
}
