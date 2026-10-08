import ExcelJS from "exceljs";
import { prisma } from "@/lib/db/prisma";
import { MA_TEP_NOP_PHI } from "@/lib/form-dang-ky";
import { khopTuKhoa } from "@/lib/tim-kiem";
import { dsThanhPhanLePhi, ghiNhanCacThanhPhan } from "@/server/services/hp/hp-01-thanh-phan-le-phi";
import { lePhiDaXacNhan } from "@/server/services/hp/thanh-phan-le-phi-chung";
import { dieuKienChiemCho } from "@/server/services/kh/kh-05-trang-thai-si-so";
import { xacNhanThanhToan } from "@/server/services/hp/hp-02-thanh-toan";
import { layThamSo } from "@/server/services/qt/qt-05-tham-so";
import { chuanHoaChu, docBangTinh, maKhoaTrongTep, timDongTieuDe } from "@/server/services/chung/bang-tinh";
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
    prisma.hocPhi.findMany({ where: { khoaId }, include: { thanhPhans: { include: { thanhPhan: true }, orderBy: { thanhPhan: { thuTu: "asc" } } } } }),
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

type DongDoiSoat = Awaited<ReturnType<typeof bangDoiSoatLePhi>>[number];

/**
 * Lệ phí chưa được xác nhận: chưa có khoản phí, chưa nộp/nộp thiếu và chưa bỏ chặn
 * (bổ sung 06/10/2026: khóa có thành phần lệ phí - còn thành phần bắt buộc chưa xác nhận).
 */
export function chuaXacNhanLePhi(d: Pick<DongDoiSoat, "hocPhi">) {
  return !lePhiDaXacNhan(d.hocPhi, true);
}

/**
 * (bổ sung 06/10/2026 - HP-02) bảng đối soát trên màn hình: tìm nhanh theo mã
 * sinh viên / số CCCD / mã hồ sơ / họ tên; thí sinh chưa xác nhận lệ phí lên
 * trên, rồi theo thời gian nộp minh chứng mới nhất (chưa nộp minh chứng xếp cuối nhóm).
 */
export function locVaSapXepDoiSoat<T extends Pick<DongDoiSoat, "hocPhi" | "hocVien" | "minhChung">>(dong: T[], tuKhoa?: string | null): T[] {
  const loc = dong.filter((d) => khopTuKhoa(d.hocVien, tuKhoa));
  const thoiGian = (d: T) => d.minhChung?.taiLenLuc.getTime() ?? -Infinity;
  return [...loc].sort(
    (a, b) =>
      Number(!chuaXacNhanLePhi(a)) - Number(!chuaXacNhanLePhi(b)) ||
      thoiGian(b) - thoiGian(a) ||
      a.hocVien.hoTen.localeCompare(b.hocVien.hoTen, "vi"),
  );
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

/** (bổ sung 06/10/2026) tiêu đề cột trạng thái của 1 thành phần lệ phí trong tệp đối soát */
export const tieuDeCotThanhPhan = (ten: string) => `Trạng thái phí - ${ten}`;
const KHONG_DANG_KY = "Không đăng ký";

export async function xuatExcelDoiSoat(khoaId: string) {
  const [{ khoa, dong }, tenCoQuan, dsTp] = await Promise.all([duLieuDoiSoat(khoaId), layThamSo("CC_TEN_CO_QUAN_CAP"), dsThanhPhanLePhi(khoaId)]);
  // (bổ sung 06/10/2026) khóa chia thành phần lệ phí: thay cột "Trạng thái phí" bằng 1 cột mỗi thành phần
  const viTriTrangThai = COT.findIndex((c) => c.tieuDe === "Trạng thái phí");
  const COT_TEP =
    dsTp.length > 0
      ? [...COT.slice(0, viTriTrangThai), ...dsTp.map((tp) => ({ tieuDe: tieuDeCotThanhPhan(tp.ten), rong: 18 })), ...COT.slice(viTriTrangThai + 1)]
      : COT;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Đối soát lệ phí", { pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  ws.columns = COT_TEP.map((c) => ({ width: c.rong }));
  const tieuDe = (s: string, dam = false, co = 11) => {
    const r = ws.addRow([s]);
    ws.mergeCells(r.number, 1, r.number, COT_TEP.length);
    r.getCell(1).font = { bold: dam, size: co };
    r.getCell(1).alignment = { horizontal: "center" };
  };
  tieuDe((tenCoQuan ?? "CƠ SỞ ĐÀO TẠO, BỒI DƯỠNG").toUpperCase(), true);
  tieuDe("DANH SÁCH THÍ SINH ĐĂNG KÝ - ĐỐI SOÁT LỆ PHÍ", true, 14);
  tieuDe(`${khoa.chuongTrinh.ten} · Mã khóa: ${khoa.maKhoa}`);
  tieuDe(
    dsTp.length > 0
      ? `Ghi "${DA_DONG}" ở cột trạng thái của từng phần (${dsTp.map((t) => t.ten).join(", ")}) thí sinh đã chuyển khoản, giữ nguyên cột Mã hồ sơ, rồi tải tệp lên hệ thống.`
      : `Ghi "${DA_DONG}" ở cột Trạng thái phí cho thí sinh đã chuyển khoản, giữ nguyên cột Mã hồ sơ, rồi tải tệp lên hệ thống.`,
  );
  ws.addRow([]);
  const header = ws.addRow(COT_TEP.map((c) => c.tieuDe));
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
      ...(dsTp.length > 0
        ? dsTp.map((tp) => {
            const x = d.hocPhi?.thanhPhans.find((t) => t.thanhPhanId === tp.id);
            return !x ? KHONG_DANG_KY : XONG.includes(x.trangThai) || d.hocPhi?.boQuaKiemTra ? DA_DONG : CHUA_DONG;
          })
        : [d.hocPhi && (XONG.includes(d.hocPhi.trangThai) || d.hocPhi.boQuaKiemTra) ? DA_DONG : CHUA_DONG]),
      "",
    ]);
    const soCotTrangThai = Math.max(dsTp.length, 1);
    for (let k = 0; k < soCotTrangThai; k++) {
      const o = r.getCell(viTriTrangThai + 1 + k);
      if (o.value !== KHONG_DANG_KY) o.dataValidation = { type: "list", allowBlank: true, formulae: [`"${DA_DONG},${CHUA_DONG}"`] };
    }
  });
  for (let r = header.number; r <= ws.rowCount; r++) {
    COT_TEP.forEach((_, i) => {
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
  const maKhoaTep = maKhoaTrongTep(dsDong, tieuDe.viTriTieuDe);
  if (maKhoaTep !== khoa.maKhoa) {
    throw new TepDoiSoatKhongHopLeError(
      maKhoaTep
        ? `đây là danh sách của khóa ${maKhoaTep}, không phải ${khoa.maKhoa}`
        : "không xác định được mã khóa trong tệp - hãy dùng tệp tải từ hệ thống",
    );
  }

  // (bổ sung 06/10/2026) khóa chia thành phần lệ phí: đọc 1 cột trạng thái mỗi thành phần
  const dsTp = await dsThanhPhanLePhi(khoaId);
  if (dsTp.length > 0) return nhapTheoThanhPhan(dsTp, dong, dsDong, tieuDe.viTriTieuDe, tieuDe.cot.maHoSo!, tenTep, nguoi);

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

/**
 * (bổ sung 06/10/2026 - HP-02) Đối soát Excel khóa chia thành phần lệ phí: mỗi thành phần 1 cột
 * "Trạng thái phí - <tên>"; dòng "Đã đóng" ở phần thí sinh đã chọn và chưa xác nhận -> ghi nhận
 * phần đó (1 phiếu thu/phần). Có dòng lỗi thì không ghi nhận dòng nào; phần đã ghi nhận bỏ qua;
 * "Chưa đóng" không tự hủy phần đã ghi nhận (chỉ cảnh báo).
 */
async function nhapTheoThanhPhan(
  dsTp: { id: string; ten: string }[],
  dong: Awaited<ReturnType<typeof duLieuDoiSoat>>["dong"],
  dsDong: Awaited<ReturnType<typeof docBangTinh>>,
  viTriTieuDe: number,
  cotMaHoSo: number,
  tenTep: string,
  nguoi: NguoiThucHien,
): Promise<KetQuaDoiSoat> {
  const tieuDeTep = dsDong[viTriTieuDe].o.map((t) => chuanHoaChu(t));
  const cotTp = dsTp.map((tp) => ({ tp, cot: tieuDeTep.indexOf(chuanHoaChu(tieuDeCotThanhPhan(tp.ten))) }));
  const thieu = cotTp.filter((c) => c.cot < 0);
  if (thieu.length > 0) {
    throw new TepDoiSoatKhongHopLeError(`thiếu cột ${thieu.map((c) => `"${tieuDeCotThanhPhan(c.tp.ten)}"`).join(", ")} - hãy tải lại tệp đối soát từ hệ thống`);
  }
  const theoMa = new Map(dong.map((d) => [d.hocVien.maHocVien, d]));
  const loi: DongLoiImport[] = [];
  const daGap = new Set<string>();
  const canGhi: { d: (typeof dong)[number]; dongTp: NonNullable<(typeof dong)[number]["hocPhi"]>["thanhPhans"][number]; ten: string }[] = [];
  const kq: KetQuaDoiSoat = { daGhiNhan: [], daCoTruoc: 0, chuaDong: 0, canhBao: [] };
  for (const { soDong, o } of dsDong.slice(viTriTieuDe + 1)) {
    const ma = (o[cotMaHoSo] ?? "").trim();
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
    for (const { tp, cot } of cotTp) {
      const tt = o[cot] ?? "";
      const x = d.hocPhi?.thanhPhans.find((t) => t.thanhPhanId === tp.id);
      const xong = x && (XONG.includes(x.trangThai) || d.hocPhi!.boQuaKiemTra);
      if (laDaDong(tt)) {
        if (!x) loi.push({ dong: soDong, loi: `${ma}: thí sinh không đăng ký "${tp.ten}"` });
        else if (xong) kq.daCoTruoc++;
        else canGhi.push({ d, dongTp: x, ten: tp.ten });
      } else if (laChuaDong(tt) || chuanHoaChu(tt) === chuanHoaChu(KHONG_DANG_KY)) {
        if (x) kq.chuaDong++;
        if (xong) kq.canhBao.push(`${ma} - ${d.hocVien.hoTen}: "${tp.ten}" tệp ghi "${CHUA_DONG}" nhưng đã ghi nhận trước đó - không tự hủy, điều chỉnh thủ công nếu cần`);
      } else loi.push({ dong: soDong, loi: `${ma}: trạng thái "${tt}" của "${tp.ten}" không hợp lệ (chỉ "${DA_DONG}" hoặc "${CHUA_DONG}")` });
    }
  }
  if (loi.length > 0) throw new DuLieuImportLoiError(loi);

  const hinhThuc = `Chuyển khoản (đối soát Excel ${tenTep})`.slice(0, 120);
  // (sửa 07/10/2026) các phần Đã đóng của cùng 1 thí sinh trong tệp -> 1 biên lai chung
  const theoThiSinh = new Map<string, typeof canGhi>();
  for (const c of canGhi) theoThiSinh.set(c.d.hocPhi!.id, [...(theoThiSinh.get(c.d.hocPhi!.id) ?? []), c]);
  for (const [hocPhiId, ds] of theoThiSinh) {
    const { d } = ds[0];
    const { phieuThu } = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`, `HP02:${hocPhiId}`);
      return ghiNhanCacThanhPhan(tx, ds.map((c) => ({ hocPhiThanhPhanId: c.dongTp.id, soTien: null })), hinhThuc, nguoi);
    });
    kq.daGhiNhan.push({ maHoSo: d.hocVien.maHocVien, hoTen: `${d.hocVien.hoTen} - ${ds.map((c) => c.ten).join(", ")}`, soTien: Number(phieuThu.soTien), soPhieu: phieuThu.soPhieu });
  }
  return kq;
}
