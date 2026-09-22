import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import type { VaiTro } from "@/generated/prisma/client";

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

export type TaoTaiKhoanInput = {
  tenDangNhap: string;
  matKhau: string;
  hoTen: string;
  email?: string;
  vaiTros: VaiTro[];
};

export async function taoTaiKhoan(input: TaoTaiKhoanInput) {
  kiemTraChinhSachMatKhau(input.matKhau);

  const daTonTai = await prisma.nguoiDung.findUnique({
    where: { tenDangNhap: input.tenDangNhap },
  });
  if (daTonTai) throw new TenDangNhapTrungError(input.tenDangNhap);

  const matKhauHash = await bcrypt.hash(input.matKhau, 10);

  return prisma.nguoiDung.create({
    data: {
      tenDangNhap: input.tenDangNhap,
      matKhauHash,
      hoTen: input.hoTen,
      email: input.email,
      vaiTros: {
        create: await ganDanhSachVaiTro(input.vaiTros),
      },
    },
    include: { vaiTros: { include: { vaiTro: true } } },
  });
}

async function ganDanhSachVaiTro(vaiTros: VaiTro[]) {
  const vaiTroModels = await prisma.vaiTroModel.findMany({
    where: { ma: { in: vaiTros } },
  });
  return vaiTroModels.map((vt) => ({ vaiTroId: vt.id }));
}

export async function ganVaiTro(nguoiDungId: string, vaiTros: VaiTro[]) {
  await prisma.$transaction([
    prisma.nguoiDungVaiTro.deleteMany({ where: { nguoiDungId } }),
    prisma.nguoiDungVaiTro.createMany({
      data: (await ganDanhSachVaiTro(vaiTros)).map((v) => ({
        nguoiDungId,
        vaiTroId: v.vaiTroId,
      })),
    }),
  ]);
}

export async function khoaTaiKhoan(nguoiDungId: string) {
  return prisma.nguoiDung.update({
    where: { id: nguoiDungId },
    data: { trangThai: "TAM_KHOA" },
  });
}

export async function moKhoaTaiKhoan(nguoiDungId: string) {
  return prisma.nguoiDung.update({
    where: { id: nguoiDungId },
    data: { trangThai: "HOAT_DONG" },
  });
}

export async function xoaTaiKhoan(nguoiDungId: string) {
  return prisma.nguoiDung.delete({ where: { id: nguoiDungId } });
}

export async function datLaiMatKhau(nguoiDungId: string, matKhauMoi: string) {
  kiemTraChinhSachMatKhau(matKhauMoi);
  const matKhauHash = await bcrypt.hash(matKhauMoi, 10);
  return prisma.nguoiDung.update({
    where: { id: nguoiDungId },
    data: { matKhauHash },
  });
}

export async function danhSachTaiKhoan() {
  return prisma.nguoiDung.findMany({
    include: { vaiTros: { include: { vaiTro: true } } },
    orderBy: { createdAt: "desc" },
  });
}
