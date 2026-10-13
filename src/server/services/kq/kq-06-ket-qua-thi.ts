import { prisma } from "@/lib/db/prisma";
import { ghiThaoTac, HE_THONG, type NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";
import {
  thamSoKetQua,
  kiemTraDiem,
  lamTron2,
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
import { danhGiaHoanThanh } from "@/server/services/kq/kq-03-xet-hoan-thanh";

export type DongKetQuaThiInput = { hocVienId: string; diemThi: number | null };

/**
 * KQ-06 (Phương thức 3): cán bộ nhập thẳng điểm thi vào kết quả toàn khóa,
 * làm căn cứ xét cấp chứng chỉ. "Không áp dụng bước tổng hợp điểm chuyên cần
 * vì khóa không có điểm danh/giảng dạy" - tyLeChuyenCan luôn null, đạt chỉ
 * xét theo điểm thi.
 * (sửa 13/10/2026) lưu điểm là xác định luôn Đạt/Không đạt và hoàn thành - không cần bước xét
 * điều kiện KQ-03: thí sinh vào danh sách chính thức dự thi đã được xác nhận lệ phí (HV-07), điều
 * kiện tài chính HP-06 vẫn được tính kèm (thường đã đạt) để giữ đúng quy tắc cấp chứng chỉ.
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
  // (bổ sung 13/10/2026) điểm thi làm tròn 2 chữ số thập phân (màn hình và nhập từ tệp)
  danhSach = danhSach.map((d) => ({ ...d, diemThi: d.diemThi === null ? null : lamTron2(d.diemThi) }));

  const dsThiSinh = await hocVienTinhKetQua(khoaId);
  const thiSinhHopLe = new Set(dsThiSinh.map((dk) => dk.hocVienId));
  if (danhSach.some((dong) => !thiSinhHopLe.has(dong.hocVienId))) {
    throw new HocVienKhongThuocKhoaError();
  }

  const thamSo = await thamSoKetQua(khoaId);

  const maHocVien = new Map(dsThiSinh.map((dk) => [dk.hocVienId, dk.hocVien.maHocVien]));
  const nhatKy = ghiThaoTac(
    nguoi,
    "NHAP_KET_QUA_THI",
    "Khoa",
    khoaId,
    `${khoa.maKhoa}: ` +
      danhSach.map((d) => `${maHocVien.get(d.hocVienId) ?? d.hocVienId} ${d.diemThi ?? "-"}`).join("; "),
  );

  const dsData = await Promise.all(
    danhSach.map(async (dong) => {
      const hocTap = danhGiaHocTap({ diemTongKet: dong.diemThi, hocPhanThieuDiem: [], tyLeChuyenCan: null }, thamSo);
      return {
        hocVienId: dong.hocVienId,
        data: {
          diemTongKet: dong.diemThi,
          tyLeChuyenCan: null,
          ...hocTap,
          ...(await danhGiaHoanThanh({ hocVienId: dong.hocVienId, khoaId, ...hocTap })),
        },
      };
    }),
  );

  await prisma.$transaction([
    nhatKy,
    ...dsData.map(({ hocVienId, data }) =>
      prisma.ketQuaKhoa.upsert({
        where: { hocVienId_khoaId: { hocVienId, khoaId } },
        update: data,
        create: { hocVienId, khoaId, ...data },
      }),
    ),
  ]);

  return prisma.ketQuaKhoa.findMany({
    where: { khoaId },
    include: { hocVien: true },
    orderBy: { hocVien: { hoTen: "asc" } },
  });
}
