import { prisma } from "@/lib/db/prisma";
import { coKhoaDangHoatDong } from "@/server/services/ct/ct-04-cap-nhat-da-ban-hanh";
import {
  SaiTrangThaiChuongTrinhError,
  KhongTimThayChuongTrinhError,
} from "@/server/services/ct/loi-chuong-trinh";

export class ThieuLyDoNgungHieuLucError extends Error {
  constructor() {
    super("Lý do ngừng hiệu lực là bắt buộc");
  }
}

export class ConKhoaChuaKetThucError extends Error {
  constructor() {
    super("Chương trình đang có khóa chưa kết thúc - không thể ngừng hiệu lực/lưu trữ");
  }
}

/**
 * CT-06: Đã ban hành -> Ngừng hiệu lực (lưu trữ), chỉ dùng để tra cứu,
 * không còn dùng để mở khóa mới (chặn ở KH-01 qua điều kiện trạng thái
 * DA_BAN_HANH sẵn có). Quy tắc: chương trình đang có khóa chưa kết thúc
 * (CHUAN_BI/DANG_TUYEN_SINH/DANG_DIEN_RA) thì chưa được lưu trữ.
 */
export async function ngungHieuLucChuongTrinh(chuongTrinhId: string, lyDo: string) {
  if (!lyDo?.trim()) throw new ThieuLyDoNgungHieuLucError();

  const chuongTrinh = await prisma.chuongTrinh.findUnique({ where: { id: chuongTrinhId } });
  if (!chuongTrinh) throw new KhongTimThayChuongTrinhError();
  if (chuongTrinh.trangThai !== "DA_BAN_HANH") {
    throw new SaiTrangThaiChuongTrinhError(
      "Chỉ chương trình ở trạng thái Đã ban hành mới ngừng hiệu lực/lưu trữ được",
    );
  }
  if (await coKhoaDangHoatDong(chuongTrinhId)) {
    throw new ConKhoaChuaKetThucError();
  }

  return prisma.chuongTrinh.update({
    where: { id: chuongTrinhId },
    data: {
      trangThai: "NGUNG_HIEU_LUC",
      lyDoNgungHieuLuc: lyDo,
      ngayNgungHieuLuc: new Date(),
    },
  });
}
