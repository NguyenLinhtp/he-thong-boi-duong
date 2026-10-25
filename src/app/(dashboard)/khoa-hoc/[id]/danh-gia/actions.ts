"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import { nguoiTuPhien } from "@/server/services/qt/qt-03-nhat-ky";
import { bocLoiLo, type KetQuaLo } from "@/server/services/chung/xu-ly-lo";
import { giaHanDanhGiaLo, thuHoiGiaHanLo } from "@/server/services/gd/gd-04-quan-ly-danh-gia";

// (bổ sung 25/10/2026 - GD-04) gia hạn bài làm trực tuyến cho các học viên đã chọn
export async function giaHanLoAction(khoaId: string, ids: string[], gt: Record<string, string>): Promise<KetQuaLo> {
  const phien = await requirePermission("KQ-02");
  const kq = await bocLoiLo(() =>
    giaHanDanhGiaLo(
      khoaId,
      ids,
      {
        mucKey: gt.mucKey,
        soLanThem: gt.soLanThem ? Number(gt.soLanThem) : 0,
        moNopLai: gt.moNopLai === "CO",
        hanDen: gt.hanDen || null,
        lyDo: gt.lyDo,
      },
      nguoiTuPhien(phien),
    ),
  );
  revalidatePath(`/khoa-hoc/${khoaId}/danh-gia`);
  return kq;
}

export async function thuHoiGiaHanLoAction(khoaId: string, ids: string[], gt: Record<string, string>): Promise<KetQuaLo> {
  const phien = await requirePermission("KQ-02");
  const kq = await bocLoiLo(() => thuHoiGiaHanLo(khoaId, ids, gt.mucKey, nguoiTuPhien(phien)));
  revalidatePath(`/khoa-hoc/${khoaId}/danh-gia`);
  return kq;
}
