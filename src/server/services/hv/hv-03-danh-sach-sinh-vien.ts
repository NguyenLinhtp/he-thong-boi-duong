import ExcelJS from "exceljs";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ghiThaoTac, type NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";
import { capNhatThamSo, layThamSo } from "@/server/services/qt/qt-05-tham-so";
import { chuanHoaChu, docBangTinh, timDongTieuDe } from "@/server/services/chung/bang-tinh";
import {
  CanXacNhanGhiDeSinhVienError,
  CauHinhCotSinhVienKhongHopLeError,
  DuLieuImportLoiError,
  FileImportRongError,
  type DongGhiDeSinhVien,
  type DongLoiImport,
} from "@/server/services/hv/loi-hoc-vien";

/**
 * (bổ sung 01/10/2026 - HV-03) Danh sách sinh viên của trường (dùng chung toàn
 * trường): cán bộ đào tạo import từ tệp (Excel/CSV) gồm mã sinh viên, số CCCD,
 * họ tên, lớp sinh hoạt. Là nguồn tra cứu khi thí sinh đăng ký dự thi bằng mã
 * sinh viên (HV-05). Có dòng lỗi thì không nạp dòng nào (báo chi tiết theo dòng).
 * (sửa 05/10/2026) Mỗi tệp bổ sung nạp thêm vào CSDL, không nhập trùng mã SV:
 * mã SV đã có với dữ liệu khác chỉ ghi đè khi cán bộ đào tạo xác nhận.
 * (bổ sung 05/10/2026) File mẫu thay đổi được: ngoài 4 cột cố định, cán bộ đào
 * tạo khai báo thêm cột (tham số SV_COT_BO_SUNG), giá trị lưu ở thongTinThem.
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

export const SO_DINH_DANH_TOI_DA = 30;

/**
 * (bổ sung 07/10/2026 - HV-03/HV-05/HV-06) Số định danh thí sinh: CCCD/CMND của người Việt Nam hoặc
 * số hộ chiếu/giấy tờ của người nước ngoài - chỉ cần có dữ liệu. Bỏ khoảng trắng, viết hoa
 * (vd. "p 3304738" -> "P3304738"); toàn số 11 chữ số (Excel mất số 0 đầu của CCCD) thì bù số 0.
 * null = trống hoặc dài quá 30 ký tự.
 */
export function chuanHoaSoDinhDanh(tho: string | null | undefined): string | null {
  const so = (tho ?? "").replace(/\s+/g, "").toUpperCase();
  if (!so || so.length > SO_DINH_DANH_TOI_DA) return null;
  return /^\d{11}$/.test(so) ? `0${so}` : so;
}

// ---- cột bổ sung của file mẫu (bổ sung 05/10/2026) ----

export type CotBoSungSinhVien = { ma: string; nhan: string; batBuoc: boolean };
export const THAM_SO_COT_BO_SUNG = "SV_COT_BO_SUNG";
export const SO_COT_BO_SUNG_TOI_DA = 30;
const MA_COT_HOP_LE = /^c[a-z0-9]{4,24}$/;

export async function layCotBoSungSinhVien(): Promise<CotBoSungSinhVien[]> {
  const tho = await layThamSo(THAM_SO_COT_BO_SUNG);
  if (!tho) return [];
  try {
    const ds = JSON.parse(tho);
    if (!Array.isArray(ds)) return [];
    return ds
      .filter((c) => c && MA_COT_HOP_LE.test(String(c.ma)) && String(c.nhan ?? "").trim())
      .map((c) => ({ ma: String(c.ma), nhan: String(c.nhan).trim(), batBuoc: c.batBuoc === true }));
  } catch {
    return [];
  }
}

/**
 * Lưu danh sách cột bổ sung: tên cột không trống, không trùng nhau, không trùng
 * cột cố định; giữ mã cột cũ khi đổi tên (dữ liệu đã nạp không mất), cột mới
 * được sinh mã. Bỏ 1 cột thì dữ liệu cũ của cột đó vẫn lưu nhưng không hiển thị.
 */
export async function luuCotBoSungSinhVien(tho: { ma?: string | null; nhan: string; batBuoc?: boolean }[], nguoi: NguoiThucHien) {
  if (tho.length > SO_COT_BO_SUNG_TOI_DA) throw new CauHinhCotSinhVienKhongHopLeError(`tối đa ${SO_COT_BO_SUNG_TOI_DA} cột bổ sung`);
  const daGap = new Set<string>();
  const ds: CotBoSungSinhVien[] = tho.map((c, i) => {
    const nhan = c.nhan.trim().replace(/\s+/g, " ");
    if (!nhan) throw new CauHinhCotSinhVienKhongHopLeError(`cột thứ ${i + 1} chưa có tên`);
    if (nhan.length > 50) throw new CauHinhCotSinhVienKhongHopLeError(`tên cột "${nhan.slice(0, 20)}…" quá dài (tối đa 50 ký tự)`);
    const t = chuanHoaChu(nhan);
    if (Object.values(COT).some((nhanDien) => nhanDien(t)) || t === "stt") {
      throw new CauHinhCotSinhVienKhongHopLeError(`"${nhan}" trùng với cột cố định (Mã sinh viên, Số CCCD, Họ tên, Lớp sinh hoạt) - đặt tên khác`);
    }
    if (daGap.has(t)) throw new CauHinhCotSinhVienKhongHopLeError(`trùng tên cột "${nhan}"`);
    daGap.add(t);
    const ma = c.ma && MA_COT_HOP_LE.test(c.ma) ? c.ma : `c${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
    return { ma, nhan, batBuoc: c.batBuoc === true };
  });
  await capNhatThamSo({
    ma: THAM_SO_COT_BO_SUNG,
    giaTri: JSON.stringify(ds),
    moTa: "HV-03: cột bổ sung của file mẫu danh sách sinh viên (JSON, sửa trên trang Danh sách sinh viên)",
    nguoiThucHienId: nguoi.nguoiThucHienId,
    nguoiThucHienTen: nguoi.nguoiThucHienTen,
  });
  return ds;
}

type ThongTinThem = Record<string, string>;
const docThongTinThem = (v: Prisma.JsonValue | null | undefined): ThongTinThem =>
  v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x ?? "")])) : {};
const giongNhau = (a: ThongTinThem, b: ThongTinThem) => {
  const khoa = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...khoa].every((k) => (a[k] ?? "") === (b[k] ?? ""));
};

// ---- nạp tệp ----

type DongSinhVien = {
  dong: number;
  maSinhVien: string;
  soCCCD: string;
  hoTen: string;
  lopSinhHoat: string | null;
  // chỉ các cột bổ sung có trong tệp
  thongTinThem: ThongTinThem;
};

/**
 * (sửa 05/10/2026) Phân tích tệp: lỗi theo dòng (thiếu/sai định dạng, trùng trong
 * tệp, CCCD đã gắn mã SV khác, thiếu giá trị cột bổ sung bắt buộc) và chia dòng
 * hợp lệ thành thêm mới / ghi đè (mã SV đã có, dữ liệu khác) / không đổi (trùng y hệt).
 * Cột bổ sung không có trong tệp thì giữ nguyên dữ liệu cũ.
 */
async function phanTichTepSinhVien(noiDung: Buffer, tenTep: string) {
  const [dsDong, dsCot] = await Promise.all([docBangTinh(noiDung, tenTep), layCotBoSungSinhVien()]);
  // cột bổ sung nhận diện theo đúng tên (đặt trước để cột cố định "Lớp..." không giành mất cột bổ sung)
  const nhanDien: Record<string, (t: string) => boolean> = {
    ...Object.fromEntries(dsCot.map((c) => [`x:${c.ma}`, (t: string) => t === chuanHoaChu(c.nhan)])),
    ...COT,
  };
  const tieuDe = timDongTieuDe(dsDong, nhanDien, ["maSinhVien", "soCCCD", "hoTen"]);
  if (!tieuDe) {
    throw new DuLieuImportLoiError([
      { dong: 1, loi: 'Không tìm thấy dòng tiêu đề có các cột "Mã sinh viên", "Số CCCD", "Họ tên" - hãy dùng tệp mẫu' },
    ]);
  }
  const { cot } = tieuDe;
  const dongTieuDe = dsDong[tieuDe.viTriTieuDe].soDong;
  const loi: DongLoiImport[] = [];
  for (const c of dsCot) {
    if (c.batBuoc && cot[`x:${c.ma}`] === undefined) loi.push({ dong: dongTieuDe, loi: `Thiếu cột bắt buộc "${c.nhan}" - hãy tải lại tệp mẫu` });
  }
  const cotTrongTep = dsCot.filter((c) => cot[`x:${c.ma}`] !== undefined);
  const dsDuLieu = dsDong.slice(tieuDe.viTriTieuDe + 1);
  if (dsDuLieu.length === 0) throw new FileImportRongError();

  const hopLe: DongSinhVien[] = [];
  const gapMa = new Map<string, number>();
  const gapCCCD = new Map<string, number>();
  for (const { soDong, o } of dsDuLieu) {
    const maSinhVien = (o[cot.maSinhVien!] ?? "").toUpperCase();
    const cccdTho = o[cot.soCCCD!] ?? "";
    const hoTen = (o[cot.hoTen!] ?? "").replace(/\s+/g, " ");
    const lopSinhHoat = cot.lopSinhHoat !== undefined ? o[cot.lopSinhHoat] || null : null;
    const thongTinThem: ThongTinThem = Object.fromEntries(cotTrongTep.map((c) => [c.ma, (o[cot[`x:${c.ma}`]!] ?? "").trim()]));
    const thieu = cotTrongTep.filter((c) => c.batBuoc && !thongTinThem[c.ma]);
    const daiQua = cotTrongTep.find((c) => thongTinThem[c.ma].length > 500);
    if (!maSinhVien) loi.push({ dong: soDong, loi: "Thiếu mã sinh viên" });
    else if (!MA_SINH_VIEN_HOP_LE.test(maSinhVien)) loi.push({ dong: soDong, loi: `Mã sinh viên "${maSinhVien}" không hợp lệ` });
    else if (!hoTen) loi.push({ dong: soDong, loi: "Thiếu họ tên" });
    else if (thieu.length > 0) loi.push({ dong: soDong, loi: `Thiếu ${thieu.map((c) => `"${c.nhan}"`).join(", ")}` });
    else if (daiQua) loi.push({ dong: soDong, loi: `"${daiQua.nhan}" quá dài (tối đa 500 ký tự)` });
    else {
      // (sửa 07/10/2026) người nước ngoài: số hộ chiếu khác định dạng CCCD - chỉ cần có dữ liệu
      const soCCCD = chuanHoaSoDinhDanh(cccdTho);
      if (!soCCCD) loi.push({ dong: soDong, loi: cccdTho.trim() ? `Số CCCD/hộ chiếu "${cccdTho}" dài quá ${SO_DINH_DANH_TOI_DA} ký tự` : "Thiếu số CCCD/hộ chiếu" });
      else if (gapMa.has(maSinhVien)) loi.push({ dong: soDong, loi: `Trùng mã sinh viên với dòng ${gapMa.get(maSinhVien)}` });
      else if (gapCCCD.has(soCCCD)) loi.push({ dong: soDong, loi: `Trùng số CCCD với dòng ${gapCCCD.get(soCCCD)}` });
      else {
        gapMa.set(maSinhVien, soDong);
        gapCCCD.set(soCCCD, soDong);
        hopLe.push({ dong: soDong, maSinhVien, soCCCD, hoTen, lopSinhHoat, thongTinThem });
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
  loi.sort((a, b) => a.dong - b.dong);

  const dsCu = new Map(
    (await prisma.sinhVien.findMany({ where: { maSinhVien: { in: hopLe.map((h) => h.maSinhVien) } } })).map((s) => [s.maSinhVien, s]),
  );
  const themMoi: DongSinhVien[] = [];
  const ghiDe: DongGhiDeSinhVien[] = [];
  let khongDoi = 0;
  for (const h of hopLe) {
    const cu = dsCu.get(h.maSinhVien);
    if (!cu) {
      themMoi.push(h);
      continue;
    }
    const thongTinCu = docThongTinThem(cu.thongTinThem);
    const thongTinMoi = { ...thongTinCu, ...h.thongTinThem };
    if (cu.hoTen === h.hoTen && cu.soCCCD === h.soCCCD && cu.lopSinhHoat === h.lopSinhHoat && giongNhau(thongTinCu, thongTinMoi)) khongDoi++;
    else
      ghiDe.push({
        dong: h.dong,
        maSinhVien: h.maSinhVien,
        cu: { hoTen: cu.hoTen, soCCCD: cu.soCCCD, lopSinhHoat: cu.lopSinhHoat, thongTinThem: thongTinCu },
        moi: { hoTen: h.hoTen, soCCCD: h.soCCCD, lopSinhHoat: h.lopSinhHoat, thongTinThem: thongTinMoi },
      });
  }
  return { loi, themMoi, ghiDe, khongDoi };
}

/**
 * (sửa 05/10/2026) Bước 1 - kiểm tra tệp, chưa ghi gì: trả về số dòng thêm mới,
 * danh sách mã SV sẽ bị ghi đè (dữ liệu cũ/mới) để cán bộ xác nhận. Có dòng lỗi thì ném lỗi theo dòng.
 */
export async function kiemTraImportSinhVien(noiDung: Buffer, tenTep: string) {
  const { loi, themMoi, ghiDe, khongDoi } = await phanTichTepSinhVien(noiDung, tenTep);
  if (loi.length > 0) throw new DuLieuImportLoiError(loi);
  return { themMoi: themMoi.length, ghiDe, khongDoi };
}

/**
 * Bước 2 - nạp: thêm mã SV mới, bỏ qua dòng trùng y hệt; mã SV đã có với dữ
 * liệu khác chỉ ghi đè khi cán bộ đã xác nhận đúng các mã đó (dsMaXacNhanGhiDe) -
 * dữ liệu đổi giữa 2 bước làm phát sinh mã cần ghi đè mới thì cảnh báo lại, chưa nạp dòng nào.
 */
export async function importDanhSachSinhVien(
  noiDung: Buffer,
  tenTep: string,
  nguoi: NguoiThucHien,
  dsMaXacNhanGhiDe: string[] = [],
) {
  const { loi, themMoi, ghiDe, khongDoi } = await phanTichTepSinhVien(noiDung, tenTep);
  if (loi.length > 0) throw new DuLieuImportLoiError(loi);
  const daXacNhan = new Set(dsMaXacNhanGhiDe.map((m) => m.trim().toUpperCase()));
  if (ghiDe.some((g) => !daXacNhan.has(g.maSinhVien))) throw new CanXacNhanGhiDeSinhVienError(ghiDe);

  await prisma.$transaction(
    async (tx) => {
      if (themMoi.length > 0) {
        await tx.sinhVien.createMany({
          data: themMoi.map(({ maSinhVien, soCCCD, hoTen, lopSinhHoat, thongTinThem }) => ({
            maSinhVien,
            soCCCD,
            hoTen,
            lopSinhHoat,
            thongTinThem: Object.keys(thongTinThem).length > 0 ? thongTinThem : Prisma.DbNull,
          })),
        });
      }
      for (const g of ghiDe) await tx.sinhVien.update({ where: { maSinhVien: g.maSinhVien }, data: g.moi });
      await ghiThaoTac(
        nguoi,
        "IMPORT_DANH_SACH_SINH_VIEN",
        "SinhVien",
        "import",
        `${tenTep}: ${themMoi.length} thêm mới, ${ghiDe.length} ghi đè (đã xác nhận${ghiDe.length ? `: ${ghiDe.map((g) => g.maSinhVien).join(", ")}` : ""}), ${khongDoi} trùng không đổi`,
        tx,
      );
    },
    { timeout: 60_000 },
  );
  return { themMoi: themMoi.length, ghiDe: ghiDe.length, khongDoi };
}

export async function danhSachSinhVien(tuKhoa?: string, gioiHan = 200, boQua = 0) {
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
    prisma.sinhVien.findMany({ where, orderBy: [{ lopSinhHoat: "asc" }, { maSinhVien: "asc" }], skip: boQua, take: gioiHan }),
    prisma.sinhVien.count({ where }),
  ]);
  return { ds: ds.map((sv) => ({ ...sv, thongTinThem: docThongTinThem(sv.thongTinThem) })), tong };
}

/**
 * Tệp Excel mẫu: 4 cột cố định + các cột bổ sung đã khai báo (cột bắt buộc có dấu *
 * trong ghi chú ô tiêu đề). Cột CCCD/mã sinh viên định dạng chữ để Excel không làm mất số 0 đầu.
 */
export async function mauExcelSinhVien(): Promise<Buffer> {
  const dsCot = await layCotBoSungSinhVien();
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Danh sách sinh viên");
  ws.columns = [
    { header: "Mã sinh viên", width: 16, style: { numFmt: "@" } },
    { header: "Số CCCD", width: 18, style: { numFmt: "@" } },
    { header: "Họ tên sinh viên", width: 30 },
    { header: "Lớp sinh hoạt", width: 16 },
    ...dsCot.map((c) => ({ header: c.nhan, width: Math.max(14, c.nhan.length + 4), style: { numFmt: "@" } })),
  ];
  const tieuDe = ws.getRow(1);
  tieuDe.font = { bold: true };
  [1, 2, 3, ...dsCot.map((c, i) => (c.batBuoc ? 5 + i : 0)).filter(Boolean)].forEach((so) => {
    tieuDe.getCell(so).note = "Bắt buộc";
  });
  ws.addRow(["3120221001", "048203000001", "Nguyễn Văn A", "22SGT", ...dsCot.map(() => "")]);
  return Buffer.from(await wb.xlsx.writeBuffer());
}
