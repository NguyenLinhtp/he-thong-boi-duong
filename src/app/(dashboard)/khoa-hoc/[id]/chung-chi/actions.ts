"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import { lapDanhSachDeNghi } from "@/server/services/cc/cc-01-de-nghi";
import { sinhSoHieu, huyChungChi } from "@/server/services/cc/cc-02-so-hieu";
import { kyDuyetChungChi } from "@/server/services/cc/cc-03-ky-duyet";
import { traTrucTiep, banGiaoTheoLo } from "@/server/services/cc/cc-04-so-cap";
import { LoiChungChi } from "@/server/services/cc/loi-chung-chi";

export type KetQuaThaoTacCC = { loi?: string; thongBao?: string } | undefined;

/** Chạy 1 thao tác CC: lỗi nghiệp vụ trả về làm thông báo, lỗi khác ném tiếp. */
async function thucHien(khoaId: string, thaoTac: () => Promise<string>): Promise<KetQuaThaoTacCC> {
  let thongBao: string;
  try {
    thongBao = await thaoTac();
  } catch (error) {
    if (error instanceof LoiChungChi) return { loi: error.message };
    throw error;
  }
  revalidatePath(`/khoa-hoc/${khoaId}/chung-chi`);
  return { thongBao };
}

export async function lapDeNghiAction(_prev: KetQuaThaoTacCC, formData: FormData): Promise<KetQuaThaoTacCC> {
  const phien = await requirePermission("CC-01");
  const khoaId = String(formData.get("khoaId"));
  return thucHien(khoaId, async () => {
    const ds = await lapDanhSachDeNghi(khoaId, { nguoiThucHienId: phien.userId, nguoiThucHienTen: phien.hoTen });
    return ds.length > 0
      ? `Đã lập đề nghị cấp chứng chỉ cho ${ds.length} học viên.`
      : "Không có học viên mới đủ điều kiện.";
  });
}

export async function sinhSoHieuAction(_prev: KetQuaThaoTacCC, formData: FormData): Promise<KetQuaThaoTacCC> {
  const phien = await requirePermission("CC-02");
  const khoaId = String(formData.get("khoaId"));
  let boQua: string[] = [];
  const ketQua = await thucHien(khoaId, async () => {
    const kq = await sinhSoHieu(khoaId, { nguoiThucHienId: phien.userId, nguoiThucHienTen: phien.hoTen });
    boQua = kq.boQua.map((b) => `${b.hoTen}: ${b.lyDo}`);
    return `Đã cấp số hiệu cho ${kq.daCapSo.length} chứng chỉ.`;
  });
  return boQua.length > 0 ? { ...ketQua, loi: `Không cấp số (không còn đủ điều kiện) - ${boQua.join("; ")}` } : ketQua;
}

export async function huyChungChiAction(_prev: KetQuaThaoTacCC, formData: FormData): Promise<KetQuaThaoTacCC> {
  const phien = await requirePermission("CC-02");
  const khoaId = String(formData.get("khoaId"));
  return thucHien(khoaId, async () => {
    const cc = await huyChungChi(String(formData.get("chungChiId")), String(formData.get("lyDo") ?? ""), {
      nguoiThucHienId: phien.userId,
      nguoiThucHienTen: phien.hoTen,
    });
    return `Đã hủy chứng chỉ ${cc.soHieu ?? ""} - số hiệu này sẽ không được cấp lại.`;
  });
}

export async function kyDuyetAction(_prev: KetQuaThaoTacCC, formData: FormData): Promise<KetQuaThaoTacCC> {
  const phien = await requirePermission("CC-03");
  const khoaId = String(formData.get("khoaId"));
  return thucHien(khoaId, async () => {
    const ds = await kyDuyetChungChi(khoaId, {
      soQuyetDinh: String(formData.get("soQuyetDinh") ?? ""),
      ngayKy: String(formData.get("ngayKy") ?? ""),
      nguoiKy: String(formData.get("nguoiKy") ?? ""),
      nguoiThucHienId: phien.userId,
      nguoiThucHienTen: phien.hoTen,
    });
    return `Đã ghi nhận ký duyệt ${ds.length} chứng chỉ.`;
  });
}

export async function traTrucTiepAction(_prev: KetQuaThaoTacCC, formData: FormData): Promise<KetQuaThaoTacCC> {
  const phien = await requirePermission("CC-04");
  const khoaId = String(formData.get("khoaId"));
  return thucHien(khoaId, async () => {
    const cc = await traTrucTiep(String(formData.get("chungChiId")), {
      nguoiNhan: String(formData.get("nguoiNhan") ?? ""),
      ngayNhan: String(formData.get("ngayNhan") ?? "") || null,
      nguoiThucHienId: phien.userId,
      nguoiThucHienTen: phien.hoTen,
    });
    return `Đã vào sổ ${cc.soVaoSo} và trao chứng chỉ ${cc.soHieu}.`;
  });
}

export async function banGiaoLoAction(_prev: KetQuaThaoTacCC, formData: FormData): Promise<KetQuaThaoTacCC> {
  const phien = await requirePermission("CC-04");
  const khoaId = String(formData.get("khoaId"));
  let biLoai: string[] = [];
  const ketQua = await thucHien(khoaId, async () => {
    const kq = await banGiaoTheoLo(String(formData.get("hopDongLienKetId")), {
      nguoiDaiDienNhan: String(formData.get("nguoiDaiDienNhan") ?? ""),
      ngayBanGiao: String(formData.get("ngayBanGiao") ?? "") || null,
      ghiChu: String(formData.get("ghiChu") ?? "") || null,
      nguoiThucHienId: phien.userId,
      nguoiThucHienTen: phien.hoTen,
    });
    biLoai = kq.biLoai.map((b) => `${b.hoTen}: ${b.lyDo}`);
    return `Đã bàn giao lô ${kq.lo.maLo} gồm ${kq.soChungChi} chứng chỉ.`;
  });
  return biLoai.length > 0 ? { ...ketQua, loi: `Không đưa vào lô - ${biLoai.join("; ")}` } : ketQua;
}
