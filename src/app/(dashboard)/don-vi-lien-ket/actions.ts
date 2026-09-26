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
