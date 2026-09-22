"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import type { VaiTro } from "@/generated/prisma/client";
import { capNhatQuyen } from "@/server/services/qt/qt-02-phan-quyen";

export async function capNhatQuyenAction(vaiTro: VaiTro, maCN: string, coQuyen: boolean) {
  await requirePermission("QT-02");
  await capNhatQuyen(vaiTro, maCN, coQuyen);
  revalidatePath("/quan-tri/phan-quyen");
}
