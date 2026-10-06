"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import { importDanhSachSinhVien, kiemTraImportSinhVien, luuCotBoSungSinhVien } from "@/server/services/hv/hv-03-danh-sach-sinh-vien";
import {
  CanXacNhanGhiDeSinhVienError,
  DuLieuImportLoiError,
  type DongGhiDeSinhVien,
  type DongLoiImport,
} from "@/server/services/hv/loi-hoc-vien";
import { nguoiTuPhien } from "@/server/services/qt/qt-03-nhat-ky";

/**
 * (sửa 05/10/2026 - HV-03) Nạp danh sách sinh viên 2 bước: kiểm tra tệp (lỗi theo
 * dòng, cảnh báo ghi đè mã SV đã có) -> cán bộ đào tạo xác nhận -> nạp.
 * kiemTra = true: chỉ kiểm tra; ngược lại nạp với danh sách mã SV đã xác nhận ghi đè.
 */
export type TrangThaiImportSinhVien = {
  ok?: string;
  loi?: string;
  cacDongLoi?: DongLoiImport[];
  // kết quả bước kiểm tra - chờ xác nhận
  kiemTra?: { themMoi: number; ghiDe: DongGhiDeSinhVien[]; khongDoi: number };
};

export async function importSinhVienAction(formData: FormData): Promise<TrangThaiImportSinhVien> {
  const phien = await requirePermission("HV-03");
  const tep = formData.get("file");
  if (!(tep instanceof File) || tep.size === 0) return { loi: "Vui lòng chọn tệp Excel/CSV" };
  const noiDung = Buffer.from(await tep.arrayBuffer());
  try {
    if (formData.get("kiemTra") === "1") {
      return { kiemTra: await kiemTraImportSinhVien(noiDung, tep.name) };
    }
    const dsMa = formData.getAll("xacNhanGhiDe").map(String);
    const kq = await importDanhSachSinhVien(noiDung, tep.name, nguoiTuPhien(phien), dsMa);
    revalidatePath("/hoc-vien/sinh-vien");
    revalidatePath("/chuong-trinh/[id]", "page");
    return {
      ok:
        `Đã nạp: ${kq.themMoi} sinh viên mới` +
        (kq.ghiDe ? `, ghi đè ${kq.ghiDe} sinh viên đã có` : "") +
        (kq.khongDoi ? `, bỏ qua ${kq.khongDoi} dòng trùng không đổi` : "") +
        ".",
    };
  } catch (error) {
    if (error instanceof DuLieuImportLoiError) return { loi: error.message, cacDongLoi: error.cacDongLoi };
    // dữ liệu đổi giữa 2 bước -> hiện lại cảnh báo ghi đè để xác nhận lại
    if (error instanceof CanXacNhanGhiDeSinhVienError) {
      return { loi: error.message, kiemTra: await kiemTraImportSinhVien(noiDung, tep.name) };
    }
    if (error instanceof Error) return { loi: error.message };
    throw error;
  }
}

// (bổ sung 05/10/2026) khai báo cột bổ sung của file mẫu danh sách sinh viên
export async function luuCotBoSungAction(json: string): Promise<string | undefined> {
  const phien = await requirePermission("HV-03");
  try {
    const ds = JSON.parse(json);
    if (!Array.isArray(ds)) return "Dữ liệu không hợp lệ";
    await luuCotBoSungSinhVien(
      ds.map((c) => ({ ma: c?.ma ?? null, nhan: String(c?.nhan ?? ""), batBuoc: c?.batBuoc === true })),
      nguoiTuPhien(phien),
    );
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }
  revalidatePath("/hoc-vien/sinh-vien");
  revalidatePath("/chuong-trinh/[id]", "page");
}
