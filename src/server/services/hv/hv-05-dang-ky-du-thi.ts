import path from "node:path";
import QRCode from "qrcode";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { MA_TEP_NOP_PHI, type TepGui } from "@/lib/form-dang-ky";
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
  XacMinhSinhVienKhongKhopError,
  NopMinhChungLePhiError,
  LaSinhVienCuaTruongError,
  ThongTinDangKyKhongHopLeError,
} from "@/server/services/hv/loi-hoc-vien";
import { chuanHoaCCCD } from "@/server/services/hv/hv-03-danh-sach-sinh-vien";
import { guiThongBao } from "@/server/services/hv/hv-10-thong-bao";
import { taoLePhiKhiDangKyDuThi } from "@/server/services/hp/hp-01-thiet-lap";
import { layThamSo, layThamSoSo } from "@/server/services/qt/qt-05-tham-so";
import { dinhDangTien } from "@/lib/dinh-dang";

export type DangKyDuThiInput = ThongTinHocVienInput & {
  khoaId: string;
  // (bổ sung 01/10/2026) form định danh bằng mã sinh viên: mã SV + 4 số cuối CCCD để xác minh
  cuoiCCCD?: string | null;
  // (bổ sung 01/10/2026) form mã sinh viên nhưng thí sinh chọn "Thí sinh tự do" (không phải sinh viên của trường)
  laThiSinhTuDo?: boolean;
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
  return { maSinhVien: sv.maSinhVien, hoTen: sv.hoTen, lopSinhHoat: sv.lopSinhHoat };
}

async function xacMinhSinhVien(maSinhVien: string | null | undefined, cuoiCCCD: string | null | undefined) {
  const sv = await prisma.sinhVien.findUnique({ where: { maSinhVien: chuanMaSinhVien(maSinhVien) } });
  if (!sv) throw new SinhVienKhongCoTrongDanhSachError();
  const cuoi = (cuoiCCCD ?? "").trim();
  if (!/^\d{4}$/.test(cuoi) || !sv.soCCCD.endsWith(cuoi)) throw new XacMinhSinhVienKhongKhopError();
  return sv;
}

/**
 * (bổ sung 01/10/2026) Thí sinh mở lại đơn đã đăng ký (in lại, nộp minh chứng
 * chuyển khoản) bằng mã sinh viên + 4 số cuối CCCD - dùng được cả khi đã hết
 * hạn đăng ký. Trả về mã hồ sơ (đường link đơn).
 */
export type ThongTinTimLaiDon = { maSinhVien?: string | null; cuoiCCCD?: string | null; soCCCD?: string | null; hoTen?: string | null };

export async function timLaiDonDuThi(khoaId: string, tt: ThongTinTimLaiDon) {
  const khoa = await prisma.khoa.findUnique({ where: { id: khoaId }, include: { chuongTrinh: true } });
  if (!khoa) throw new KhongTimThayKhoaError();
  if (khoa.chuongTrinh.phuongThucDangKy !== "CHI_DU_THI") throw new SaiPhuongThucDangKyError("Phương thức 3 (đăng ký dự thi, không qua học)");
  const { cauHinh } = await cauHinhHieuLuc(khoa.id);
  let dieuKien: Prisma.HocVienWhereInput;
  const theoMaSinhVien = cauHinh.dinhDanh === "MA_SINH_VIEN" && !!tt.maSinhVien?.trim();
  if (theoMaSinhVien) {
    const sv = await xacMinhSinhVien(tt.maSinhVien, tt.cuoiCCCD);
    dieuKien = { OR: [{ maSinhVien: sv.maSinhVien }, { soCCCD: sv.soCCCD }] };
  } else {
    // (bổ sung 01/10/2026) form định danh CCCD: số CCCD + họ tên đã khai (không phân biệt hoa thường/dấu cách)
    const soCCCD = (tt.soCCCD ?? "").trim();
    if (!soCCCD || !(tt.hoTen ?? "").trim()) throw new KhongTimThayDangKyError();
    dieuKien = { soCCCD };
  }
  const dangKy = await prisma.dangKyHoc.findFirst({ where: { khoaId: khoa.id, hocVien: dieuKien }, include: { hocVien: true } });
  const chuan = (x: string) => x.trim().replace(/\s+/g, " ").toLocaleLowerCase("vi");
  if (!dangKy || (!theoMaSinhVien && chuan(dangKy.hocVien.hoTen) !== chuan(tt.hoTen ?? ""))) {
    throw new KhongTimThayDangKyError();
  }
  return dangKy.id;
}

/**
 * HV-05 (Phương thức 3): học viên tự đăng ký dự thi cho 1 khóa/đợt thi
 * ("Đợt thi đăng ký" = khóa được chọn), không qua giai đoạn học tập. Không
 * có bước nộp giấy riêng như Phương thức 1 nên hồ sơ vào thẳng CHO_DUYET
 * (mặc định của DangKyHoc). "Khóa thuộc Phương thức 3 không áp dụng điểm
 * danh/giảng dạy" - module GD tự kiểm tra phuongThucDangKy.
 *
 * (bổ sung 01/10/2026) Form định danh bằng mã sinh viên: họ tên, CCCD, lớp
 * lấy từ danh sách sinh viên đã import (HV-03), thí sinh xác minh bằng 4 số
 * cuối CCCD; lệ phí phát sinh ngay khi đăng ký (thí sinh chuyển khoản theo mã
 * QR rồi nộp minh chứng, cán bộ tài chính đối soát - HP-02).
 */
export async function dangKyDuThi(input: DangKyDuThiInput) {
  const khoa = await khoaDuThiDangMo(input.khoaId);
  const { cauHinh } = await cauHinhHieuLuc(khoa.id);

  let thongTinGoc: ThongTinHocVienInput = input;
  if (cauHinh.dinhDanh === "MA_SINH_VIEN" && !input.laThiSinhTuDo) {
    const sv = await xacMinhSinhVien(input.maSinhVien, input.cuoiCCCD);
    // danh tính đã xác minh -> đăng ký lại thì trả về hồ sơ cũ để xem đơn/nộp minh chứng
    const daCo = await prisma.dangKyHoc.findFirst({
      where: { khoaId: khoa.id, hocVien: { OR: [{ maSinhVien: sv.maSinhVien }, { soCCCD: sv.soCCCD }] } },
    });
    if (daCo) throw new DaDangKyKhoaNayError(daCo.id);
    thongTinGoc = { ...input, hoTen: sv.hoTen, soCCCD: sv.soCCCD, maSinhVien: sv.maSinhVien, lopSinhHoat: sv.lopSinhHoat };
  } else {
    if (cauHinh.dinhDanh === "MA_SINH_VIEN") {
      // (bổ sung 01/10/2026) thí sinh tự do: họ tên + CCCD tự nhập; CCCD có trong danh sách
      // sinh viên thì phải đăng ký theo diện sinh viên (giữ đúng mã SV, lớp)
      const soCCCD = chuanHoaCCCD((input.soCCCD ?? "").trim());
      if (!input.hoTen.trim()) throw new ThongTinDangKyKhongHopLeError('Chưa nhập "Họ tên"');
      if (!soCCCD) throw new ThongTinDangKyKhongHopLeError("Số CCCD không hợp lệ (12 chữ số)");
      if (await prisma.sinhVien.findUnique({ where: { soCCCD } })) throw new LaSinhVienCuaTruongError();
      thongTinGoc = { ...input, soCCCD, maSinhVien: null, lopSinhHoat: null };
    } else {
      thongTinGoc = { ...input, maSinhVien: null, lopSinhHoat: null };
    }
  }

  // (bổ sung 30/09/2026) kiểm tra theo form đăng ký cấu hình của khóa trước khi tạo hồ sơ
  const { input: thongTin, boSung } = await chuanBiThongTinDangKy(khoa.id, thongTinGoc);
  const hocVien = await timHoacTaoHocVien(thongTin);

  let dangKy;
  try {
    dangKy = await prisma.dangKyHoc.create({
      data: { hocVienId: hocVien.id, khoaId: khoa.id },
      include: { hocVien: true, khoa: { include: { chuongTrinh: true } } },
    });
  } catch (error) {
    const laLoiTrungDangKy =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
    if (laLoiTrungDangKy) throw new DaDangKyKhoaNayError();
    throw error;
  }
  await luuHoSoBoSung(dangKy.id, boSung);
  const lePhi = await taoLePhiKhiDangKyDuThi(dangKy.id);

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
    choNopMinhChung: !daXong && !["KHONG_HOP_LE", "THOI_HOC"].includes(dangKy.trangThai),
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
