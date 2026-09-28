"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import { thietLapHocPhi } from "@/server/services/hp/hp-01-thiet-lap";
import { xacNhanThanhToan, xacNhanMienGiam } from "@/server/services/hp/hp-02-thanh-toan";
import { datHanNop, guiNhacNoHocPhi } from "@/server/services/hp/hp-03-cong-no";
import { boQuaDieuKienHocPhi } from "@/server/services/hp/hp-06-dieu-kien";
import {
  KhongTimThayKhoaError,
  KhongTimThayHocPhiError,
  ThieuLyDoDieuChinhHocPhiError,
  SoTienKhongHopLeError,
  HocPhiQuaDonViLienKetError,
  ThieuLyDoBoQuaError,
} from "@/server/services/hp/loi-hoc-phi";
import { nguoiTuPhien } from "@/server/services/qt/qt-03-nhat-ky";

function duongDan(khoaId: string) {
  return `/khoa-hoc/${khoaId}/hoc-phi`;
}

export async function thietLapHocPhiAction(_prevState: string | undefined, formData: FormData) {
  const phien = await requirePermission("HP-01");
  const khoaId = String(formData.get("khoaId"));

  try {
    await thietLapHocPhi(khoaId, {
      mucHocPhi: Number(formData.get("mucHocPhi")),
      chinhSachMienGiam: String(formData.get("chinhSachMienGiam") ?? "") || null,
      lyDoDieuChinh: String(formData.get("lyDoDieuChinh") ?? "") || null,
    }, nguoiTuPhien(phien));
  } catch (error) {
    if (error instanceof KhongTimThayKhoaError || error instanceof ThieuLyDoDieuChinhHocPhiError) {
      return error.message;
    }
    throw error;
  }

  revalidatePath(duongDan(khoaId));
  return undefined;
}

export async function xacNhanThanhToanAction(_prevState: string | undefined, formData: FormData) {
  const phien = await requirePermission("HP-02");
  const hocPhiId = String(formData.get("hocPhiId"));
  const khoaId = String(formData.get("khoaId"));

  try {
    await xacNhanThanhToan(hocPhiId, {
      soTien: Number(formData.get("soTien")),
      hinhThucNop: String(formData.get("hinhThucNop") ?? "Tiền mặt"),
      nguoiXacNhanId: phien.userId,
      nguoiXacNhanTen: phien.hoTen,
    });
  } catch (error) {
    if (
      error instanceof KhongTimThayHocPhiError ||
      error instanceof SoTienKhongHopLeError ||
      error instanceof HocPhiQuaDonViLienKetError
    ) {
      return error.message;
    }
    throw error;
  }

  revalidatePath(duongDan(khoaId));
  return undefined;
}

export async function xacNhanMienGiamAction(hocPhiId: string, khoaId: string) {
  const phien = await requirePermission("HP-02");
  await xacNhanMienGiam(hocPhiId, {
    lyDo: "Miễn giảm theo chính sách khóa",
    nguoiXacNhanId: phien.userId,
    nguoiXacNhanTen: phien.hoTen,
  });
  revalidatePath(duongDan(khoaId));
}

export async function datHanNopAction(_prevState: string | undefined, formData: FormData) {
  await requirePermission("HP-03");
  const hocPhiId = String(formData.get("hocPhiId"));
  const khoaId = String(formData.get("khoaId"));

  try {
    await datHanNop(hocPhiId, new Date(String(formData.get("hanNop"))));
  } catch (error) {
    if (error instanceof KhongTimThayHocPhiError) return error.message;
    throw error;
  }

  revalidatePath(duongDan(khoaId));
  return undefined;
}

export async function guiNhacNoAction(hocPhiId: string, khoaId: string) {
  await requirePermission("HP-03");
  await guiNhacNoHocPhi(hocPhiId);
  revalidatePath(duongDan(khoaId));
}

// HP-06 actor là "Hệ thống (tự động kiểm tra)" - không map sang vai trò người
// dùng cụ thể nào; gán quyền bấm nút "bỏ qua điều kiện" theo HP-01 (Cán bộ
// quản lý đào tạo/Cán bộ tài chính, đã gộp cả vai trò lãnh đạo phê duyệt
// trường hợp đặc biệt theo quyết định RBAC 6 vai trò). Đã chốt 28/09/2026 (bổ
// sung quy tắc HP-06 trong functions.json): cả 2 vai trò đều được bỏ chặn.
export async function boQuaDieuKienAction(_prevState: string | undefined, formData: FormData) {
  const phien = await requirePermission("HP-01");
  const hocPhiId = String(formData.get("hocPhiId"));
  const khoaId = String(formData.get("khoaId"));

  try {
    await boQuaDieuKienHocPhi(hocPhiId, {
      lyDo: String(formData.get("lyDo") ?? ""),
      nguoiPheDuyetId: phien.userId,
      nguoiPheDuyetTen: phien.hoTen,
    });
  } catch (error) {
    if (error instanceof KhongTimThayHocPhiError || error instanceof ThieuLyDoBoQuaError) {
      return error.message;
    }
    throw error;
  }

  revalidatePath(duongDan(khoaId));
  return undefined;
}
