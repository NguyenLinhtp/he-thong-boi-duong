"use server";

import { revalidatePath } from "next/cache";
import { requireMotTrongCacQuyen, requirePermission } from "@/lib/auth/guard";
import { nhapExcelDoiSoat, type KetQuaDoiSoat } from "@/server/services/hp/hp-02-doi-soat-excel";
import { chotDanhSachDuThi } from "@/server/services/hv/hv-07-chot-danh-sach-du-thi";
import { DuLieuImportLoiError, type DongLoiImport } from "@/server/services/hv/loi-hoc-vien";
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
  LePhiTuDoKhongApDungError,
  ChuyenTrangThaiLePhiKhongHopLeError,
  ThanhPhanLePhiKhongHopLeError,
} from "@/server/services/hp/loi-hoc-phi";
import { luuThanhPhanLePhi, type ThanhPhanNhap } from "@/server/services/hp/hp-01-thanh-phan-le-phi";
import { chuyenTrangThaiLePhi, type TrangThaiDongPhi } from "@/server/services/hp/hp-02-chuyen-trang-thai-le-phi";
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
      // (bổ sung 01/10/2026) ô chỉ có ở khóa dự thi; để trống = như sinh viên
      mucHocPhiTuDo: formData.has("mucHocPhiTuDo") ? (String(formData.get("mucHocPhiTuDo")).trim() === "" ? null : Number(formData.get("mucHocPhiTuDo"))) : undefined,
      chinhSachMienGiam: String(formData.get("chinhSachMienGiam") ?? "") || null,
      lyDoDieuChinh: String(formData.get("lyDoDieuChinh") ?? "") || null,
    }, nguoiTuPhien(phien));
  } catch (error) {
    if (error instanceof KhongTimThayKhoaError || error instanceof ThieuLyDoDieuChinhHocPhiError || error instanceof LePhiTuDoKhongApDungError) {
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

// (bổ sung 01/10/2026 - HP-02) tải lên Excel đối soát lệ phí đã đánh dấu "Đã đóng"
export type TrangThaiDoiSoat = { ketQua?: KetQuaDoiSoat; loi?: string; cacDongLoi?: DongLoiImport[] };

export async function nhapDoiSoatAction(
  khoaId: string,
  _prev: TrangThaiDoiSoat | undefined,
  formData: FormData,
): Promise<TrangThaiDoiSoat> {
  const phien = await requirePermission("HP-02");
  const tep = formData.get("file");
  if (!(tep instanceof File) || tep.size === 0) return { loi: "Vui lòng chọn tệp Excel đối soát" };
  try {
    const ketQua = await nhapExcelDoiSoat(khoaId, Buffer.from(await tep.arrayBuffer()), tep.name, nguoiTuPhien(phien));
    revalidatePath(duongDan(khoaId));
    return { ketQua };
  } catch (error) {
    if (error instanceof DuLieuImportLoiError) return { loi: error.message, cacDongLoi: error.cacDongLoi };
    if (error instanceof Error) return { loi: error.message };
    throw error;
  }
}

// (bổ sung 06/10/2026 - HP-02) chuyển Đã đóng / Chưa đóng trên từng dòng bảng đối soát
export async function chuyenTrangThaiLePhiAction(
  khoaId: string,
  hocPhiId: string,
  trangThai: TrangThaiDongPhi,
  lyDo: string,
  // (bổ sung 06/10/2026) xác nhận/hủy riêng 1 thành phần lệ phí
  hocPhiThanhPhanId?: string | null,
): Promise<{ loi?: string; ok?: string }> {
  const phien = await requirePermission("HP-02");
  try {
    const kq = await chuyenTrangThaiLePhi(hocPhiId, trangThai, lyDo, nguoiTuPhien(phien), hocPhiThanhPhanId);
    revalidatePath(duongDan(khoaId));
    revalidatePath(`/khoa-hoc/${khoaId}/tuyen-sinh`);
    return {
      ok:
        "phieuThu" in kq
          ? `Đã ghi nhận đóng phí, phiếu thu ${kq.phieuThu.soPhieu}.`
          : `Đã chuyển về Chưa đóng${kq.phieuDaHuy.length > 0 ? `, hủy phiếu thu ${kq.phieuDaHuy.join(", ")}` : ""}${kq.traVeHopLe ? ", hồ sơ trả về Hợp lệ (rời danh sách chính thức)" : ""}.`,
    };
  } catch (error) {
    if (
      error instanceof KhongTimThayHocPhiError ||
      error instanceof HocPhiQuaDonViLienKetError ||
      error instanceof ChuyenTrangThaiLePhiKhongHopLeError ||
      error instanceof ThanhPhanLePhiKhongHopLeError
    ) {
      return { loi: error.message };
    }
    throw error;
  }
}

// (bổ sung 01/10/2026 - HV-07) chốt danh sách chính thức khóa dự thi theo lệ phí đã xác nhận
export type TrangThaiChot = { ok?: string; loi?: string; nopThieu?: string[] };

export async function chotDanhSachDuThiAction(khoaId: string): Promise<TrangThaiChot> {
  const phien = await requireMotTrongCacQuyen(["HP-02", "HV-07"]);
  try {
    const kq = await chotDanhSachDuThi(khoaId, nguoiTuPhien(phien));
    revalidatePath(duongDan(khoaId));
    revalidatePath(`/khoa-hoc/${khoaId}/tuyen-sinh`);
    return {
      ok: `Đã chốt: thêm ${kq.chinhThuc} thí sinh chính thức, ${kq.khongHopLe} thí sinh không nộp lệ phí chuyển Không hợp lệ.`,
      nopThieu: kq.nopThieu,
    };
  } catch (error) {
    if (error instanceof Error) return { loi: error.message };
    throw error;
  }
}

// (bổ sung 06/10/2026 - HP-01) cấu hình thành phần lệ phí của khóa dự thi
export async function luuThanhPhanLePhiAction(khoaId: string, ds: ThanhPhanNhap[], lyDo: string): Promise<{ ok?: string; loi?: string }> {
  const phien = await requirePermission("HP-01");
  try {
    const kq = await luuThanhPhanLePhi(khoaId, ds, lyDo, nguoiTuPhien(phien));
    revalidatePath(duongDan(khoaId));
    return { ok: kq.length > 0 ? `Đã lưu ${kq.length} thành phần lệ phí.` : "Đã bỏ chia thành phần - khóa thu 1 mức lệ phí chung." };
  } catch (error) {
    if (error instanceof ThanhPhanLePhiKhongHopLeError || error instanceof KhongTimThayKhoaError) return { loi: error.message };
    throw error;
  }
}
