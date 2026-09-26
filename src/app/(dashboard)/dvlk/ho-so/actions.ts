"use server";

import { requirePermission } from "@/lib/auth/guard";
import { xacNhanThuHoSo } from "@/server/services/dvlk/dvlk-05-xac-nhan-thu-ho-so";
import { thucHienDvlk, type KetQuaThaoTacDvlk } from "../../don-vi-lien-ket/thuc-hien";

// DVLK-05 phía đơn vị liên kết: chỉ hồ sơ thuộc hợp đồng của đơn vị của tài khoản
export async function xacNhanThuHoSoDvlkAction(_prev: KetQuaThaoTacDvlk, formData: FormData): Promise<KetQuaThaoTacDvlk> {
  const phien = await requirePermission("DVLK-05");
  return thucHienDvlk(["/dvlk/ho-so"], async () => {
    const dsLo = await xacNhanThuHoSo(
      { loai: "DVLK", nguoiDungId: phien.userId },
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
