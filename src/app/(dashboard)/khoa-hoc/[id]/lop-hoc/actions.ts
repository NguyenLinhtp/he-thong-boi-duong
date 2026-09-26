"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import { taoLop, capNhatLop, xoaLop, xepLopNhieu, chiaLopTuDong } from "@/server/services/kh/kh-07-lop-hoc";
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

export async function chiaLopTuDongAction(
  _prevState: KetQuaThaoTacLop,
  formData: FormData,
): Promise<KetQuaThaoTacLop> {
  const phien = await requirePermission("KH-07");
  const khoaId = String(formData.get("khoaId"));
  let ketQua: Awaited<ReturnType<typeof chiaLopTuDong>> | undefined;
  const loi = await thucHien(khoaId, async () => {
    ketQua = await chiaLopTuDong(khoaId, { nguoiThucHienId: phien.userId, nguoiThucHienTen: phien.hoTen });
  });
  if (loi || !ketQua) return { loi };

  const { soDaXep, soChuaXep, soNhomDonVi, soNhomBiTach } = ketQua;
  return {
    thongBao:
      `Đã xếp ${soDaXep} học viên (${soNhomDonVi} nhóm đơn vị công tác` +
      (soNhomBiTach > 0 ? `, ${soNhomBiTach} nhóm quá đông phải tách sang nhiều lớp` : ", không nhóm nào bị tách") +
      ").",
    loi:
      soChuaXep > 0
        ? `Còn ${soChuaXep} học viên chưa xếp được do các lớp đã đủ sĩ số - tạo thêm lớp hoặc tăng sĩ số.`
        : undefined,
  };
}

export type KetQuaThaoTacLop = { loi?: string; thongBao?: string } | undefined;

/** Chia/chuyển thủ công: các học viên được tick (sau khi lọc) vào cùng 1 lớp. */
export async function xepLopNhieuAction(_prevState: KetQuaThaoTacLop, formData: FormData) {
  const phien = await requirePermission("KH-07");
  const khoaId = String(formData.get("khoaId"));
  const dangKyIds = formData.getAll("dangKyId").map(String);
  if (dangKyIds.length === 0) return { loi: "Chưa chọn học viên nào" };

  let ketQua: Awaited<ReturnType<typeof xepLopNhieu>> = [];
  const loi = await thucHien(khoaId, async () => {
    ketQua = await xepLopNhieu(khoaId, dangKyIds, {
      lopId: String(formData.get("lopId")),
      lyDo: String(formData.get("lyDo") ?? "") || null,
      ngayHieuLuc: String(formData.get("ngayHieuLuc") ?? "") || null,
      nguoiThucHienId: phien.userId,
      nguoiThucHienTen: phien.hoTen,
    });
  });
  if (loi) return { loi };

  const thatBai = ketQua.filter((kq) => kq.loi);
  return {
    thongBao: `Đã xếp/chuyển ${ketQua.length - thatBai.length} học viên.`,
    loi: thatBai.length > 0 ? thatBai.map((kq) => `${kq.hoTen}: ${kq.loi}`).join("; ") : undefined,
  };
}
