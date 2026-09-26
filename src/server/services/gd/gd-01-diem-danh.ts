import { prisma } from "@/lib/db/prisma";
import type { TrangThaiDiemDanh } from "@/generated/prisma/client";
import { layBuoiHocNeuDuocPhanCong } from "@/server/services/gd/dung-chung";
import { hocVienThuocBuoi } from "@/server/services/kh/kh-07-lop-hoc";

export type DongDiemDanhInput = { hocVienId: string; trangThai: TrangThaiDiemDanh };

/**
 * Danh sách học viên để điểm danh 1 buổi học = học viên Chính thức (HV-07)
 * thuộc buổi đó (cả khóa, hoặc lớp của buổi tại ngày học - KH-07), kèm trạng
 * thái điểm danh đã ghi trước đó (nếu có) để giảng viên sửa lại thay vì luôn
 * nhập lại từ đầu. Học viên đã có dòng điểm danh ở buổi này (vd học bù từ lớp
 * khác, hoặc đã chuyển lớp sau đó) vẫn hiện để không "mất" dữ liệu đã ghi.
 */
export async function dsHocVienDeDiemDanh(giangVienId: string, buoiHocId: string) {
  const buoiHoc = await layBuoiHocNeuDuocPhanCong(giangVienId, buoiHocId);

  const [dsThuocBuoi, dsDaDiemDanh] = await Promise.all([
    hocVienThuocBuoi(buoiHoc),
    prisma.diemDanh.findMany({ where: { buoiHocId }, include: { hocVien: true } }),
  ]);
  const trangThaiTheoHocVien = new Map(dsDaDiemDanh.map((dd) => [dd.hocVienId, dd.trangThai]));
  const hocVienTheoId = new Map([
    ...dsDaDiemDanh.map((dd) => [dd.hocVienId, dd.hocVien] as const),
    ...dsThuocBuoi.map((dk) => [dk.hocVienId, dk.hocVien] as const),
  ]);

  return [...hocVienTheoId.values()]
    .map((hv) => ({
      hocVienId: hv.id,
      hoTen: hv.hoTen,
      maHocVien: hv.maHocVien,
      trangThaiHienTai: trangThaiTheoHocVien.get(hv.id) ?? null,
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
