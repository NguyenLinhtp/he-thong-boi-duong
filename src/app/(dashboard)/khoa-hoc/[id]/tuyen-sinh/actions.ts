"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import { nhapExcelThamDinh, type KetQuaThamDinhTuTep } from "@/server/services/hv/hv-06-tham-dinh-excel";
import { dieuChinhThongTinThiSinh } from "@/server/services/hv/hv-06-dieu-chinh-thong-tin";
import { nhapExcelXetDuyet, type KetQuaXetDuyetTuTep } from "@/server/services/hv/hv-07-xet-duyet-excel";
import { DuLieuImportLoiError, type DongLoiImport } from "@/server/services/hv/loi-hoc-vien";
import { nguoiTuPhien } from "@/server/services/qt/qt-03-nhat-ky";

// (bổ sung 05/10/2026) HV-06/HV-07: thẩm định/xét duyệt theo tệp, điều chỉnh thông tin thí sinh

function lamMoi(khoaId: string) {
  for (const duoi of ["", "/tuyen-sinh"]) revalidatePath(`/khoa-hoc/${khoaId}${duoi}`);
}

async function docTep(formData: FormData) {
  const tep = formData.get("file");
  if (!(tep instanceof File) || tep.size === 0) return null;
  return { ten: tep.name, noiDung: Buffer.from(await tep.arrayBuffer()) };
}

export type TrangThaiTepDanhSach<T> = { ketQua?: T; loi?: string; cacDongLoi?: DongLoiImport[] };

async function xuLyTep<T>(chay: () => Promise<T>): Promise<TrangThaiTepDanhSach<T>> {
  try {
    return { ketQua: await chay() };
  } catch (error) {
    if (error instanceof DuLieuImportLoiError) return { loi: error.message, cacDongLoi: error.cacDongLoi };
    if (error instanceof Error) return { loi: error.message };
    throw error;
  }
}

export async function nhapThamDinhAction(
  khoaId: string,
  _prev: TrangThaiTepDanhSach<KetQuaThamDinhTuTep> | undefined,
  formData: FormData,
): Promise<TrangThaiTepDanhSach<KetQuaThamDinhTuTep>> {
  const phien = await requirePermission("HV-06");
  const tep = await docTep(formData);
  if (!tep) return { loi: "Vui lòng chọn tệp Excel thẩm định" };
  const kq = await xuLyTep(() => nhapExcelThamDinh(khoaId, tep.noiDung, tep.ten, nguoiTuPhien(phien)));
  if (kq.ketQua) lamMoi(khoaId);
  return kq;
}

export async function nhapXetDuyetAction(
  khoaId: string,
  _prev: TrangThaiTepDanhSach<KetQuaXetDuyetTuTep> | undefined,
  formData: FormData,
): Promise<TrangThaiTepDanhSach<KetQuaXetDuyetTuTep>> {
  const phien = await requirePermission("HV-07");
  const tep = await docTep(formData);
  if (!tep) return { loi: "Vui lòng chọn tệp Excel xét duyệt" };
  const kq = await xuLyTep(() => nhapExcelXetDuyet(khoaId, tep.noiDung, tep.ten, nguoiTuPhien(phien)));
  if (kq.ketQua) lamMoi(khoaId);
  return kq;
}

export async function dieuChinhThongTinAction(
  khoaId: string,
  dangKyId: string,
  _prev: { ok?: boolean; loi?: string } | undefined,
  formData: FormData,
): Promise<{ ok?: boolean; loi?: string }> {
  const phien = await requirePermission("HV-06");
  const chuoi = (k: string) => String(formData.get(k) ?? "");
  const boSung: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (k.startsWith("bs_") && typeof v === "string") boSung[k.slice(3)] = v;
  try {
    await dieuChinhThongTinThiSinh(
      dangKyId,
      {
        hoTen: chuoi("hoTen"),
        soCCCD: chuoi("soCCCD"),
        ngaySinh: chuoi("ngaySinh") || null,
        soDienThoai: chuoi("soDienThoai") || null,
        email: chuoi("email") || null,
        donViCongTac: chuoi("donViCongTac") || null,
        soDienThoaiXacThuc: formData.has("soDienThoaiXacThuc") ? chuoi("soDienThoaiXacThuc") : null,
        boSung,
        lyDo: chuoi("lyDo"),
      },
      nguoiTuPhien(phien),
    );
  } catch (error) {
    if (error instanceof Error) return { loi: error.message };
    throw error;
  }
  lamMoi(khoaId);
  revalidatePath(`/khoa-hoc/${khoaId}/tuyen-sinh/ho-so/${dangKyId}`);
  return { ok: true };
}
