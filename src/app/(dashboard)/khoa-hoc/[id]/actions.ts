"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import { phanCongGiangVien } from "@/server/services/kh/kh-02-phan-cong-giang-vien";
import { thietLapBuoiHoc, xoaBuoiHoc } from "@/server/services/kh/kh-03-thoi-khoa-bieu";
import {
  thietLapHinhThucGiangDay,
  tuDongTaoLinkTrucTuyen,
} from "@/server/services/kh/kh-04-hinh-thuc-giang-day";
import { chuyenTrangThaiKhoa } from "@/server/services/kh/kh-05-trang-thai-si-so";
import {
  phatHanhThongBao,
  type KenhGui,
  type ThongBaoDaPhatHanh,
} from "@/server/services/kh/kh-06-thong-bao-tuyen-sinh";
import { xacNhanNopGiay } from "@/server/services/hv/hv-02-xac-nhan-nop-giay";
import { importDanhSachHocVien } from "@/server/services/hv/hv-03-import-danh-sach";
import { thamDinhHoSo, type KetQuaThamDinh } from "@/server/services/hv/hv-06-tham-dinh";
import { xetDuyetDanhSachChinhThuc } from "@/server/services/hv/hv-07-xet-duyet-chinh-thuc";
import {
  themHocVienVaoKhoa,
  xoaHocVienKhoiKhoa,
  chuyenHocVienSangKhoa,
  ghiNhanThoiHoc,
} from "@/server/services/hv/hv-09-quan-ly-danh-sach-khoa";
import { DuLieuImportLoiError } from "@/server/services/hv/loi-hoc-vien";
import type { HinhThucGiangDay, TrangThaiKhoa } from "@/generated/prisma/client";

export async function phanCongGiangVienAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  await requirePermission("KH-02");
  const khoaId = String(formData.get("khoaId"));

  try {
    await phanCongGiangVien({
      khoaId,
      hocPhanId: String(formData.get("hocPhanId")),
      giangVienId: String(formData.get("giangVienId")),
    });
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }

  revalidatePath(`/khoa-hoc/${khoaId}`);
  return undefined;
}

export async function themBuoiHocAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  await requirePermission("KH-03");
  const khoaId = String(formData.get("khoaId"));
  const hocPhanId = String(formData.get("hocPhanId") || "");
  const gioBatDau = String(formData.get("gioBatDau") || "");
  const gioKetThuc = String(formData.get("gioKetThuc") || "");
  const phongHocId = String(formData.get("phongHocId") || "");
  const linkTrucTuyen = String(formData.get("linkTrucTuyen") || "");

  try {
    await thietLapBuoiHoc({
      khoaId,
      hocPhanId: hocPhanId || null,
      ngayHoc: String(formData.get("ngayHoc")),
      gioBatDau: gioBatDau || null,
      gioKetThuc: gioKetThuc || null,
      phongHocId: phongHocId || null,
      linkTrucTuyen: linkTrucTuyen || null,
    });
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }

  revalidatePath(`/khoa-hoc/${khoaId}`);
  return undefined;
}

export async function xoaBuoiHocAction(khoaId: string, buoiHocId: string): Promise<void> {
  await requirePermission("KH-03");
  await xoaBuoiHoc(buoiHocId);
  revalidatePath(`/khoa-hoc/${khoaId}`);
}

export async function thietLapHinhThucAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  await requirePermission("KH-04");
  const khoaId = String(formData.get("khoaId"));

  try {
    await thietLapHinhThucGiangDay(khoaId, formData.get("hinhThucGiangDay") as HinhThucGiangDay);
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }

  revalidatePath(`/khoa-hoc/${khoaId}`);
  return undefined;
}

export async function tuDongTaoLinkAction(khoaId: string): Promise<void> {
  await requirePermission("KH-04");
  await tuDongTaoLinkTrucTuyen(khoaId);
  revalidatePath(`/khoa-hoc/${khoaId}`);
}

export async function chuyenTrangThaiAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  await requirePermission("KH-05");
  const khoaId = String(formData.get("khoaId"));

  try {
    await chuyenTrangThaiKhoa(khoaId, formData.get("trangThai") as TrangThaiKhoa);
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }

  revalidatePath(`/khoa-hoc/${khoaId}`);
  revalidatePath("/khoa-hoc");
  return undefined;
}

export type TrangThaiPhatHanhThongBao = { loi?: string; ketQua?: ThongBaoDaPhatHanh };

export async function phatHanhThongBaoAction(
  _prevState: TrangThaiPhatHanhThongBao | undefined,
  formData: FormData,
): Promise<TrangThaiPhatHanhThongBao> {
  await requirePermission("KH-06");
  const khoaId = String(formData.get("khoaId"));
  const kenhGui = formData.getAll("kenhGui") as KenhGui[];

  try {
    const ketQua = await phatHanhThongBao({
      khoaId,
      noiDung: String(formData.get("noiDung") || ""),
      kenhGui,
    });
    return { ketQua };
  } catch (error) {
    if (error instanceof Error) return { loi: error.message };
    throw error;
  }
}

export async function xacNhanNopGiayAction(khoaId: string, dangKyId: string): Promise<void> {
  await requirePermission("HV-02");
  await xacNhanNopGiay(dangKyId);
  revalidatePath(`/khoa-hoc/${khoaId}`);
}

export type TrangThaiImport = { loi?: string; cacDongLoi?: { dong: number; loi: string }[]; soLuongDaTao?: number };

export async function importDanhSachAction(
  _prevState: TrangThaiImport | undefined,
  formData: FormData,
): Promise<TrangThaiImport> {
  await requirePermission("HV-03");
  const khoaId = String(formData.get("khoaId"));
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { loi: "Vui lòng chọn file CSV để import" };

  try {
    const ketQua = await importDanhSachHocVien(khoaId, await file.text());
    revalidatePath(`/khoa-hoc/${khoaId}`);
    return { soLuongDaTao: ketQua.length };
  } catch (error) {
    if (error instanceof DuLieuImportLoiError) return { loi: error.message, cacDongLoi: error.cacDongLoi };
    if (error instanceof Error) return { loi: error.message };
    throw error;
  }
}

export async function xetDuyetDanhSachChinhThucAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  await requirePermission("HV-07");
  const khoaId = String(formData.get("khoaId"));
  const dsDangKyId = formData.getAll("dangKyId") as string[];

  try {
    await xetDuyetDanhSachChinhThuc(khoaId, dsDangKyId);
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }

  revalidatePath(`/khoa-hoc/${khoaId}`);
  return undefined;
}

export async function themHocVienVaoKhoaAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  await requirePermission("HV-09");
  const khoaId = String(formData.get("khoaId"));

  try {
    await themHocVienVaoKhoa({
      khoaId,
      hoTen: String(formData.get("hoTen")),
      soCCCD: String(formData.get("soCCCD")),
      lyDo: String(formData.get("lyDo") || "") || null,
    });
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }

  revalidatePath(`/khoa-hoc/${khoaId}`);
  return undefined;
}

export async function xoaHocVienKhoiKhoaAction(khoaId: string, dangKyId: string): Promise<void> {
  await requirePermission("HV-09");
  await xoaHocVienKhoiKhoa(dangKyId);
  revalidatePath(`/khoa-hoc/${khoaId}`);
}

export async function ghiNhanThoiHocAction(khoaId: string, dangKyId: string): Promise<void> {
  await requirePermission("HV-09");
  await ghiNhanThoiHoc(dangKyId);
  revalidatePath(`/khoa-hoc/${khoaId}`);
}

export async function chuyenHocVienSangKhoaAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  await requirePermission("HV-09");
  const khoaId = String(formData.get("khoaId"));
  const dangKyId = String(formData.get("dangKyId"));
  const khoaMoiId = String(formData.get("khoaMoiId"));

  try {
    await chuyenHocVienSangKhoa(dangKyId, khoaMoiId);
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }

  revalidatePath(`/khoa-hoc/${khoaId}`);
  return undefined;
}

export async function thamDinhHoSoAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  await requirePermission("HV-06");
  const khoaId = String(formData.get("khoaId"));
  const dangKyId = String(formData.get("dangKyId"));
  const ketQua = formData.get("ketQua") as KetQuaThamDinh;
  const ghiChu = String(formData.get("ghiChu") || "");

  try {
    await thamDinhHoSo(dangKyId, ketQua, ghiChu || null);
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }

  revalidatePath(`/khoa-hoc/${khoaId}`);
  return undefined;
}
