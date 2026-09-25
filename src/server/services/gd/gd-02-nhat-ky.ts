import { prisma } from "@/lib/db/prisma";
import { layBuoiHocNeuDuocPhanCong } from "@/server/services/gd/dung-chung";

export type GhiNhatKyInput = {
  noiDungDaGiang?: string | null;
  nhanXet?: string | null;
};

/** GD-02: không bắt buộc nhưng khuyến khích ghi sau mỗi buổi - chỉ giảng viên được phân công mới ghi được. */
export async function ghiNhatKyBuoiHoc(
  giangVienId: string,
  buoiHocId: string,
  input: GhiNhatKyInput,
) {
  await layBuoiHocNeuDuocPhanCong(giangVienId, buoiHocId);

  return prisma.buoiHoc.update({
    where: { id: buoiHocId },
    data: {
      noiDungDaGiang: input.noiDungDaGiang ?? null,
      nhanXet: input.nhanXet ?? null,
    },
  });
}

/** Nhật ký toàn khóa (output của GD-02) - cán bộ/giảng viên đều xem được, chỉ giảng viên phụ trách mới sửa được. */
export async function nhatKyKhoa(khoaId: string) {
  return prisma.buoiHoc.findMany({
    where: { khoaId },
    include: { hocPhan: true },
    orderBy: [{ ngayHoc: "asc" }, { gioBatDau: "asc" }],
  });
}
