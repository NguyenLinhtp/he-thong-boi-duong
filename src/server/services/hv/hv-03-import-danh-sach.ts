import { prisma } from "@/lib/db/prisma";
import { dieuKienChiemCho } from "@/server/services/kh/kh-05-trang-thai-si-so";
import { timHoacTaoHocVien } from "@/server/services/hv/dung-chung";
import {
  KhongTimThayKhoaError,
  SaiPhuongThucDangKyError,
  KhoaKhongConNhanImportError,
  ImportVuotSiSoToiDaError,
  DuLieuImportLoiError,
  FileImportRongError,
  type DongLoiImport,
} from "@/server/services/hv/loi-hoc-vien";
import { chuanHoaSoDinhDanh } from "@/server/services/hv/hv-03-danh-sach-sinh-vien";
import { NHAN_TRANG_THAI_DANG_KY, timDangKyTrongKhoa } from "@/server/services/hv/kiem-tra-trung-khoa";
import { cauHinhHieuLuc, luuHoSoBoSung } from "@/server/services/hv/form-dang-ky";
import { chuanHoaChu, docBangTinh, maKhoaTrongTep, taoBangExcel, timDongTieuDe } from "@/server/services/chung/bang-tinh";
import { kiemTraDuLieu, tenInput, type CauHinhForm, type KetQuaKiemTra, type TruongForm } from "@/lib/form-dang-ky";
import { layThamSoSo } from "@/server/services/qt/qt-05-tham-so";

/**
 * HV-03 (Phương thức 2) - (sửa 08/10/2026) danh sách học viên được cử đi học nhập theo FORM ĐĂNG KÝ
 * của khóa: tệp mẫu (Excel) tải từ hệ thống có cột Họ và tên, Số CCCD/hộ chiếu (luôn có, bắt buộc)
 * và mỗi trường đang hiện của form đăng ký (trừ tệp minh chứng, trường cố định), đánh dấu (*) trường
 * bắt buộc, có danh sách chọn cho trường chọn. Khi nạp: nhận cột theo tên tiêu đề (không theo thứ tự),
 * kiểm tra định dạng như form (ngày, số, email, danh sách chọn); trường bắt buộc để trống vẫn nhận -
 * học viên bổ sung khi tự xác nhận tham gia (HV-04). Vẫn đọc tệp CSV cũ "hoTen,soCCCD,...".
 */

type CotNhap = { ma: string; nhan: string; batBuoc: boolean; truong?: TruongForm; luaChon?: string[] };

const KHOA_HO_TEN = "hoTen";
const KHOA_CCCD = "soCCCD";

async function cotNhapCuaKhoa(khoaId: string) {
  const { cauHinh } = await cauHinhHieuLuc(khoaId);
  const dsChucDanh = await prisma.chucDanhHocVi.findMany({ select: { id: true, ten: true }, orderBy: { ten: "asc" } });
  const cot: CotNhap[] = [
    { ma: KHOA_HO_TEN, nhan: "Họ và tên", batBuoc: true },
    { ma: KHOA_CCCD, nhan: "Số CCCD/hộ chiếu", batBuoc: true },
  ];
  for (const t of cauHinh.truong) {
    if (!t.hien || t.coDinh || t.kieu === "TEP") continue;
    const luaChon = t.ma === "chucDanhHocViId" ? dsChucDanh.map((c) => c.ten) : t.luaChon.length > 0 ? t.luaChon : undefined;
    cot.push({ ma: tenInput(t), nhan: t.nhan, batBuoc: t.batBuoc, truong: t, luaChon });
  }
  return { cauHinh, cot, dsChucDanh };
}

/** Tiêu đề cột trong tệp mẫu: tên trường + (*) nếu bắt buộc. */
const tieuDeCot = (c: CotNhap) => `${c.nhan}${c.batBuoc ? " (*)" : ""}`;

/** Danh sách cột của tệp mẫu (hiển thị hướng dẫn trên màn hình nạp). */
export async function cotMauImport(khoaId: string) {
  return (await cotNhapCuaKhoa(khoaId)).cot.map(tieuDeCot);
}

/** Bỏ dấu (*), phần ghi chú trong ngoặc, dấu cách thừa - để so tiêu đề cột. */
const goc = (s: string) => chuanHoaChu(s.replace(/\(\*\)|\*/g, "").replace(/\([^)]*\)/g, ""));

function khopTieuDe(c: CotNhap, t: string): boolean {
  const h = goc(t);
  const gon = h.replace(/\s/g, "");
  if (c.ma === KHOA_HO_TEN) return ["ho ten", "ho va ten"].includes(h) || gon === "hoten";
  if (c.ma === KHOA_CCCD) return /cccd|ho chieu|cmnd|dinh danh|ma so/.test(chuanHoaChu(t)) || gon === "socccd";
  return h === goc(c.nhan) || gon === c.ma.toLowerCase() || gon === (c.truong?.ma ?? "").toLowerCase();
}

/** "01/02/1990", "1-2-1990", "1990-02-01" -> "1990-02-01"; không nhận dạng được -> null. */
function ngayChoForm(giaTri: string): string | null {
  const v = giaTri.trim();
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

export async function mauExcelImportKhoa(khoaId: string) {
  const khoa = await prisma.khoa.findUnique({ where: { id: khoaId }, include: { chuongTrinh: true } });
  if (!khoa) throw new KhongTimThayKhoaError();
  const { cot } = await cotNhapCuaKhoa(khoaId);
  return taoBangExcel(
    "Danh sách",
    [
      "DANH SÁCH HỌC VIÊN ĐƯỢC CỬ ĐI HỌC",
      khoa.tenKhoa ?? khoa.chuongTrinh.ten,
      `Mã khóa: ${khoa.maKhoa}`,
      "Cột có dấu (*) là trường bắt buộc của form đăng ký - để trống thì học viên bổ sung khi xác nhận tham gia (riêng Họ và tên, Số CCCD/hộ chiếu phải có). " +
        "Ngày ghi dd/mm/yyyy. Cột có danh sách chọn: chọn đúng 1 giá trị trong danh sách.",
    ],
    cot.map((c) => ({ tieuDe: tieuDeCot(c), rong: Math.min(Math.max(c.nhan.length + 6, 16), 40), luaChon: c.luaChon })),
    Array.from({ length: 200 }, () => cot.map(() => null)),
  );
}

type DongHopLe = { soDong: number; hoTen: string; soCCCD: string; ketQua: KetQuaKiemTra };

async function docTep(khoaId: string, maKhoa: string, noiDung: string | Buffer, tenTep: string) {
  const dsDong = await docBangTinh(typeof noiDung === "string" ? Buffer.from(noiDung, "utf8") : noiDung, tenTep);
  const { cauHinh, cot, dsChucDanh } = await cotNhapCuaKhoa(khoaId);
  const nhanDien = Object.fromEntries(cot.map((c) => [c.ma, (t: string) => khopTieuDe(c, t)]));
  const tieuDe = timDongTieuDe(dsDong, nhanDien, [KHOA_HO_TEN, KHOA_CCCD]);
  if (!tieuDe) {
    if (dsDong.length <= 1) throw new FileImportRongError();
    throw new DuLieuImportLoiError([{ dong: 1, loi: "Không tìm thấy dòng tiêu đề có cột Họ và tên và Số CCCD/hộ chiếu - tải tệp mẫu của khóa để nhập" }]);
  }
  const maTrongTep = maKhoaTrongTep(dsDong, tieuDe.viTriTieuDe);
  if (maTrongTep && maTrongTep !== maKhoa) {
    throw new DuLieuImportLoiError([{ dong: 1, loi: `Tệp mẫu của khóa ${maTrongTep}, không phải khóa ${maKhoa}` }]);
  }
  const dsDuLieu = dsDong.slice(tieuDe.viTriTieuDe + 1);
  if (dsDuLieu.length === 0) throw new FileImportRongError();

  // kiểm tra định dạng như form đăng ký nhưng không bắt buộc (học viên bổ sung khi xác nhận)
  const cauHinhNhap: CauHinhForm = { ...cauHinh, truong: cauHinh.truong.map((t) => ({ ...t, batBuoc: false })) };
  const toiDaMb = await layThamSoSo("DK_MINH_CHUNG_TOI_DA_MB", 10);
  const hopLe: DongHopLe[] = [];
  const loi: DongLoiImport[] = [];
  const daGap = new Set<string>();

  for (const dong of dsDuLieu) {
    const o = (ma: string) => {
      const i = tieuDe.cot[ma];
      return i === undefined ? "" : (dong.o[i] ?? "").trim();
    };
    const hoTen = o(KHOA_HO_TEN);
    const cccdTho = o(KHOA_CCCD);
    // (bổ sung 08/10/2026) chuẩn hóa số CCCD như danh sách sinh viên (bỏ khoảng trắng, viết hoa, bù số 0
    // đầu khi Excel làm mất) - cùng 1 người luôn khớp đúng 1 hồ sơ học viên/tài khoản
    const soCCCD = chuanHoaSoDinhDanh(cccdTho);
    if (!hoTen) {
      loi.push({ dong: dong.soDong, loi: "Thiếu họ tên" });
      continue;
    }
    if (!soCCCD) {
      loi.push({ dong: dong.soDong, loi: cccdTho ? `CCCD/mã số "${cccdTho}" dài quá 30 ký tự` : "Thiếu CCCD/mã số" });
      continue;
    }
    if (daGap.has(soCCCD)) {
      loi.push({ dong: dong.soDong, loi: `Trùng CCCD/mã số "${soCCCD}" với 1 dòng khác trong file` });
      continue;
    }
    daGap.add(soCCCD);

    const giaTri: Record<string, string> = {};
    let loiDong: string | null = null;
    for (const c of cot) {
      const t = c.truong;
      const v = o(c.ma);
      if (!t || !v) continue;
      if (t.kieu === "NGAY") {
        const ngay = ngayChoForm(v);
        if (!ngay) {
          loiDong = `"${t.nhan}": "${v}" không đúng dạng ngày dd/mm/yyyy`;
          break;
        }
        giaTri[c.ma] = ngay;
      } else if (t.ma === "chucDanhHocViId") {
        const cd = dsChucDanh.find((x) => chuanHoaChu(x.ten) === chuanHoaChu(v) || x.id === v);
        if (!cd) {
          loiDong = `"${t.nhan}": "${v}" không có trong danh mục`;
          break;
        }
        giaTri[c.ma] = cd.id;
      } else if (t.luaChon.length > 0) {
        // chọn trong danh sách: không phân biệt hoa thường/dấu cách thừa
        giaTri[c.ma] = t.luaChon.find((x) => chuanHoaChu(x) === chuanHoaChu(v)) ?? v;
      } else {
        giaTri[c.ma] = v;
      }
    }
    if (loiDong) {
      loi.push({ dong: dong.soDong, loi: loiDong });
      continue;
    }
    const kq = kiemTraDuLieu(cauHinhNhap, { giaTri, tep: {} }, { dsChucDanhId: dsChucDanh.map((c) => c.id), toiDaMb });
    if ("loi" in kq) {
      loi.push({ dong: dong.soDong, loi: kq.loi });
      continue;
    }
    hopLe.push({ soDong: dong.soDong, hoTen, soCCCD, ketQua: kq.ketQua });
  }
  return { hopLe, loi };
}

/**
 * HV-03 (Phương thức 2): import "trước khi mở đăng ký" - chỉ chặn khi khóa
 * đã qua hẳn giai đoạn tuyển sinh (Đang diễn ra/Đã kết thúc/Hủy), vẫn cho
 * phép ở Chuẩn bị lẫn Đang tuyển sinh. Có dòng lỗi thì không nạp dòng nào.
 */
export async function importDanhSachHocVien(khoaId: string, noiDung: string | Buffer, tenTep = "danh-sach.csv") {
  const khoa = await prisma.khoa.findUnique({
    where: { id: khoaId },
    include: { chuongTrinh: true },
  });
  if (!khoa) throw new KhongTimThayKhoaError();

  if (!khoa.chuongTrinh.phuongThucDangKys.includes("IMPORT_TU_XAC_NHAN")) {
    throw new SaiPhuongThucDangKyError("Phương thức 2 (import danh sách, học viên tự xác nhận)");
  }
  if (["DANG_DIEN_RA", "DA_KET_THUC", "HUY"].includes(khoa.trangThai)) {
    throw new KhoaKhongConNhanImportError();
  }

  const { hopLe, loi } = await docTep(khoaId, khoa.maKhoa, noiDung, tenTep);

  for (const hang of hopLe) {
    // (sửa 08/10/2026) tìm theo cả cách ghi cũ của số CCCD (vd. thiếu số 0 đầu) - kể cả người đã tự đăng ký vào khóa
    const daDangKyKhoaNay = await timDangKyTrongKhoa(khoaId, { soCCCD: hang.soCCCD });
    if (daDangKyKhoaNay) {
      loi.push({
        dong: hang.soDong,
        loi: `CCCD/mã số "${hang.soCCCD}" đã tồn tại trong khóa này (hồ sơ ${daDangKyKhoaNay.hocVien.maHocVien} - ${NHAN_TRANG_THAI_DANG_KY[daDangKyKhoaNay.trangThai] ?? daDangKyKhoaNay.trangThai})`,
      });
    }
  }

  if (loi.length > 0) throw new DuLieuImportLoiError(loi.sort((a, b) => a.dong - b.dong));

  const siSoHienTai = await prisma.dangKyHoc.count({ where: dieuKienChiemCho(khoaId) });
  const choConLai = khoa.siSoToiDa - siSoHienTai;
  if (hopLe.length > choConLai) {
    throw new ImportVuotSiSoToiDaError(Math.max(choConLai, 0));
  }

  const ketQua = [];
  for (const hang of hopLe) {
    const c = hang.ketQua.coSan;
    const hocVien = await timHoacTaoHocVien({
      hoTen: hang.hoTen,
      soCCCD: hang.soCCCD,
      ngaySinh: c.ngaySinh,
      donViCongTac: c.donViCongTac,
      soDienThoai: c.soDienThoai,
      email: c.email,
      chucDanhHocViId: c.chucDanhHocViId,
    });
    const dangKy = await prisma.dangKyHoc.create({
      data: { hocVienId: hocVien.id, khoaId, trangThai: "CHO_TU_XAC_NHAN" },
      include: { hocVien: true },
    });
    // trường tùy chỉnh của form lưu kèm hồ sơ đăng ký (như khi học viên tự đăng ký)
    await luuHoSoBoSung(dangKy.id, { coSan: {}, boSung: hang.ketQua.boSung, tep: [] });
    ketQua.push(dangKy);
  }

  return ketQua;
}

export async function danhSachChoTuXacNhan(khoaId: string) {
  return prisma.dangKyHoc.findMany({
    where: { khoaId, trangThai: "CHO_TU_XAC_NHAN" },
    include: { hocVien: true },
    orderBy: { ngayDangKy: "asc" },
  });
}
