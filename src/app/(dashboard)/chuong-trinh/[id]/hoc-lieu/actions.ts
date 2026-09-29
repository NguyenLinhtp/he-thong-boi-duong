"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import { nguoiTuPhien } from "@/server/services/qt/qt-03-nhat-ky";
import {
  xoaHocLieu,
  doiThuTuHocLieu,
  taoBaiTracNghiem,
  capNhatBaiTracNghiem,
  xoaBaiTracNghiem,
  themCauHoi,
  xoaCauHoi,
  nhapCauHoiTuExcel,
  taoYeuCauSanPham,
  capNhatYeuCauSanPham,
  xoaYeuCauSanPham,
} from "@/server/services/ct/ct-02-hoc-lieu";
import { LoiHocLieu } from "@/server/services/gd/loi-giang-day";

export type KetQuaThaoTac = { loi?: string; ok?: string } | undefined;

// lỗi nghiệp vụ -> thông báo trên form; lỗi khác ném tiếp
async function thucHien(duongDan: string, fn: () => Promise<string | void>): Promise<KetQuaThaoTac> {
  try {
    const ok = await fn();
    revalidatePath(duongDan);
    return { ok: ok || undefined };
  } catch (error) {
    if (error instanceof LoiHocLieu) return { loi: error.message };
    throw error;
  }
}

const so = (v: FormDataEntryValue | null) => (v == null || String(v).trim() === "" ? null : Number(v));
const cauHinhBai = (f: FormData) => ({
  tieuDe: String(f.get("tieuDe") ?? ""),
  moTa: String(f.get("moTa") ?? ""),
  thoiGianPhut: so(f.get("thoiGianPhut")),
  soLanToiDa: so(f.get("soLanToiDa")),
  tinhDiem: f.get("tinhDiem") === "on",
  heSo: so(f.get("heSo")),
});
const yeuCau = (f: FormData) => ({
  tieuDe: String(f.get("tieuDe") ?? ""),
  moTa: String(f.get("moTa") ?? ""),
  tinhDiem: f.get("tinhDiem") === "on",
  heSo: so(f.get("heSo")),
});

export async function xoaHocLieuAction(chuongTrinhId: string, id: string) {
  const phien = await requirePermission("CT-02");
  return thucHien(`/chuong-trinh/${chuongTrinhId}/hoc-lieu`, () => xoaHocLieu(id, nguoiTuPhien(phien)));
}

export async function doiThuTuHocLieuAction(chuongTrinhId: string, id: string, huong: "len" | "xuong") {
  await requirePermission("CT-02");
  return thucHien(`/chuong-trinh/${chuongTrinhId}/hoc-lieu`, () => doiThuTuHocLieu(id, huong));
}

export async function taoBaiTracNghiemAction(chuongTrinhId: string, hocPhanId: string, _t: KetQuaThaoTac, f: FormData) {
  const phien = await requirePermission("CT-02");
  return thucHien(`/chuong-trinh/${chuongTrinhId}/hoc-lieu`, async () => {
    await taoBaiTracNghiem(hocPhanId, cauHinhBai(f), nguoiTuPhien(phien));
    return "Đã tạo bài trắc nghiệm - bấm “Soạn câu hỏi” để thêm câu hỏi.";
  });
}

export async function capNhatBaiTracNghiemAction(chuongTrinhId: string, baiId: string, _t: KetQuaThaoTac, f: FormData) {
  const phien = await requirePermission("CT-02");
  return thucHien(`/chuong-trinh/${chuongTrinhId}/hoc-lieu/trac-nghiem/${baiId}`, async () => {
    await capNhatBaiTracNghiem(baiId, cauHinhBai(f), nguoiTuPhien(phien));
    return "Đã lưu cấu hình bài.";
  });
}

export async function xoaBaiTracNghiemAction(chuongTrinhId: string, baiId: string) {
  const phien = await requirePermission("CT-02");
  return thucHien(`/chuong-trinh/${chuongTrinhId}/hoc-lieu`, () => xoaBaiTracNghiem(baiId, nguoiTuPhien(phien)));
}

export async function themCauHoiAction(chuongTrinhId: string, baiId: string, _t: KetQuaThaoTac, f: FormData) {
  await requirePermission("CT-02");
  return thucHien(`/chuong-trinh/${chuongTrinhId}/hoc-lieu/trac-nghiem/${baiId}`, async () => {
    await themCauHoi(baiId, {
      noiDung: String(f.get("noiDung") ?? ""),
      phuongAn: [0, 1, 2, 3, 4, 5].map((i) => String(f.get(`phuongAn${i}`) ?? "")),
      dapAnDung: f.getAll("dapAnDung").map(Number),
    });
    return "Đã thêm câu hỏi.";
  });
}

export async function xoaCauHoiAction(chuongTrinhId: string, baiId: string, cauHoiId: string) {
  await requirePermission("CT-02");
  return thucHien(`/chuong-trinh/${chuongTrinhId}/hoc-lieu/trac-nghiem/${baiId}`, () => xoaCauHoi(cauHoiId));
}

export async function nhapExcelAction(chuongTrinhId: string, baiId: string, _t: KetQuaThaoTac, f: FormData) {
  const phien = await requirePermission("CT-02");
  const tep = f.get("tep");
  return thucHien(`/chuong-trinh/${chuongTrinhId}/hoc-lieu/trac-nghiem/${baiId}`, async () => {
    if (!(tep instanceof File) || tep.size === 0) return "Chưa chọn tệp Excel.";
    const so = await nhapCauHoiTuExcel(baiId, Buffer.from(await tep.arrayBuffer()), nguoiTuPhien(phien));
    return `Đã nhập ${so} câu hỏi.`;
  });
}

export async function taoYeuCauSanPhamAction(chuongTrinhId: string, hocPhanId: string, _t: KetQuaThaoTac, f: FormData) {
  const phien = await requirePermission("CT-02");
  return thucHien(`/chuong-trinh/${chuongTrinhId}/hoc-lieu`, async () => {
    await taoYeuCauSanPham(hocPhanId, yeuCau(f), nguoiTuPhien(phien));
    return "Đã thêm yêu cầu sản phẩm.";
  });
}

export async function capNhatYeuCauSanPhamAction(chuongTrinhId: string, id: string, _t: KetQuaThaoTac, f: FormData) {
  const phien = await requirePermission("CT-02");
  return thucHien(`/chuong-trinh/${chuongTrinhId}/hoc-lieu`, async () => {
    await capNhatYeuCauSanPham(id, yeuCau(f), nguoiTuPhien(phien));
    return "Đã lưu.";
  });
}

export async function xoaYeuCauSanPhamAction(chuongTrinhId: string, id: string) {
  const phien = await requirePermission("CT-02");
  return thucHien(`/chuong-trinh/${chuongTrinhId}/hoc-lieu`, () => xoaYeuCauSanPham(id, nguoiTuPhien(phien)));
}
