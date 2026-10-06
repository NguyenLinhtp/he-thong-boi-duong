import { prisma } from "@/lib/db/prisma";
import { ghiThaoTac, HE_THONG, type NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";
import {
  KhongTimThayKhoaError,
  DanhSachXetDuyetRongError,
  DanhSachXetDuyetKhongHopLeError,
  VuotSiSoKhiXetDuyetError,
  ChuaXacNhanLePhiKhiXetDuyetError,
} from "@/server/services/hv/loi-hoc-vien";
import { guiThongBao } from "@/server/services/hv/hv-10-thong-bao";
import { taoHocPhiSauKhiChinhThuc } from "@/server/services/hp/hp-01-thiet-lap";
import { lePhiDaXacNhan } from "@/server/services/hp/thanh-phan-le-phi-chung";

/**
 * HV-07 (actor "Lãnh đạo đơn vị" - đã gộp vào vai trò CAN_BO_QUAN_LY_DAO_TAO,
 * xem quyết định RBAC 6 vai trò): duyệt 1 lô hồ sơ đã Hợp lệ (HV-06) thành
 * danh sách chính thức. "Số lượng chính thức không vượt sĩ số tối đa" - so
 * đếm CHINH_THUC hiện có + số hồ sơ sắp duyệt trong lô này, không tính
 * chung với các trạng thái khác (HOP_LE dù đang chiếm 1 chỗ tạm tính ở
 * KH-05 vẫn có thể không được chọn duyệt hết nếu vượt sĩ số - ví dụ tuyển
 * chọn cạnh tranh).
 */
export async function xetDuyetDanhSachChinhThuc(
  khoaId: string,
  dsDangKyId: string[],
  nguoi: NguoiThucHien = HE_THONG,
) {
  const khoa = await prisma.khoa.findUnique({ where: { id: khoaId }, include: { chuongTrinh: true } });
  if (!khoa) throw new KhongTimThayKhoaError();
  if (dsDangKyId.length === 0) throw new DanhSachXetDuyetRongError();
  const laDuThi = khoa.chuongTrinh.phuongThucDangKy === "CHI_DU_THI";

  // kiểm tra hợp lệ + sĩ số + cập nhật + nhật ký trong 1 transaction, khóa theo
  // khóa học: 2 lần duyệt đồng thời không cùng lọt qua kiểm tra sĩ số
  const ketQua = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`, `HV07:${khoaId}`);
    const dsHopLe = await tx.dangKyHoc.findMany({
      where: { id: { in: dsDangKyId }, khoaId, trangThai: "HOP_LE" },
    });
    if (dsHopLe.length !== dsDangKyId.length) throw new DanhSachXetDuyetKhongHopLeError();
    if (laDuThi) {
      const chuaXacNhan = await hocVienChuaXacNhanLePhi(khoa, dsHopLe.map((dk) => dk.hocVienId), tx);
      if (chuaXacNhan.size > 0) {
        const ds = await tx.hocVien.findMany({ where: { id: { in: [...chuaXacNhan] } }, select: { hoTen: true, maHocVien: true } });
        throw new ChuaXacNhanLePhiKhiXetDuyetError(ds.map((hv) => `${hv.hoTen} (${hv.maHocVien})`));
      }
    }

    const soChinhThucHienTai = await tx.dangKyHoc.count({
      where: { khoaId, trangThai: "CHINH_THUC" },
    });
    const choConLai = khoa.siSoToiDa - soChinhThucHienTai;
    if (dsHopLe.length > choConLai) throw new VuotSiSoKhiXetDuyetError(Math.max(choConLai, 0));

    await tx.dangKyHoc.updateMany({
      where: { id: { in: dsDangKyId } },
      data: { trangThai: "CHINH_THUC" },
    });
    const daDuyet = await tx.dangKyHoc.findMany({
      where: { id: { in: dsDangKyId } },
      include: { hocVien: true },
    });
    await ghiThaoTac(
      nguoi,
      "XET_DUYET_CHINH_THUC",
      "Khoa",
      khoaId,
      `${khoa.maKhoa}: duyệt ${daDuyet.length} học viên - ${daDuyet.map((dk) => dk.hocVien.maHocVien).join(", ")}`,
      tx,
    );
    return daDuyet;
  });

  for (const dk of ketQua) {
    await guiThongBao(
      dk.hocVienId,
      "TRUNG_TUYEN",
      `Trúng tuyển chính thức khóa ${khoa.maKhoa}`,
      `Chúc mừng bạn đã trúng tuyển chính thức vào khóa ${khoa.maKhoa}.`,
    );
    await taoHocPhiSauKhiChinhThuc(dk.id);
  }

  return ketQua;
}

/**
 * Các học viên (trong danh sách) chưa được xác nhận lệ phí của khóa (bổ sung 06/10/2026 -
 * khóa có thành phần lệ phí: xét các thành phần bắt buộc - xem lePhiDaXacNhan).
 */
export async function hocVienChuaXacNhanLePhi(
  khoa: { id: string; mucHocPhi: unknown },
  dsHocVienId: string[],
  db: Pick<typeof prisma, "hocPhi"> = prisma,
) {
  const coLePhi = khoa.mucHocPhi !== null && Number(khoa.mucHocPhi) > 0;
  const dsHocPhi = await db.hocPhi.findMany({
    where: { khoaId: khoa.id, hocVienId: { in: dsHocVienId } },
    include: { thanhPhans: { include: { thanhPhan: true } } },
  });
  const theoHv = new Map(dsHocPhi.map((h) => [h.hocVienId, h]));
  return new Set(dsHocVienId.filter((id) => !lePhiDaXacNhan(theoHv.get(id), coLePhi)));
}

export async function danhSachHopLeChoXetDuyet(khoaId: string) {
  const [khoa, ds] = await Promise.all([
    prisma.khoa.findUnique({ where: { id: khoaId }, include: { chuongTrinh: true } }),
    prisma.dangKyHoc.findMany({
      where: { khoaId, trangThai: "HOP_LE" },
      include: { hocVien: true },
      orderBy: { ngayDangKy: "asc" },
    }),
  ]);
  const chuaXacNhan =
    khoa?.chuongTrinh.phuongThucDangKy === "CHI_DU_THI"
      ? await hocVienChuaXacNhanLePhi(khoa, ds.map((dk) => dk.hocVienId))
      : new Set<string>();
  return ds.map((dk) => ({ ...dk, chuaXacNhanLePhi: chuaXacNhan.has(dk.hocVienId) }));
}

export async function danhSachChinhThuc(khoaId: string) {
  return prisma.dangKyHoc.findMany({
    where: { khoaId, trangThai: "CHINH_THUC" },
    include: { hocVien: true },
    orderBy: { ngayDangKy: "asc" },
  });
}
