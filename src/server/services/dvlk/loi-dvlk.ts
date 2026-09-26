/** Lớp cơ sở lỗi nghiệp vụ module DVLK - thông điệp an toàn để hiện cho người dùng. */
export class LoiDonViLienKet extends Error {}

export class ThieuThongTinDvlkError extends LoiDonViLienKet {
  constructor(truong: string) {
    super(`Thiếu thông tin bắt buộc: ${truong}`);
  }
}

export class MaDonViLienKetTrungError extends LoiDonViLienKet {
  constructor(ma: string) {
    super(`Mã đơn vị liên kết "${ma}" đã tồn tại`);
  }
}

export class KhongTimThayDonViLienKetError extends LoiDonViLienKet {
  constructor() {
    super("Không tìm thấy đơn vị liên kết");
  }
}

// DVLK-01: "không xóa được đơn vị đang có hợp đồng chưa thanh lý". Hợp đồng đã
// thanh lý vẫn là hồ sơ (học viên, chứng chỉ bàn giao tham chiếu tới) nên cũng
// không xóa được - chuyển Tạm ngừng hợp tác thay cho xóa.
export class DonViConHopDongError extends LoiDonViLienKet {
  constructor(soChuaThanhLy: number) {
    super(
      soChuaThanhLy > 0
        ? `Không xóa được: đơn vị đang có ${soChuaThanhLy} hợp đồng liên kết chưa thanh lý`
        : "Không xóa được: đơn vị đã có hợp đồng liên kết (hồ sơ lưu trữ) - hãy chuyển trạng thái Tạm ngừng hợp tác",
    );
  }
}
