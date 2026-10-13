"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import { nguoiTuPhien } from "@/server/services/qt/qt-03-nhat-ky";
import { datDiemDatChuongTrinh, DieuKienDatError } from "@/server/services/kq/dieu-kien-dat";
import { luuCauHinhChuongTrinh } from "@/server/services/kq/cau-truc-diem-thi";
import { LoiKetQua } from "@/server/services/kq/loi-ket-qua";

// (bổ sung 13/10/2026) điều kiện đạt của chương trình - các khóa không đặt riêng dùng theo
export type KetQuaDieuKienDat = { loi?: string; ok?: string } | undefined;

export async function datDieuKienDatChuongTrinhAction(chuongTrinhId: string, _prev: KetQuaDieuKienDat, fd: FormData): Promise<KetQuaDieuKienDat> {
  const phien = await requirePermission("CT-01");
  const chu = String(fd.get("diemDat") ?? "").trim().replace(",", ".");
  const cc = fd.has("chuyenCan") ? String(fd.get("chuyenCan") ?? "").trim().replace(",", ".") : undefined;
  try {
    const kq = await datDiemDatChuongTrinh(
      chuongTrinhId,
      chu === "" ? null : Number(chu),
      nguoiTuPhien(phien),
      cc === undefined ? undefined : cc === "" ? null : Number(cc),
    );
    revalidatePath(`/chuong-trinh/${chuongTrinhId}`);
    return {
      ok: `Đã lưu${kq.soKhoaTinhLai > 0 ? ` - tính lại kết quả ${kq.soKhoaTinhLai} khóa chưa phê duyệt` : ""}`,
    };
  } catch (error) {
    if (error instanceof DieuKienDatError) return { loi: error.message };
    throw error;
  }
}

// (bổ sung 13/10/2026) cấu trúc điểm thi + điều kiện đạt của chương trình chỉ thi; null = bỏ cấu hình (1 điểm thi)
export async function luuCauTrucDiemChuongTrinhAction(chuongTrinhId: string, json: string | null): Promise<KetQuaDieuKienDat> {
  const phien = await requirePermission("CT-01");
  try {
    const kq = await luuCauHinhChuongTrinh(chuongTrinhId, json === null ? null : JSON.parse(json), nguoiTuPhien(phien));
    revalidatePath(`/chuong-trinh/${chuongTrinhId}`);
    return { ok: `Đã lưu${kq.soKhoaTinhLai > 0 ? ` - tính lại kết quả ${kq.soKhoaTinhLai} khóa chưa phê duyệt` : ""}` };
  } catch (error) {
    if (error instanceof LoiKetQua) return { loi: error.message };
    if (error instanceof SyntaxError) return { loi: "Dữ liệu cấu hình không hợp lệ" };
    throw error;
  }
}
