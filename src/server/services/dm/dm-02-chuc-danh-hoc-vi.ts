import { prisma } from "@/lib/db/prisma";
import { MaTrungError, DangDuocThamChieuError } from "@/server/services/shared/loi-danh-muc";

export async function danhSachChucDanhHocVi() {
  return prisma.chucDanhHocVi.findMany({ orderBy: { ma: "asc" } });
}

async function kiemTraMaTrung(ma: string, boQuaId?: string) {
  const daTonTai = await prisma.chucDanhHocVi.findUnique({ where: { ma } });
  if (daTonTai && daTonTai.id !== boQuaId) throw new MaTrungError(ma);
}

export type ChucDanhHocViInput = { ma: string; ten: string; loai: string };

export async function taoChucDanhHocVi(input: ChucDanhHocViInput) {
  await kiemTraMaTrung(input.ma);
  return prisma.chucDanhHocVi.create({ data: input });
}

export async function suaChucDanhHocVi(id: string, input: ChucDanhHocViInput) {
  await kiemTraMaTrung(input.ma, id);
  return prisma.chucDanhHocVi.update({ where: { id }, data: input });
}

export async function xoaChucDanhHocVi(id: string) {
  const [soGiangVien, soHocVien] = await Promise.all([
    prisma.giangVien.count({ where: { chucDanhHocViId: id } }),
    prisma.hocVien.count({ where: { chucDanhHocViId: id } }),
  ]);
  if (soGiangVien > 0 || soHocVien > 0) {
    throw new DangDuocThamChieuError(
      "Không thể xóa chức danh/học hàm/học vị đang được gán cho giảng viên hoặc học viên",
    );
  }
  return prisma.chucDanhHocVi.delete({ where: { id } });
}
