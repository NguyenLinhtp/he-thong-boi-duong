"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import { importDanhSachSinhVien } from "@/server/services/hv/hv-03-danh-sach-sinh-vien";
import { DuLieuImportLoiError, type DongLoiImport } from "@/server/services/hv/loi-hoc-vien";
import { nguoiTuPhien } from "@/server/services/qt/qt-03-nhat-ky";

export type TrangThaiImportSinhVien = { ok?: string; loi?: string; cacDongLoi?: DongLoiImport[] };

export async function importSinhVienAction(
  _prev: TrangThaiImportSinhVien | undefined,
  formData: FormData,
): Promise<TrangThaiImportSinhVien> {
  const phien = await requirePermission("HV-03");
  const tep = formData.get("file");
  if (!(tep instanceof File) || tep.size === 0) return { loi: "Vui lòng chọn tệp Excel/CSV" };
  try {
    const kq = await importDanhSachSinhVien(Buffer.from(await tep.arrayBuffer()), tep.name, nguoiTuPhien(phien));
    revalidatePath("/hoc-vien/sinh-vien");
    return { ok: `Đã nạp: ${kq.themMoi} sinh viên mới, cập nhật ${kq.capNhat} sinh viên đã có.` };
  } catch (error) {
    if (error instanceof DuLieuImportLoiError) return { loi: error.message, cacDongLoi: error.cacDongLoi };
    if (error instanceof Error) return { loi: error.message };
    throw error;
  }
}
