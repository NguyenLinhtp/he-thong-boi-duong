/**
 * (bổ sung 07/10/2026 - HV-01/HV-05/HP-04) Mẫu in cấu hình được: đơn đăng ký (theo chương trình,
 * khóa được sửa riêng) và biên lai thu tiền mẫu C45-BB (theo chương trình).
 * Module thuần (không truy cập CSDL) - dùng chung cho trình biên tập (xem trước trực tiếp),
 * trang in và kiểm tra phía máy chủ.
 *
 * Bố cục cố định theo mẫu quy định; cán bộ sửa các đoạn chữ, chèn biến dạng {{tenKhoa}}.
 */

export type MauDonDangKy = {
  tieuDe: string;
  kinhGui: string;
  // các dòng "Căn cứ ..." - mỗi dòng 1 căn cứ, để trống = không in
  canCu: string;
  dongDangKy: string;
  dongDot: string;
  hienBangLePhi: boolean;
  camKet: string;
  diaDanh: string;
  nhanKy: string;
  ghiChu: string;
};

export type MauBienLai = {
  donVi: string;
  maQHNS: string;
  mauSo: string;
  canCuMau: string;
  tieuDe: string;
  quyenSo: string;
  noiDungThu: string;
  loaiTien: string;
  nhanNguoiNop: string;
  nhanNguoiThu: string;
};

/** Biến chèn được vào các đoạn chữ của mẫu - tên hiển thị cho trình biên tập. */
export const BIEN_MAU_DON: Record<string, string> = {
  tenCoQuan: "Tên cơ quan (tham số hệ thống)",
  tenChuongTrinh: "Tên chương trình",
  maChuongTrinh: "Mã chương trình",
  tenKhoa: "Tên khóa / đợt thi",
  maKhoa: "Mã khóa",
  ngayThi: "Ngày thi / khai giảng",
  ngayBeGiang: "Ngày bế giảng",
  hanDangKy: "Hạn đăng ký",
};

export const BIEN_MAU_BIEN_LAI: Record<string, string> = {
  ...BIEN_MAU_DON,
  noiDung: "Các nội dung thu của biên lai (vd. Đăng ký thi 450.000đ, Đăng ký ôn thi 300.000đ)",
};

export const NHAN_TRUONG_MAU_DON: Record<keyof MauDonDangKy, string> = {
  tieuDe: "Tiêu đề đơn",
  kinhGui: "Kính gửi",
  canCu: "Căn cứ (mỗi dòng 1 căn cứ, để trống nếu không cần)",
  dongDangKy: "Dòng nội dung đăng ký",
  dongDot: "Dòng đợt thi / khóa",
  hienBangLePhi: "In bảng nội dung đăng ký và số tiền",
  camKet: "Lời cam kết",
  diaDanh: "Địa danh nơi làm đơn (để trống = dấu chấm cho thí sinh tự ghi)",
  nhanKy: "Chức danh người ký",
  ghiChu: "Ghi chú cuối đơn (hướng dẫn nộp hồ sơ, giấy tờ kèm theo...)",
};

export const NHAN_TRUONG_MAU_BIEN_LAI: Record<keyof MauBienLai, string> = {
  donVi: "Đơn vị",
  maQHNS: "Mã QHNS",
  mauSo: "Mẫu số",
  canCuMau: "Căn cứ ban hành mẫu",
  tieuDe: "Tiêu đề",
  quyenSo: "Quyển số",
  noiDungThu: "Nội dung thu",
  loaiTien: "Loại tiền",
  nhanNguoiNop: "Chữ ký bên nộp",
  nhanNguoiThu: "Chữ ký bên thu",
};

export function mauDonMacDinh(laDuThi: boolean): MauDonDangKy {
  return laDuThi
    ? {
        tieuDe: "ĐƠN ĐĂNG KÝ DỰ THI",
        kinhGui: "{{tenCoQuan}}",
        canCu: "",
        dongDangKy: "Tôi đăng ký dự thi: {{tenChuongTrinh}}",
        dongDot: "Đợt thi: {{tenKhoa}} (mã {{maKhoa}}), ngày thi dự kiến {{ngayThi}}",
        hienBangLePhi: true,
        camKet: "Tôi cam kết thông tin khai trên là đúng sự thật và thực hiện đúng các quy định về tổ chức thi và cấp chứng chỉ.",
        diaDanh: "",
        nhanKy: "Người đăng ký dự thi",
        ghiChu: "",
      }
    : {
        tieuDe: "ĐƠN ĐĂNG KÝ THAM GIA KHÓA BỒI DƯỠNG",
        kinhGui: "{{tenCoQuan}}",
        canCu: "",
        dongDangKy: "Tôi đăng ký tham gia chương trình bồi dưỡng: {{tenChuongTrinh}}",
        dongDot: "Khóa bồi dưỡng: {{tenKhoa}} (mã {{maKhoa}}), khai giảng {{ngayThi}}",
        hienBangLePhi: true,
        camKet: "Tôi cam kết thông tin khai trên là đúng sự thật và thực hiện đúng các quy định về tổ chức bồi dưỡng và cấp chứng chỉ.",
        diaDanh: "",
        nhanKy: "Người làm đơn",
        ghiChu: "",
      };
}

export const MAU_BIEN_LAI_MAC_DINH: MauBienLai = {
  donVi: "{{tenCoQuan}}",
  maQHNS: "",
  mauSo: "C45-BB",
  canCuMau: "Ban hành kèm theo Thông tư số 107/2017/TT-BTC ngày 10/10/2017 của Bộ Tài chính",
  tieuDe: "BIÊN LAI THU TIỀN",
  quyenSo: "",
  noiDungThu: "{{noiDung}} - {{tenKhoa}}",
  loaiTien: "VNĐ",
  nhanNguoiNop: "NGƯỜI NỘP TIỀN",
  nhanNguoiThu: "NGƯỜI THU TIỀN",
};

const DO_DAI_TOI_DA = 2000;

function chuanChuoi(v: unknown, macDinh: string): string {
  return typeof v === "string" ? v.slice(0, DO_DAI_TOI_DA) : macDinh;
}

/** Ghép cấu hình đã lưu (có thể thiếu khóa/sai kiểu) với mẫu mặc định. */
export function chuanHoaMauDon(luu: unknown, laDuThi: boolean): MauDonDangKy {
  const md = mauDonMacDinh(laDuThi);
  const o = (luu && typeof luu === "object" ? luu : {}) as Record<string, unknown>;
  return {
    tieuDe: chuanChuoi(o.tieuDe, md.tieuDe),
    kinhGui: chuanChuoi(o.kinhGui, md.kinhGui),
    canCu: chuanChuoi(o.canCu, md.canCu),
    dongDangKy: chuanChuoi(o.dongDangKy, md.dongDangKy),
    dongDot: chuanChuoi(o.dongDot, md.dongDot),
    hienBangLePhi: typeof o.hienBangLePhi === "boolean" ? o.hienBangLePhi : md.hienBangLePhi,
    camKet: chuanChuoi(o.camKet, md.camKet),
    diaDanh: chuanChuoi(o.diaDanh, md.diaDanh),
    nhanKy: chuanChuoi(o.nhanKy, md.nhanKy),
    ghiChu: chuanChuoi(o.ghiChu, md.ghiChu),
  };
}

export function chuanHoaMauBienLai(luu: unknown): MauBienLai {
  const o = (luu && typeof luu === "object" ? luu : {}) as Record<string, unknown>;
  const md = MAU_BIEN_LAI_MAC_DINH;
  return Object.fromEntries(
    (Object.keys(md) as (keyof MauBienLai)[]).map((k) => [k, chuanChuoi(o[k], md[k])]),
  ) as MauBienLai;
}

/** Thay {{bien}} bằng giá trị; biến không có giá trị in dấu chấm để ghi tay. */
export function thayBien(mau: string, bien: Record<string, string | null | undefined>): string {
  return mau.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, ten: string) => {
    const v = bien[ten];
    return v == null || v === "" ? "………………" : v;
  });
}

/** Các biến lạ (gõ sai tên) trong 1 đoạn chữ - để báo cho cán bộ khi lưu mẫu. */
export function bienKhongHopLe(mau: string, dsBien: Record<string, string>): string[] {
  return [...mau.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).filter((ten) => !(ten in dsBien));
}

const CHU_SO = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
const DON_VI_NHOM = ["", "nghìn", "triệu", "tỷ"];

function docBaSo(so: number, day: boolean): string {
  const tram = Math.floor(so / 100);
  const chuc = Math.floor((so % 100) / 10);
  const dv = so % 10;
  const tu: string[] = [];
  if (day || tram > 0) tu.push(CHU_SO[tram], "trăm");
  if (chuc === 0) {
    if (dv > 0 && (day || tram > 0)) tu.push("linh");
  } else if (chuc === 1) tu.push("mười");
  else tu.push(CHU_SO[chuc], "mươi");
  if (dv > 0) {
    if (dv === 5 && chuc > 0) tu.push("lăm");
    else if (dv === 1 && chuc > 1) tu.push("mốt");
    else tu.push(CHU_SO[dv]);
  }
  return tu.join(" ");
}

/** 450000 -> "Bốn trăm năm mươi nghìn đồng" (số tiền nguyên không âm). */
export function docSoTien(soTien: number): string {
  let n = Math.round(Math.abs(soTien));
  if (n === 0) return "Không đồng";
  const nhom: number[] = [];
  while (n > 0) {
    nhom.push(n % 1000);
    n = Math.floor(n / 1000);
  }
  const phan: string[] = [];
  for (let i = nhom.length - 1; i >= 0; i--) {
    if (nhom[i] === 0) continue;
    // nhóm 3 số thứ i: đơn vị nghìn/triệu/tỷ, từ nhóm thứ 4 trở lên lặp lại "nghìn tỷ", "triệu tỷ"...
    const donVi = [DON_VI_NHOM[i % 3 === 0 && i > 0 ? 3 : i % 3], ...Array(Math.max(0, Math.floor((i - 1) / 3))).fill("tỷ")]
      .filter(Boolean)
      .join(" ");
    phan.push([docBaSo(nhom[i], i < nhom.length - 1), donVi].filter(Boolean).join(" "));
  }
  const cau = `${phan.join(" ")} đồng`;
  return cau.charAt(0).toUpperCase() + cau.slice(1);
}
