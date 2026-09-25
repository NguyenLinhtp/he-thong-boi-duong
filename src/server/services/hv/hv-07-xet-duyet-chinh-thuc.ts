import { prisma } from "@/lib/db/prisma";
import {
  KhongTimThayKhoaError,
  DanhSachXetDuyetRongError,
  DanhSachXetDuyetKhongHopLeError,
  VuotSiSoKhiXetDuyetError,
} from "@/server/services/hv/loi-hoc-vien";
import { guiThongBao } from "@/server/services/hv/hv-10-thong-bao";

/**
 * HV-07 (actor "Lãnh đạo đơn vị" - đã gộp vào vai trò CAN_BO_QUAN_LY_DAO_TAO,
 * xem quyết định RBAC 6 vai trò): duyệt 1 lô hồ sơ đã Hợp lệ (HV-06) thành
 * danh sách chính thức. "Số lượng chính thức không vượt sĩ số tối đa" - so
 * đếm CHINH_THUC hiện có + số hồ sơ sắp duyệt trong lô này, không tính
 * chung với các trạng thái khác (HOP_LE dù đang chiếm 1 chỗ tạm tính ở
 * KH-05 vẫn có thể không được chọn duyệt hết nếu vượt sĩ số - ví dụ tuyển
 * chọn cạnh tranh).
 */
export async function xetDuyetDanhSachChinhThuc(khoaId: string, dsDangKyId: string[]) {
  const khoa = await prisma.khoa.findUnique({ where: { id: khoaId } });
  if (!khoa) throw new KhongTimThayKhoaError();
  if (dsDangKyId.length === 0) throw new DanhSachXetDuyetRongError();

  const dsHopLe = await prisma.dangKyHoc.findMany({
    where: { id: { in: dsDangKyId }, khoaId, trangThai: "HOP_LE" },
  });
  if (dsHopLe.length !== dsDangKyId.length) throw new DanhSachXetDuyetKhongHopLeError();

  const soChinhThucHienTai = await prisma.dangKyHoc.count({
    where: { khoaId, trangThai: "CHINH_THUC" },
  });
  const choConLai = khoa.siSoToiDa - soChinhThucHienTai;
  if (dsHopLe.length > choConLai) throw new VuotSiSoKhiXetDuyetError(Math.max(choConLai, 0));

  await prisma.dangKyHoc.updateMany({
    where: { id: { in: dsDangKyId } },
    data: { trangThai: "CHINH_THUC" },
  });

  const ketQua = await prisma.dangKyHoc.findMany({
    where: { id: { in: dsDangKyId } },
    include: { hocVien: true },
  });

  for (const dk of ketQua) {
    await guiThongBao(
      dk.hocVienId,
      "TRUNG_TUYEN",
      `Trúng tuyển chính thức khóa ${khoa.maKhoa}`,
      `Chúc mừng bạn đã trúng tuyển chính thức vào khóa ${khoa.maKhoa}.`,
    );
  }

  return ketQua;
}

export async function danhSachHopLeChoXetDuyet(khoaId: string) {
  return prisma.dangKyHoc.findMany({
    where: { khoaId, trangThai: "HOP_LE" },
    include: { hocVien: true },
    orderBy: { ngayDangKy: "asc" },
  });
}

export async function danhSachChinhThuc(khoaId: string) {
  return prisma.dangKyHoc.findMany({
    where: { khoaId, trangThai: "CHINH_THUC" },
    include: { hocVien: true },
    orderBy: { ngayDangKy: "asc" },
  });
}
