import { prisma } from "@/lib/db/prisma";

// DVLK-01 đã chuyển sang services/dvlk - giữ export cũ cho nơi đang dùng
export { taoDonViLienKet, danhSachDonViLienKet } from "@/server/services/dvlk/dvlk-01-danh-muc";
export {
  MaDonViLienKetTrungError,
  KhongTimThayDonViLienKetError,
  TaiKhoanKhongPhaiCanBoDonViLienKetError,
  TaiKhoanDaGanDonViKhacError,
} from "@/server/services/dvlk/loi-dvlk";
// DVLK-02 đã chuyển sang services/dvlk
export {
  ganTaiKhoanDonViLienKet,
  danhSachTaiKhoanChuaGan,
  donViLienKetCuaTaiKhoan,
} from "@/server/services/dvlk/dvlk-02-tai-khoan";

// HV-11/HV-12 (Phương thức 4a/4b) cần "đơn vị liên kết" + "hợp đồng liên
// kết" đã tồn tại để hoạt động, nhưng module quản lý đầy đủ các thực thể
// này (DVLK-01 quản lý danh mục, DVLK-02 cấp tài khoản, DVLK-03 quản lý hợp
// đồng) thuộc nhóm 11, CHƯA được xây. File này chỉ là phần tối thiểu để
// HV-11/12 chạy được qua UI thật (tạo đơn vị, gán tài khoản đã có sẵn của
// QT-01, tạo hợp đồng) - KHÔNG thay thế DVLK-01/02/03, các ràng buộc đầy đủ
// của DVLK-01 (vd "không xóa được đơn vị đang có hợp đồng chưa thanh lý")
// sẽ được hoàn thiện khi làm đúng module đó.

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

