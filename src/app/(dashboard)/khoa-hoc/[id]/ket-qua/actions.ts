"use server";

import { revalidatePath } from "next/cache";
import { requireMotTrongCacQuyen, requirePermission } from "@/lib/auth/guard";
import { datDiemDatKhoa } from "@/server/services/kq/dieu-kien-dat";
import { luuCauHinhKhoa, nhapDiemThanhPhan } from "@/server/services/kq/cau-truc-diem-thi";
import { phucKhaoDiemThanhPhan } from "@/server/services/kq/kq-04-phe-duyet";
import { tongHopKetQuaKhoa } from "@/server/services/kq/kq-02-tong-hop";
import { xetDieuKienHoanThanh } from "@/server/services/kq/kq-03-xet-hoan-thanh";
import {
  pheDuyetKetQua,
  phucKhaoDiemHocPhan,
  phucKhaoKetQuaThi,
} from "@/server/services/kq/kq-04-phe-duyet";
import { nhapKetQuaThi } from "@/server/services/kq/kq-06-ket-qua-thi";
import { nhapDiemThiTuTep } from "@/server/services/kq/kq-06-nhap-diem-tu-tep";
import { TepDiemThiCoLoiError } from "@/server/services/kq/loi-ket-qua";
import { LoiKetQua } from "@/server/services/kq/loi-ket-qua";
import { nguoiTuPhien } from "@/server/services/qt/qt-03-nhat-ky";

function duongDan(khoaId: string) {
  return `/khoa-hoc/${khoaId}/ket-qua`;
}

function diemTuForm(giaTri: FormDataEntryValue | null): number | null {
  // (sửa 13/10/2026) nhận dấu phẩy thập phân như ô nhập điểm
  const chuoi = String(giaTri ?? "").trim().replace(",", ".");
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
  const phien = await requirePermission("KQ-03");
  const khoaId = String(formData.get("khoaId"));
  return thucHien(khoaId, () => xetDieuKienHoanThanh(khoaId, nguoiTuPhien(phien)));
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
  const phien = await requirePermission("KQ-06");
  const khoaId = String(formData.get("khoaId"));
  const danhSach = (formData.getAll("hocVienId") as string[]).map((hocVienId) => ({
    hocVienId,
    diemThi: diemTuForm(formData.get(`diemThi_${hocVienId}`)),
  }));
  return thucHien(khoaId, () => nhapKetQuaThi(khoaId, danhSach, nguoiTuPhien(phien)));
}

// (bổ sung 13/10/2026) nhập điểm thi từ tệp danh sách phòng thi đã ghi điểm
export type KetQuaNhapDiemTep = { loi?: string; cacDongLoi?: { dong: string; loi: string }[]; ok?: string } | undefined;

export async function nhapDiemThiTuTepAction(khoaId: string, _prev: KetQuaNhapDiemTep, formData: FormData): Promise<KetQuaNhapDiemTep> {
  const phien = await requirePermission("KQ-06");
  const tep = formData.get("file");
  if (!(tep instanceof File) || tep.size === 0) return { loi: "Chưa chọn tệp" };
  try {
    const kq = await nhapDiemThiTuTep(khoaId, Buffer.from(await tep.arrayBuffer()), tep.name, nguoiTuPhien(phien));
    revalidatePath(duongDan(khoaId));
    return {
      ok: `Đã nhập điểm cho ${kq.soNhap} thí sinh từ ${kq.soSheet} phòng${kq.soDeTrong > 0 ? ` (${kq.soDeTrong} thí sinh để trống điểm - giữ nguyên)` : ""}`,
    };
  } catch (error) {
    if (error instanceof TepDiemThiCoLoiError) return { loi: error.message, cacDongLoi: error.cacDongLoi };
    if (error instanceof LoiKetQua) return { loi: error.message };
    throw error;
  }
}

// (bổ sung 13/10/2026) điều kiện đạt riêng của khóa; để trống = theo chương trình
export async function datDieuKienDatKhoaAction(khoaId: string, _prev: KetQuaNhapDiemTep, formData: FormData): Promise<KetQuaNhapDiemTep> {
  const phien = await requireMotTrongCacQuyen(["KQ-02", "KQ-06"]);
  const chu = String(formData.get("diemDat") ?? "").trim().replace(",", ".");
  // (bổ sung 13/10/2026) khóa có đào tạo: kèm chuyên cần tối thiểu (ô có mặt trong form mới đổi)
  const cc = formData.has("chuyenCan") ? String(formData.get("chuyenCan") ?? "").trim().replace(",", ".") : undefined;
  try {
    const kq = await datDiemDatKhoa(khoaId, chu === "" ? null : Number(chu), nguoiTuPhien(phien), cc === undefined ? undefined : cc === "" ? null : Number(cc));
    revalidatePath(duongDan(khoaId));
    return { ok: `Đã lưu${kq.soTinhLai > 0 ? ` - tính lại Đạt/Không đạt cho ${kq.soTinhLai} kết quả` : ""}` };
  } catch (error) {
    if (error instanceof LoiKetQua) return { loi: error.message };
    throw error;
  }
}

// (bổ sung 13/10/2026) cấu trúc điểm thi riêng của khóa (null = theo chương trình)
export async function luuCauTrucDiemKhoaAction(khoaId: string, json: string | null): Promise<KetQuaNhapDiemTep> {
  const phien = await requirePermission("KQ-06");
  try {
    const kq = await luuCauHinhKhoa(khoaId, json === null ? null : JSON.parse(json), nguoiTuPhien(phien));
    revalidatePath(duongDan(khoaId));
    return { ok: `Đã lưu${kq.soTinhLai > 0 ? ` - tính lại ${kq.soTinhLai} kết quả` : ""}` };
  } catch (error) {
    if (error instanceof LoiKetQua) return { loi: error.message };
    if (error instanceof SyntaxError) return { loi: "Dữ liệu cấu hình không hợp lệ" };
    throw error;
  }
}

/** (bổ sung 13/10/2026) nhập điểm từng thành phần: ô diem_<hocVienId>_<mã thành phần>. */
export async function nhapDiemThanhPhanAction(_prevState: string | undefined, formData: FormData) {
  const phien = await requirePermission("KQ-06");
  const khoaId = String(formData.get("khoaId"));
  const dsMa = formData.getAll("maThanhPhan") as string[];
  const danhSach = (formData.getAll("hocVienId") as string[]).map((hocVienId) => ({
    hocVienId,
    diem: Object.fromEntries(dsMa.map((ma) => [ma, diemTuForm(formData.get(`diem_${hocVienId}_${ma}`))])),
  }));
  return thucHien(khoaId, () => nhapDiemThanhPhan(khoaId, danhSach, nguoiTuPhien(phien)));
}

export async function phucKhaoThanhPhanAction(_prevState: string | undefined, formData: FormData) {
  const phien = await requirePermission("KQ-04");
  const khoaId = String(formData.get("khoaId"));
  const dsMa = formData.getAll("maThanhPhan") as string[];
  return thucHien(khoaId, () =>
    phucKhaoDiemThanhPhan(String(formData.get("ketQuaId")), {
      ...nguoiTuPhien(phien),
      diem: Object.fromEntries(dsMa.map((ma) => [ma, diemTuForm(formData.get(`diem_${ma}`))])),
      soQuyetDinhPhucKhao: String(formData.get("soQuyetDinhPhucKhao") ?? ""),
    }),
  );
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
