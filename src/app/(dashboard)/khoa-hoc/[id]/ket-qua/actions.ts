"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import { tongHopKetQuaKhoa } from "@/server/services/kq/kq-02-tong-hop";
import { xetDieuKienHoanThanh } from "@/server/services/kq/kq-03-xet-hoan-thanh";
import {
  pheDuyetKetQua,
  phucKhaoDiemHocPhan,
  phucKhaoKetQuaThi,
} from "@/server/services/kq/kq-04-phe-duyet";
import { nhapKetQuaThi } from "@/server/services/kq/kq-06-ket-qua-thi";
import { LoiKetQua } from "@/server/services/kq/loi-ket-qua";

function duongDan(khoaId: string) {
  return `/khoa-hoc/${khoaId}/ket-qua`;
}

function diemTuForm(giaTri: FormDataEntryValue | null): number | null {
  const chuoi = String(giaTri ?? "").trim();
  return chuoi === "" ? null : Number(chuoi);
}

/** Chạy 1 thao tác nghiệp vụ KQ: lỗi nghiệp vụ trả về làm thông báo, lỗi khác ném tiếp. */
async function thucHien(khoaId: string, thaoTac: () => Promise<unknown>) {
  try {
    await thaoTac();
  } catch (error) {
    if (error instanceof LoiKetQua) return error.message;
    throw error;
  }
  revalidatePath(duongDan(khoaId));
  return undefined;
}

export async function tongHopAction(_prevState: string | undefined, formData: FormData) {
  await requirePermission("KQ-02");
  const khoaId = String(formData.get("khoaId"));
  return thucHien(khoaId, () => tongHopKetQuaKhoa(khoaId));
}

export async function xetHoanThanhAction(_prevState: string | undefined, formData: FormData) {
  await requirePermission("KQ-03");
  const khoaId = String(formData.get("khoaId"));
  return thucHien(khoaId, () => xetDieuKienHoanThanh(khoaId));
}

export async function pheDuyetAction(_prevState: string | undefined, formData: FormData) {
  const phien = await requirePermission("KQ-04");
  const khoaId = String(formData.get("khoaId"));
  return thucHien(khoaId, () =>
    pheDuyetKetQua(khoaId, {
      soQuyetDinh: String(formData.get("soQuyetDinh") ?? ""),
      nguoiThucHienId: phien.userId,
      nguoiThucHienTen: phien.hoTen,
    }),
  );
}

export async function nhapKetQuaThiAction(_prevState: string | undefined, formData: FormData) {
  await requirePermission("KQ-06");
  const khoaId = String(formData.get("khoaId"));
  const danhSach = (formData.getAll("hocVienId") as string[]).map((hocVienId) => ({
    hocVienId,
    diemThi: diemTuForm(formData.get(`diemThi_${hocVienId}`)),
  }));
  return thucHien(khoaId, () => nhapKetQuaThi(khoaId, danhSach));
}

export async function phucKhaoHocPhanAction(_prevState: string | undefined, formData: FormData) {
  const phien = await requirePermission("KQ-04");
  const khoaId = String(formData.get("khoaId"));
  return thucHien(khoaId, () =>
    phucKhaoDiemHocPhan(String(formData.get("ketQuaId")), {
      diemThanhPhan: diemTuForm(formData.get("diemThanhPhan")),
      diemKetThuc: diemTuForm(formData.get("diemKetThuc")),
      soQuyetDinhPhucKhao: String(formData.get("soQuyetDinhPhucKhao") ?? ""),
      nguoiThucHienId: phien.userId,
      nguoiThucHienTen: phien.hoTen,
    }),
  );
}

export async function phucKhaoThiAction(_prevState: string | undefined, formData: FormData) {
  const phien = await requirePermission("KQ-04");
  const khoaId = String(formData.get("khoaId"));
  return thucHien(khoaId, () =>
    phucKhaoKetQuaThi(String(formData.get("ketQuaId")), {
      diemThi: Number(formData.get("diemThi")),
      soQuyetDinhPhucKhao: String(formData.get("soQuyetDinhPhucKhao") ?? ""),
      nguoiThucHienId: phien.userId,
      nguoiThucHienTen: phien.hoTen,
    }),
  );
}
