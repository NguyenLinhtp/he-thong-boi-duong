"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { dangKyTrucTuyen } from "@/server/services/hv/hv-01-dang-ky-truc-tuyen";
import { xacNhanThamGia } from "@/server/services/hv/hv-04-tu-xac-nhan";
import { dangKyDuThi } from "@/server/services/hv/hv-05-dang-ky-du-thi";
import { dangKyQuaDonViLienKet } from "@/server/services/hv/hv-12-dang-ky-qua-dvlk";
import { cauHinhHieuLuc, docDuLieuForm } from "@/server/services/hv/form-dang-ky";

// (bổ sung 30/09/2026) đọc dữ liệu form theo cấu hình hiệu lực của khóa (gồm trường tùy chỉnh, tệp minh chứng)
async function duLieuForm(formData: FormData) {
  const { cauHinh } = await cauHinhHieuLuc(String(formData.get("khoaId")));
  return docDuLieuForm(cauHinh, formData);
}

export async function dangKyTrucTuyenAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  let dangKy;
  try {
    dangKy = await dangKyTrucTuyen({
      khoaId: String(formData.get("khoaId")),
      hoTen: String(formData.get("hoTen") ?? ""),
      soCCCD: String(formData.get("soCCCD") ?? ""),
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
  const bangTaiKhoan = formData.get("cachXacNhan") === "TAI_KHOAN";
  const nguoiDungId = bangTaiKhoan ? (await auth())?.phienDangNhap?.userId : null;
  if (bangTaiKhoan && !nguoiDungId) return "Phiên đăng nhập đã hết hạn - hãy đăng nhập lại hoặc xác nhận bằng CCCD/mã số";

  try {
    await xacNhanThamGia(
      {
        khoaId: String(formData.get("khoaId")),
        soCCCD: bangTaiKhoan ? null : String(formData.get("soCCCD") || ""),
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
  let dangKy;
  try {
    dangKy = await dangKyQuaDonViLienKet({
      khoaId: String(formData.get("khoaId")),
      donViLienKetId: String(formData.get("donViLienKetId")),
      hoTen: String(formData.get("hoTen") ?? ""),
      soCCCD: String(formData.get("soCCCD") ?? ""),
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
  try {
    await dangKyDuThi({
      khoaId: String(formData.get("khoaId")),
      hoTen: String(formData.get("hoTen") ?? ""),
      soCCCD: String(formData.get("soCCCD") ?? ""),
      duLieuForm: await duLieuForm(formData),
    });
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }

  return "THANH_CONG";
}
