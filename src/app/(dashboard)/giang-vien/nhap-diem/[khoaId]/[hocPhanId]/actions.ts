"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import { giangVienCuaTaiKhoan } from "@/server/services/gd/dung-chung";
import { nhapDiemHocPhan } from "@/server/services/kq/kq-01-nhap-diem";
import { LoiKetQua } from "@/server/services/kq/loi-ket-qua";
import { nguoiTuPhien } from "@/server/services/qt/qt-03-nhat-ky";

function diemTuForm(giaTri: FormDataEntryValue | null): number | null {
  const chuoi = String(giaTri ?? "").trim();
  return chuoi === "" ? null : Number(chuoi);
}

export async function nhapDiemAction(_prevState: string | undefined, formData: FormData) {
  const phien = await requirePermission("KQ-01");
  const khoaId = String(formData.get("khoaId"));
  const hocPhanId = String(formData.get("hocPhanId"));

  const giangVien = await giangVienCuaTaiKhoan(phien.userId);
  if (!giangVien) return "Tài khoản đăng nhập chưa gắn với hồ sơ giảng viên nào";

  try {
    const danhSach = (formData.getAll("hocVienId") as string[]).map((hocVienId) => ({
      hocVienId,
      diemThanhPhan: diemTuForm(formData.get(`diemThanhPhan_${hocVienId}`)),
      diemKetThuc: diemTuForm(formData.get(`diemKetThuc_${hocVienId}`)),
    }));
    await nhapDiemHocPhan(giangVien.id, khoaId, hocPhanId, danhSach, nguoiTuPhien(phien));
  } catch (error) {
    if (error instanceof LoiKetQua) return error.message;
    throw error;
  }

  revalidatePath(`/giang-vien/nhap-diem/${khoaId}/${hocPhanId}`);
  return undefined;
}
