"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { dangKyTrucTuyen } from "@/server/services/hv/hv-01-dang-ky-truc-tuyen";
import { xacNhanThamGia } from "@/server/services/hv/hv-04-tu-xac-nhan";
import { dangKyDuThi, nopMinhChungLePhi, timLaiDonDuThi, traCuuSinhVienDuThi } from "@/server/services/hv/hv-05-dang-ky-du-thi";
import { DaDangKyKhoaNayError } from "@/server/services/hv/loi-hoc-vien";
import type { KetQuaTraCuuSinhVien } from "@/components/dang-ky/truong-ma-sinh-vien";
import { dangKyQuaDonViLienKet } from "@/server/services/hv/hv-12-dang-ky-qua-dvlk";
import { cauHinhHieuLuc, docDuLieuForm } from "@/server/services/hv/form-dang-ky";
import { hocVienCuaTaiKhoan } from "@/server/services/kq/kq-05-tra-cuu";

/**
 * (bổ sung 01/10/2026) Khóa bồi dưỡng (PT1, PT2, PT4b) chỉ đăng ký bằng tài khoản
 * học viên đang đăng nhập: danh tính (họ tên, CCCD) lấy từ hồ sơ của tài khoản,
 * không theo dữ liệu gửi lên - không đăng ký hộ người khác được.
 */
async function hocVienDangNhapBatBuoc() {
  const userId = (await auth())?.phienDangNhap?.userId;
  if (!userId) return { loi: "Khóa học cần tài khoản học viên - vui lòng đăng nhập hoặc đăng ký tài khoản" } as const;
  const hocVien = await hocVienCuaTaiKhoan(userId);
  if (!hocVien) return { loi: "Tài khoản đang đăng nhập không phải tài khoản học viên" } as const;
  if (!hocVien.soCCCD) return { loi: "Hồ sơ học viên chưa có số CCCD - vui lòng cập nhật hồ sơ cá nhân" } as const;
  return { userId, hocVien } as const;
}

// (bổ sung 30/09/2026) đọc dữ liệu form theo cấu hình hiệu lực của khóa (gồm trường tùy chỉnh, tệp minh chứng)
async function duLieuForm(formData: FormData) {
  const { cauHinh } = await cauHinhHieuLuc(String(formData.get("khoaId")));
  return docDuLieuForm(cauHinh, formData);
}

export async function dangKyTrucTuyenAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const tk = await hocVienDangNhapBatBuoc();
  if ("loi" in tk) return tk.loi;
  let dangKy;
  try {
    dangKy = await dangKyTrucTuyen({
      khoaId: String(formData.get("khoaId")),
      hoTen: tk.hocVien.hoTen,
      soCCCD: tk.hocVien.soCCCD,
      duLieuForm: await duLieuForm(formData),
    });
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }

  redirect(`/khoa/${formData.get("maKhoa")}/don-dang-ky/${dangKy.id}`);
}

export async function xacNhanThamGiaAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  // HV-04 "xác nhận bằng tài khoản": danh tính lấy từ phiên đăng nhập phía server
  // (bổ sung 01/10/2026) khóa bồi dưỡng chỉ xác nhận bằng tài khoản học viên
  const tk = await hocVienDangNhapBatBuoc();
  if ("loi" in tk) return tk.loi;
  const nguoiDungId = tk.userId;

  try {
    await xacNhanThamGia(
      {
        khoaId: String(formData.get("khoaId")),
        soCCCD: null,
        duLieuForm: await duLieuForm(formData),
      },
      nguoiDungId,
    );
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }

  return "THANH_CONG";
}

export async function dangKyQuaDonViLienKetAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const tk = await hocVienDangNhapBatBuoc();
  if ("loi" in tk) return tk.loi;
  let dangKy;
  try {
    dangKy = await dangKyQuaDonViLienKet({
      khoaId: String(formData.get("khoaId")),
      donViLienKetId: String(formData.get("donViLienKetId")),
      hoTen: tk.hocVien.hoTen,
      soCCCD: tk.hocVien.soCCCD,
      duLieuForm: await duLieuForm(formData),
    });
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }

  redirect(`/khoa/${formData.get("maKhoa")}/don-dang-ky/${dangKy.id}`);
}

export async function dangKyDuThiAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  let dangKyId: string;
  let daDangKy = false;
  try {
    const dangKy = await dangKyDuThi({
      khoaId: String(formData.get("khoaId")),
      hoTen: String(formData.get("hoTen") ?? ""),
      soCCCD: String(formData.get("soCCCD") ?? ""),
      maSinhVien: String(formData.get("maSinhVien") ?? ""),
      cuoiCCCD: String(formData.get("cuoiCCCD") ?? ""),
      laThiSinhTuDo: formData.get("doiTuong") === "TU_DO",
      duLieuForm: await duLieuForm(formData),
    });
    dangKyId = dangKy.id;
  } catch (error) {
    // (bổ sung 01/10/2026) đã xác minh mã SV + 4 số cuối CCCD -> mở lại đơn đã đăng ký
    if (error instanceof DaDangKyKhoaNayError && error.dangKyId) {
      dangKyId = error.dangKyId;
      daDangKy = true;
    } else if (error instanceof Error) return error.message;
    else throw error;
  }

  // (bổ sung 01/10/2026) sang đơn đăng ký dự thi: in đơn, chuyển khoản lệ phí, nộp minh chứng
  redirect(`/khoa/${formData.get("maKhoa")}/don-dang-ky/${dangKyId}${daDangKy ? "?daDangKy=1" : ""}`);
}

export async function timLaiDonDuThiAction(_prev: string | undefined, formData: FormData): Promise<string | undefined> {
  let dangKyId: string;
  try {
    dangKyId = await timLaiDonDuThi(String(formData.get("khoaId")), {
      maSinhVien: String(formData.get("maSinhVien") ?? ""),
      cuoiCCCD: String(formData.get("cuoiCCCD") ?? ""),
      soCCCD: String(formData.get("soCCCD") ?? ""),
      hoTen: String(formData.get("hoTen") ?? ""),
    });
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }
  redirect(`/khoa/${formData.get("maKhoa")}/don-dang-ky/${dangKyId}`);
}

export async function traCuuSinhVienAction(khoaId: string, maSinhVien: string): Promise<KetQuaTraCuuSinhVien> {
  try {
    return await traCuuSinhVienDuThi(khoaId, maSinhVien);
  } catch (error) {
    if (error instanceof Error) return { loi: error.message };
    throw error;
  }
}

// (bổ sung 01/10/2026) thí sinh nộp minh chứng chuyển khoản lệ phí - quyền theo đường link đơn đăng ký (mã hồ sơ ngẫu nhiên)
export async function nopMinhChungLePhiAction(
  dangKyId: string,
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const tep = formData.get("minhChung");
  if (!(tep instanceof File) || tep.size === 0) return "Vui lòng chọn tệp minh chứng";
  try {
    await nopMinhChungLePhi(dangKyId, { ten: tep.name, loai: tep.type || "application/octet-stream", noiDung: Buffer.from(await tep.arrayBuffer()) });
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }
  revalidatePath(`/khoa/${formData.get("maKhoa")}/don-dang-ky/${dangKyId}`);
  return "OK";
}
