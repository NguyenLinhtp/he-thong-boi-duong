import { prisma } from "@/lib/db/prisma";

// HV-11/HV-12 (Phương thức 4a/4b) cần "đơn vị liên kết" + "hợp đồng liên
// kết" đã tồn tại để hoạt động, nhưng module quản lý đầy đủ các thực thể
// này (DVLK-01 quản lý danh mục, DVLK-02 cấp tài khoản, DVLK-03 quản lý hợp
// đồng) thuộc nhóm 11, CHƯA được xây. File này chỉ là phần tối thiểu để
// HV-11/12 chạy được qua UI thật (tạo đơn vị, gán tài khoản đã có sẵn của
// QT-01, tạo hợp đồng) - KHÔNG thay thế DVLK-01/02/03, các ràng buộc đầy đủ
// của DVLK-01 (vd "không xóa được đơn vị đang có hợp đồng chưa thanh lý")
// sẽ được hoàn thiện khi làm đúng module đó.

export class MaDonViLienKetTrungError extends Error {
  constructor(ma: string) {
    super(`Mã đơn vị liên kết "${ma}" đã tồn tại`);
  }
}

export class KhongTimThayDonViLienKetError extends Error {
  constructor() {
    super("Không tìm thấy đơn vị liên kết");
  }
}

export class TaiKhoanKhongPhaiCanBoDonViLienKetError extends Error {
  constructor() {
    super("Tài khoản được chọn không có vai trò Cán bộ đơn vị liên kết");
  }
}

export class TaiKhoanDaGanDonViKhacError extends Error {
  constructor() {
    super("Tài khoản này đã gán cho 1 đơn vị liên kết khác");
  }
}

export type TaoDonViLienKetInput = {
  ma: string;
  ten: string;
  diaChi?: string | null;
  nguoiDaiDien?: string | null;
  soDienThoai?: string | null;
};

export async function taoDonViLienKet(input: TaoDonViLienKetInput) {
  const daTonTai = await prisma.donViLienKet.findUnique({ where: { ma: input.ma } });
  if (daTonTai) throw new MaDonViLienKetTrungError(input.ma);

  return prisma.donViLienKet.create({ data: input });
}

export async function danhSachDonViLienKet() {
  return prisma.donViLienKet.findMany({
    include: { taiKhoan: true, hopDongs: { include: { khoa: true } } },
    orderBy: { ten: "asc" },
  });
}

/** Gán 1 tài khoản (đã tạo sẵn qua QT-01 với vai trò CAN_BO_DON_VI_LIEN_KET) cho 1 đơn vị liên kết. */
export async function ganTaiKhoanDonViLienKet(donViLienKetId: string, nguoiDungId: string) {
  const donVi = await prisma.donViLienKet.findUnique({ where: { id: donViLienKetId } });
  if (!donVi) throw new KhongTimThayDonViLienKetError();

  const nguoiDung = await prisma.nguoiDung.findUnique({
    where: { id: nguoiDungId },
    include: { vaiTros: { include: { vaiTro: true } } },
  });
  const coVaiTroDung = nguoiDung?.vaiTros.some((v) => v.vaiTro.ma === "CAN_BO_DON_VI_LIEN_KET");
  if (!coVaiTroDung) throw new TaiKhoanKhongPhaiCanBoDonViLienKetError();

  const daGanChoDonViKhac = await prisma.donViLienKet.findFirst({
    where: { taiKhoanId: nguoiDungId, id: { not: donViLienKetId } },
  });
  if (daGanChoDonViKhac) throw new TaiKhoanDaGanDonViKhacError();

  return prisma.donViLienKet.update({
    where: { id: donViLienKetId },
    data: { taiKhoanId: nguoiDungId },
  });
}

/** Danh sách tài khoản vai trò Cán bộ đơn vị liên kết chưa gán cho đơn vị nào - để chọn khi gán. */
export async function danhSachTaiKhoanChuaGan() {
  const taiKhoans = await prisma.nguoiDung.findMany({
    where: { vaiTros: { some: { vaiTro: { ma: "CAN_BO_DON_VI_LIEN_KET" } } } },
    include: { donViLienKet: true },
  });
  return taiKhoans.filter((tk) => !tk.donViLienKet);
}

export type TaoHopDongLienKetInput = {
  maHopDong: string;
  donViLienKetId: string;
  khoaId: string;
  soLuongDuKien?: number | null;
  donGiaThoaThuan?: number | null;
};

export async function taoHopDongLienKet(input: TaoHopDongLienKetInput) {
  return prisma.hopDongLienKet.create({ data: input });
}

/** HV-11/12: các hợp đồng "Đang triển khai" của 1 khóa - dùng để xác định đơn vị nào còn hiệu lực. */
export async function hopDongConHieuLucTheoKhoa(khoaId: string) {
  return prisma.hopDongLienKet.findMany({
    where: { khoaId, trangThai: "DANG_TRIEN_KHAI" },
    include: { donViLienKet: true },
  });
}

/** HV-11: khóa nào đang có hợp đồng còn hiệu lực với đơn vị liên kết của 1 tài khoản. */
export async function khoaDuocPhanCongChoTaiKhoan(nguoiDungId: string) {
  const donVi = await prisma.donViLienKet.findUnique({ where: { taiKhoanId: nguoiDungId } });
  if (!donVi) return [];

  const hopDongs = await prisma.hopDongLienKet.findMany({
    where: { donViLienKetId: donVi.id, trangThai: "DANG_TRIEN_KHAI" },
    include: { khoa: { include: { chuongTrinh: true } } },
  });
  return hopDongs;
}

export async function donViLienKetCuaTaiKhoan(nguoiDungId: string) {
  return prisma.donViLienKet.findUnique({ where: { taiKhoanId: nguoiDungId } });
}
