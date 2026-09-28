import { prisma } from "@/lib/db/prisma";
import { ghiThaoTac, HE_THONG, type NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";
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
export async function nhapKetQuaThi(
  khoaId: string,
  danhSach: DongKetQuaThiInput[],
  nguoi: NguoiThucHien = HE_THONG,
) {
  const khoa = await layKhoaKemChuongTrinh(khoaId);
  if (!laKhoaChiDuThi(khoa)) throw new KhongPhaiKhoaChiDuThiError();
  await chanNeuDaPheDuyet(khoaId);

  for (const dong of danhSach) kiemTraDiem(dong.diemThi);

  const dsThiSinh = await hocVienTinhKetQua(khoaId);
  const thiSinhHopLe = new Set(dsThiSinh.map((dk) => dk.hocVienId));
  if (danhSach.some((dong) => !thiSinhHopLe.has(dong.hocVienId))) {
    throw new HocVienKhongThuocKhoaError();
  }

  const thamSo = await thamSoKetQua();

  const maHocVien = new Map(dsThiSinh.map((dk) => [dk.hocVienId, dk.hocVien.maHocVien]));
  const nhatKy = ghiThaoTac(
    nguoi,
    "NHAP_KET_QUA_THI",
    "Khoa",
    khoaId,
    `${khoa.maKhoa}: ` +
      danhSach.map((d) => `${maHocVien.get(d.hocVienId) ?? d.hocVienId} ${d.diemThi ?? "-"}`).join("; "),
  );

  await prisma.$transaction([
    nhatKy,
    ...danhSach.map((dong) => {
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
  ]);

  return prisma.ketQuaKhoa.findMany({
    where: { khoaId },
    include: { hocVien: true },
    orderBy: { hocVien: { hoTen: "asc" } },
  });
}
