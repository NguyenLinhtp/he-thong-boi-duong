import type { TrangThaiDangKy, TrangThaiKhoa } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { baoCaoCongNo } from "@/server/services/hp/hp-05-bao-cao";

const KHOA_DANG_MO: TrangThaiKhoa[] = ["CHUAN_BI", "DANG_TUYEN_SINH", "DANG_DIEN_RA"];
const HO_SO_CHO_XU_LY: TrangThaiDangKy[] = ["CHO_NOP_GIAY", "DA_NOP_GIAY", "CHO_TU_XAC_NHAN", "DA_XAC_NHAN_THAM_GIA", "CHO_DUYET", "HOP_LE"];
const QUA_DVLK = ["CHO_THANH_LY_HOP_DONG", "DA_HOAN_TAT"] as const;

const dauThang = (d: Date, lui = 0) => new Date(d.getFullYear(), d.getMonth() - lui, 1);

/**
 * BC-01 (Lãnh đạo/Cán bộ quản lý đào tạo/Cán bộ tài chính): số liệu tổng quan
 * tính trực tiếp từ CSDL tại thời điểm gọi - trang dashboard tự làm mới định
 * kỳ (≤ 1 phút) nên "dữ liệu cập nhật không trễ quá 5 phút". Chuyển Supabase
 * Realtime (đẩy ngay khi dữ liệu đổi) thuộc giai đoạn triển khai.
 * Học phí: doanh thu = phiếu thu (khớp HP-05); tỷ lệ thu tính trên khoản nộp
 * cá nhân (không tính miễn giảm và học viên qua đơn vị liên kết).
 */
export async function tongQuanDashboard(bayGio = new Date()) {
  const dauNam = new Date(bayGio.getFullYear(), 0, 1);
  const truoc30Ngay = new Date(bayGio.getTime() - 30 * 864e5);

  const [
    khoaTheoTrangThai,
    soHocVienDangHoc,
    soHoSoMoi30Ngay,
    soHoSoChoXuLy,
    dsKhoaDangHoc,
    phieuThu6Thang,
    hocPhiCaNhan,
    congNo,
    vanBang,
  ] = await Promise.all([
    prisma.khoa.groupBy({ by: ["trangThai"], _count: { _all: true } }),
    prisma.dangKyHoc.count({ where: { trangThai: "CHINH_THUC", khoa: { trangThai: "DANG_DIEN_RA" } } }),
    prisma.dangKyHoc.count({ where: { ngayDangKy: { gte: truoc30Ngay } } }),
    prisma.dangKyHoc.count({ where: { trangThai: { in: HO_SO_CHO_XU_LY }, khoa: { trangThai: { in: KHOA_DANG_MO } } } }),
    prisma.khoa.findMany({
      where: { trangThai: "DANG_DIEN_RA" },
      include: {
        chuongTrinh: true,
        buoiHocs: { where: { daHuy: false }, select: { ngayHoc: true } },
        _count: { select: { dangKys: { where: { trangThai: "CHINH_THUC" } } } },
      },
      orderBy: { thoiGianKhaiGiang: "asc" },
    }),
    prisma.phieuThu.findMany({ where: { ngayLap: { gte: dauThang(bayGio, 5) } }, select: { ngayLap: true, soTien: true } }),
    prisma.hocPhi.aggregate({
      where: { trangThai: { notIn: ["MIEN_GIAM", ...QUA_DVLK] } },
      _sum: { soTienPhaiNop: true, soTienDaNop: true },
    }),
    baoCaoCongNo(),
    prisma.chungChi.groupBy({
      by: ["trangThai"],
      where: { OR: [{ trangThai: { in: ["DE_NGHI", "CHO_KY_DUYET", "DA_KY_DUYET"] } }, { trangThai: "DA_CAP", ngayNhan: { gte: dauNam } }] },
      _count: { _all: true },
    }),
  ]);

  const demKhoa = (tt: TrangThaiKhoa) => khoaTheoTrangThai.find((k) => k.trangThai === tt)?._count._all ?? 0;

  const tienDo = dsKhoaDangHoc.map((k) => {
    const tong = k.buoiHocs.length;
    const daHoc = k.buoiHocs.filter((b) => b.ngayHoc <= bayGio).length;
    return {
      khoaId: k.id,
      maKhoa: k.maKhoa,
      tenChuongTrinh: k.chuongTrinh.ten,
      soHocVien: k._count.dangKys,
      tongBuoi: tong,
      daHoc,
      phanTram: tong === 0 ? null : Math.round((daHoc / tong) * 100),
    };
  });
  const tongBuoi = tienDo.reduce((t, k) => t + k.tongBuoi, 0);
  const tongDaHoc = tienDo.reduce((t, k) => t + k.daHoc, 0);

  const thuTheoThang = Array.from({ length: 6 }, (_, i) => {
    const tu = dauThang(bayGio, 5 - i);
    const den = dauThang(bayGio, 4 - i);
    return {
      thang: `${tu.getMonth() + 1}/${tu.getFullYear()}`,
      soTien: phieuThu6Thang.filter((p) => p.ngayLap >= tu && p.ngayLap < den).reduce((t, p) => t + Number(p.soTien), 0),
    };
  });
  const phaiThu = Number(hocPhiCaNhan._sum.soTienPhaiNop ?? 0);
  const daThu = Number(hocPhiCaNhan._sum.soTienDaNop ?? 0);
  const demVanBang = (tt: string) => vanBang.find((v) => v.trangThai === tt)?._count._all ?? 0;

  return {
    capNhatLuc: bayGio,
    khoa: {
      dangMo: KHOA_DANG_MO.reduce((t, tt) => t + demKhoa(tt), 0),
      chuanBi: demKhoa("CHUAN_BI"),
      dangTuyenSinh: demKhoa("DANG_TUYEN_SINH"),
      dangHoc: demKhoa("DANG_DIEN_RA"),
      daKetThuc: demKhoa("DA_KET_THUC"),
    },
    hocVien: { dangHoc: soHocVienDangHoc, hoSoMoi30Ngay: soHoSoMoi30Ngay, hoSoChoXuLy: soHoSoChoXuLy },
    giangDay: {
      tongBuoi,
      daHoc: tongDaHoc,
      phanTram: tongBuoi === 0 ? null : Math.round((tongDaHoc / tongBuoi) * 100),
      theoKhoa: tienDo,
    },
    hocPhi: {
      thuThangNay: thuTheoThang[5].soTien,
      thuTheoThang,
      congNo: congNo.tongConNo,
      soHocVienConNo: congNo.soHocVienConNo,
      tyLeThu: phaiThu === 0 ? null : Math.round((daThu / phaiThu) * 1000) / 10,
    },
    vanBang: {
      choCapSo: demVanBang("DE_NGHI"),
      choKy: demVanBang("CHO_KY_DUYET"),
      choTra: demVanBang("DA_KY_DUYET"),
      daCapNamNay: demVanBang("DA_CAP"),
    },
  };
}
