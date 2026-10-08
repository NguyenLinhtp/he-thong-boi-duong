"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import { nguoiTuPhien } from "@/server/services/qt/qt-03-nhat-ky";
import { bocLoiLo, type KetQuaLo } from "@/server/services/chung/xu-ly-lo";
import type { TrangThaiDongPhi } from "@/server/services/hp/hp-02-chuyen-trang-thai-le-phi";
import { boQuaDieuKienLo, chuyenLePhiLo, datHanNopLo, mienGiamLo, nhacNoLo } from "@/server/services/hp/hp-thao-tac-lo";

// (bổ sung 07/10/2026) thao tác hàng loạt của cán bộ tài chính trên các danh sách tab Học phí
function lamMoi(khoaId: string) {
  revalidatePath(`/khoa-hoc/${khoaId}/hoc-phi`);
  revalidatePath(`/khoa-hoc/${khoaId}/tuyen-sinh`);
}

export async function chuyenLePhiLoAction(khoaId: string, trangThai: TrangThaiDongPhi, ids: string[], gt: Record<string, string>): Promise<KetQuaLo> {
  const phien = await requirePermission("HP-02");
  const kq = await bocLoiLo(() => chuyenLePhiLo(khoaId, ids, trangThai, gt.thanhPhanId || null, gt.lyDo, nguoiTuPhien(phien)));
  lamMoi(khoaId);
  return kq;
}

export async function mienGiamLoAction(khoaId: string, ids: string[], gt: Record<string, string>): Promise<KetQuaLo> {
  const phien = await requirePermission("HP-02");
  const kq = await bocLoiLo(() => mienGiamLo(khoaId, ids, gt.lyDo, nguoiTuPhien(phien)));
  lamMoi(khoaId);
  return kq;
}

export async function datHanNopLoAction(khoaId: string, ids: string[], gt: Record<string, string>): Promise<KetQuaLo> {
  await requirePermission("HP-03");
  const kq = await bocLoiLo(() => datHanNopLo(khoaId, ids, gt.hanNop));
  lamMoi(khoaId);
  return kq;
}

export async function nhacNoLoAction(khoaId: string, ids: string[]): Promise<KetQuaLo> {
  await requirePermission("HP-03");
  const kq = await bocLoiLo(() => nhacNoLo(khoaId, ids));
  lamMoi(khoaId);
  return kq;
}

// HP-06: cùng quyền với nút bỏ qua điều kiện từng dòng (HP-01 - cán bộ đào tạo/tài chính)
export async function boQuaDieuKienLoAction(khoaId: string, ids: string[], gt: Record<string, string>): Promise<KetQuaLo> {
  const phien = await requirePermission("HP-01");
  const kq = await bocLoiLo(() => boQuaDieuKienLo(khoaId, ids, gt.lyDo, nguoiTuPhien(phien)));
  lamMoi(khoaId);
  return kq;
}
