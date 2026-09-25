import { prisma } from "@/lib/db/prisma";
import type { TrangThaiDiemDanh } from "@/generated/prisma/client";
import { layBuoiHocNeuDuocPhanCong } from "@/server/services/gd/dung-chung";

export type DongDiemDanhInput = { hocVienId: string; trangThai: TrangThaiDiemDanh };

/**
 * Danh sách học viên để điểm danh 1 buổi học = mọi học viên đang Chính thức
 * (HV-07) của khóa, kèm trạng thái điểm danh đã ghi trước đó (nếu có) để
 * giảng viên sửa lại thay vì luôn nhập lại từ đầu.
 */
export async function dsHocVienDeDiemDanh(giangVienId: string, buoiHocId: string) {
  const buoiHoc = await layBuoiHocNeuDuocPhanCong(giangVienId, buoiHocId);

  const [dsChinhThuc, dsDaDiemDanh] = await Promise.all([
    prisma.dangKyHoc.findMany({
      where: { khoaId: buoiHoc.khoaId, trangThai: "CHINH_THUC" },
      include: { hocVien: true },
    }),
    prisma.diemDanh.findMany({ where: { buoiHocId } }),
  ]);
  const trangThaiTheoHocVien = new Map(dsDaDiemDanh.map((dd) => [dd.hocVienId, dd.trangThai]));

  return dsChinhThuc
    .map((dk) => ({
      hocVienId: dk.hocVienId,
      hoTen: dk.hocVien.hoTen,
      maHocVien: dk.hocVien.maHocVien,
      trangThaiHienTai: trangThaiTheoHocVien.get(dk.hocVienId) ?? null,
    }))
    .sort((a, b) => a.hoTen.localeCompare(b.hoTen));
}

export async function diemDanhBuoiHoc(
  giangVienId: string,
  buoiHocId: string,
  danhSach: DongDiemDanhInput[],
) {
  await layBuoiHocNeuDuocPhanCong(giangVienId, buoiHocId);

  await prisma.$transaction(
    danhSach.map((dong) =>
      prisma.diemDanh.upsert({
        where: { buoiHocId_hocVienId: { buoiHocId, hocVienId: dong.hocVienId } },
        update: { trangThai: dong.trangThai, giangVienId },
        create: {
          buoiHocId,
          hocVienId: dong.hocVienId,
          trangThai: dong.trangThai,
          giangVienId,
        },
      }),
    ),
  );

  return bangDiemDanhBuoiHoc(buoiHocId);
}

export async function bangDiemDanhBuoiHoc(buoiHocId: string) {
  return prisma.diemDanh.findMany({
    where: { buoiHocId },
    include: { hocVien: true },
    orderBy: { hocVien: { hoTen: "asc" } },
  });
}
