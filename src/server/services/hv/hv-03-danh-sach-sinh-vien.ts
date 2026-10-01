import ExcelJS from "exceljs";
import { prisma } from "@/lib/db/prisma";
import { ghiThaoTac, type NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";
import { docBangTinh, timDongTieuDe } from "@/server/services/chung/bang-tinh";
import { DuLieuImportLoiError, FileImportRongError, type DongLoiImport } from "@/server/services/hv/loi-hoc-vien";

/**
 * (bổ sung 01/10/2026 - HV-03) Danh sách sinh viên của trường: cán bộ đào tạo
 * import từ tệp (Excel/CSV) gồm mã sinh viên, số CCCD, họ tên, lớp sinh hoạt.
 * Là nguồn tra cứu khi thí sinh đăng ký dự thi bằng mã sinh viên (HV-05).
 * Nhập lại tệp thì cập nhật theo mã sinh viên (không tạo trùng); có dòng lỗi
 * thì không nạp dòng nào (báo chi tiết theo dòng để sửa).
 */
const COT = {
  maSinhVien: (t: string) => t.includes("ma sinh vien") || t.includes("ma sv") || t === "msv",
  soCCCD: (t: string) => t.includes("cccd") || t.includes("can cuoc") || t.includes("cmnd"),
  hoTen: (t: string) => t.includes("ho ten") || t.includes("ho va ten"),
  lopSinhHoat: (t: string) => t.includes("lop"),
};

export const MA_SINH_VIEN_HOP_LE = /^[A-Za-z0-9._-]{3,20}$/;

/** CCCD 12 số (hoặc CMND 9 số); Excel lưu dạng số làm mất số 0 đầu của CCCD 12 số -> bù lại. */
export function chuanHoaCCCD(tho: string): string | null {
  const so = tho.replace(/\s+/g, "");
  if (/^\d{11}$/.test(so)) return `0${so}`;
  return /^(\d{9}|\d{12})$/.test(so) ? so : null;
}

export async function importDanhSachSinhVien(noiDung: Buffer, tenTep: string, nguoi: NguoiThucHien) {
  const dsDong = await docBangTinh(noiDung, tenTep);
  const tieuDe = timDongTieuDe(dsDong, COT, ["maSinhVien", "soCCCD", "hoTen"]);
  if (!tieuDe) {
    throw new DuLieuImportLoiError([
      { dong: 1, loi: 'Không tìm thấy dòng tiêu đề có các cột "Mã sinh viên", "Số CCCD", "Họ tên" - hãy dùng tệp mẫu' },
    ]);
  }
  const { cot } = tieuDe;
  const dsDuLieu = dsDong.slice(tieuDe.viTriTieuDe + 1);
  if (dsDuLieu.length === 0) throw new FileImportRongError();

  const loi: DongLoiImport[] = [];
  const hopLe: { maSinhVien: string; soCCCD: string; hoTen: string; lopSinhHoat: string | null }[] = [];
  const gapMa = new Map<string, number>();
  const gapCCCD = new Map<string, number>();
  for (const { soDong, o } of dsDuLieu) {
    const maSinhVien = (o[cot.maSinhVien!] ?? "").toUpperCase();
    const cccdTho = o[cot.soCCCD!] ?? "";
    const hoTen = (o[cot.hoTen!] ?? "").replace(/\s+/g, " ");
    const lopSinhHoat = cot.lopSinhHoat !== undefined ? o[cot.lopSinhHoat] || null : null;
    if (!maSinhVien) loi.push({ dong: soDong, loi: "Thiếu mã sinh viên" });
    else if (!MA_SINH_VIEN_HOP_LE.test(maSinhVien)) loi.push({ dong: soDong, loi: `Mã sinh viên "${maSinhVien}" không hợp lệ` });
    else if (!hoTen) loi.push({ dong: soDong, loi: "Thiếu họ tên" });
    else {
      const soCCCD = chuanHoaCCCD(cccdTho);
      if (!soCCCD) loi.push({ dong: soDong, loi: `Số CCCD "${cccdTho}" không hợp lệ (12 số hoặc CMND 9 số)` });
      else if (gapMa.has(maSinhVien)) loi.push({ dong: soDong, loi: `Trùng mã sinh viên với dòng ${gapMa.get(maSinhVien)}` });
      else if (gapCCCD.has(soCCCD)) loi.push({ dong: soDong, loi: `Trùng số CCCD với dòng ${gapCCCD.get(soCCCD)}` });
      else {
        gapMa.set(maSinhVien, soDong);
        gapCCCD.set(soCCCD, soDong);
        hopLe.push({ maSinhVien, soCCCD, hoTen, lopSinhHoat });
      }
    }
  }

  // CCCD đã thuộc 1 mã sinh viên khác trong hệ thống (không phải dòng đang được cập nhật)
  const daCo = await prisma.sinhVien.findMany({ where: { soCCCD: { in: hopLe.map((h) => h.soCCCD) } } });
  for (const sv of daCo) {
    const dong = hopLe.find((h) => h.soCCCD === sv.soCCCD)!;
    if (sv.maSinhVien !== dong.maSinhVien) {
      loi.push({ dong: gapCCCD.get(sv.soCCCD)!, loi: `Số CCCD đã gắn với mã sinh viên ${sv.maSinhVien} trong hệ thống` });
    }
  }
  if (loi.length > 0) throw new DuLieuImportLoiError(loi.sort((a, b) => a.dong - b.dong));

  const dsMaCu = new Set(
    (await prisma.sinhVien.findMany({ where: { maSinhVien: { in: hopLe.map((h) => h.maSinhVien) } }, select: { maSinhVien: true } })).map(
      (s) => s.maSinhVien,
    ),
  );
  await prisma.$transaction(
    async (tx) => {
      for (const h of hopLe) {
        await tx.sinhVien.upsert({ where: { maSinhVien: h.maSinhVien }, create: h, update: h });
      }
      await ghiThaoTac(
        nguoi,
        "IMPORT_DANH_SACH_SINH_VIEN",
        "SinhVien",
        "import",
        `${tenTep}: ${hopLe.length - dsMaCu.size} thêm mới, ${dsMaCu.size} cập nhật`,
        tx,
      );
    },
    { timeout: 60_000 },
  );
  return { themMoi: hopLe.length - dsMaCu.size, capNhat: dsMaCu.size };
}

export async function danhSachSinhVien(tuKhoa?: string, gioiHan = 200) {
  const q = tuKhoa?.trim();
  const where = q
    ? {
        OR: [
          { maSinhVien: { contains: q, mode: "insensitive" as const } },
          { hoTen: { contains: q, mode: "insensitive" as const } },
          { lopSinhHoat: { contains: q, mode: "insensitive" as const } },
          { soCCCD: { contains: q } },
        ],
      }
    : {};
  const [ds, tong] = await Promise.all([
    prisma.sinhVien.findMany({ where, orderBy: [{ lopSinhHoat: "asc" }, { maSinhVien: "asc" }], take: gioiHan }),
    prisma.sinhVien.count({ where }),
  ]);
  return { ds, tong };
}

/** Tệp Excel mẫu: cột CCCD/mã sinh viên định dạng chữ để Excel không làm mất số 0 đầu. */
export async function mauExcelSinhVien(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Danh sách sinh viên");
  ws.columns = [
    { header: "Mã sinh viên", width: 16, style: { numFmt: "@" } },
    { header: "Số CCCD", width: 18, style: { numFmt: "@" } },
    { header: "Họ tên sinh viên", width: 30 },
    { header: "Lớp sinh hoạt", width: 16 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.addRow(["3120221001", "048203000001", "Nguyễn Văn A", "22SGT"]);
  return Buffer.from(await wb.xlsx.writeBuffer());
}
