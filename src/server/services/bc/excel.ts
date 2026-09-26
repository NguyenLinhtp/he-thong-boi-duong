import ExcelJS from "exceljs";
import { layThamSo } from "@/server/services/qt/qt-05-tham-so";

export type CotBang = { tieuDe: string; rong: number; dinhDang?: string };
export type GiaTriO = string | number | null;

const VIEN = { style: "thin" } as const;

/**
 * Sheet báo cáo theo mẫu chung của trường: tên cơ quan (QT-05
 * CC_TEN_CO_QUAN_CAP), tiêu đề, các dòng mô tả (kỳ, bộ lọc), bảng có kẻ viền
 * và dòng tổng (in đậm) nếu có.
 */
export async function themSheetBaoCao(
  wb: ExcelJS.Workbook,
  ten: string,
  opts: { tieuDe: string; moTa: string[]; cot: CotBang[]; dong: GiaTriO[][]; dongTong?: GiaTriO[] },
) {
  const tenCoQuan = (await layThamSo("CC_TEN_CO_QUAN_CAP")) ?? "CƠ SỞ ĐÀO TẠO, BỒI DƯỠNG";
  const ws = wb.addWorksheet(ten, {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  ws.columns = opts.cot.map((c) => ({ width: c.rong }));

  const dongGop = (noiDung: string, dam = false, co = 11) => {
    const r = ws.addRow([noiDung]);
    ws.mergeCells(r.number, 1, r.number, opts.cot.length);
    r.getCell(1).font = { bold: dam, size: co };
    r.getCell(1).alignment = { horizontal: "center" };
  };
  dongGop(tenCoQuan.toUpperCase(), true);
  dongGop(opts.tieuDe, true, 14);
  for (const m of opts.moTa) dongGop(m);
  ws.addRow([]);

  const header = ws.addRow(opts.cot.map((c) => c.tieuDe));
  header.font = { bold: true };
  header.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  for (const d of opts.dong) ws.addRow(d);
  if (opts.dongTong) ws.addRow(opts.dongTong).font = { bold: true };

  const cuoi = ws.rowCount;
  for (let r = header.number; r <= cuoi; r++) {
    opts.cot.forEach((c, i) => {
      const o = ws.getCell(r, i + 1);
      o.border = { top: VIEN, left: VIEN, bottom: VIEN, right: VIEN };
      if (c.dinhDang && r > header.number) o.numFmt = c.dinhDang;
    });
  }
  return ws;
}

export const DINH_DANG_TIEN = "#,##0";
export const DINH_DANG_PHAN_TRAM = "0.0";

export async function sangBuffer(wb: ExcelJS.Workbook) {
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export { ExcelJS };
