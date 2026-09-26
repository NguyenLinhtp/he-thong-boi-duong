"use server";

import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { taoHopDong, capNhatHopDong, type HopDongInput } from "@/server/services/dvlk/dvlk-03-hop-dong";
import { xacNhanThuHoSo } from "@/server/services/dvlk/dvlk-05-xac-nhan-thu-ho-so";
import { thanhLyHopDong } from "@/server/services/dvlk/dvlk-06-thanh-ly";
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

// DVLK-05 phía trường (cán bộ quản lý đào tạo xác nhận thay khi đơn vị mang hồ
// sơ giấy về trường). Yêu cầu thêm DVLK-03 để tài khoản đơn vị liên kết (chỉ
// có DVLK-05) không gọi được action này vượt phạm vi đơn vị mình.
export async function xacNhanThuHoSoTruongAction(_prev: KetQuaThaoTacDvlk, formData: FormData): Promise<KetQuaThaoTacDvlk> {
  await requirePermission("DVLK-03");
  const phien = await requirePermission("DVLK-05");
  const hopDongId = String(formData.get("hopDongId") ?? "");
  return thucHienDvlk([`${DUONG_DAN}/${hopDongId}`], async () => {
    const dsLo = await xacNhanThuHoSo(
      { loai: "TRUONG" },
      {
        dangKyIds: formData.getAll("dangKyIds").map(String),
        ngayGui: String(formData.get("ngayGui") ?? "") || null,
        hinhThuc: String(formData.get("hinhThuc") ?? ""),
        ghiChu: String(formData.get("ghiChu") ?? ""),
        nguoiThucHienId: phien.userId,
        nguoiThucHienTen: phien.hoTen,
      },
    );
    return `Đã xác nhận ${dsLo.reduce((t, lo) => t + lo.dangKys.length, 0)} hồ sơ, lô ${dsLo.map((lo) => lo.maLo).join(", ")}.`;
  });
}

// DVLK-06 (Cán bộ tài chính): thanh lý hợp đồng - bước 2 sau khi xem đối chiếu
export async function thanhLyHopDongAction(_prev: KetQuaThaoTacDvlk, formData: FormData): Promise<KetQuaThaoTacDvlk> {
  const phien = await requirePermission("DVLK-06");
  const id = String(formData.get("id"));
  if (formData.get("daDoiChieu") !== "on") return { loi: "Hãy xác nhận đã đối chiếu số liệu trước khi thanh lý." };
  return thucHienDvlk([DUONG_DAN, `${DUONG_DAN}/${id}`], async () => {
    const { hopDong, soHocVienCapNhat } = await thanhLyHopDong(id, {
      soTienQuyetToan: soHoacNull(formData.get("soTienQuyetToan")),
      ngayThanhLy: String(formData.get("ngayThanhLy") ?? "") || null,
      ghiChu: String(formData.get("ghiChu") ?? ""),
      nguoiThucHienId: phien.userId,
      nguoiThucHienTen: phien.hoTen,
    });
    return `Đã thanh lý, biên bản ${hopDong.soBienBanThanhLy}; cập nhật Đã hoàn tất cho ${soHocVienCapNhat} học viên.`;
  });
}
