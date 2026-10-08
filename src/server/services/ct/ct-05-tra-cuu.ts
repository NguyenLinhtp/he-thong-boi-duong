import { prisma } from "@/lib/db/prisma";
import type { TrangThaiChuongTrinh } from "@/generated/prisma/client";

export type TimKiemChuongTrinhFilter = {
  ten?: string;
  maCT?: string;
  loaiHinhBoiDuongId?: string;
  trangThai?: TrangThaiChuongTrinh;
};

// CT-05: tra cứu/tìm kiếm - "Không giới hạn" quy tắc nghiệp vụ nên không lọc
// theo vai trò/trạng thái ẩn - mọi người dùng nội bộ có quyền CT-05 tìm được
// chương trình ở bất kỳ trạng thái nào.
export async function timKiemChuongTrinh(filter: TimKiemChuongTrinhFilter = {}) {
  return prisma.chuongTrinh.findMany({
    where: {
      ...(filter.ten ? { ten: { contains: filter.ten, mode: "insensitive" } } : {}),
      ...(filter.maCT ? { maCT: { contains: filter.maCT, mode: "insensitive" } } : {}),
      ...(filter.loaiHinhBoiDuongId ? { loaiHinhBoiDuongId: filter.loaiHinhBoiDuongId } : {}),
      ...(filter.trangThai ? { trangThai: filter.trangThai } : {}),
    },
    include: { loaiHinhBoiDuong: true, _count: { select: { khoas: true } } },
    orderBy: { createdAt: "desc" },
  });
}
