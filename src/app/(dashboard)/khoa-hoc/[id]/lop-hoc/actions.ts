"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import { taoLop, capNhatLop, xoaLop, xepLop, chiaLopTuDong } from "@/server/services/kh/kh-07-lop-hoc";
import { LoiLopHoc } from "@/server/services/kh/loi-khoa";

function siSoTuForm(giaTri: FormDataEntryValue | null): number | null {
  const chuoi = String(giaTri ?? "").trim();
  return chuoi === "" ? null : Number(chuoi);
}

/** Chạy 1 thao tác KH-07: lỗi nghiệp vụ trả về làm thông báo, lỗi khác ném tiếp. */
async function thucHien(khoaId: string, thaoTac: () => Promise<unknown>) {
  try {
    await thaoTac();
  } catch (error) {
    if (error instanceof LoiLopHoc) return error.message;
    throw error;
  }
  revalidatePath(`/khoa-hoc/${khoaId}/lop-hoc`);
  revalidatePath(`/khoa-hoc/${khoaId}`);
  return undefined;
}

export async function taoLopAction(_prevState: string | undefined, formData: FormData) {
  await requirePermission("KH-07");
  const khoaId = String(formData.get("khoaId"));
  return thucHien(khoaId, () =>
    taoLop(khoaId, {
      ten: String(formData.get("ten") ?? ""),
      siSoToiDa: siSoTuForm(formData.get("siSoToiDa")),
    }),
  );
}

export async function capNhatLopAction(_prevState: string | undefined, formData: FormData) {
  await requirePermission("KH-07");
  const khoaId = String(formData.get("khoaId"));
  return thucHien(khoaId, () =>
    capNhatLop(String(formData.get("lopId")), {
      ten: String(formData.get("ten") ?? ""),
      siSoToiDa: siSoTuForm(formData.get("siSoToiDa")),
    }),
  );
}

export async function xoaLopAction(_prevState: string | undefined, formData: FormData) {
  await requirePermission("KH-07");
  const khoaId = String(formData.get("khoaId"));
  return thucHien(khoaId, () => xoaLop(String(formData.get("lopId"))));
}

export async function chiaLopTuDongAction(_prevState: string | undefined, formData: FormData) {
  const phien = await requirePermission("KH-07");
  const khoaId = String(formData.get("khoaId"));
  let soChuaXep = 0;
  const loi = await thucHien(khoaId, async () => {
    ({ soChuaXep } = await chiaLopTuDong(khoaId, {
      nguoiThucHienId: phien.userId,
      nguoiThucHienTen: phien.hoTen,
    }));
  });
  if (loi) return loi;
  return soChuaXep > 0
    ? `Còn ${soChuaXep} học viên chưa xếp được do các lớp đã đủ sĩ số - tạo thêm lớp hoặc tăng sĩ số.`
    : undefined;
}

export async function xepLopAction(_prevState: string | undefined, formData: FormData) {
  const phien = await requirePermission("KH-07");
  const khoaId = String(formData.get("khoaId"));
  return thucHien(khoaId, () =>
    xepLop(String(formData.get("dangKyId")), {
      lopId: String(formData.get("lopId")),
      lyDo: String(formData.get("lyDo") ?? "") || null,
      ngayHieuLuc: String(formData.get("ngayHieuLuc") ?? "") || null,
      nguoiThucHienId: phien.userId,
      nguoiThucHienTen: phien.hoTen,
    }),
  );
}
