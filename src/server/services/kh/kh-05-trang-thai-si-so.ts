import { prisma } from "@/lib/db/prisma";
import { ghiThaoTac, HE_THONG, type NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";
import type { Prisma, TrangThaiKhoa } from "@/generated/prisma/client";
import { KhongTimThayKhoaError, ChuyenTrangThaiKhoaKhongHopLeError } from "@/server/services/kh/loi-khoa";
import { guiThongBao } from "@/server/services/hv/hv-10-thong-bao";
import { xacNhanSanSangTrucTuyen } from "@/server/services/kh/kh-04-hinh-thuc-giang-day";

/**
 * KH-05: vòng đời khóa theo đúng thứ tự mô tả trong CN - "chuẩn bị mở -> đang
 * tuyển sinh -> đang học -> đã kết thúc"; "hủy" có thể xảy ra ở bất kỳ bước
 * nào trước khi kết thúc. Đã kết thúc/hủy là trạng thái cuối, không chuyển
 * tiếp được nữa.
 */
const CHUYEN_TIEP_HOP_LE: Record<TrangThaiKhoa, TrangThaiKhoa[]> = {
  CHUAN_BI: ["DANG_TUYEN_SINH", "HUY"],
  DANG_TUYEN_SINH: ["DANG_DIEN_RA", "HUY"],
  DANG_DIEN_RA: ["DA_KET_THUC", "HUY"],
  DA_KET_THUC: [],
  HUY: [],
};

export async function chuyenTrangThaiKhoa(
  khoaId: string,
  trangThaiMoi: TrangThaiKhoa,
  nguoi: NguoiThucHien = HE_THONG,
) {
  const khoa = await prisma.khoa.findUnique({ where: { id: khoaId } });
  if (!khoa) throw new KhongTimThayKhoaError();

  if (khoa.trangThai === trangThaiMoi) return khoa;

  const chuyenDuoc = CHUYEN_TIEP_HOP_LE[khoa.trangThai].includes(trangThaiMoi);
  if (!chuyenDuoc) throw new ChuyenTrangThaiKhoaKhongHopLeError(khoa.trangThai, trangThaiMoi);
  // KH-04: khóa trực tuyến chỉ khai giảng khi mọi buổi học đã có link
  if (trangThaiMoi === "DANG_DIEN_RA") await xacNhanSanSangTrucTuyen(khoaId);

  const ketQua = await prisma.$transaction(async (tx) => {
    const sau = await tx.khoa.update({ where: { id: khoaId }, data: { trangThai: trangThaiMoi } });
    await ghiThaoTac(nguoi, "CHUYEN_TRANG_THAI_KHOA", "Khoa", khoaId, `${khoa.maKhoa}: ${khoa.trangThai} -> ${trangThaiMoi}`, tx);
    return sau;
  });

  // HV-10: "lịch học/lịch thi" - báo khai giảng cho học viên chính thức khi
  // khóa chuyển sang Đang diễn ra.
  if (trangThaiMoi === "DANG_DIEN_RA") {
    const dsChinhThuc = await prisma.dangKyHoc.findMany({
      where: { khoaId, trangThai: "CHINH_THUC" },
    });
    for (const dk of dsChinhThuc) {
      await guiThongBao(
        dk.hocVienId,
        "LICH_HOC_LICH_THI",
        `Khóa ${khoa.maKhoa} bắt đầu khai giảng`,
        `Khóa ${khoa.maKhoa} đã chuyển sang giai đoạn Đang diễn ra. Vui lòng theo dõi thời khóa biểu để tham gia học đúng lịch.`,
      );
    }
  }

  return ketQua;
}

/**
 * Đăng ký còn "chiếm chỗ" trong khóa - loại trừ đăng ký không hợp lệ (bị từ
 * chối), đã thôi học, đã hủy do quá hạn nộp giấy (HV-02/DVLK-05) và đăng ký
 * chờ nộp giấy đã quá hạn (sẽ bị hủy lười ở lần thao tác kế tiếp - không để
 * nó giữ chỗ làm khóa báo đủ sĩ số sai, vô hiệu link KH-06 sớm).
 */
export function dieuKienChiemCho(khoaId: string, bayGio = new Date()): Prisma.DangKyHocWhereInput {
  return {
    khoaId,
    trangThai: { notIn: ["KHONG_HOP_LE", "THOI_HOC", "HUY_QUA_HAN_NOP_GIAY"] },
    NOT: { trangThai: "CHO_NOP_GIAY", hanNopGiay: { lt: bayGio } },
  };
}

export async function siSoHienTai(khoaId: string): Promise<number> {
  return prisma.dangKyHoc.count({ where: dieuKienChiemCho(khoaId) });
}

export type TinhTrangSiSo = {
  siSoHienTai: number;
  siSoToiDa: number;
  daDayDu: boolean;
};

export async function tinhTrangSiSo(khoaId: string): Promise<TinhTrangSiSo> {
  const khoa = await prisma.khoa.findUnique({ where: { id: khoaId } });
  if (!khoa) throw new KhongTimThayKhoaError();

  const hienTai = await siSoHienTai(khoaId);
  return { siSoHienTai: hienTai, siSoToiDa: khoa.siSoToiDa, daDayDu: hienTai >= khoa.siSoToiDa };
}

/**
 * KH-05: "Không nhận đăng ký khi sĩ số đã đủ hoặc khóa đã đóng đăng ký" -
 * cổng kiểm tra dùng lại ở HV module (đăng ký học viên) khi được xây dựng.
 * Chỉ khóa đang ở trạng thái "Đang tuyển sinh" mới còn mở đăng ký.
 */
export async function coTheNhanDangKy(khoaId: string): Promise<boolean> {
  const khoa = await prisma.khoa.findUnique({ where: { id: khoaId } });
  if (!khoa) throw new KhongTimThayKhoaError();
  if (khoa.trangThai !== "DANG_TUYEN_SINH") return false;
  // (bổ sung 01/10/2026) quá hạn đăng ký = đã đóng đăng ký
  if (daQuaHanDangKy(khoa)) return false;

  const hienTai = await siSoHienTai(khoaId);
  return hienTai < khoa.siSoToiDa;
}

/** (bổ sung 01/10/2026) hạn đăng ký tính hết ngày (giờ Việt Nam) của ngày được chọn. */
export function cuoiNgayVN(ngay: string): Date {
  return new Date(`${ngay}T23:59:59.999+07:00`);
}

export function daQuaHanDangKy(khoa: { hanDangKy: Date | null }, bayGio = new Date()) {
  return khoa.hanDangKy !== null && bayGio > khoa.hanDangKy;
}

/** (bổ sung 01/10/2026) đặt/xóa hạn đăng ký của khóa; ngay = "yyyy-mm-dd" hoặc null. */
export async function datHanDangKy(khoaId: string, ngay: string | null, nguoi: NguoiThucHien = HE_THONG) {
  const khoa = await prisma.khoa.findUnique({ where: { id: khoaId } });
  if (!khoa) throw new KhongTimThayKhoaError();
  if (ngay !== null && !/^\d{4}-\d{2}-\d{2}$/.test(ngay)) throw new Error("Hạn đăng ký không hợp lệ");
  const han = ngay ? cuoiNgayVN(ngay) : null;
  return prisma.$transaction(async (tx) => {
    const sau = await tx.khoa.update({ where: { id: khoaId }, data: { hanDangKy: han } });
    await ghiThaoTac(nguoi, "DAT_HAN_DANG_KY", "Khoa", khoaId, `${khoa.maKhoa}: hạn đăng ký -> ${ngay ?? "không giới hạn"}`, tx);
    return sau;
  });
}
