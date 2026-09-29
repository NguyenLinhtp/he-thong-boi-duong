import path from "node:path";
import ExcelJS from "exceljs";
import type { LoaiHocLieu } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { HE_THONG, ghiThaoTac, type NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";
import { layThamSoSo } from "@/server/services/qt/qt-05-tham-so";
import { luuTep, xoaTep } from "@/server/services/gd/luu-tru-hoc-lieu";
import { hocVienCuaTaiKhoan } from "@/server/services/kq/kq-05-tra-cuu";
import { giangVienCuaTaiKhoan } from "@/server/services/gd/dung-chung";
import {
  BaiDaCoNguoiLamError,
  KhongDuocXemTaiLieuError,
  ChuongTrinhDaNgungError,
  DanhGiaKhongHopLeError,
  KhongTimThayTaiLieuError,
  TaiLieuKhongHopLeError,
  YeuCauDaCoBaiNopError,
} from "@/server/services/gd/loi-giang-day";

/**
 * CT-02 (bổ sung 28/09/2026): học liệu khung theo học phần/chuyên đề của
 * chương trình - mọi khóa mở từ chương trình dùng chung. Gồm các mục học liệu
 * (tài liệu, slide, thông tin, video) và yêu cầu đánh giá (bài trắc nghiệm,
 * yêu cầu sản phẩm cuối khóa). Mọi mục đều không bắt buộc.
 */

export const NHAN_LOAI_HOC_LIEU: Record<LoaiHocLieu, string> = {
  TAI_LIEU: "Tài liệu",
  SLIDE: "Slide bài giảng",
  THONG_TIN: "Thông tin (info)",
  VIDEO: "Video",
};

/** Định dạng tệp cho phép theo loại học liệu (không nhận tệp thực thi/HTML). */
export const DUOI_THEO_LOAI: Record<LoaiHocLieu, string[]> = {
  TAI_LIEU: [".doc", ".docx", ".pdf", ".xls", ".xlsx", ".txt", ".zip", ".rar", ".7z"],
  SLIDE: [".ppt", ".pptx", ".pdf"],
  THONG_TIN: [".jpg", ".jpeg", ".png", ".pdf", ".doc", ".docx"],
  VIDEO: [".mp4", ".webm"],
};

export type TepTaiLen = { ten: string; loai: string; noiDung: Buffer };

async function hocPhanDeSua(hocPhanId: string) {
  const hocPhan = await prisma.hocPhan.findUnique({ where: { id: hocPhanId }, include: { chuongTrinh: true } });
  if (!hocPhan) throw new DanhGiaKhongHopLeError("không tìm thấy học phần");
  if (hocPhan.chuongTrinh.trangThai === "NGUNG_HIEU_LUC") throw new ChuongTrinhDaNgungError();
  return hocPhan;
}

const lamSach = (s: string | null | undefined) => s?.trim() || null;

function kiemTraHeSo(tinhDiem: boolean, heSo: number | null | undefined) {
  const hs = heSo ?? 1;
  if (tinhDiem && !(Number.isFinite(hs) && hs > 0 && hs <= 99)) throw new DanhGiaKhongHopLeError("hệ số điểm phải trong khoảng (0; 99]");
  return hs;
}

// ---------------- học liệu ----------------

export type ThemHocLieuInput = {
  loai: LoaiHocLieu;
  tieuDe: string;
  moTa?: string | null;
  noiDung?: string | null;
  duongLink?: string | null;
  tep?: TepTaiLen | null;
};

/**
 * Mỗi mục học liệu là 1 tệp HOẶC 1 đường link; riêng "Thông tin" được phép chỉ
 * có nội dung văn bản. Video tải lên giới hạn HL_VIDEO_TOI_DA_MB (mặc định
 * 500MB), loại khác GD_HOC_LIEU_TOI_DA_MB (mặc định 20MB).
 */
export async function themHocLieu(hocPhanId: string, input: ThemHocLieuInput, nguoi: NguoiThucHien = HE_THONG) {
  const hocPhan = await hocPhanDeSua(hocPhanId);
  if (!(input.loai in NHAN_LOAI_HOC_LIEU)) throw new TaiLieuKhongHopLeError("loại học liệu không hợp lệ");
  const tieuDe = input.tieuDe?.trim();
  if (!tieuDe) throw new TaiLieuKhongHopLeError("thiếu tiêu đề");
  const duongLink = lamSach(input.duongLink);
  const noiDung = lamSach(input.noiDung);
  const tep = input.tep && input.tep.noiDung.length > 0 ? input.tep : null;
  if (tep && duongLink) throw new TaiLieuKhongHopLeError("chọn 1 trong 2: tệp tải lên hoặc đường link");
  if (!tep && !duongLink && !(input.loai === "THONG_TIN" && noiDung)) {
    throw new TaiLieuKhongHopLeError(input.loai === "THONG_TIN" ? "cần nội dung, tệp hoặc đường link" : "cần tệp tải lên hoặc đường link");
  }
  if (duongLink && !/^https?:\/\/\S+$/i.test(duongLink)) throw new TaiLieuKhongHopLeError("đường link phải bắt đầu bằng http:// hoặc https://");
  let duoi = "";
  if (tep) {
    duoi = path.extname(tep.ten).toLowerCase();
    if (!DUOI_THEO_LOAI[input.loai].includes(duoi)) {
      throw new TaiLieuKhongHopLeError(`${NHAN_LOAI_HOC_LIEU[input.loai]} chỉ nhận ${DUOI_THEO_LOAI[input.loai].join(", ")}`);
    }
    const toiDaMb =
      input.loai === "VIDEO" ? await layThamSoSo("HL_VIDEO_TOI_DA_MB", 500) : await layThamSoSo("GD_HOC_LIEU_TOI_DA_MB", 20);
    if (tep.noiDung.length > toiDaMb * 1024 * 1024) throw new TaiLieuKhongHopLeError(`tệp vượt ${toiDaMb}MB`);
  }

  const thuTu = ((await prisma.hocLieuHocPhan.aggregate({ where: { hocPhanId }, _max: { thuTu: true } }))._max.thuTu ?? 0) + 1;
  const khoaLuuTru = tep ? await luuTep(tep.noiDung, duoi) : null;
  try {
    return await prisma.$transaction(async (tx) => {
      const hocLieu = await tx.hocLieuHocPhan.create({
        data: {
          hocPhanId,
          loai: input.loai,
          tieuDe,
          moTa: lamSach(input.moTa),
          noiDung,
          tenFile: tep ? path.basename(tep.ten) : null,
          loaiFile: tep ? tep.loai || "application/octet-stream" : null,
          kichThuoc: tep ? tep.noiDung.length : null,
          khoaLuuTru,
          duongLink,
          thuTu,
          nguoiDang: nguoi.nguoiThucHienTen,
        },
      });
      await ghiThaoTac(nguoi, "THEM_HOC_LIEU_CHUONG_TRINH", "HocLieuHocPhan", hocLieu.id, `${hocPhan.ten}: [${NHAN_LOAI_HOC_LIEU[input.loai]}] ${tieuDe}`, tx);
      return hocLieu;
    });
  } catch (error) {
    if (khoaLuuTru) await xoaTep(khoaLuuTru); // không để tệp mồ côi
    throw error;
  }
}

export async function xoaHocLieu(id: string, nguoi: NguoiThucHien = HE_THONG) {
  const hocLieu = await prisma.hocLieuHocPhan.findUnique({ where: { id } });
  if (!hocLieu) throw new KhongTimThayTaiLieuError();
  await hocPhanDeSua(hocLieu.hocPhanId);
  await prisma.$transaction([
    prisma.hocLieuHocPhan.delete({ where: { id } }),
    ghiThaoTac(nguoi, "XOA_HOC_LIEU_CHUONG_TRINH", "HocLieuHocPhan", id, hocLieu.tieuDe),
  ]);
  if (hocLieu.khoaLuuTru) await xoaTep(hocLieu.khoaLuuTru);
}

/** Đổi thứ tự hiển thị: đổi chỗ với mục liền trước/sau trong cùng học phần. */
export async function doiThuTuHocLieu(id: string, huong: "len" | "xuong") {
  const hocLieu = await prisma.hocLieuHocPhan.findUnique({ where: { id } });
  if (!hocLieu) throw new KhongTimThayTaiLieuError();
  await hocPhanDeSua(hocLieu.hocPhanId);
  const ds = await prisma.hocLieuHocPhan.findMany({ where: { hocPhanId: hocLieu.hocPhanId }, orderBy: [{ thuTu: "asc" }, { createdAt: "asc" }] });
  const i = ds.findIndex((h) => h.id === id);
  const j = huong === "len" ? i - 1 : i + 1;
  if (j < 0 || j >= ds.length) return;
  // chuẩn hóa thứ tự 1..n rồi đổi chỗ 2 phần tử
  const moi = ds.map((h) => h.id);
  [moi[i], moi[j]] = [moi[j], moi[i]];
  await prisma.$transaction(moi.map((hid, k) => prisma.hocLieuHocPhan.update({ where: { id: hid }, data: { thuTu: k + 1 } })));
}

// ---------------- bài trắc nghiệm ----------------

export type CauHinhBaiInput = {
  tieuDe: string;
  moTa?: string | null;
  thoiGianPhut?: number | null;
  soLanToiDa?: number | null;
  tinhDiem: boolean;
  heSo?: number | null;
};

function chuanHoaCauHinh(input: CauHinhBaiInput) {
  const tieuDe = input.tieuDe?.trim();
  if (!tieuDe) throw new DanhGiaKhongHopLeError("thiếu tiêu đề bài");
  for (const [ten, gt] of [["thời gian làm bài", input.thoiGianPhut], ["số lần làm tối đa", input.soLanToiDa]] as const) {
    if (gt != null && !(Number.isInteger(gt) && gt > 0)) throw new DanhGiaKhongHopLeError(`${ten} phải là số nguyên dương`);
  }
  return {
    tieuDe,
    moTa: lamSach(input.moTa),
    thoiGianPhut: input.thoiGianPhut ?? null,
    soLanToiDa: input.soLanToiDa ?? null,
    tinhDiem: input.tinhDiem,
    heSo: kiemTraHeSo(input.tinhDiem, input.heSo),
  };
}

export async function taoBaiTracNghiem(hocPhanId: string, input: CauHinhBaiInput, nguoi: NguoiThucHien = HE_THONG) {
  const hocPhan = await hocPhanDeSua(hocPhanId);
  const duLieu = chuanHoaCauHinh(input);
  const thuTu = ((await prisma.baiTracNghiem.aggregate({ where: { hocPhanId }, _max: { thuTu: true } }))._max.thuTu ?? 0) + 1;
  return prisma.$transaction(async (tx) => {
    const bai = await tx.baiTracNghiem.create({ data: { hocPhanId, ...duLieu, thuTu } });
    await ghiThaoTac(nguoi, "TAO_BAI_TRAC_NGHIEM", "BaiTracNghiem", bai.id, `${hocPhan.ten}: ${bai.tieuDe}`, tx);
    return bai;
  });
}

/** Cấu hình (tính điểm, hệ số, thời gian, số lần) đổi được cả khi đã có người làm. */
export async function capNhatBaiTracNghiem(baiId: string, input: CauHinhBaiInput, nguoi: NguoiThucHien = HE_THONG) {
  const bai = await prisma.baiTracNghiem.findUnique({ where: { id: baiId } });
  if (!bai) throw new DanhGiaKhongHopLeError("không tìm thấy bài trắc nghiệm");
  await hocPhanDeSua(bai.hocPhanId);
  const duLieu = chuanHoaCauHinh(input);
  return prisma.$transaction(async (tx) => {
    const moi = await tx.baiTracNghiem.update({ where: { id: baiId }, data: duLieu });
    await ghiThaoTac(nguoi, "CAP_NHAT_BAI_TRAC_NGHIEM", "BaiTracNghiem", baiId, `${moi.tieuDe}: ${moi.tinhDiem ? `tính điểm, hệ số ${moi.heSo}` : "chỉ tự kiểm tra"}`, tx);
    return moi;
  });
}

async function baiChuaCoNguoiLam(baiId: string) {
  const bai = await prisma.baiTracNghiem.findUnique({ where: { id: baiId }, include: { _count: { select: { lanLams: true } } } });
  if (!bai) throw new DanhGiaKhongHopLeError("không tìm thấy bài trắc nghiệm");
  await hocPhanDeSua(bai.hocPhanId);
  if (bai._count.lanLams > 0) throw new BaiDaCoNguoiLamError();
  return bai;
}

export async function xoaBaiTracNghiem(baiId: string, nguoi: NguoiThucHien = HE_THONG) {
  const bai = await baiChuaCoNguoiLam(baiId);
  await prisma.$transaction([
    prisma.baiTracNghiem.delete({ where: { id: baiId } }),
    ghiThaoTac(nguoi, "XOA_BAI_TRAC_NGHIEM", "BaiTracNghiem", baiId, bai.tieuDe),
  ]);
}

export type CauHoiInput = { noiDung: string; phuongAn: string[]; dapAnDung: number[] };

function chuanHoaCauHoi(input: CauHoiInput, viTri = "") {
  const noiDung = input.noiDung?.trim();
  if (!noiDung) throw new DanhGiaKhongHopLeError(`${viTri}thiếu nội dung câu hỏi`);
  // bỏ phương án trống ở cuối, giữ nguyên chỉ số các phương án còn lại
  const phuongAn = input.phuongAn.map((p) => p?.trim() ?? "");
  while (phuongAn.length && !phuongAn.at(-1)) phuongAn.pop();
  if (phuongAn.length < 2 || phuongAn.some((p) => !p)) throw new DanhGiaKhongHopLeError(`${viTri}cần ít nhất 2 phương án, không để trống phương án ở giữa`);
  const dapAnDung = [...new Set(input.dapAnDung)].sort((a, b) => a - b);
  if (dapAnDung.length === 0) throw new DanhGiaKhongHopLeError(`${viTri}chưa chọn đáp án đúng`);
  if (dapAnDung.some((d) => !Number.isInteger(d) || d < 0 || d >= phuongAn.length)) throw new DanhGiaKhongHopLeError(`${viTri}đáp án đúng không nằm trong các phương án`);
  return { noiDung, phuongAn, dapAnDung };
}

export async function themCauHoi(baiId: string, input: CauHoiInput) {
  await baiChuaCoNguoiLam(baiId);
  const duLieu = chuanHoaCauHoi(input);
  const thuTu = ((await prisma.cauHoiTracNghiem.aggregate({ where: { baiId }, _max: { thuTu: true } }))._max.thuTu ?? 0) + 1;
  return prisma.cauHoiTracNghiem.create({ data: { baiId, ...duLieu, thuTu } });
}

export async function xoaCauHoi(cauHoiId: string) {
  const cauHoi = await prisma.cauHoiTracNghiem.findUnique({ where: { id: cauHoiId } });
  if (!cauHoi) throw new DanhGiaKhongHopLeError("không tìm thấy câu hỏi");
  await baiChuaCoNguoiLam(cauHoi.baiId);
  await prisma.cauHoiTracNghiem.delete({ where: { id: cauHoiId } });
}

const CHU_PHUONG_AN = ["A", "B", "C", "D", "E", "F"];

/**
 * Nhập câu hỏi từ Excel (sheet đầu): cột 1 = câu hỏi, cột 2-7 = phương án
 * A-F, cột 8 = đáp án đúng ("A" hoặc "A,C"). Dòng 1 là tiêu đề. Lỗi ở bất kỳ
 * dòng nào thì không nhập dòng nào (báo chi tiết theo dòng).
 */
export async function nhapCauHoiTuExcel(baiId: string, noiDungTep: Buffer, nguoi: NguoiThucHien = HE_THONG) {
  const bai = await baiChuaCoNguoiLam(baiId);
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(noiDungTep as unknown as ArrayBuffer);
  } catch {
    throw new DanhGiaKhongHopLeError("tệp không phải Excel .xlsx hợp lệ");
  }
  const ws = wb.worksheets[0];
  if (!ws) throw new DanhGiaKhongHopLeError("tệp Excel không có sheet nào");
  const chu = (v: ExcelJS.CellValue) =>
    v == null ? "" : typeof v === "object" && "richText" in v ? v.richText.map((r) => r.text).join("") : String(typeof v === "object" && "result" in v ? v.result : v);

  const dsCauHoi: ReturnType<typeof chuanHoaCauHoi>[] = [];
  const loi: string[] = [];
  ws.eachRow((row, so) => {
    if (so === 1) return;
    const giaTri = Array.from({ length: 8 }, (_, i) => chu(row.getCell(i + 1).value).trim());
    if (giaTri.every((g) => !g)) return;
    const dapAnDung = giaTri[7]
      .toUpperCase()
      .split(/[,;\s]+/)
      .filter(Boolean)
      .map((c) => CHU_PHUONG_AN.indexOf(c));
    try {
      dsCauHoi.push(chuanHoaCauHoi({ noiDung: giaTri[0], phuongAn: giaTri.slice(1, 7), dapAnDung }, `Dòng ${so}: `));
    } catch (e) {
      loi.push((e as Error).message.replace(/^Không hợp lệ: /, ""));
    }
  });
  if (loi.length) throw new DanhGiaKhongHopLeError(loi.join("; "));
  if (dsCauHoi.length === 0) throw new DanhGiaKhongHopLeError("tệp không có câu hỏi nào (dòng 1 là tiêu đề)");

  const batDau = ((await prisma.cauHoiTracNghiem.aggregate({ where: { baiId }, _max: { thuTu: true } }))._max.thuTu ?? 0) + 1;
  await prisma.$transaction([
    prisma.cauHoiTracNghiem.createMany({ data: dsCauHoi.map((c, i) => ({ baiId, ...c, thuTu: batDau + i })) }),
    ghiThaoTac(nguoi, "NHAP_CAU_HOI_TRAC_NGHIEM", "BaiTracNghiem", baiId, `${bai.tieuDe}: ${dsCauHoi.length} câu`),
  ]);
  return dsCauHoi.length;
}

/** Tệp Excel mẫu để nhập câu hỏi. */
export async function mauExcelCauHoi(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Cau hoi");
  ws.columns = [{ width: 60 }, ...CHU_PHUONG_AN.map(() => ({ width: 24 })), { width: 14 }];
  ws.addRow(["Câu hỏi", ...CHU_PHUONG_AN.map((c) => `Phương án ${c}`), "Đáp án đúng"]).font = { bold: true };
  ws.addRow(["Chương trình GDPT 2018 được ban hành theo văn bản nào?", "Thông tư 32/2018/TT-BGDĐT", "Nghị định 71/2020/NĐ-CP", "Luật Giáo dục 2019", "", "", "", "A"]);
  ws.addRow(["Những năng lực chung trong Chương trình GDPT 2018 gồm (chọn nhiều)?", "Tự chủ và tự học", "Giao tiếp và hợp tác", "Tin học", "Giải quyết vấn đề và sáng tạo", "", "", "A,B,D"]);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

// ---------------- yêu cầu sản phẩm cuối khóa ----------------

export type YeuCauSanPhamInput = { tieuDe: string; moTa?: string | null; tinhDiem: boolean; heSo?: number | null };

export async function taoYeuCauSanPham(hocPhanId: string, input: YeuCauSanPhamInput, nguoi: NguoiThucHien = HE_THONG) {
  const hocPhan = await hocPhanDeSua(hocPhanId);
  const tieuDe = input.tieuDe?.trim();
  if (!tieuDe) throw new DanhGiaKhongHopLeError("thiếu tiêu đề yêu cầu sản phẩm");
  const heSo = kiemTraHeSo(input.tinhDiem, input.heSo);
  const thuTu = ((await prisma.yeuCauSanPham.aggregate({ where: { hocPhanId }, _max: { thuTu: true } }))._max.thuTu ?? 0) + 1;
  return prisma.$transaction(async (tx) => {
    const yc = await tx.yeuCauSanPham.create({
      data: { hocPhanId, tieuDe, moTa: lamSach(input.moTa), tinhDiem: input.tinhDiem, heSo, thuTu },
    });
    await ghiThaoTac(nguoi, "TAO_YEU_CAU_SAN_PHAM", "YeuCauSanPham", yc.id, `${hocPhan.ten}: ${tieuDe}`, tx);
    return yc;
  });
}

export async function capNhatYeuCauSanPham(id: string, input: YeuCauSanPhamInput, nguoi: NguoiThucHien = HE_THONG) {
  const yc = await prisma.yeuCauSanPham.findUnique({ where: { id } });
  if (!yc) throw new DanhGiaKhongHopLeError("không tìm thấy yêu cầu sản phẩm");
  await hocPhanDeSua(yc.hocPhanId);
  const tieuDe = input.tieuDe?.trim();
  if (!tieuDe) throw new DanhGiaKhongHopLeError("thiếu tiêu đề yêu cầu sản phẩm");
  const heSo = kiemTraHeSo(input.tinhDiem, input.heSo);
  return prisma.$transaction(async (tx) => {
    const moi = await tx.yeuCauSanPham.update({ where: { id }, data: { tieuDe, moTa: lamSach(input.moTa), tinhDiem: input.tinhDiem, heSo } });
    await ghiThaoTac(nguoi, "CAP_NHAT_YEU_CAU_SAN_PHAM", "YeuCauSanPham", id, `${tieuDe}: ${moi.tinhDiem ? `tính điểm, hệ số ${moi.heSo}` : "không tính điểm"}`, tx);
    return moi;
  });
}

export async function xoaYeuCauSanPham(id: string, nguoi: NguoiThucHien = HE_THONG) {
  const yc = await prisma.yeuCauSanPham.findUnique({ where: { id }, include: { _count: { select: { baiNops: true } } } });
  if (!yc) throw new DanhGiaKhongHopLeError("không tìm thấy yêu cầu sản phẩm");
  await hocPhanDeSua(yc.hocPhanId);
  if (yc._count.baiNops > 0) throw new YeuCauDaCoBaiNopError();
  await prisma.$transaction([
    prisma.yeuCauSanPham.delete({ where: { id } }),
    ghiThaoTac(nguoi, "XOA_YEU_CAU_SAN_PHAM", "YeuCauSanPham", id, yc.tieuDe),
  ]);
}

// ---------------- đọc ----------------

/** Toàn bộ học liệu khung + yêu cầu đánh giá của chương trình, theo thứ tự học phần. */
export async function hocLieuKhungChuongTrinh(chuongTrinhId: string) {
  return prisma.hocPhan.findMany({
    where: { chuongTrinhId },
    orderBy: { thuTu: "asc" },
    include: {
      hocLieus: { orderBy: [{ thuTu: "asc" }, { createdAt: "asc" }] },
      baiTracNghiems: {
        orderBy: [{ thuTu: "asc" }, { createdAt: "asc" }],
        include: { _count: { select: { cauHois: true, lanLams: true } } },
      },
      yeuCauSanPhams: {
        orderBy: [{ thuTu: "asc" }, { createdAt: "asc" }],
        include: { _count: { select: { baiNops: true } } },
      },
    },
  });
}

export async function layBaiTracNghiem(baiId: string) {
  return prisma.baiTracNghiem.findUnique({
    where: { id: baiId },
    include: {
      hocPhan: { include: { chuongTrinh: true } },
      cauHois: { orderBy: { thuTu: "asc" } },
      _count: { select: { lanLams: true } },
    },
  });
}

/**
 * Ai xem/tải được học liệu khung: cán bộ nội bộ (CT-02/CT-05), giảng viên
 * được phân công học phần ở 1 khóa của chương trình, học viên chính thức/hoàn
 * thành của 1 khóa mở từ chương trình (trừ khóa Phương thức 3).
 */
export async function kiemTraQuyenXemHocLieuKhung(phien: { userId: string; maCNDuocPhep: string[] }, id: string) {
  const hocLieu = await prisma.hocLieuHocPhan.findUnique({ where: { id }, include: { hocPhan: true } });
  if (!hocLieu) throw new KhongTimThayTaiLieuError();
  if (phien.maCNDuocPhep.some((ma) => ma === "CT-02" || ma === "CT-05")) return hocLieu;
  const khoaCuaChuongTrinh = { chuongTrinhId: hocLieu.hocPhan.chuongTrinhId, chuongTrinh: { phuongThucDangKy: { not: "CHI_DU_THI" as const } } };

  const hocVien = await hocVienCuaTaiKhoan(phien.userId);
  if (
    hocVien &&
    (await prisma.dangKyHoc.count({
      where: { hocVienId: hocVien.id, trangThai: { in: ["CHINH_THUC", "HOAN_THANH"] }, khoa: khoaCuaChuongTrinh },
    })) > 0
  ) {
    return hocLieu;
  }
  const giangVien = await giangVienCuaTaiKhoan(phien.userId);
  if (giangVien && (await prisma.giangVienHocPhan.count({ where: { giangVienId: giangVien.id, hocPhanId: hocLieu.hocPhanId } })) > 0) {
    return hocLieu;
  }
  throw new KhongDuocXemTaiLieuError();
}
