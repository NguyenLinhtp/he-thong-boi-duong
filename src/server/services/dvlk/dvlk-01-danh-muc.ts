import { prisma } from "@/lib/db/prisma";
import type { TrangThaiHopTac } from "@/generated/prisma/client";
import { ghiNhatKy } from "@/server/services/qt/qt-03-nhat-ky";
import {
  ThieuThongTinDvlkError,
  MaDonViLienKetTrungError,
  KhongTimThayDonViLienKetError,
  DonViConHopDongError,
} from "@/server/services/dvlk/loi-dvlk";

export type NguoiThucHien = { nguoiThucHienId?: string | null; nguoiThucHienTen: string };
const HE_THONG: NguoiThucHien = { nguoiThucHienTen: "Hệ thống" };

export type DonViLienKetInput = {
  ma: string;
  ten: string;
  diaChi?: string | null;
  nguoiDaiDien?: string | null;
  soDienThoai?: string | null;
  email?: string | null;
};

const tuyChon = (giaTri?: string | null) => giaTri?.trim() || null;

function chuanHoa(input: DonViLienKetInput) {
  const ma = input.ma?.trim();
  const ten = input.ten?.trim();
  if (!ma) throw new ThieuThongTinDvlkError("mã đơn vị liên kết");
  if (!ten) throw new ThieuThongTinDvlkError("tên đơn vị liên kết");
  return {
    ma,
    ten,
    diaChi: tuyChon(input.diaChi),
    nguoiDaiDien: tuyChon(input.nguoiDaiDien),
    soDienThoai: tuyChon(input.soDienThoai),
    email: tuyChon(input.email),
  };
}

/** DVLK-01: "mã đơn vị liên kết không trùng lặp" - so không phân biệt hoa/thường. */
async function kiemTraMaTrung(ma: string, boQuaId?: string) {
  const daTonTai = await prisma.donViLienKet.findFirst({
    where: { ma: { equals: ma, mode: "insensitive" }, id: boQuaId ? { not: boQuaId } : undefined },
  });
  if (daTonTai) throw new MaDonViLienKetTrungError(ma);
}

export async function taoDonViLienKet(input: DonViLienKetInput, nguoi: NguoiThucHien = HE_THONG) {
  const data = chuanHoa(input);
  await kiemTraMaTrung(data.ma);
  const donVi = await prisma.donViLienKet.create({ data });
  await ghiNhatKy({
    ...nguoi,
    hanhDong: "TAO_DON_VI_LIEN_KET",
    doiTuong: "DonViLienKet",
    doiTuongId: donVi.id,
    chiTiet: `${donVi.ma} - ${donVi.ten}`,
  });
  return donVi;
}

export async function capNhatDonViLienKet(id: string, input: DonViLienKetInput, nguoi: NguoiThucHien = HE_THONG) {
  const cu = await prisma.donViLienKet.findUnique({ where: { id } });
  if (!cu) throw new KhongTimThayDonViLienKetError();
  const data = chuanHoa(input);
  await kiemTraMaTrung(data.ma, id);
  const donVi = await prisma.donViLienKet.update({ where: { id }, data });
  await ghiNhatKy({
    ...nguoi,
    hanhDong: "SUA_DON_VI_LIEN_KET",
    doiTuong: "DonViLienKet",
    doiTuongId: id,
    chiTiet: cu.ma === donVi.ma ? `${donVi.ma} - ${donVi.ten}` : `${cu.ma} -> ${donVi.ma} - ${donVi.ten}`,
  });
  return donVi;
}

/** DVLK-01: đang hợp tác / tạm ngừng. Tạm ngừng chặn lập hợp đồng mới (DVLK-03). */
export async function doiTrangThaiHopTac(id: string, trangThai: TrangThaiHopTac, nguoi: NguoiThucHien = HE_THONG) {
  const cu = await prisma.donViLienKet.findUnique({ where: { id } });
  if (!cu) throw new KhongTimThayDonViLienKetError();
  const donVi = await prisma.donViLienKet.update({ where: { id }, data: { trangThaiHopTac: trangThai } });
  await ghiNhatKy({
    ...nguoi,
    hanhDong: "DOI_TRANG_THAI_HOP_TAC_DVLK",
    doiTuong: "DonViLienKet",
    doiTuongId: id,
    chiTiet: `${donVi.ma}: ${cu.trangThaiHopTac} -> ${trangThai}`,
  });
  return donVi;
}

/** DVLK-01: "không xóa được đơn vị đang có hợp đồng chưa thanh lý" (xem DonViConHopDongError). */
export async function xoaDonViLienKet(id: string, nguoi: NguoiThucHien = HE_THONG) {
  const donVi = await prisma.donViLienKet.findUnique({ where: { id }, include: { hopDongs: true } });
  if (!donVi) throw new KhongTimThayDonViLienKetError();
  if (donVi.hopDongs.length > 0) {
    throw new DonViConHopDongError(donVi.hopDongs.filter((hd) => hd.trangThai !== "DA_THANH_LY").length);
  }
  await prisma.donViLienKet.delete({ where: { id } });
  await ghiNhatKy({
    ...nguoi,
    hanhDong: "XOA_DON_VI_LIEN_KET",
    doiTuong: "DonViLienKet",
    doiTuongId: id,
    chiTiet: `${donVi.ma} - ${donVi.ten}`,
  });
}

export type BoLocDonViLienKet = { tuKhoa?: string | null; trangThaiHopTac?: TrangThaiHopTac | null };

/** DVLK-01 tra cứu theo mã/tên/người đại diện/liên hệ và trạng thái hợp tác. */
export async function danhSachDonViLienKet(boLoc: BoLocDonViLienKet = {}) {
  const tuKhoa = boLoc.tuKhoa?.trim();
  return prisma.donViLienKet.findMany({
    where: {
      trangThaiHopTac: boLoc.trangThaiHopTac || undefined,
      OR: tuKhoa
        ? (["ma", "ten", "nguoiDaiDien", "soDienThoai", "email", "diaChi"] as const).map((truong) => ({
            [truong]: { contains: tuKhoa, mode: "insensitive" as const },
          }))
        : undefined,
    },
    include: { taiKhoan: true, hopDongs: { include: { khoa: true } } },
    orderBy: { ten: "asc" },
  });
}

export async function layDonViLienKet(id: string) {
  const donVi = await prisma.donViLienKet.findUnique({
    where: { id },
    include: {
      taiKhoan: true,
      hopDongs: { include: { khoa: { include: { chuongTrinh: true } } }, orderBy: { maHopDong: "asc" } },
    },
  });
  if (!donVi) throw new KhongTimThayDonViLienKetError();
  return donVi;
}
