import ExcelJS from "exceljs";

/**
 * Đọc tệp bảng tính (.xlsx hoặc .csv) thành mảng dòng, mỗi dòng là mảng chuỗi
 * đã trim (dùng chung cho các chức năng nhập/đối soát qua Excel - bổ sung 01/10/2026).
 * soDong giữ đúng số dòng trong tệp để báo lỗi cho người dùng sửa.
 */
export type DongBangTinh = { soDong: number; o: string[] };

export class TepBangTinhKhongHopLeError extends Error {
  constructor(lyDo: string) {
    super(`Tệp không đọc được: ${lyDo}`);
  }
}

const chuCuaO = (v: ExcelJS.CellValue): string => {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((r) => r.text).join("");
    if ("result" in v) return v.result == null ? "" : String(v.result);
    if ("text" in v) return String(v.text);
    return "";
  }
  return String(v);
};

function tachDongCsv(dong: string): string[] {
  const kq: string[] = [];
  let cur = "";
  let trongNhay = false;
  for (let i = 0; i < dong.length; i++) {
    const c = dong[i];
    if (trongNhay) {
      if (c === '"' && dong[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') trongNhay = false;
      else cur += c;
    } else if (c === '"') trongNhay = true;
    else if (c === "," || c === ";") {
      kq.push(cur);
      cur = "";
    } else cur += c;
  }
  kq.push(cur);
  return kq.map((x) => x.trim());
}

export async function docBangTinh(noiDung: Buffer, tenTep: string): Promise<DongBangTinh[]> {
  const duoi = tenTep.toLowerCase().slice(tenTep.lastIndexOf("."));
  if (duoi === ".csv") {
    const chu = noiDung.toString("utf8").replace(/^﻿/, "");
    return chu
      .split(/\r?\n/)
      .map((d, i) => ({ soDong: i + 1, o: tachDongCsv(d) }))
      .filter((d) => d.o.some(Boolean));
  }
  if (duoi !== ".xlsx") throw new TepBangTinhKhongHopLeError("chỉ nhận tệp Excel .xlsx hoặc .csv");
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(noiDung as unknown as ArrayBuffer);
  } catch {
    throw new TepBangTinhKhongHopLeError("không phải tệp Excel .xlsx hợp lệ");
  }
  const ws = wb.worksheets[0];
  if (!ws) throw new TepBangTinhKhongHopLeError("tệp Excel không có sheet nào");
  const ds: DongBangTinh[] = [];
  ws.eachRow((row, soDong) => {
    const o: string[] = [];
    for (let i = 1; i <= Math.max(row.cellCount, 1); i++) o.push(chuCuaO(row.getCell(i).value).trim());
    if (o.some(Boolean)) ds.push({ soDong, o });
  });
  return ds;
}

/** Bỏ dấu tiếng Việt + chữ thường + gộp khoảng trắng - so khớp tiêu đề cột/giá trị gõ tay. */
export function chuanHoaChu(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Tìm dòng tiêu đề (dòng đầu tiên chứa đủ các cột bắt buộc) và vị trí từng cột.
 * nhanDien: mã cột -> hàm nhận tiêu đề đã chuẩn hóa.
 */
export function timDongTieuDe<K extends string>(
  dsDong: DongBangTinh[],
  nhanDien: Record<K, (tieuDe: string) => boolean>,
  batBuoc: NoInfer<K>[],
): { viTriTieuDe: number; cot: Partial<Record<K, number>> } | null {
  for (const [viTri, dong] of dsDong.entries()) {
    const cot: Partial<Record<K, number>> = {};
    dong.o.forEach((tieuDe, i) => {
      // tiêu đề cột là chữ ngắn; dòng hướng dẫn dài (ô gộp) có thể nhắc tên nhiều cột -> bỏ qua
      if (tieuDe.length > 50) return;
      const t = chuanHoaChu(tieuDe);
      const k = (Object.keys(nhanDien) as K[]).find((x) => cot[x] === undefined && nhanDien[x](t));
      if (k) cot[k] = i;
    });
    if (batBuoc.every((k) => cot[k] !== undefined)) return { viTriTieuDe: viTri, cot };
  }
  return null;
}
