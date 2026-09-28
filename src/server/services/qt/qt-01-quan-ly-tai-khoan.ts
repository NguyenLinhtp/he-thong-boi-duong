import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import type { VaiTro } from "@/generated/prisma/client";
import { ghiThaoTac, HE_THONG, type NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";

export class TenDangNhapTrungError extends Error {
  constructor(tenDangNhap: string) {
    super(`Tên đăng nhập "${tenDangNhap}" đã tồn tại`);
  }
}

export class MatKhauYeuError extends Error {
  constructor() {
    super("Mật khẩu phải có ít nhất 8 ký tự, gồm cả chữ và số");
  }
}

// QT-01: "Mật khẩu tuân thủ chính sách bảo mật tối thiểu"
function kiemTraChinhSachMatKhau(matKhau: string) {
  const duDai = matKhau.length >= 8;
  const coChu = /[a-zA-Z]/.test(matKhau);
  const coSo = /[0-9]/.test(matKhau);
  if (!duDai || !coChu || !coSo) throw new MatKhauYeuError();
}

// QT-03: mọi thay đổi tài khoản ghi nhật ký (không bao giờ ghi mật khẩu)
const DOI_TUONG = "NguoiDung";

export type TaoTaiKhoanInput = {
  tenDangNhap: string;
  matKhau: string;
  hoTen: string;
  email?: string;
  vaiTros: VaiTro[];
};

export async function taoTaiKhoan(input: TaoTaiKhoanInput, nguoi: NguoiThucHien = HE_THONG) {
  kiemTraChinhSachMatKhau(input.matKhau);

  const daTonTai = await prisma.nguoiDung.findUnique({
    where: { tenDangNhap: input.tenDangNhap },
  });
  if (daTonTai) throw new TenDangNhapTrungError(input.tenDangNhap);

  const matKhauHash = await bcrypt.hash(input.matKhau, 10);
  const vaiTros = await ganDanhSachVaiTro(input.vaiTros);

  return prisma.$transaction(async (tx) => {
    const taiKhoan = await tx.nguoiDung.create({
      data: {
        tenDangNhap: input.tenDangNhap,
        matKhauHash,
        hoTen: input.hoTen,
        email: input.email,
        vaiTros: { create: vaiTros },
      },
      include: { vaiTros: { include: { vaiTro: true } } },
    });
    await ghiThaoTac(
      nguoi,
      "TAO_TAI_KHOAN",
      DOI_TUONG,
      taiKhoan.id,
      `${input.tenDangNhap} (${input.hoTen}) - vai trò: ${input.vaiTros.join(", ") || "không"}`,
      tx,
    );
    return taiKhoan;
  });
}

async function ganDanhSachVaiTro(vaiTros: VaiTro[]) {
  const vaiTroModels = await prisma.vaiTroModel.findMany({
    where: { ma: { in: vaiTros } },
  });
  return vaiTroModels.map((vt) => ({ vaiTroId: vt.id }));
}

async function tenTaiKhoan(nguoiDungId: string) {
  const nd = await prisma.nguoiDung.findUniqueOrThrow({ where: { id: nguoiDungId } });
  return `${nd.tenDangNhap} (${nd.hoTen})`;
}

export async function ganVaiTro(nguoiDungId: string, vaiTros: VaiTro[], nguoi: NguoiThucHien = HE_THONG) {
  const ten = await tenTaiKhoan(nguoiDungId);
  const cu = await prisma.nguoiDungVaiTro.findMany({ where: { nguoiDungId }, include: { vaiTro: true } });
  const dsMoi = await ganDanhSachVaiTro(vaiTros);
  await prisma.$transaction(async (tx) => {
    await tx.nguoiDungVaiTro.deleteMany({ where: { nguoiDungId } });
    await tx.nguoiDungVaiTro.createMany({ data: dsMoi.map((v) => ({ nguoiDungId, vaiTroId: v.vaiTroId })) });
    await ghiThaoTac(
      nguoi,
      "GAN_VAI_TRO",
      DOI_TUONG,
      nguoiDungId,
      `${ten}: ${cu.map((v) => v.vaiTro.ma).join(", ") || "không"} -> ${vaiTros.join(", ") || "không"}`,
      tx,
    );
  });
}

async function doiTrangThai(
  nguoiDungId: string,
  trangThai: "TAM_KHOA" | "HOAT_DONG",
  hanhDong: string,
  nguoi: NguoiThucHien,
) {
  const ten = await tenTaiKhoan(nguoiDungId);
  return prisma.$transaction(async (tx) => {
    const sau = await tx.nguoiDung.update({ where: { id: nguoiDungId }, data: { trangThai } });
    await ghiThaoTac(nguoi, hanhDong, DOI_TUONG, nguoiDungId, ten, tx);
    return sau;
  });
}

export async function khoaTaiKhoan(nguoiDungId: string, nguoi: NguoiThucHien = HE_THONG) {
  return doiTrangThai(nguoiDungId, "TAM_KHOA", "KHOA_TAI_KHOAN", nguoi);
}

export async function moKhoaTaiKhoan(nguoiDungId: string, nguoi: NguoiThucHien = HE_THONG) {
  return doiTrangThai(nguoiDungId, "HOAT_DONG", "MO_KHOA_TAI_KHOAN", nguoi);
}

export async function xoaTaiKhoan(nguoiDungId: string, nguoi: NguoiThucHien = HE_THONG) {
  const ten = await tenTaiKhoan(nguoiDungId);
  return prisma.$transaction(async (tx) => {
    const daXoa = await tx.nguoiDung.delete({ where: { id: nguoiDungId } });
    await ghiThaoTac(nguoi, "XOA_TAI_KHOAN", DOI_TUONG, nguoiDungId, ten, tx);
    return daXoa;
  });
}

export async function datLaiMatKhau(nguoiDungId: string, matKhauMoi: string, nguoi: NguoiThucHien = HE_THONG) {
  kiemTraChinhSachMatKhau(matKhauMoi);
  const ten = await tenTaiKhoan(nguoiDungId);
  const matKhauHash = await bcrypt.hash(matKhauMoi, 10);
  return prisma.$transaction(async (tx) => {
    const sau = await tx.nguoiDung.update({ where: { id: nguoiDungId }, data: { matKhauHash } });
    await ghiThaoTac(nguoi, "DAT_LAI_MAT_KHAU", DOI_TUONG, nguoiDungId, ten, tx);
    return sau;
  });
}

export async function danhSachTaiKhoan() {
  return prisma.nguoiDung.findMany({
    include: { vaiTros: { include: { vaiTro: true } } },
    orderBy: { createdAt: "desc" },
  });
}
