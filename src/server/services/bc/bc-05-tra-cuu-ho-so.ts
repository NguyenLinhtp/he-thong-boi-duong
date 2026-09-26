import { prisma } from "@/lib/db/prisma";
import { ghiNhatKy } from "@/server/services/qt/qt-03-nhat-ky";
import { nhanKy, type KhoangNgay } from "@/server/services/bc/khoang-ngay";
import { nhanVanBang } from "@/server/services/cc/van-bang";
import { KhoangNgayKhongHopLeError } from "@/server/services/bc/loi-bao-cao";
import type { NguoiThucHien } from "@/server/services/dvlk/dvlk-01-danh-muc";

export const LOAI_HO_SO = ["CHUONG_TRINH", "KHOA", "HOC_VIEN", "CHUNG_CHI"] as const;
export type LoaiHoSo = (typeof LOAI_HO_SO)[number];

export const NHAN_LOAI_HO_SO: Record<LoaiHoSo, string> = {
  CHUONG_TRINH: "Chương trình",
  KHOA: "Khóa bồi dưỡng",
  HOC_VIEN: "Học viên",
  CHUNG_CHI: "Chứng chỉ / giấy chứng nhận",
};

export type HoSoTimThay = {
  loai: LoaiHoSo;
  id: string;
  ma: string;
  tieuDe: string;
  moTa: string;
  ngay: Date | null;
  lienKet: string;
};

export type LocTraCuuHoSo = KhoangNgay & { tuKhoa?: string | null; loai?: LoaiHoSo | null };

/** Số kết quả tối đa mỗi loại hồ sơ - thu hẹp từ khóa/kỳ nếu vượt. */
export const GIOI_HAN_MOI_LOAI = 50;

const chua = (tuKhoa: string) => ({ contains: tuKhoa, mode: "insensitive" as const });

/**
 * BC-05 (Cán bộ quản lý đào tạo/Lãnh đạo): tra cứu hồ sơ chương trình/khóa/
 * học viên/chứng chỉ đã lưu phục vụ kiểm định, thanh tra - theo từ khóa, khoảng
 * thời gian, loại hồ sơ; mỗi kết quả kèm liên kết xem chi tiết. "Toàn bộ thao
 * tác tra cứu được ghi nhật ký" (QT-03): mỗi lượt tra cứu ghi 1 dòng gồm điều
 * kiện và số kết quả. Bắt buộc có từ khóa hoặc khoảng thời gian.
 * Mốc thời gian: chương trình - ngày ban hành (chưa ban hành: ngày tạo); khóa -
 * khai giảng (chưa có: ngày tạo); học viên - ngày đăng ký gần nhất; văn bằng -
 * ngày ký (chưa ký: ngày tạo).
 */
export async function traCuuHoSo(loc: LocTraCuuHoSo, nguoi: NguoiThucHien) {
  const tuKhoa = loc.tuKhoa?.trim() || null;
  if (!tuKhoa && !loc.tu && !loc.den) throw new KhoangNgayKhongHopLeError("nhập từ khóa hoặc khoảng thời gian để tra cứu");
  const khoang = loc.tu || loc.den ? { gte: loc.tu, lte: loc.den } : undefined;
  const cac = loc.loai ? [loc.loai] : [...LOAI_HO_SO];

  const ketQua: HoSoTimThay[] = [];
  const tong: Partial<Record<LoaiHoSo, number>> = {};

  if (cac.includes("CHUONG_TRINH")) {
    const where = {
      AND: [
        tuKhoa ? { OR: [{ maCT: chua(tuKhoa) }, { ten: chua(tuKhoa) }, { soQuyetDinh: chua(tuKhoa) }] } : {},
        khoang ? { OR: [{ ngayBanHanh: khoang }, { ngayBanHanh: null, createdAt: khoang }] } : {},
      ],
    };
    const [ds, dem] = await Promise.all([
      prisma.chuongTrinh.findMany({ where, include: { loaiHinhBoiDuong: true }, orderBy: { createdAt: "desc" }, take: GIOI_HAN_MOI_LOAI }),
      prisma.chuongTrinh.count({ where }),
    ]);
    tong.CHUONG_TRINH = dem;
    for (const ct of ds) {
      ketQua.push({
        loai: "CHUONG_TRINH",
        id: ct.id,
        ma: ct.maCT,
        tieuDe: ct.ten,
        moTa: `${ct.loaiHinhBoiDuong.ten} · ${ct.trangThai}${ct.soQuyetDinh ? ` · QĐ ${ct.soQuyetDinh}` : ""}`,
        ngay: ct.ngayBanHanh ?? ct.createdAt,
        lienKet: `/chuong-trinh/${ct.id}`,
      });
    }
  }

  if (cac.includes("KHOA")) {
    const where = {
      AND: [
        tuKhoa ? { OR: [{ maKhoa: chua(tuKhoa) }, { chuongTrinh: { ten: chua(tuKhoa) } }] } : {},
        khoang ? { OR: [{ thoiGianKhaiGiang: khoang }, { thoiGianKhaiGiang: null, createdAt: khoang }] } : {},
      ],
    };
    const [ds, dem] = await Promise.all([
      prisma.khoa.findMany({
        where,
        include: { chuongTrinh: true, _count: { select: { dangKys: true } } },
        orderBy: { createdAt: "desc" },
        take: GIOI_HAN_MOI_LOAI,
      }),
      prisma.khoa.count({ where }),
    ]);
    tong.KHOA = dem;
    for (const k of ds) {
      ketQua.push({
        loai: "KHOA",
        id: k.id,
        ma: k.maKhoa,
        tieuDe: k.chuongTrinh.ten,
        moTa: `${k.trangThai} · ${k._count.dangKys} hồ sơ đăng ký`,
        ngay: k.thoiGianKhaiGiang ?? k.createdAt,
        lienKet: `/khoa-hoc/${k.id}`,
      });
    }
  }

  if (cac.includes("HOC_VIEN")) {
    const where = {
      AND: [
        tuKhoa
          ? { OR: [{ hoTen: chua(tuKhoa) }, { maHocVien: chua(tuKhoa) }, { soCCCD: tuKhoa }, { donViCongTac: chua(tuKhoa) }] }
          : {},
        khoang ? { dangKys: { some: { ngayDangKy: khoang } } } : {},
      ],
    };
    const [ds, dem] = await Promise.all([
      prisma.hocVien.findMany({
        where,
        include: { dangKys: { include: { khoa: true }, orderBy: { ngayDangKy: "desc" } } },
        orderBy: { hoTen: "asc" },
        take: GIOI_HAN_MOI_LOAI,
      }),
      prisma.hocVien.count({ where }),
    ]);
    tong.HOC_VIEN = dem;
    for (const hv of ds) {
      ketQua.push({
        loai: "HOC_VIEN",
        id: hv.id,
        ma: hv.maHocVien,
        tieuDe: hv.hoTen,
        moTa: `${hv.donViCongTac ?? "—"} · ${hv.dangKys.length} khóa${hv.dangKys.length ? ` (${hv.dangKys.map((dk) => dk.khoa.maKhoa).slice(0, 3).join(", ")}${hv.dangKys.length > 3 ? "…" : ""})` : ""}`,
        ngay: hv.dangKys[0]?.ngayDangKy ?? null,
        lienKet: `/hoc-vien/${hv.id}`,
      });
    }
  }

  if (cac.includes("CHUNG_CHI")) {
    const where = {
      AND: [
        { soHieu: { not: null } },
        tuKhoa
          ? {
              OR: [
                { soHieu: chua(tuKhoa) },
                { soVaoSo: chua(tuKhoa) },
                { soQuyetDinh: chua(tuKhoa) },
                { hocVien: { hoTen: chua(tuKhoa) } },
                { hocVien: { maHocVien: chua(tuKhoa) } },
              ],
            }
          : {},
        khoang ? { OR: [{ ngayCap: khoang }, { ngayCap: null, createdAt: khoang }] } : {},
      ],
    };
    const [ds, dem] = await Promise.all([
      prisma.chungChi.findMany({
        where,
        include: { hocVien: true, khoa: true },
        orderBy: { soHieu: "asc" },
        take: GIOI_HAN_MOI_LOAI,
      }),
      prisma.chungChi.count({ where }),
    ]);
    tong.CHUNG_CHI = dem;
    for (const cc of ds) {
      ketQua.push({
        loai: "CHUNG_CHI",
        id: cc.id,
        ma: cc.soHieu!,
        tieuDe: `${nhanVanBang(cc.loaiVanBang)} - ${cc.hocVien.hoTen}`,
        moTa: `Khóa ${cc.khoa.maKhoa} · ${cc.trangThai}${cc.soQuyetDinh ? ` · QĐ ${cc.soQuyetDinh}` : ""}${cc.soVaoSo ? ` · sổ ${cc.soVaoSo}` : ""}`,
        ngay: cc.ngayCap ?? cc.createdAt,
        lienKet: `/khoa-hoc/${cc.khoaId}/chung-chi`,
      });
    }
  }

  const soKetQua = Object.values(tong).reduce((t, n) => t + (n ?? 0), 0);
  await ghiNhatKy({
    ...nguoi,
    hanhDong: "TRA_CUU_HO_SO_LUU_TRU",
    doiTuong: "HoSoLuuTru",
    doiTuongId: loc.loai ?? "TAT_CA",
    chiTiet: `Từ khóa: ${tuKhoa ? `"${tuKhoa}"` : "(không)"}; loại: ${loc.loai ? NHAN_LOAI_HO_SO[loc.loai] : "tất cả"}; kỳ: ${
      loc.tu || loc.den ? nhanKy(loc) : "(không)"
    }; ${soKetQua} kết quả`,
  });

  return { ketQua, tong, soKetQua };
}

/** Các lượt tra cứu gần đây (nhật ký QT-03) - phục vụ giám sát việc tra cứu hồ sơ. */
export async function lichSuTraCuu(soLuong = 20) {
  return prisma.nhatKyThaoTac.findMany({
    where: { hanhDong: "TRA_CUU_HO_SO_LUU_TRU" },
    orderBy: { thoiGian: "desc" },
    take: soLuong,
  });
}
