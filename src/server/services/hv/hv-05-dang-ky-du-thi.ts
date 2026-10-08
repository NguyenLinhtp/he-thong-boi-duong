import path from "node:path";
import QRCode from "qrcode";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { MA_TEP_NOP_PHI, tenInput, type CauHinhForm, type TepGui } from "@/lib/form-dang-ky";
import { chuoiVietQR, noiDungChuyenKhoan } from "@/lib/viet-qr";
import { cauHinhHieuLuc, luuHoSoBoSung } from "@/server/services/hv/form-dang-ky";
import { coTheNhanDangKy } from "@/server/services/kh/kh-05-trang-thai-si-so";
import { timHoacTaoHocVien, type ThongTinHocVienInput, chuanBiThongTinDangKy } from "@/server/services/hv/dung-chung";
import {
  KhongTimThayKhoaError,
  KhongTimThayDangKyError,
  SaiPhuongThucDangKyError,
  KhoaKhongMoDangKyError,
  DaDangKyKhoaNayError,
  SinhVienKhongCoTrongDanhSachError,
  SoDienThoaiXacThucKhongHopLeError,
  DaDangKyDuThiKhacSoDienThoaiError,
  NopMinhChungLePhiError,
  LaSinhVienCuaTruongError,
  ThongTinDangKyKhongHopLeError,
} from "@/server/services/hv/loi-hoc-vien";
import { chuanHoaSoDinhDanh, layCotBoSungSinhVien } from "@/server/services/hv/hv-03-danh-sach-sinh-vien";
import { ghiThaoTac } from "@/server/services/qt/qt-03-nhat-ky";
import { guiThongBao } from "@/server/services/hv/hv-10-thong-bao";
import { kiemTraLuaChonThanhPhan, taoLePhiTheoThanhPhan, thanhPhanCuaDangKy } from "@/server/services/hp/hp-01-thanh-phan-le-phi";
import { taoLePhiKhiDangKyDuThi } from "@/server/services/hp/hp-01-thiet-lap";
import { layThamSo, layThamSoSo } from "@/server/services/qt/qt-05-tham-so";
import { dinhDangTien } from "@/lib/dinh-dang";

export type DangKyDuThiInput = ThongTinHocVienInput & {
  khoaId: string;
  // (bổ sung 01/10/2026) form mã sinh viên nhưng thí sinh chọn "Thí sinh tự do" (không phải sinh viên của trường)
  laThiSinhTuDo?: boolean;
  // (bổ sung 06/10/2026) khóa chia thành phần lệ phí: id các thành phần tùy chọn thí sinh tick
  // (thành phần bắt buộc luôn được tính)
  dsThanhPhan?: string[];
};

async function khoaDuThiDangMo(khoaId: string) {
  const khoa = await prisma.khoa.findUnique({
    where: { id: khoaId },
    include: { chuongTrinh: true },
  });
  if (!khoa) throw new KhongTimThayKhoaError();
  if (khoa.chuongTrinh.phuongThucDangKy !== "CHI_DU_THI") {
    throw new SaiPhuongThucDangKyError("Phương thức 3 (đăng ký dự thi, không qua học)");
  }
  if (!(await coTheNhanDangKy(khoa.id))) throw new KhoaKhongMoDangKyError();
  return khoa;
}

const chuanMaSinhVien = (s: string | null | undefined) => (s ?? "").trim().toUpperCase();

/**
 * (bổ sung 01/10/2026) Thí sinh gõ mã sinh viên -> hiện họ tên, lớp sinh hoạt
 * để tự kiểm tra. KHÔNG trả về CCCD (người khác gõ thử mã SV không thấy được
 * số định danh); chỉ tra được trên khóa đang mở đăng ký bằng mã sinh viên.
 */
export async function traCuuSinhVienDuThi(khoaId: string, maSinhVien: string) {
  const khoa = await khoaDuThiDangMo(khoaId);
  const { cauHinh } = await cauHinhHieuLuc(khoa.id);
  if (cauHinh.dinhDanh !== "MA_SINH_VIEN") throw new SinhVienKhongCoTrongDanhSachError();
  const sv = await prisma.sinhVien.findUnique({ where: { maSinhVien: chuanMaSinhVien(maSinhVien) } });
  if (!sv) throw new SinhVienKhongCoTrongDanhSachError();
  // (sửa 07/10/2026) hiện đầy đủ số CCCD/hộ chiếu để thí sinh kiểm tra, sai thì sửa lại trên form;
  // các cột bổ sung của danh sách (ngày sinh, nơi sinh...) điền sẵn vào ô cùng tên của form đăng ký
  return {
    maSinhVien: sv.maSinhVien,
    hoTen: sv.hoTen,
    lopSinhHoat: sv.lopSinhHoat,
    soCCCD: sv.soCCCD,
    dienForm: await giaTriFormTuDanhSach(cauHinh, sv.thongTinThem),
  };
}

// so tên cột/tên ô không phân biệt hoa thường, bỏ phần ghi chú trong ngoặc: "Nơi sinh (tỉnh/thành phố)" ~ "Nơi sinh"
const chuanNhan = (s: string) =>
  s
    .normalize("NFC")
    .replace(/\([^)]*\)/g, " ")
    .trim()
    .toLowerCase()
    .replace(/[\s:]+$/g, "")
    .replace(/\s+/g, " ");

/** "01/02/2004", "1-2-2004", "2004-02-01" -> "2004-02-01" (ô ngày của form); không nhận dạng được -> null. */
function ngayChoForm(giaTri: string): string | null {
  const v = giaTri.trim();
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

/**
 * (bổ sung 07/10/2026) Ghép cột bổ sung của danh sách sinh viên (HV-03) với trường cùng tên trong
 * form đăng ký của khóa (không phân biệt hoa thường): trả về { tên ô của form: giá trị }. Bỏ qua
 * tệp minh chứng, trường cố định; ô ngày đổi về yyyy-mm-dd; danh sách chọn chỉ điền khi khớp 1 lựa chọn.
 */
async function giaTriFormTuDanhSach(cauHinh: CauHinhForm, thongTinThem: unknown): Promise<Record<string, string>> {
  const giaTri = thongTinThem && typeof thongTinThem === "object" ? (thongTinThem as Record<string, string>) : {};
  const theoNhan = new Map((await layCotBoSungSinhVien()).map((c) => [chuanNhan(c.nhan), (giaTri[c.ma] ?? "").trim()]));
  const kq: Record<string, string> = {};
  for (const t of cauHinh.truong) {
    if (!t.hien || t.coDinh || t.kieu === "TEP" || t.ma === "chucDanhHocViId") continue;
    const v = theoNhan.get(chuanNhan(t.nhan));
    if (!v) continue;
    if (t.kieu === "NGAY") {
      const ngay = ngayChoForm(v);
      if (ngay) kq[tenInput(t)] = ngay;
    } else if (t.luaChon.length > 0 || t.kieu === "LUA_CHON") {
      const khop = t.luaChon.find((l) => chuanNhan(l) === chuanNhan(v));
      if (khop) kq[tenInput(t)] = khop;
    } else kq[tenInput(t)] = v;
  }
  return kq;
}

export const NHAN_TRUONG_SUA: Record<string, string> = { hoTen: "Họ tên", soCCCD: "Số CCCD/hộ chiếu", lopSinhHoat: "Lớp sinh hoạt" };

/**
 * (bổ sung 07/10/2026) Thí sinh sửa thông tin tự điền từ danh sách sinh viên (họ tên, số CCCD/hộ
 * chiếu, lớp) khi danh sách sai. Trả về giá trị dùng cho hồ sơ + phần chênh lệch (cũ/mới) để lưu
 * vào hồ sơ đăng ký cho cán bộ đối chiếu. Số CCCD/hộ chiếu sửa không được trùng sinh viên/học viên khác.
 */
async function thongTinSinhVienDaSua(
  sv: { maSinhVien: string; hoTen: string; soCCCD: string; lopSinhHoat: string | null },
  input: { hoTen?: string | null; soCCCD?: string | null; lopSinhHoat?: string | null },
) {
  const hoTen = (input.hoTen ?? "").trim().replace(/\s+/g, " ") || sv.hoTen;
  const lopSinhHoat = (input.lopSinhHoat ?? "").trim() || sv.lopSinhHoat;
  let soCCCD = sv.soCCCD;
  if ((input.soCCCD ?? "").trim()) {
    const moi = chuanHoaSoDinhDanh(input.soCCCD);
    if (!moi) throw new ThongTinDangKyKhongHopLeError("Số CCCD/hộ chiếu không hợp lệ (tối đa 30 ký tự)");
    soCCCD = moi;
  }
  if (hoTen.length > 200) throw new ThongTinDangKyKhongHopLeError("Họ tên quá dài");
  if (lopSinhHoat && lopSinhHoat.length > 50) throw new ThongTinDangKyKhongHopLeError("Lớp sinh hoạt quá dài");
  if (soCCCD !== sv.soCCCD) {
    const [svKhac, hvKhac] = await Promise.all([
      prisma.sinhVien.findUnique({ where: { soCCCD } }),
      prisma.hocVien.findUnique({ where: { soCCCD } }),
    ]);
    if ((svKhac && svKhac.maSinhVien !== sv.maSinhVien) || (hvKhac && hvKhac.maSinhVien !== sv.maSinhVien)) {
      throw new ThongTinDangKyKhongHopLeError("Số CCCD/hộ chiếu đã gắn với thí sinh khác - vui lòng liên hệ phòng đào tạo");
    }
  }
  const sua: Record<string, { cu: string | null; moi: string | null }> = {};
  if (hoTen !== sv.hoTen) sua.hoTen = { cu: sv.hoTen, moi: hoTen };
  if (soCCCD !== sv.soCCCD) sua.soCCCD = { cu: sv.soCCCD, moi: soCCCD };
  if ((lopSinhHoat ?? null) !== (sv.lopSinhHoat ?? null)) sua.lopSinhHoat = { cu: sv.lopSinhHoat, moi: lopSinhHoat };
  return { hoTen, soCCCD, lopSinhHoat, sua: Object.keys(sua).length > 0 ? sua : null };
}

async function laySinhVien(maSinhVien: string | null | undefined) {
  const sv = await prisma.sinhVien.findUnique({ where: { maSinhVien: chuanMaSinhVien(maSinhVien) } });
  if (!sv) throw new SinhVienKhongCoTrongDanhSachError();
  return sv;
}

/**
 * (sửa 05/10/2026) Số điện thoại xác thực thí sinh dự thi (thay 4 số cuối CCCD):
 * bỏ dấu cách/chấm/gạch, +84/84 đầu số đổi thành 0; hợp lệ = 10 chữ số bắt đầu bằng 0.
 */
export function chuanHoaSoDienThoai(tho: string | null | undefined): string | null {
  let so = (tho ?? "").replace(/[\s.\-()]/g, "");
  if (so.startsWith("+84")) so = `0${so.slice(3)}`;
  else if (/^84\d{9}$/.test(so)) so = `0${so.slice(2)}`;
  return /^0\d{9}$/.test(so) ? so : null;
}

// hồ sơ đăng ký trước khi có số điện thoại xác thực: dùng số điện thoại trong hồ sơ học viên
const khopSoDienThoai = (
  dk: { soDienThoaiXacThuc: string | null; hocVien: { soDienThoai: string | null } },
  soDienThoai: string,
) => chuanHoaSoDienThoai(dk.soDienThoaiXacThuc ?? dk.hocVien.soDienThoai) === soDienThoai;

const dieuKienTheoSinhVien = (sv: { maSinhVien: string; soCCCD: string }): Prisma.HocVienWhereInput => ({
  OR: [{ maSinhVien: sv.maSinhVien }, { soCCCD: sv.soCCCD }],
});

/**
 * (bổ sung 01/10/2026) Thí sinh mở lại đơn đã đăng ký (in lại, nộp minh chứng
 * chuyển khoản) - dùng được cả khi đã hết hạn đăng ký. Trả về mã hồ sơ (đường link đơn).
 * (sửa 05/10/2026) sinh viên: mã sinh viên + số điện thoại; thí sinh tự do/form
 * định danh CCCD: số CCCD + số điện thoại đã khai khi đăng ký.
 */
export type ThongTinTimLaiDon = { maSinhVien?: string | null; soCCCD?: string | null; soDienThoai?: string | null };

export async function timLaiDonDuThi(khoaId: string, tt: ThongTinTimLaiDon) {
  const khoa = await prisma.khoa.findUnique({ where: { id: khoaId }, include: { chuongTrinh: true } });
  if (!khoa) throw new KhongTimThayKhoaError();
  if (khoa.chuongTrinh.phuongThucDangKy !== "CHI_DU_THI") throw new SaiPhuongThucDangKyError("Phương thức 3 (đăng ký dự thi, không qua học)");
  const { cauHinh } = await cauHinhHieuLuc(khoa.id);
  const soDienThoai = chuanHoaSoDienThoai(tt.soDienThoai);
  if (!soDienThoai) throw new SoDienThoaiXacThucKhongHopLeError();
  let dieuKien: Prisma.HocVienWhereInput;
  if (cauHinh.dinhDanh === "MA_SINH_VIEN" && tt.maSinhVien?.trim()) {
    dieuKien = dieuKienTheoSinhVien(await laySinhVien(tt.maSinhVien));
  } else {
    const soCCCD = chuanHoaSoDinhDanh(tt.soCCCD);
    if (!soCCCD) throw new KhongTimThayDangKyError();
    dieuKien = { soCCCD };
  }
  const dangKy = await prisma.dangKyHoc.findFirst({ where: { khoaId: khoa.id, hocVien: dieuKien }, include: { hocVien: true } });
  if (!dangKy || !khopSoDienThoai(dangKy, soDienThoai)) throw new KhongTimThayDangKyError();
  return dangKy.id;
}

/**
 * Đã có hồ sơ của mã SV/CCCD này trong khóa: đúng số điện thoại đã khai thì mở
 * lại đơn cũ, sai thì báo đã đăng ký (không trả về mã hồ sơ của người khác).
 */
async function chanDangKyTrung(khoaId: string, dieuKien: Prisma.HocVienWhereInput, soDienThoai: string, theo: "mã sinh viên" | "số CCCD") {
  const daCo = await prisma.dangKyHoc.findFirst({ where: { khoaId, hocVien: dieuKien }, include: { hocVien: true } });
  if (!daCo) return;
  if (khopSoDienThoai(daCo, soDienThoai)) throw new DaDangKyKhoaNayError(daCo.id);
  throw new DaDangKyDuThiKhacSoDienThoaiError(theo);
}

/**
 * HV-05 (Phương thức 3): học viên tự đăng ký dự thi cho 1 khóa/đợt thi
 * ("Đợt thi đăng ký" = khóa được chọn), không qua giai đoạn học tập. Không
 * có bước nộp giấy riêng như Phương thức 1 nên hồ sơ vào thẳng CHO_DUYET
 * (mặc định của DangKyHoc). "Khóa thuộc Phương thức 3 không áp dụng điểm
 * danh/giảng dạy" - module GD tự kiểm tra phuongThucDangKy.
 *
 * (bổ sung 01/10/2026) Form định danh bằng mã sinh viên: họ tên, CCCD, lớp
 * lấy từ danh sách sinh viên đã import (HV-03), thí sinh xác thực bằng số điện
 * thoại (sửa 05/10/2026, thay 4 số cuối CCCD); lệ phí phát sinh ngay khi đăng ký (thí sinh chuyển khoản theo mã
 * QR rồi nộp minh chứng, cán bộ tài chính đối soát - HP-02).
 */
export async function dangKyDuThi(input: DangKyDuThiInput) {
  const khoa = await khoaDuThiDangMo(input.khoaId);
  const { cauHinh } = await cauHinhHieuLuc(khoa.id);
  await kiemTraLuaChonThanhPhan(khoa.id, input.dsThanhPhan);

  // (sửa 05/10/2026) số điện thoại xác thực bắt buộc ở mọi form dự thi (trường "Số điện thoại" của form)
  const soDienThoai = chuanHoaSoDienThoai(input.duLieuForm ? input.duLieuForm.giaTri.soDienThoai : input.soDienThoai);
  if (!soDienThoai) throw new SoDienThoaiXacThucKhongHopLeError();

  let thongTinGoc: ThongTinHocVienInput = input;
  let suaThongTin: Awaited<ReturnType<typeof thongTinSinhVienDaSua>>["sua"] = null;
  if (cauHinh.dinhDanh === "MA_SINH_VIEN" && !input.laThiSinhTuDo) {
    const sv = await laySinhVien(input.maSinhVien);
    // đăng ký lại với đúng số điện thoại đã khai -> mở hồ sơ cũ để xem đơn/nộp minh chứng
    await chanDangKyTrung(khoa.id, dieuKienTheoSinhVien(sv), soDienThoai, "mã sinh viên");
    // (sửa 07/10/2026) thông tin tự điền từ danh sách; thí sinh sửa lại được nếu danh sách sai
    const daSua = await thongTinSinhVienDaSua(sv, input);
    suaThongTin = daSua.sua;
    thongTinGoc = { ...input, hoTen: daSua.hoTen, soCCCD: daSua.soCCCD, maSinhVien: sv.maSinhVien, lopSinhHoat: daSua.lopSinhHoat };
  } else {
    if (cauHinh.dinhDanh === "MA_SINH_VIEN") {
      // (bổ sung 01/10/2026) thí sinh tự do: họ tên + CCCD tự nhập; CCCD có trong danh sách
      // sinh viên thì phải đăng ký theo diện sinh viên (giữ đúng mã SV, lớp)
      // (sửa 07/10/2026) nhận cả số hộ chiếu của thí sinh nước ngoài - chỉ cần có dữ liệu
      const soCCCD = chuanHoaSoDinhDanh(input.soCCCD);
      if (!input.hoTen.trim()) throw new ThongTinDangKyKhongHopLeError('Chưa nhập "Họ tên"');
      if (!soCCCD) throw new ThongTinDangKyKhongHopLeError("Chưa nhập số CCCD/hộ chiếu (tối đa 30 ký tự)");
      if (await prisma.sinhVien.findUnique({ where: { soCCCD } })) throw new LaSinhVienCuaTruongError();
      thongTinGoc = { ...input, soCCCD, maSinhVien: null, lopSinhHoat: null };
    } else {
      thongTinGoc = { ...input, maSinhVien: null, lopSinhHoat: null };
    }
    // số CCCD là khóa định danh thí sinh tự do
    const soCCCD = chuanHoaSoDinhDanh(thongTinGoc.soCCCD);
    if (soCCCD) await chanDangKyTrung(khoa.id, { soCCCD }, soDienThoai, "số CCCD");
  }

  // (bổ sung 30/09/2026) kiểm tra theo form đăng ký cấu hình của khóa trước khi tạo hồ sơ
  const { input: thongTin, boSung } = await chuanBiThongTinDangKy(khoa.id, thongTinGoc);
  const hocVien = await timHoacTaoHocVien(thongTin);

  let dangKy;
  try {
    dangKy = await prisma.dangKyHoc.create({
      data: {
        hocVienId: hocVien.id,
        khoaId: khoa.id,
        soDienThoaiXacThuc: soDienThoai,
        ...(suaThongTin ? { suaThongTinDanhSach: suaThongTin } : {}),
      },
      include: { hocVien: true, khoa: { include: { chuongTrinh: true } } },
    });
  } catch (error) {
    const laLoiTrungDangKy =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
    if (laLoiTrungDangKy) throw new DaDangKyKhoaNayError();
    throw error;
  }
  await luuHoSoBoSung(dangKy.id, boSung);
  if (suaThongTin) {
    // hồ sơ học viên đã có từ trước không bị ghi đè (chống sửa hộ người khác) - cán bộ áp dụng ở HV-06
    const chuaApDung = hocVien.hoTen !== thongTinGoc.hoTen || hocVien.soCCCD !== thongTinGoc.soCCCD || hocVien.lopSinhHoat !== thongTinGoc.lopSinhHoat;
    await ghiThaoTac(
      { nguoiThucHienId: null, nguoiThucHienTen: `Thí sinh ${thongTinGoc.maSinhVien}` },
      "THI_SINH_SUA_THONG_TIN_DANH_SACH",
      "DangKyHoc",
      dangKy.id,
      Object.entries(suaThongTin)
        .map(([k, v]) => `${NHAN_TRUONG_SUA[k]}: "${v.cu ?? ""}" -> "${v.moi ?? ""}"`)
        .join("; ") + (chuaApDung ? " (hồ sơ học viên đã có từ trước - chưa áp dụng, cán bộ điều chỉnh tại HV-06)" : ""),
    );
  }
  const lePhi = (await taoLePhiTheoThanhPhan(dangKy.id, input.dsThanhPhan)) ?? (await taoLePhiKhiDangKyDuThi(dangKy.id));

  await guiThongBao(
    hocVien.id,
    "LICH_HOC_LICH_THI",
    `Đăng ký dự thi khóa ${khoa.maKhoa} thành công`,
    `Bạn đã đăng ký dự thi thành công cho khóa ${khoa.maKhoa}.` +
      (lePhi && Number(lePhi.soTienPhaiNop) > 0
        ? ` Vui lòng chuyển khoản lệ phí ${dinhDangTien(lePhi.soTienPhaiNop)} theo hướng dẫn trên đơn đăng ký và nộp minh chứng giao dịch; danh sách chính thức chỉ gồm thí sinh đã được xác nhận nộp lệ phí.`
        : " Lịch thi cụ thể sẽ được thông báo sau."),
  );

  return dangKy;
}

export async function danhSachThiSinh(khoaId: string) {
  return prisma.dangKyHoc.findMany({
    where: { khoaId },
    include: { hocVien: true },
    orderBy: { ngayDangKy: "asc" },
  });
}

// ---- lệ phí thi: thông tin chuyển khoản + minh chứng (bổ sung 01/10/2026) ----

const DUOI_MINH_CHUNG_CK = [".pdf", ".jpg", ".jpeg", ".png"];

/** Nội dung chuyển khoản để tài chính đối soát: mã khóa + mã SV (hoặc mã học viên). */
export function noiDungChuyenKhoanDuThi(maKhoa: string, hocVien: { maSinhVien: string | null; maHocVien: string }) {
  return noiDungChuyenKhoan(`${maKhoa} ${hocVien.maSinhVien ?? hocVien.maHocVien}`, 25);
}

/**
 * Thông tin hiển thị trên đơn đăng ký dự thi: số lệ phí, trạng thái, minh
 * chứng đã nộp, tài khoản nhận (tham số QT-05 NH_*) kèm mã VietQR. Trả về
 * null nếu không phải khóa dự thi hoặc khóa chưa có lệ phí.
 */
export async function thongTinLePhiDuThi(dangKyId: string) {
  const dangKy = await prisma.dangKyHoc.findUnique({
    where: { id: dangKyId },
    include: { hocVien: true, khoa: { include: { chuongTrinh: true } }, tepHoSos: { where: { maTruong: MA_TEP_NOP_PHI } } },
  });
  if (!dangKy || dangKy.khoa.chuongTrinh.phuongThucDangKy !== "CHI_DU_THI") return null;
  const hocPhi = await prisma.hocPhi.findUnique({ where: { hocVienId_khoaId: { hocVienId: dangKy.hocVienId, khoaId: dangKy.khoaId } } });
  if (!hocPhi || Number(hocPhi.soTienPhaiNop) <= 0) return null;

  const [maBin, soTaiKhoan, chuTaiKhoan, tenNganHang] = await Promise.all([
    layThamSo("NH_MA_BIN"),
    layThamSo("NH_SO_TAI_KHOAN"),
    layThamSo("NH_CHU_TAI_KHOAN"),
    layThamSo("NH_TEN_NGAN_HANG"),
  ]);
  const soTien = Number(hocPhi.soTienPhaiNop) - Number(hocPhi.soTienDaNop);
  const noiDung = noiDungChuyenKhoanDuThi(dangKy.khoa.maKhoa, dangKy.hocVien);
  const coTaiKhoan = !!(maBin && /^\d{6}$/.test(maBin) && soTaiKhoan && /^[0-9A-Za-z]{4,19}$/.test(soTaiKhoan));
  const daXong = ["DA_NOP_DU", "MIEN_GIAM"].includes(hocPhi.trangThai) || hocPhi.boQuaKiemTra;
  const minhChung = dangKy.tepHoSos[0];
  // (bổ sung 08/10/2026 - HP-02) đã nối dịch vụ ngân hàng (khóa webhook) và không tắt tự động ghi nhận
  const tuDongDoiSoat = !!process.env.NGAN_HANG_WEBHOOK_KEY && (await layThamSo("TT_TU_DONG_GHI_NHAN"))?.trim() !== "0";
  const giaoDich = await prisma.giaoDichNganHang.findFirst({
    where: { hocPhiId: hocPhi.id, soPhieuThu: { not: null } },
    orderBy: { thoiGianGiaoDich: "desc" },
  });
  return {
    soTienPhaiNop: Number(hocPhi.soTienPhaiNop),
    soTienConLai: Math.max(soTien, 0),
    trangThai: hocPhi.trangThai,
    daXong,
    noiDung,
    nganHang: coTaiKhoan ? { soTaiKhoan: soTaiKhoan!, chuTaiKhoan, tenNganHang } : null,
    qrSvg:
      coTaiKhoan && !daXong && soTien > 0
        ? await QRCode.toString(chuoiVietQR({ maBin: maBin!, soTaiKhoan: soTaiKhoan!, soTien, noiDung }), { type: "svg", margin: 1 })
        : null,
    minhChung: minhChung ? { id: minhChung.id, tenFile: minhChung.tenFile, taiLenLuc: minhChung.taiLenLuc } : null,
    tuDongDoiSoat,
    giaoDichGanNhat: giaoDich
      ? { soTien: Number(giaoDich.soTienGhiNhan), luc: giaoDich.thoiGianGiaoDich, soPhieuThu: giaoDich.soPhieuThu, thua: giaoDich.trangThai === "THUA_TIEN" }
      : null,
    choNopMinhChung: !daXong && !["KHONG_HOP_LE", "THOI_HOC"].includes(dangKy.trangThai),
    // (bổ sung 06/10/2026) khóa chia thành phần lệ phí: từng phần đã chọn + được đổi lựa chọn không
    thanhPhan: await thanhPhanCuaDangKy(dangKyId),
  };
}

/** Thí sinh tải lên minh chứng giao dịch chuyển khoản (thay tệp cũ nếu nộp lại). */
export async function nopMinhChungLePhi(dangKyId: string, tep: TepGui) {
  const dangKy = await prisma.dangKyHoc.findUnique({ where: { id: dangKyId }, include: { khoa: { include: { chuongTrinh: true } } } });
  if (!dangKy) throw new KhongTimThayDangKyError();
  if (dangKy.khoa.chuongTrinh.phuongThucDangKy !== "CHI_DU_THI") throw new NopMinhChungLePhiError("khóa không thu lệ phí thi khi đăng ký");
  if (["KHONG_HOP_LE", "THOI_HOC"].includes(dangKy.trangThai)) throw new NopMinhChungLePhiError("hồ sơ đã bị từ chối/hủy");
  const hocPhi = await prisma.hocPhi.findUnique({ where: { hocVienId_khoaId: { hocVienId: dangKy.hocVienId, khoaId: dangKy.khoaId } } });
  if (!hocPhi) throw new NopMinhChungLePhiError("đợt thi chưa thiết lập lệ phí");
  if (["DA_NOP_DU", "MIEN_GIAM"].includes(hocPhi.trangThai)) throw new NopMinhChungLePhiError("lệ phí đã được nhà trường xác nhận");
  if (tep.noiDung.length === 0) throw new NopMinhChungLePhiError("chưa chọn tệp");
  if (!DUOI_MINH_CHUNG_CK.includes(path.extname(tep.ten).toLowerCase())) {
    throw new NopMinhChungLePhiError(`chỉ nhận tệp ${DUOI_MINH_CHUNG_CK.join(", ")}`);
  }
  const toiDaMb = await layThamSoSo("DK_MINH_CHUNG_TOI_DA_MB", 10);
  if (tep.noiDung.length > toiDaMb * 1024 * 1024) throw new NopMinhChungLePhiError(`tệp vượt ${toiDaMb}MB`);
  await luuHoSoBoSung(dangKy.id, {
    coSan: {},
    boSung: [],
    tep: [{ ma: MA_TEP_NOP_PHI, nhan: "Minh chứng chuyển khoản lệ phí", tep }],
  });
}
