import { prisma } from "@/lib/db/prisma";
import { MaTrungError, DangDuocThamChieuError } from "@/server/services/shared/loi-danh-muc";

export async function danhSachDonVi() {
  return prisma.donVi.findMany({
    include: { donViCha: true },
    orderBy: { ma: "asc" },
  });
}

async function kiemTraMaTrung(ma: string, boQuaId?: string) {
  const daTonTai = await prisma.donVi.findUnique({ where: { ma } });
  if (daTonTai && daTonTai.id !== boQuaId) throw new MaTrungError(ma);
}

export type TaoDonViInput = { ma: string; ten: string; donViChaId?: string | null };

export async function taoDonVi(input: TaoDonViInput) {
  await kiemTraMaTrung(input.ma);
  return prisma.donVi.create({ data: input });
}

export async function suaDonVi(id: string, input: TaoDonViInput) {
  await kiemTraMaTrung(input.ma, id);
  return prisma.donVi.update({ where: { id }, data: input });
}

export async function xoaDonVi(id: string) {
  const soGiangVienThamChieu = await prisma.giangVien.count({ where: { donViId: id } });
  if (soGiangVienThamChieu > 0) {
    throw new DangDuocThamChieuError(
      "Không thể xóa đơn vị đang được tham chiếu bởi giảng viên",
    );
  }
  return prisma.donVi.delete({ where: { id } });
}
