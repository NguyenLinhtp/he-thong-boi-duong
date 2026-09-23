import { prisma } from "@/lib/db/prisma";
import { MaTrungError, DangDuocThamChieuError } from "@/server/services/shared/loi-danh-muc";

export async function danhSachLoaiHinhBoiDuong() {
  return prisma.loaiHinhBoiDuong.findMany({ orderBy: { ma: "asc" } });
}

async function kiemTraMaTrung(ma: string, boQuaId?: string) {
  const daTonTai = await prisma.loaiHinhBoiDuong.findUnique({ where: { ma } });
  if (daTonTai && daTonTai.id !== boQuaId) throw new MaTrungError(ma);
}

export type LoaiHinhBoiDuongInput = { ma: string; ten: string };

export async function taoLoaiHinhBoiDuong(input: LoaiHinhBoiDuongInput) {
  await kiemTraMaTrung(input.ma);
  return prisma.loaiHinhBoiDuong.create({ data: input });
}

export async function suaLoaiHinhBoiDuong(id: string, input: LoaiHinhBoiDuongInput) {
  await kiemTraMaTrung(input.ma, id);
  return prisma.loaiHinhBoiDuong.update({ where: { id }, data: input });
}

// Rule: "Mỗi chương trình bồi dưỡng phải gắn với đúng 1 loại hình" - ChuongTrinh.loaiHinhBoiDuongId
// là bắt buộc (không nullable) nên không thể xóa loại hình đang có chương trình sử dụng.
export async function xoaLoaiHinhBoiDuong(id: string) {
  const soChuongTrinhThamChieu = await prisma.chuongTrinh.count({
    where: { loaiHinhBoiDuongId: id },
  });
  if (soChuongTrinhThamChieu > 0) {
    throw new DangDuocThamChieuError(
      "Không thể xóa loại hình đang được chương trình bồi dưỡng sử dụng",
    );
  }
  return prisma.loaiHinhBoiDuong.delete({ where: { id } });
}
