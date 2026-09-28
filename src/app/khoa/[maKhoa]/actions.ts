"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { dangKyTrucTuyen } from "@/server/services/hv/hv-01-dang-ky-truc-tuyen";
import { xacNhanThamGia } from "@/server/services/hv/hv-04-tu-xac-nhan";
import { dangKyDuThi } from "@/server/services/hv/hv-05-dang-ky-du-thi";
import { dangKyQuaDonViLienKet } from "@/server/services/hv/hv-12-dang-ky-qua-dvlk";

export async function dangKyTrucTuyenAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const khoaId = String(formData.get("khoaId"));
  const soDienThoai = String(formData.get("soDienThoai") || "");
  const email = String(formData.get("email") || "");
  const ngaySinh = String(formData.get("ngaySinh") || "");
  const donViCongTac = String(formData.get("donViCongTac") || "");

  let dangKy;
  try {
    dangKy = await dangKyTrucTuyen({
      khoaId,
      hoTen: String(formData.get("hoTen")),
      soCCCD: String(formData.get("soCCCD")),
      soDienThoai: soDienThoai || null,
      email: email || null,
      ngaySinh: ngaySinh || null,
      donViCongTac: donViCongTac || null,
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
        soDienThoai: String(formData.get("soDienThoai") || "") || null,
        email: String(formData.get("email") || "") || null,
        ngaySinh: String(formData.get("ngaySinh") || "") || null,
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
  const khoaId = String(formData.get("khoaId"));
  const soDienThoai = String(formData.get("soDienThoai") || "");
  const email = String(formData.get("email") || "");
  const ngaySinh = String(formData.get("ngaySinh") || "");
  const donViCongTac = String(formData.get("donViCongTac") || "");

  let dangKy;
  try {
    dangKy = await dangKyQuaDonViLienKet({
      khoaId,
      donViLienKetId: String(formData.get("donViLienKetId")),
      hoTen: String(formData.get("hoTen")),
      soCCCD: String(formData.get("soCCCD")),
      soDienThoai: soDienThoai || null,
      email: email || null,
      ngaySinh: ngaySinh || null,
      donViCongTac: donViCongTac || null,
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
  const soDienThoai = String(formData.get("soDienThoai") || "");
  const email = String(formData.get("email") || "");
  const ngaySinh = String(formData.get("ngaySinh") || "");

  try {
    await dangKyDuThi({
      khoaId: String(formData.get("khoaId")),
      hoTen: String(formData.get("hoTen")),
      soCCCD: String(formData.get("soCCCD")),
      soDienThoai: soDienThoai || null,
      email: email || null,
      ngaySinh: ngaySinh || null,
    });
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }

  return "THANH_CONG";
}
