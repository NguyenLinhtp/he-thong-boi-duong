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
import { huyBuoiHoc, doiLichBuoiHoc } from "@/server/services/gd/gd-03-doi-lich";
import { thuHoiLinkTrucTuyen } from "@/server/services/gd/gd-05-link-truc-tuyen";
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
import { nguoiTuPhien } from "@/server/services/qt/qt-03-nhat-ky";

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
      lopId: String(formData.get("lopId") || "") || null,
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
      lopId: String(formData.get("lopId") || "") || null,
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

export async function huyBuoiHocAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  await requirePermission("GD-03");
  const khoaId = String(formData.get("khoaId"));
  const buoiHocId = String(formData.get("buoiHocId"));

  try {
    await huyBuoiHoc(buoiHocId, String(formData.get("lyDo") || ""));
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }

  revalidatePath(`/khoa-hoc/${khoaId}`);
  return undefined;
}

export async function doiLichBuoiHocAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  await requirePermission("GD-03");
  const khoaId = String(formData.get("khoaId"));
  const buoiHocId = String(formData.get("buoiHocId"));
  const hocPhanId = String(formData.get("hocPhanId") || "");
  const gioBatDau = String(formData.get("gioBatDau") || "");
  const gioKetThuc = String(formData.get("gioKetThuc") || "");
  const phongHocId = String(formData.get("phongHocId") || "");

  try {
    await doiLichBuoiHoc(buoiHocId, {
      hocPhanId: hocPhanId || null,
      ngayHoc: String(formData.get("ngayHoc")),
      gioBatDau: gioBatDau || null,
      gioKetThuc: gioKetThuc || null,
      phongHocId: phongHocId || null,
      lyDo: String(formData.get("lyDo") || ""),
    });
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }

  revalidatePath(`/khoa-hoc/${khoaId}`);
  return undefined;
}

export async function thuHoiLinkAction(khoaId: string, buoiHocId: string): Promise<void> {
  await requirePermission("GD-05");
  await thuHoiLinkTrucTuyen(buoiHocId);
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
  const phien = await requirePermission("KH-05");
  const khoaId = String(formData.get("khoaId"));

  try {
    await chuyenTrangThaiKhoa(khoaId, formData.get("trangThai") as TrangThaiKhoa, nguoiTuPhien(phien));
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
  const phien = await requirePermission("HV-07");
  const khoaId = String(formData.get("khoaId"));
  const dsDangKyId = formData.getAll("dangKyId") as string[];

  try {
    await xetDuyetDanhSachChinhThuc(khoaId, dsDangKyId, nguoiTuPhien(phien));
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
  const phien = await requirePermission("HV-09");
  const khoaId = String(formData.get("khoaId"));

  try {
    await themHocVienVaoKhoa({
      khoaId,
      hoTen: String(formData.get("hoTen")),
      soCCCD: String(formData.get("soCCCD")),
      lyDo: String(formData.get("lyDo") || "") || null,
    }, { nguoiThucHienId: phien.userId, nguoiThucHienTen: phien.hoTen });
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }

  revalidatePath(`/khoa-hoc/${khoaId}`);
  return undefined;
}

// HV-09: xóa có thể bị chặn (đã có điểm/chứng chỉ, đã nộp học phí, hồ sơ ĐVLK) -> trả thông điệp cho form
export async function xoaHocVienKhoiKhoaAction(khoaId: string, dangKyId: string): Promise<string | undefined> {
  const phien = await requirePermission("HV-09");
  try {
    await xoaHocVienKhoiKhoa(dangKyId, null, { nguoiThucHienId: phien.userId, nguoiThucHienTen: phien.hoTen });
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }
  revalidatePath(`/khoa-hoc/${khoaId}`);
  return undefined;
}

export async function ghiNhanThoiHocAction(khoaId: string, dangKyId: string): Promise<void> {
  const phien = await requirePermission("HV-09");
  await ghiNhanThoiHoc(dangKyId, null, { nguoiThucHienId: phien.userId, nguoiThucHienTen: phien.hoTen });
  revalidatePath(`/khoa-hoc/${khoaId}`);
}

export async function chuyenHocVienSangKhoaAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const phien = await requirePermission("HV-09");
  const khoaId = String(formData.get("khoaId"));
  const dangKyId = String(formData.get("dangKyId"));
  const khoaMoiId = String(formData.get("khoaMoiId"));

  try {
    await chuyenHocVienSangKhoa(dangKyId, khoaMoiId, String(formData.get("lyDo") || "") || null, { nguoiThucHienId: phien.userId, nguoiThucHienTen: phien.hoTen });
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
  const phien = await requirePermission("HV-06");
  const khoaId = String(formData.get("khoaId"));
  const dangKyId = String(formData.get("dangKyId"));
  const ketQua = formData.get("ketQua") as KetQuaThamDinh;
  const ghiChu = String(formData.get("ghiChu") || "");

  try {
    await thamDinhHoSo(dangKyId, ketQua, ghiChu || null, nguoiTuPhien(phien));
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }

  revalidatePath(`/khoa-hoc/${khoaId}`);
  return undefined;
}
