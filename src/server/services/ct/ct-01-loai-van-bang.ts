import { prisma } from "@/lib/db/prisma";
import type { LoaiVanBang } from "@/generated/prisma/client";
import {
  SaiTrangThaiChuongTrinhError,
  KhongTimThayChuongTrinhError,
} from "@/server/services/ct/loi-chuong-trinh";

export const NHAN_LOAI_VAN_BANG: Record<LoaiVanBang, string> = {
  CHUNG_CHI: "Chứng chỉ",
  CHUNG_NHAN: "Giấy chứng nhận",
};

export class DoiLoaiVanBangKhiDaLapError extends Error {
  constructor() {
    super(
      "Chương trình đã có văn bằng được lập (đề nghị/cấp) ở khóa của chương trình - không đổi loại văn bằng được nữa",
    );
  }
}

/**
 * CT-01 (bổ sung 26/09/2026): mỗi chương trình xác định cấp CHỨNG CHỈ hay GIẤY
 * CHỨNG NHẬN cho học viên hoàn thành. Đổi được cho tới khi có văn bằng (chưa
 * hủy) được lập ở bất kỳ khóa nào của chương trình - sau đó đổi sẽ làm văn bằng
 * cùng chương trình lẫn 2 loại/2 dãy số hiệu.
 */
export async function thietLapLoaiVanBang(chuongTrinhId: string, loaiVanBang: LoaiVanBang) {
  const chuongTrinh = await prisma.chuongTrinh.findUnique({ where: { id: chuongTrinhId } });
  if (!chuongTrinh) throw new KhongTimThayChuongTrinhError();
  if (chuongTrinh.trangThai === "NGUNG_HIEU_LUC") {
    throw new SaiTrangThaiChuongTrinhError("Chương trình đã ngừng hiệu lực, không thiết lập loại văn bằng");
  }
  if (chuongTrinh.loaiVanBang === loaiVanBang) return chuongTrinh;

  const soVanBangDaLap = await prisma.chungChi.count({
    where: { khoa: { chuongTrinhId }, trangThai: { not: "DA_HUY" } },
  });
  if (soVanBangDaLap > 0) throw new DoiLoaiVanBangKhiDaLapError();

  return prisma.chuongTrinh.update({ where: { id: chuongTrinhId }, data: { loaiVanBang } });
}
