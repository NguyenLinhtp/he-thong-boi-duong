import { Prisma } from "@/generated/prisma/client";
import type { TrangThaiDangKy, TrangThaiHopDong } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ghiNhatKy } from "@/server/services/qt/qt-03-nhat-ky";
import type { NguoiThucHien } from "@/server/services/dvlk/dvlk-01-danh-muc";
import { tuDongHuyQuaHan } from "@/server/services/dvlk/dvlk-05-xac-nhan-thu-ho-so";
import {
  KhongTimThayDonViLienKetError,
  KhongTimThayKhoaDvlkError,
  KhongTimThayHopDongDvlkError,
  DonViTamNgungError,
  KhoaKhongQuaDonViLienKetError,
  KhoaDaDongError,
  DaCoHopDongHieuLucError,
  HopDongDaThanhLyError,
  SoLieuHopDongKhongHopLeError,
} from "@/server/services/dvlk/loi-dvlk";

const HE_THONG: NguoiThucHien = { nguoiThucHienTen: "Hệ thống" };

/**
 * Hồ sơ KHÔNG tính vào số lượng thực tế: hủy do quá hạn nộp giấy (HV-02/
 * DVLK-05) và bị thẩm định không hợp lệ (HV-06). Thôi học vẫn tính - DVLK-06
 * đối chiếu riêng số hoàn thành/thôi học.
 */
export const TRANG_THAI_KHONG_TINH: TrangThaiDangKy[] = ["HUY_QUA_HAN_NOP_GIAY", "KHONG_HOP_LE"];

export type HopDongInput = {
  soLuongDuKien?: number | null;
  donGiaThoaThuan?: number | null;
  ghiChu?: string | null;
};

function kiemTraSoLieu(input: HopDongInput) {
  const { soLuongDuKien, donGiaThoaThuan } = input;
  if (soLuongDuKien != null && (!Number.isInteger(soLuongDuKien) || soLuongDuKien < 0)) {
    throw new SoLieuHopDongKhongHopLeError("số lượng dự kiến phải là số nguyên không âm");
  }
  if (donGiaThoaThuan != null && (!Number.isFinite(donGiaThoaThuan) || donGiaThoaThuan < 0)) {
    throw new SoLieuHopDongKhongHopLeError("đơn giá thỏa thuận không được âm");
  }
  return {
    soLuongDuKien: soLuongDuKien ?? null,
    donGiaThoaThuan: donGiaThoaThuan ?? null,
    ghiChu: input.ghiChu?.trim() || null,
  };
}

/**
 * DVLK-03: khởi tạo hợp đồng liên kết tuyển sinh cho 1 khóa -> Đang triển
 * khai. "Một khóa có thể có nhiều hợp đồng nếu nhiều đơn vị liên kết cùng
 * tuyển sinh" - nhưng mỗi đơn vị chỉ 1 hợp đồng đang triển khai/khóa (HV-11/12
 * xác định hợp đồng theo cặp đơn vị-khóa). Chỉ cho khóa Phương thức 4 (CT-07),
 * chưa kết thúc/hủy, và đơn vị đang hợp tác (DVLK-01).
 * Mã hợp đồng sinh tự động HDLK-<mã khóa>-<số thứ tự 2 chữ số>.
 */
export async function taoHopDong(
  input: HopDongInput & { donViLienKetId: string; khoaId: string },
  nguoi: NguoiThucHien = HE_THONG,
) {
  const soLieu = kiemTraSoLieu(input);
  const [donVi, khoa] = await Promise.all([
    prisma.donViLienKet.findUnique({ where: { id: input.donViLienKetId } }),
    prisma.khoa.findUnique({ where: { id: input.khoaId }, include: { chuongTrinh: true } }),
  ]);
  if (!donVi) throw new KhongTimThayDonViLienKetError();
  if (!khoa) throw new KhongTimThayKhoaDvlkError();
  if (donVi.trangThaiHopTac === "TAM_NGUNG") throw new DonViTamNgungError();
  if (khoa.chuongTrinh.phuongThucDangKy !== "QUA_DON_VI_LIEN_KET") throw new KhoaKhongQuaDonViLienKetError();
  if (khoa.trangThai === "DA_KET_THUC" || khoa.trangThai === "HUY") throw new KhoaDaDongError();
  const daCo = await prisma.hopDongLienKet.findFirst({
    where: { khoaId: khoa.id, donViLienKetId: donVi.id, trangThai: "DANG_TRIEN_KHAI" },
  });
  if (daCo) throw new DaCoHopDongHieuLucError(daCo.maHopDong);

  const tienTo = `HDLK-${khoa.maKhoa}-`;
  for (let lanThu = 0; lanThu < 5; lanThu++) {
    const soDaCo = await prisma.hopDongLienKet.count({ where: { maHopDong: { startsWith: tienTo } } });
    try {
      const hopDong = await prisma.hopDongLienKet.create({
        data: {
          ...soLieu,
          maHopDong: `${tienTo}${String(soDaCo + 1 + lanThu).padStart(2, "0")}`,
          donViLienKetId: donVi.id,
          khoaId: khoa.id,
        },
        include: { donViLienKet: true, khoa: true },
      });
      await ghiNhatKy({
        ...nguoi,
        hanhDong: "TAO_HOP_DONG_LIEN_KET",
        doiTuong: "HopDongLienKet",
        doiTuongId: hopDong.id,
        chiTiet: `${hopDong.maHopDong}: ${donVi.ma} - khóa ${khoa.maKhoa}, dự kiến ${soLieu.soLuongDuKien ?? "?"} HV, đơn giá ${soLieu.donGiaThoaThuan ?? "?"}`,
      });
      return hopDong;
    } catch (error) {
      const laLoiTrung = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!laLoiTrung) throw error;
    }
  }
  throw new Error("Không sinh được mã hợp đồng sau nhiều lần thử");
}

/** DVLK-03: sửa số lượng dự kiến / đơn giá / ghi chú - chỉ khi hợp đồng chưa thanh lý. */
export async function capNhatHopDong(id: string, input: HopDongInput, nguoi: NguoiThucHien = HE_THONG) {
  const cu = await prisma.hopDongLienKet.findUnique({ where: { id } });
  if (!cu) throw new KhongTimThayHopDongDvlkError();
  if (cu.trangThai === "DA_THANH_LY") throw new HopDongDaThanhLyError();
  const soLieu = kiemTraSoLieu(input);
  const sau = await prisma.hopDongLienKet.update({ where: { id, trangThai: "DANG_TRIEN_KHAI" }, data: soLieu });
  await ghiNhatKy({
    ...nguoi,
    hanhDong: "SUA_HOP_DONG_LIEN_KET",
    doiTuong: "HopDongLienKet",
    doiTuongId: id,
    chiTiet:
      `${cu.maHopDong}: dự kiến ${cu.soLuongDuKien ?? "?"} -> ${sau.soLuongDuKien ?? "?"}, ` +
      `đơn giá ${cu.donGiaThoaThuan ?? "?"} -> ${sau.donGiaThoaThuan ?? "?"}`,
  });
  return sau;
}

/** Số lượng thực tế (theo trạng thái hồ sơ) của các hợp đồng - tính trực tiếp từ đăng ký. */
async function thongKeHocVien(hopDongIds: string[]) {
  const nhom = await prisma.dangKyHoc.groupBy({
    by: ["hopDongLienKetId", "trangThai"],
    where: { hopDongLienKetId: { in: hopDongIds } },
    _count: { _all: true },
  });
  const theoHopDong = new Map<string, { thucTe: number; theoTrangThai: Partial<Record<TrangThaiDangKy, number>> }>();
  for (const id of hopDongIds) theoHopDong.set(id, { thucTe: 0, theoTrangThai: {} });
  for (const n of nhom) {
    const tk = theoHopDong.get(n.hopDongLienKetId!)!;
    tk.theoTrangThai[n.trangThai] = n._count._all;
    if (!TRANG_THAI_KHONG_TINH.includes(n.trangThai)) tk.thucTe += n._count._all;
  }
  return theoHopDong;
}

export type BoLocHopDong = {
  khoaId?: string | null;
  donViLienKetId?: string | null;
  trangThai?: TrangThaiHopDong | null;
  tuKhoa?: string | null;
};

/** DVLK-03: theo dõi hợp đồng - kèm số lượng thực tế so với dự kiến. */
export async function danhSachHopDong(boLoc: BoLocHopDong = {}) {
  const tuKhoa = boLoc.tuKhoa?.trim();
  const ds = await prisma.hopDongLienKet.findMany({
    where: {
      khoaId: boLoc.khoaId || undefined,
      donViLienKetId: boLoc.donViLienKetId || undefined,
      trangThai: boLoc.trangThai || undefined,
      OR: tuKhoa
        ? [
            { maHopDong: { contains: tuKhoa, mode: "insensitive" } },
            { donViLienKet: { ten: { contains: tuKhoa, mode: "insensitive" } } },
            { donViLienKet: { ma: { contains: tuKhoa, mode: "insensitive" } } },
            { khoa: { maKhoa: { contains: tuKhoa, mode: "insensitive" } } },
          ]
        : undefined,
    },
    include: { donViLienKet: true, khoa: { include: { chuongTrinh: true } } },
    orderBy: [{ trangThai: "asc" }, { maHopDong: "asc" }],
  });
  const thongKe = await thongKeHocVien(ds.map((hd) => hd.id));
  return ds.map((hd) => ({ ...hd, ...thongKe.get(hd.id)! }));
}

export async function layHopDong(id: string) {
  await tuDongHuyQuaHan([id]); // DVLK-05: quá hạn thu hồ sơ -> tự hủy
  const hopDong = await prisma.hopDongLienKet.findUnique({
    where: { id },
    include: {
      donViLienKet: true,
      khoa: { include: { chuongTrinh: true } },
      dangKys: { include: { hocVien: true, loNopHoSo: true }, orderBy: { hocVien: { hoTen: "asc" } } },
      banGiaos: { orderBy: { createdAt: "asc" } },
      loNopHoSos: { include: { _count: { select: { dangKys: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!hopDong) throw new KhongTimThayHopDongDvlkError();
  const thongKe = (await thongKeHocVien([id])).get(id)!;
  return { ...hopDong, ...thongKe };
}

/** HV-11/12: các hợp đồng Đang triển khai của 1 khóa - đơn vị nào còn nhận đăng ký qua liên kết. */
export async function hopDongConHieuLucTheoKhoa(khoaId: string) {
  return prisma.hopDongLienKet.findMany({
    where: { khoaId, trangThai: "DANG_TRIEN_KHAI" },
    include: { donViLienKet: true },
  });
}

/** Lựa chọn khi lập hợp đồng: đơn vị đang hợp tác, khóa Phương thức 4 chưa kết thúc/hủy. */
export async function tuyChonLapHopDong() {
  const [dsDonVi, dsKhoa] = await Promise.all([
    prisma.donViLienKet.findMany({ where: { trangThaiHopTac: "DANG_HOP_TAC" }, orderBy: { ten: "asc" } }),
    prisma.khoa.findMany({
      where: {
        chuongTrinh: { phuongThucDangKy: "QUA_DON_VI_LIEN_KET" },
        trangThai: { notIn: ["DA_KET_THUC", "HUY"] },
      },
      include: { chuongTrinh: true },
      orderBy: { maKhoa: "asc" },
    }),
  ]);
  return { dsDonVi, dsKhoa };
}
