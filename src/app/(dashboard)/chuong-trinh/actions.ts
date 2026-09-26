"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import { taoChuongTrinh } from "@/server/services/ct/ct-01-tao-chuong-trinh";
import type { LoaiVanBang } from "@/generated/prisma/client";

export async function taoChuongTrinhAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  await requirePermission("CT-01");
  const tongThoiLuongRaw = formData.get("tongThoiLuong") as string;

  await taoChuongTrinh({
    ten: String(formData.get("ten")),
    mucTieu: (formData.get("mucTieu") as string) || null,
    doiTuongApDung: (formData.get("doiTuongApDung") as string) || null,
    tongThoiLuong: tongThoiLuongRaw ? Number(tongThoiLuongRaw) : null,
    loaiHinhBoiDuongId: String(formData.get("loaiHinhBoiDuongId")),
    loaiVanBang: formData.get("loaiVanBang") === "CHUNG_NHAN" ? "CHUNG_NHAN" : ("CHUNG_CHI" as LoaiVanBang),
  });

  revalidatePath("/chuong-trinh");
  return undefined;
}
