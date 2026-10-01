import ExcelJS from "exceljs";
import { prisma } from "@/lib/db/prisma";
import { MA_TEP_NOP_PHI } from "@/lib/form-dang-ky";
import { dieuKienChiemCho } from "@/server/services/kh/kh-05-trang-thai-si-so";
import { xacNhanThanhToan } from "@/server/services/hp/hp-02-thanh-toan";
import { layThamSo } from "@/server/services/qt/qt-05-tham-so";
import { chuanHoaChu, docBangTinh, timDongTieuDe } from "@/server/services/chung/bang-tinh";
import { KhongTimThayKhoaError, TepDoiSoatKhongHopLeError } from "@/server/services/hp/loi-hoc-phi";
import { DuLieuImportLoiError, type DongLoiImport } from "@/server/services/hv/loi-hoc-vien";
import type { NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";

/**
 * (bổ sung 01/10/2026 - HP-02) Đối soát lệ phí qua Excel: cán bộ tài chính tải
 * danh sách thí sinh đã đăng ký (kèm tình trạng minh chứng chuyển khoản), đối
 * chiếu sao kê ngân hàng, ghi "Đã đóng" ở cột Trạng thái phí rồi tải tệp lên -
 * hệ thống ghi nhận thanh toán (HP-02, lập phiếu thu HP-04, ghi nhật ký) cho
 * các dòng Đã đóng. Có dòng lỗi thì không ghi nhận dòng nào. Không tự hủy
 * khoản đã ghi nhận trước đó dù tệp ghi "Chưa đóng" (chỉ cảnh báo).
 */
export const DA_DONG = "Đã đóng";
export const CHUA_DONG = "Chưa đóng";
const XONG = ["DA_NOP_DU", "MIEN_GIAM"];

async function duLieuDoiSoat(khoaId: string) {
  const khoa = await prisma.khoa.findUnique({ where: { id: khoaId }, include: { chuongTrinh: true } });
  if (!khoa) throw new KhongTimThayKhoaError();
  const [dsDangKy, dsHocPhi] = await Promise.all([
    prisma.dangKyHoc.findMany({
      where: dieuKienChiemCho(khoaId),
      include: { hocVien: true, tepHoSos: { where: { maTruong: MA_TEP_NOP_PHI } } },
      orderBy: [{ hocVien: { lopSinhHoat: "asc" } }, { hocVien: { hoTen: "asc" } }],
    }),
    prisma.hocPhi.findMany({ where: { khoaId } }),
  ]);
  const hocPhiTheoHv = new Map(dsHocPhi.map((h) => [h.hocVienId, h]));
  return {
    khoa,
    dong: dsDangKy.map((dk) => ({ dangKy: dk, hocVien: dk.hocVien, minhChung: dk.tepHoSos[0] ?? null, hocPhi: hocPhiTheoHv.get(dk.hocVienId) ?? null })),
  };
}

/** Bảng thí sinh + lệ phí + minh chứng để hiển thị trên trang học phí của khóa. */
export async function bangDoiSoatLePhi(khoaId: string) {
  return (await duLieuDoiSoat(khoaId)).dong;
}

const COT = [
  { tieuDe: "STT", rong: 6 },
  { tieuDe: "Mã hồ sơ", rong: 14 },
  { tieuDe: "Mã sinh viên", rong: 14 },
  { tieuDe: "Họ và tên", rong: 26 },
  { tieuDe: "Số CCCD", rong: 16 },
  { tieuDe: "Lớp sinh hoạt", rong: 14 },
  { tieuDe: "Ngày đăng ký", rong: 13 },
  { tieuDe: "Lệ phí", rong: 12 },
  { tieuDe: "Đã ghi nhận", rong: 12 },
  { tieuDe: "Nội dung CK", rong: 24 },
  { tieuDe: "Minh chứng CK", rong: 20 },
  { tieuDe: "Trạng thái phí", rong: 14 },
  { tieuDe: "Ghi chú", rong: 24 },
];

export async function xuatExcelDoiSoat(khoaId: string) {
  const [{ khoa, dong }, tenCoQuan] = await Promise.all([duLieuDoiSoat(khoaId), layThamSo("CC_TEN_CO_QUAN_CAP")]);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Đối soát lệ phí", { pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  ws.columns = COT.map((c) => ({ width: c.rong }));
  const tieuDe = (s: string, dam = false, co = 11) => {
    const r = ws.addRow([s]);
    ws.mergeCells(r.number, 1, r.number, COT.length);
    r.getCell(1).font = { bold: dam, size: co };
    r.getCell(1).alignment = { horizontal: "center" };
  };
  tieuDe((tenCoQuan ?? "CƠ SỞ ĐÀO TẠO, BỒI DƯỠNG").toUpperCase(), true);
  tieuDe("DANH SÁCH THÍ SINH ĐĂNG KÝ - ĐỐI SOÁT LỆ PHÍ", true, 14);
  tieuDe(`${khoa.chuongTrinh.ten} · Mã khóa: ${khoa.maKhoa}`);
  tieuDe(`Ghi "${DA_DONG}" ở cột Trạng thái phí cho thí sinh đã chuyển khoản, giữ nguyên cột Mã hồ sơ, rồi tải tệp lên hệ thống.`);
  ws.addRow([]);
  const header = ws.addRow(COT.map((c) => c.tieuDe));
  header.font = { bold: true };
  header.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  dong.forEach((d, i) => {
    const r = ws.addRow([
      i + 1,
      d.hocVien.maHocVien,
      d.hocVien.maSinhVien ?? "",
      d.hocVien.hoTen,
      d.hocVien.soCCCD ?? "",
      d.hocVien.lopSinhHoat ?? "",
      d.dangKy.ngayDangKy.toLocaleDateString("vi-VN"),
      d.hocPhi ? Number(d.hocPhi.soTienPhaiNop) : null,
      d.hocPhi ? Number(d.hocPhi.soTienDaNop) : null,
      `${khoa.maKhoa} ${d.hocVien.maSinhVien ?? d.hocVien.maHocVien}`,
      d.minhChung ? `Đã nộp ${d.minhChung.taiLenLuc.toLocaleString("vi-VN")}` : "Chưa nộp",
      d.hocPhi && (XONG.includes(d.hocPhi.trangThai) || d.hocPhi.boQuaKiemTra) ? DA_DONG : CHUA_DONG,
      "",
    ]);
    r.getCell(12).dataValidation = { type: "list", allowBlank: true, formulae: [`"${DA_DONG},${CHUA_DONG}"`] };
  });
  for (let r = header.number; r <= ws.rowCount; r++) {
    COT.forEach((_, i) => {
      const o = ws.getCell(r, i + 1);
      o.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      if ((i === 7 || i === 8) && r > header.number) o.numFmt = "#,##0";
    });
  }
  return { tenFile: `doi-soat-le-phi-${khoa.maKhoa}.xlsx`, noiDung: Buffer.from(await wb.xlsx.writeBuffer()) };
}

export type KetQuaDoiSoat = {
  daGhiNhan: { maHoSo: string; hoTen: string; soTien: number; soPhieu: string }[];
  daCoTruoc: number;
  chuaDong: number;
  canhBao: string[];
};

const laDaDong = (s: string) => ["da dong", "da nop", "x", "co", "dong"].includes(chuanHoaChu(s));
const laChuaDong = (s: string) => ["", "chua dong", "chua nop", "khong"].includes(chuanHoaChu(s));

export async function nhapExcelDoiSoat(khoaId: string, noiDung: Buffer, tenTep: string, nguoi: NguoiThucHien): Promise<KetQuaDoiSoat> {
  const { khoa, dong } = await duLieuDoiSoat(khoaId);
  const dsDong = await docBangTinh(noiDung, tenTep);
  const tieuDe = timDongTieuDe(
    dsDong,
    { maHoSo: (t) => t.includes("ma ho so"), trangThai: (t) => t.includes("trang thai phi") },
    ["maHoSo", "trangThai"],
  );
  if (!tieuDe) throw new TepDoiSoatKhongHopLeError('không thấy cột "Mã hồ sơ" và "Trạng thái phí" - hãy dùng tệp tải từ hệ thống');
  // tệp phải đúng của khóa này (dòng mô tả "Mã khóa: ..." phía trên bảng)
  const maKhoaTrongTep = dsDong
    .slice(0, tieuDe.viTriTieuDe)
    .map((d) => d.o.join(" ").match(/Mã khóa:\s*([A-Za-z0-9_-]+)/)?.[1])
    .find(Boolean);
  if (maKhoaTrongTep !== khoa.maKhoa) {
    throw new TepDoiSoatKhongHopLeError(
      maKhoaTrongTep
        ? `đây là danh sách của khóa ${maKhoaTrongTep}, không phải ${khoa.maKhoa}`
        : "không xác định được mã khóa trong tệp - hãy dùng tệp tải từ hệ thống",
    );
  }

  const theoMa = new Map(dong.map((d) => [d.hocVien.maHocVien, d]));
  const loi: DongLoiImport[] = [];
  const daGap = new Set<string>();
  const canGhi: (typeof dong)[number][] = [];
  const kq: KetQuaDoiSoat = { daGhiNhan: [], daCoTruoc: 0, chuaDong: 0, canhBao: [] };
  for (const { soDong, o } of dsDong.slice(tieuDe.viTriTieuDe + 1)) {
    const ma = (o[tieuDe.cot.maHoSo!] ?? "").trim();
    const tt = o[tieuDe.cot.trangThai!] ?? "";
    if (!ma) continue;
    const d = theoMa.get(ma);
    if (!d) {
      loi.push({ dong: soDong, loi: `Mã hồ sơ ${ma} không thuộc danh sách đăng ký của khóa` });
      continue;
    }
    if (daGap.has(ma)) {
      loi.push({ dong: soDong, loi: `Mã hồ sơ ${ma} xuất hiện nhiều lần` });
      continue;
    }
    daGap.add(ma);
    const xong = d.hocPhi && (XONG.includes(d.hocPhi.trangThai) || d.hocPhi.boQuaKiemTra);
    if (laDaDong(tt)) {
      if (!d.hocPhi) loi.push({ dong: soDong, loi: "Khóa chưa thiết lập lệ phí cho thí sinh này (HP-01)" });
      else if (xong) kq.daCoTruoc++;
      else if (!["CHUA_NOP", "CON_NO"].includes(d.hocPhi.trangThai)) loi.push({ dong: soDong, loi: "Khoản phí không ghi nhận cá nhân được (qua đơn vị liên kết)" });
      else canGhi.push(d);
    } else if (laChuaDong(tt)) {
      kq.chuaDong++;
      if (xong) kq.canhBao.push(`${ma} - ${d.hocVien.hoTen}: tệp ghi "${CHUA_DONG}" nhưng hệ thống đã ghi nhận nộp trước đó - không tự hủy, điều chỉnh thủ công nếu cần`);
    } else loi.push({ dong: soDong, loi: `Trạng thái phí "${tt}" không hợp lệ (chỉ "${DA_DONG}" hoặc "${CHUA_DONG}")` });
  }
  if (loi.length > 0) throw new DuLieuImportLoiError(loi);

  for (const d of canGhi) {
    const soTien = Number(d.hocPhi!.soTienPhaiNop) - Number(d.hocPhi!.soTienDaNop);
    if (soTien <= 0) continue;
    const { phieuThu } = await xacNhanThanhToan(d.hocPhi!.id, {
      soTien,
      hinhThucNop: `Chuyển khoản (đối soát Excel ${tenTep})`.slice(0, 120),
      nguoiXacNhanId: nguoi.nguoiThucHienId,
      nguoiXacNhanTen: nguoi.nguoiThucHienTen,
    });
    kq.daGhiNhan.push({ maHoSo: d.hocVien.maHocVien, hoTen: d.hocVien.hoTen, soTien, soPhieu: phieuThu.soPhieu });
  }
  return kq;
}
