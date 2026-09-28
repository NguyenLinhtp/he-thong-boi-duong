import { prisma } from "@/lib/db/prisma";
import { ghiThaoTac, HE_THONG, type NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";
import { coKhoaDangHoatDong } from "@/server/services/ct/ct-04-cap-nhat-da-ban-hanh";
import {
  SaiTrangThaiChuongTrinhError,
  KhongTimThayChuongTrinhError,
} from "@/server/services/ct/loi-chuong-trinh";
import type { PhuongThucDangKy } from "@/generated/prisma/client";

export class DoiPhuongThucKhiCoKhoaDangHoatDongError extends Error {
  constructor() {
    super(
      "Chương trình đang có khóa hoạt động kế thừa phương thức đăng ký hiện tại, không được đổi sang phương thức khác",
    );
  }
}

// CT-07: mỗi chương trình chỉ gắn đúng 1 trong 4 phương thức đăng ký; mọi
// khóa mở từ chương trình kế thừa phương thức này. Ràng buộc "Phương thức 4
// (qua đơn vị liên kết) bắt buộc có hợp đồng liên kết còn hiệu lực mới cho
// phép đăng ký" áp dụng ở thời điểm học viên đăng ký/mở khóa tuyển sinh
// (HV-11/HV-12, Đợt 2) - module Đơn vị liên kết (DVLK) là Đợt 2, chưa tồn
// tại ở Đợt 1 nên KHÔNG enforce ở đây; CT-07 chỉ gắn "Phương thức 4" chung,
// chưa chọn đơn vị liên kết cụ thể (việc đó thuộc DVLK-03/KH-06 sau).
export async function thietLapPhuongThucDangKy(
  chuongTrinhId: string,
  phuongThucDangKy: PhuongThucDangKy,
  nguoi: NguoiThucHien = HE_THONG,
) {
  const chuongTrinh = await prisma.chuongTrinh.findUnique({ where: { id: chuongTrinhId } });
  if (!chuongTrinh) throw new KhongTimThayChuongTrinhError();
  if (chuongTrinh.trangThai === "NGUNG_HIEU_LUC") {
    throw new SaiTrangThaiChuongTrinhError(
      "Chương trình đã ngừng hiệu lực, không thiết lập phương thức đăng ký",
    );
  }

  if (
    chuongTrinh.phuongThucDangKy !== phuongThucDangKy &&
    (await coKhoaDangHoatDong(chuongTrinhId))
  ) {
    throw new DoiPhuongThucKhiCoKhoaDangHoatDongError();
  }

  if (chuongTrinh.phuongThucDangKy === phuongThucDangKy) return chuongTrinh;
  return prisma.$transaction(async (tx) => {
    const sau = await tx.chuongTrinh.update({
      where: { id: chuongTrinhId },
      data: { phuongThucDangKy },
    });
    await ghiThaoTac(
      nguoi,
      "THIET_LAP_PHUONG_THUC_DANG_KY",
      "ChuongTrinh",
      chuongTrinhId,
      `${sau.maCT}: ${chuongTrinh.phuongThucDangKy ?? "chưa có"} -> ${phuongThucDangKy}`,
      tx,
    );
    return sau;
  });
}
