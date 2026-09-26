import { revalidatePath } from "next/cache";
import { LoiDonViLienKet } from "@/server/services/dvlk/loi-dvlk";

export type KetQuaThaoTacDvlk = { loi?: string; thongBao?: string } | undefined;

/** Chạy 1 thao tác DVLK: lỗi nghiệp vụ trả về làm thông báo, lỗi khác ném tiếp. */
export async function thucHienDvlk(
  duongDan: string[],
  thaoTac: () => Promise<string>,
): Promise<KetQuaThaoTacDvlk> {
  let thongBao: string;
  try {
    thongBao = await thaoTac();
  } catch (error) {
    if (error instanceof LoiDonViLienKet) return { loi: error.message };
    throw error;
  }
  for (const d of duongDan) revalidatePath(d);
  return { thongBao };
}
