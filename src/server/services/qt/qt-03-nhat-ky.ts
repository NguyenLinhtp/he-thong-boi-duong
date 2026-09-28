import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

/**
 * QT-03: điểm ghi nhật ký thao tác dùng chung cho toàn hệ thống. "Không cho
 * phép sửa/xóa nhật ký đã ghi" - module này CHỦ Ý không xuất hàm update/delete
 * nào, chỉ có ghi (insert) và đọc.
 *
 * Không dùng pattern best-effort (khác guiThongBao ở HV-10): ghi nhật ký là 1
 * insert bình thường trong cùng DB, không phụ thuộc dịch vụ ngoài (SMTP) nên
 * để lỗi throw ra bình thường như mọi thao tác DB khác.
 */
export async function ghiNhatKy(input: {
  nguoiThucHienId?: string | null;
  nguoiThucHienTen: string;
  hanhDong: string;
  doiTuong: string;
  doiTuongId: string;
  chiTiet?: string | null;
}, db: Prisma.TransactionClient = prisma) {
  // db: truyền tx để nhật ký nằm cùng transaction với thao tác được ghi
  return db.nhatKyThaoTac.create({
    data: {
      nguoiThucHienId: input.nguoiThucHienId ?? null,
      nguoiThucHienTen: input.nguoiThucHienTen,
      hanhDong: input.hanhDong,
      doiTuong: input.doiTuong,
      doiTuongId: input.doiTuongId,
      chiTiet: input.chiTiet ?? null,
    },
  });
}

/** Người thực hiện thao tác - lấy từ phiên đăng nhập ở trang/API. */
export type NguoiThucHien = { nguoiThucHienId?: string | null; nguoiThucHienTen: string };

/** Mặc định cho lời gọi nội bộ/tác vụ tự động không gắn với 1 tài khoản. */
export const HE_THONG: NguoiThucHien = { nguoiThucHienTen: "Hệ thống" };

export const nguoiTuPhien = (phien: { userId: string; hoTen: string }): NguoiThucHien => ({
  nguoiThucHienId: phien.userId,
  nguoiThucHienTen: phien.hoTen,
});

/** Rút gọn ghiNhatKy cho các service nhận tham số NguoiThucHien. */
export function ghiThaoTac(
  nguoi: NguoiThucHien,
  hanhDong: string,
  doiTuong: string,
  doiTuongId: string,
  chiTiet?: string | null,
  db: Prisma.TransactionClient = prisma,
) {
  return ghiNhatKy(
    {
      nguoiThucHienId: nguoi.nguoiThucHienId,
      nguoiThucHienTen: nguoi.nguoiThucHienTen,
      hanhDong,
      doiTuong,
      doiTuongId,
      chiTiet,
    },
    db,
  );
}

export type LocNhatKy = {
  doiTuong?: string;
  doiTuongId?: string;
  tuNgay?: Date;
  denNgay?: Date;
};

export async function danhSachNhatKy(loc: LocNhatKy = {}) {
  return prisma.nhatKyThaoTac.findMany({
    where: {
      doiTuong: loc.doiTuong,
      doiTuongId: loc.doiTuongId,
      thoiGian: {
        gte: loc.tuNgay,
        lte: loc.denNgay,
      },
    },
    orderBy: { thoiGian: "desc" },
    take: 500,
  });
}
