"use server";

import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { taoHopDong, capNhatHopDong, type HopDongInput } from "@/server/services/dvlk/dvlk-03-hop-dong";
import { thucHienDvlk, type KetQuaThaoTacDvlk } from "../thuc-hien";

const DUONG_DAN = "/don-vi-lien-ket/hop-dong";

function soHoacNull(giaTri: FormDataEntryValue | null) {
  const chuoi = String(giaTri ?? "").trim();
  return chuoi === "" ? null : Number(chuoi);
}

function docSoLieu(formData: FormData): HopDongInput {
  return {
    soLuongDuKien: soHoacNull(formData.get("soLuongDuKien")),
    donGiaThoaThuan: soHoacNull(formData.get("donGiaThoaThuan")),
    ghiChu: String(formData.get("ghiChu") ?? ""),
  };
}

export async function taoHopDongAction(_prev: KetQuaThaoTacDvlk, formData: FormData): Promise<KetQuaThaoTacDvlk> {
  const phien = await requirePermission("DVLK-03");
  let hopDongId = "";
  const ketQua = await thucHienDvlk([DUONG_DAN, "/don-vi-lien-ket"], async () => {
    const hd = await taoHopDong(
      {
        ...docSoLieu(formData),
        donViLienKetId: String(formData.get("donViLienKetId") ?? ""),
        khoaId: String(formData.get("khoaId") ?? ""),
      },
      { nguoiThucHienId: phien.userId, nguoiThucHienTen: phien.hoTen },
    );
    hopDongId = hd.id;
    return `Đã lập hợp đồng ${hd.maHopDong}.`;
  });
  if (ketQua?.loi) return ketQua;
  redirect(`${DUONG_DAN}/${hopDongId}`);
}

export async function capNhatHopDongAction(_prev: KetQuaThaoTacDvlk, formData: FormData): Promise<KetQuaThaoTacDvlk> {
  const phien = await requirePermission("DVLK-03");
  const id = String(formData.get("id"));
  return thucHienDvlk([DUONG_DAN, `${DUONG_DAN}/${id}`], async () => {
    await capNhatHopDong(id, docSoLieu(formData), { nguoiThucHienId: phien.userId, nguoiThucHienTen: phien.hoTen });
    return "Đã lưu hợp đồng.";
  });
}
