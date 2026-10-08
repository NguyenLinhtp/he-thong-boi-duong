"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import { nguoiTuPhien } from "@/server/services/qt/qt-03-nhat-ky";
import { bocLoiLo, type KetQuaLo } from "@/server/services/chung/xu-ly-lo";
import {
  chuyenKhoaLo,
  thamDinhLo,
  thoiHocLo,
  xacNhanNopGiayLo,
  xetDuyetLo,
  xoaKhoiKhoaLo,
} from "@/server/services/hv/thao-tac-lo-tuyen-sinh";
import type { KetQuaThamDinh } from "@/server/services/hv/hv-06-tham-dinh";

// (bổ sung 07/10/2026) thao tác hàng loạt trên các danh sách tab Tuyển sinh - mỗi action
// được bind sẵn khoaId (và loại thao tác) ở trang, nhận (ids, giá trị nhập) từ thanh chọn nhiều
function lamMoi(khoaId: string) {
  for (const duoi of ["", "/tuyen-sinh", "/hoc-phi"]) revalidatePath(`/khoa-hoc/${khoaId}${duoi}`);
}

export async function xacNhanNopGiayLoAction(khoaId: string, ids: string[]): Promise<KetQuaLo> {
  await requirePermission("HV-02");
  const kq = await bocLoiLo(() => xacNhanNopGiayLo(khoaId, ids));
  lamMoi(khoaId);
  return kq;
}

export async function thamDinhLoAction(khoaId: string, ketQua: KetQuaThamDinh, ids: string[], gt: Record<string, string>): Promise<KetQuaLo> {
  const phien = await requirePermission("HV-06");
  const kq = await bocLoiLo(() => thamDinhLo(khoaId, ids, ketQua, gt.lyDo, nguoiTuPhien(phien)));
  lamMoi(khoaId);
  return kq;
}

export async function xetDuyetLoAction(khoaId: string, ids: string[]): Promise<KetQuaLo> {
  const phien = await requirePermission("HV-07");
  const kq = await bocLoiLo(() => xetDuyetLo(khoaId, ids, nguoiTuPhien(phien)));
  lamMoi(khoaId);
  return kq;
}

export async function thoiHocLoAction(khoaId: string, ids: string[], gt: Record<string, string>): Promise<KetQuaLo> {
  const phien = await requirePermission("HV-09");
  const kq = await bocLoiLo(() => thoiHocLo(khoaId, ids, gt.lyDo, nguoiTuPhien(phien)));
  lamMoi(khoaId);
  return kq;
}

export async function xoaKhoiKhoaLoAction(khoaId: string, ids: string[], gt: Record<string, string>): Promise<KetQuaLo> {
  const phien = await requirePermission("HV-09");
  const kq = await bocLoiLo(() => xoaKhoiKhoaLo(khoaId, ids, gt.lyDo, nguoiTuPhien(phien)));
  lamMoi(khoaId);
  return kq;
}

export async function chuyenKhoaLoAction(khoaId: string, ids: string[], gt: Record<string, string>): Promise<KetQuaLo> {
  const phien = await requirePermission("HV-09");
  const kq = await bocLoiLo(() => chuyenKhoaLo(khoaId, ids, gt.khoaMoiId, gt.lyDo, nguoiTuPhien(phien)));
  lamMoi(khoaId);
  if (gt.khoaMoiId) revalidatePath(`/khoa-hoc/${gt.khoaMoiId}/tuyen-sinh`);
  return kq;
}
