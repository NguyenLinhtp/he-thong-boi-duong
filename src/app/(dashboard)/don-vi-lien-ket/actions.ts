"use server";

import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import {
  taoDonViLienKet,
  capNhatDonViLienKet,
  doiTrangThaiHopTac,
  xoaDonViLienKet,
  type DonViLienKetInput,
} from "@/server/services/dvlk/dvlk-01-danh-muc";
import {
  capTaiKhoanDonViLienKet,
  ganTaiKhoanDonViLienKet,
  thuHoiTaiKhoanDonViLienKet,
} from "@/server/services/dvlk/dvlk-02-tai-khoan";
import { thucHienDvlk, type KetQuaThaoTacDvlk } from "./thuc-hien";

const DUONG_DAN = "/don-vi-lien-ket";

function docThongTin(formData: FormData): DonViLienKetInput {
  const lay = (k: string) => String(formData.get(k) ?? "");
  return {
    ma: lay("ma"),
    ten: lay("ten"),
    diaChi: lay("diaChi"),
    nguoiDaiDien: lay("nguoiDaiDien"),
    soDienThoai: lay("soDienThoai"),
    email: lay("email"),
  };
}

export async function taoDonViLienKetAction(_prev: KetQuaThaoTacDvlk, formData: FormData): Promise<KetQuaThaoTacDvlk> {
  const phien = await requirePermission("DVLK-01");
  return thucHienDvlk([DUONG_DAN], async () => {
    const dv = await taoDonViLienKet(docThongTin(formData), {
      nguoiThucHienId: phien.userId,
      nguoiThucHienTen: phien.hoTen,
    });
    return `Đã thêm đơn vị liên kết ${dv.ma} - ${dv.ten}.`;
  });
}

export async function capNhatDonViLienKetAction(_prev: KetQuaThaoTacDvlk, formData: FormData): Promise<KetQuaThaoTacDvlk> {
  const phien = await requirePermission("DVLK-01");
  const id = String(formData.get("id"));
  return thucHienDvlk([DUONG_DAN, `${DUONG_DAN}/${id}`], async () => {
    await capNhatDonViLienKet(id, docThongTin(formData), {
      nguoiThucHienId: phien.userId,
      nguoiThucHienTen: phien.hoTen,
    });
    return "Đã lưu thông tin đơn vị liên kết.";
  });
}

export async function doiTrangThaiHopTacAction(_prev: KetQuaThaoTacDvlk, formData: FormData): Promise<KetQuaThaoTacDvlk> {
  const phien = await requirePermission("DVLK-01");
  const id = String(formData.get("id"));
  const trangThai = formData.get("trangThai") === "TAM_NGUNG" ? "TAM_NGUNG" : "DANG_HOP_TAC";
  return thucHienDvlk([DUONG_DAN, `${DUONG_DAN}/${id}`], async () => {
    await doiTrangThaiHopTac(id, trangThai, { nguoiThucHienId: phien.userId, nguoiThucHienTen: phien.hoTen });
    return trangThai === "TAM_NGUNG" ? "Đã chuyển Tạm ngừng hợp tác." : "Đã chuyển Đang hợp tác.";
  });
}

export async function xoaDonViLienKetAction(_prev: KetQuaThaoTacDvlk, formData: FormData): Promise<KetQuaThaoTacDvlk> {
  const phien = await requirePermission("DVLK-01");
  const id = String(formData.get("id"));
  const ketQua = await thucHienDvlk([DUONG_DAN], async () => {
    await xoaDonViLienKet(id, { nguoiThucHienId: phien.userId, nguoiThucHienTen: phien.hoTen });
    return "Đã xóa.";
  });
  if (ketQua?.loi) return ketQua;
  redirect(DUONG_DAN);
}

// DVLK-02 (Quản trị hệ thống): cấp / gắn / thu hồi tài khoản đơn vị liên kết
export async function capTaiKhoanAction(_prev: KetQuaThaoTacDvlk, formData: FormData): Promise<KetQuaThaoTacDvlk> {
  const phien = await requirePermission("DVLK-02");
  const id = String(formData.get("id"));
  return thucHienDvlk([DUONG_DAN, `${DUONG_DAN}/${id}`], async () => {
    const tk = await capTaiKhoanDonViLienKet(
      id,
      {
        tenDangNhap: String(formData.get("tenDangNhap") ?? ""),
        matKhau: String(formData.get("matKhau") ?? ""),
        hoTen: String(formData.get("hoTen") ?? ""),
        email: String(formData.get("email") ?? ""),
      },
      { nguoiThucHienId: phien.userId, nguoiThucHienTen: phien.hoTen },
    );
    return `Đã cấp tài khoản ${tk.tenDangNhap} cho đơn vị.`;
  });
}

export async function ganTaiKhoanAction(_prev: KetQuaThaoTacDvlk, formData: FormData): Promise<KetQuaThaoTacDvlk> {
  const phien = await requirePermission("DVLK-02");
  const id = String(formData.get("id"));
  return thucHienDvlk([DUONG_DAN, `${DUONG_DAN}/${id}`], async () => {
    await ganTaiKhoanDonViLienKet(id, String(formData.get("nguoiDungId") ?? ""), {
      nguoiThucHienId: phien.userId,
      nguoiThucHienTen: phien.hoTen,
    });
    return "Đã gắn tài khoản cho đơn vị.";
  });
}

export async function thuHoiTaiKhoanAction(_prev: KetQuaThaoTacDvlk, formData: FormData): Promise<KetQuaThaoTacDvlk> {
  const phien = await requirePermission("DVLK-02");
  const id = String(formData.get("id"));
  return thucHienDvlk([DUONG_DAN, `${DUONG_DAN}/${id}`], async () => {
    await thuHoiTaiKhoanDonViLienKet(id, { nguoiThucHienId: phien.userId, nguoiThucHienTen: phien.hoTen });
    return "Đã thu hồi và tạm khóa tài khoản.";
  });
}
