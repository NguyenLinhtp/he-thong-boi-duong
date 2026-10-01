import ExcelJS from "exceljs";
import { prisma } from "@/lib/db/prisma";
import { dieuKienChiemCho, daQuaHanDangKy } from "@/server/services/kh/kh-05-trang-thai-si-so";
import { khoaDaPheDuyetKetQua } from "@/server/services/kq/dung-chung";
import { ghiThaoTac, type NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";
import { layThamSo } from "@/server/services/qt/qt-05-tham-so";
import { guiThongBao } from "@/server/services/hv/hv-10-thong-bao";
import { dinhDangNgay } from "@/lib/dinh-dang";
import { ChotDanhSachDuThiError, KhongTimThayKhoaError } from "@/server/services/hv/loi-hoc-vien";

/**
 * (bổ sung 01/10/2026 - HV-07) Khóa Phương thức 3 thu lệ phí khi đăng ký: sau
 * hạn đăng ký, cán bộ tài chính chốt danh sách chính thức = thí sinh đã được
 * xác nhận lệ phí (đã nộp đủ/miễn giảm/được bỏ chặn - HP-02/HP-06) thay cho
 * bước thẩm định + xét duyệt từng hồ sơ. Thí sinh chưa nộp đồng nào chuyển
 * Không hợp lệ (kèm lý do), khoản lệ phí chưa thu của họ bị xóa; thí sinh nộp
 * thiếu giữ nguyên để xử lý thủ công. Chốt lại được nhiều lần (thêm người được
 * xác nhận muộn). Hồ sơ cán bộ đã đánh giá Không hợp lệ không bị đụng tới.
 */
const LY_DO_KHONG_NOP = "Không nộp lệ phí thi trước hạn đăng ký";

async function khoaDuThi(khoaId: string) {
  const khoa = await prisma.khoa.findUnique({ where: { id: khoaId }, include: { chuongTrinh: true } });
  if (!khoa) throw new KhongTimThayKhoaError();
  if (khoa.chuongTrinh.phuongThucDangKy !== "CHI_DU_THI") throw new ChotDanhSachDuThiError("chỉ áp dụng cho khóa dự thi (Phương thức 3)");
  return khoa;
}

/** Đã được chốt chưa: hết hạn đăng ký hoặc khóa đã đóng tuyển sinh. */
export function duocChotDanhSach(khoa: { trangThai: string; hanDangKy: Date | null }) {
  if (["CHUAN_BI", "HUY"].includes(khoa.trangThai)) return false;
  return khoa.trangThai !== "DANG_TUYEN_SINH" || daQuaHanDangKy(khoa);
}

export async function chotDanhSachDuThi(khoaId: string, nguoi: NguoiThucHien) {
  const khoa = await khoaDuThi(khoaId);
  if (!duocChotDanhSach(khoa)) {
    throw new ChotDanhSachDuThiError(
      khoa.trangThai === "DANG_TUYEN_SINH"
        ? khoa.hanDangKy
          ? `chưa hết hạn đăng ký (${dinhDangNgay(khoa.hanDangKy)})`
          : "khóa chưa đặt hạn đăng ký và vẫn đang tuyển sinh"
        : "khóa chưa mở hoặc đã hủy",
    );
  }
  if (await khoaDaPheDuyetKetQua(khoaId)) throw new ChotDanhSachDuThiError("kết quả khóa đã phê duyệt");
  const coLePhi = khoa.mucHocPhi !== null && Number(khoa.mucHocPhi) > 0;

  const kq = await prisma.$transaction(
    async (tx) => {
      // cùng khóa tư vấn với HV-07 xét duyệt thường: không chốt song song vượt sĩ số
      await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`, `HV07:${khoaId}`);
      const dsCho = await tx.dangKyHoc.findMany({
        where: { AND: [dieuKienChiemCho(khoaId), { trangThai: { notIn: ["CHINH_THUC", "HOAN_THANH"] } }] },
        include: { hocVien: true },
      });
      const dsHocPhi = await tx.hocPhi.findMany({ where: { khoaId, hocVienId: { in: dsCho.map((d) => d.hocVienId) } } });
      const hp = new Map(dsHocPhi.map((h) => [h.hocVienId, h]));
      const daDong = dsCho.filter((d) => {
        const h = hp.get(d.hocVienId);
        return h ? ["DA_NOP_DU", "MIEN_GIAM"].includes(h.trangThai) || h.boQuaKiemTra : !coLePhi;
      });
      const chuaDong = dsCho.filter((d) => !daDong.includes(d) && Number(hp.get(d.hocVienId)?.soTienDaNop ?? 0) === 0);
      const nopThieu = dsCho.filter((d) => !daDong.includes(d) && !chuaDong.includes(d));

      const soChinhThuc = await tx.dangKyHoc.count({ where: { khoaId, trangThai: { in: ["CHINH_THUC", "HOAN_THANH"] } } });
      if (soChinhThuc + daDong.length > khoa.siSoToiDa) {
        throw new ChotDanhSachDuThiError(`vượt sĩ số tối đa (${khoa.siSoToiDa}) - còn ${Math.max(khoa.siSoToiDa - soChinhThuc, 0)} chỗ`);
      }
      if (daDong.length > 0) {
        await tx.dangKyHoc.updateMany({ where: { id: { in: daDong.map((d) => d.id) } }, data: { trangThai: "CHINH_THUC" } });
      }
      if (chuaDong.length > 0) {
        await tx.dangKyHoc.updateMany({
          where: { id: { in: chuaDong.map((d) => d.id) } },
          data: { trangThai: "KHONG_HOP_LE", ghiChuThamDinh: LY_DO_KHONG_NOP },
        });
        // khoản lệ phí chưa thu đồng nào, chưa có phiếu thu -> bỏ khỏi công nợ
        await tx.hocPhi.deleteMany({
          where: { khoaId, hocVienId: { in: chuaDong.map((d) => d.hocVienId) }, soTienDaNop: 0, phieuThus: { none: {} } },
        });
      }
      await ghiThaoTac(
        nguoi,
        "CHOT_DANH_SACH_DU_THI",
        "Khoa",
        khoaId,
        `${khoa.maKhoa}: ${daDong.length} chính thức, ${chuaDong.length} không nộp lệ phí -> Không hợp lệ, ${nopThieu.length} nộp thiếu giữ nguyên`,
        tx,
      );
      return { daDong, chuaDong, nopThieu };
    },
    { timeout: 30_000 },
  );

  for (const d of kq.daDong) {
    await guiThongBao(
      d.hocVienId,
      "TRUNG_TUYEN",
      `Có tên trong danh sách chính thức dự thi ${khoa.maKhoa}`,
      `Bạn đã có tên trong danh sách thí sinh chính thức dự thi ${khoa.chuongTrinh.ten} (đợt ${khoa.maKhoa}). Lịch thi, phòng thi sẽ được thông báo sau.`,
    );
  }
  return {
    chinhThuc: kq.daDong.length,
    khongHopLe: kq.chuaDong.length,
    nopThieu: kq.nopThieu.map((d) => `${d.hocVien.maHocVien} - ${d.hocVien.hoTen}`),
  };
}

/** Excel danh sách chính thức (thí sinh đủ điều kiện dự thi) của khóa dự thi. */
export async function xuatDanhSachChinhThucDuThi(khoaId: string) {
  const khoa = await khoaDuThi(khoaId);
  const [ds, tenCoQuan] = await Promise.all([
    prisma.dangKyHoc.findMany({
      where: { khoaId, trangThai: { in: ["CHINH_THUC", "HOAN_THANH"] } },
      include: { hocVien: true },
      orderBy: [{ hocVien: { lopSinhHoat: "asc" } }, { hocVien: { hoTen: "asc" } }],
    }),
    layThamSo("CC_TEN_CO_QUAN_CAP"),
  ]);
  const cot = [
    { tieuDe: "STT", rong: 6 },
    { tieuDe: "Mã sinh viên", rong: 14 },
    { tieuDe: "Họ và tên", rong: 28 },
    { tieuDe: "Ngày sinh", rong: 12 },
    { tieuDe: "Số CCCD", rong: 16 },
    { tieuDe: "Lớp sinh hoạt", rong: 14 },
    { tieuDe: "Điện thoại", rong: 14 },
    { tieuDe: "Mã hồ sơ", rong: 14 },
    { tieuDe: "Ghi chú", rong: 20 },
  ];
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Danh sách chính thức", { pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  ws.columns = cot.map((c) => ({ width: c.rong }));
  const tieuDe = (s: string, dam = false, co = 11) => {
    const r = ws.addRow([s]);
    ws.mergeCells(r.number, 1, r.number, cot.length);
    r.getCell(1).font = { bold: dam, size: co };
    r.getCell(1).alignment = { horizontal: "center" };
  };
  tieuDe((tenCoQuan ?? "CƠ SỞ ĐÀO TẠO, BỒI DƯỠNG").toUpperCase(), true);
  tieuDe("DANH SÁCH THÍ SINH ĐỦ ĐIỀU KIỆN DỰ THI", true, 14);
  tieuDe(`${khoa.chuongTrinh.ten} · Mã khóa: ${khoa.maKhoa}${khoa.thoiGianKhaiGiang ? ` · Ngày thi: ${dinhDangNgay(khoa.thoiGianKhaiGiang)}` : ""}`);
  tieuDe(`Tổng số: ${ds.length} thí sinh`);
  ws.addRow([]);
  const header = ws.addRow(cot.map((c) => c.tieuDe));
  header.font = { bold: true };
  header.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  ds.forEach((d, i) =>
    ws.addRow([
      i + 1,
      d.hocVien.maSinhVien ?? "",
      d.hocVien.hoTen,
      d.hocVien.ngaySinh ? dinhDangNgay(d.hocVien.ngaySinh) : "",
      d.hocVien.soCCCD ?? "",
      d.hocVien.lopSinhHoat ?? "",
      d.hocVien.soDienThoai ?? "",
      d.hocVien.maHocVien,
      "",
    ]),
  );
  for (let r = header.number; r <= ws.rowCount; r++) {
    cot.forEach((_, i) => {
      ws.getCell(r, i + 1).border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    });
  }
  return { tenFile: `danh-sach-chinh-thuc-${khoa.maKhoa}.xlsx`, noiDung: Buffer.from(await wb.xlsx.writeBuffer()) };
}
