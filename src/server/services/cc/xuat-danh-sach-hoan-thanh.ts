import ExcelJS from "exceljs";
import { layThamSo } from "@/server/services/qt/qt-05-tham-so";
import { danhSachHoanThanh } from "@/server/services/cc/cc-01-de-nghi";
import { nhanVanBang } from "@/server/services/cc/van-bang";

const COT = [
  { tieuDe: "STT", rong: 6 },
  { tieuDe: "Mã học viên", rong: 16 },
  { tieuDe: "Họ và tên", rong: 28 },
  { tieuDe: "Ngày sinh", rong: 12 },
  { tieuDe: "Đơn vị công tác", rong: 32 },
  { tieuDe: "Lớp", rong: 18 },
  { tieuDe: "Đơn vị liên kết", rong: 24 },
  { tieuDe: "Điểm tổng kết", rong: 12 },
  { tieuDe: "Chuyên cần (%)", rong: 12 },
  { tieuDe: "Số hiệu văn bằng", rong: 18 },
  { tieuDe: "Ghi chú", rong: 20 },
];

/**
 * CC-01 (bổ sung 26/09/2026): xuất Excel danh sách học viên hoàn thành chương
 * trình theo khóa hoặc theo lớp - làm căn cứ ban hành quyết định cấp chứng
 * chỉ/giấy chứng nhận. Trả về { tenFile, noiDung } để route trả về tải xuống.
 */
export async function xuatExcelDanhSachHoanThanh(khoaId: string, lopId?: string | null) {
  const [{ khoa, lop, dong }, tenCoQuan] = await Promise.all([
    danhSachHoanThanh(khoaId, lopId),
    layThamSo("CC_TEN_CO_QUAN_CAP"),
  ]);
  const loaiVanBang = nhanVanBang(khoa.chuongTrinh.loaiVanBang);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Danh sách hoàn thành", {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  ws.columns = COT.map((c) => ({ width: c.rong }));

  const dongTieuDe = (noiDung: string, dam = false, co = 11) => {
    const r = ws.addRow([noiDung]);
    ws.mergeCells(r.number, 1, r.number, COT.length);
    r.getCell(1).font = { bold: dam, size: co };
    r.getCell(1).alignment = { horizontal: "center" };
  };
  dongTieuDe((tenCoQuan ?? "CƠ SỞ ĐÀO TẠO, BỒI DƯỠNG").toUpperCase(), true);
  dongTieuDe("DANH SÁCH HỌC VIÊN HOÀN THÀNH CHƯƠNG TRÌNH BỒI DƯỠNG", true, 14);
  dongTieuDe(`Đề nghị cấp ${loaiVanBang}`);
  dongTieuDe(
    `Chương trình: ${khoa.chuongTrinh.ten} (${khoa.chuongTrinh.maCT}) · Khóa: ${khoa.maKhoa}` +
      (lop ? ` · Lớp: ${lop.maLop} - ${lop.ten}` : " · Cả khóa"),
  );
  ws.addRow([]);

  const header = ws.addRow(COT.map((c) => c.tieuDe));
  header.font = { bold: true };
  header.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

  dong.forEach((d, i) => {
    ws.addRow([
      i + 1,
      d.maHocVien,
      d.hoTen,
      d.ngaySinh ? d.ngaySinh.toLocaleDateString("vi-VN") : "",
      d.donViCongTac ?? "",
      d.maLop ?? "",
      d.donViLienKet ?? "",
      d.diemTongKet,
      d.tyLeChuyenCan,
      d.soHieu ?? "",
      "",
    ]);
  });
  const dauBang = header.number;
  for (let r = dauBang; r <= dauBang + dong.length; r++) {
    for (let c = 1; c <= COT.length; c++) {
      ws.getCell(r, c).border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    }
  }

  ws.addRow([]);
  const tong = ws.addRow([`Tổng cộng: ${dong.length} học viên`]);
  tong.font = { bold: true };

  const hauTo = lop ? `-${lop.maLop}` : "";
  return {
    tenFile: `DS-hoan-thanh-${khoa.maKhoa}${hauTo}.xlsx`,
    noiDung: Buffer.from(await wb.xlsx.writeBuffer()),
    soHocVien: dong.length,
  };
}
