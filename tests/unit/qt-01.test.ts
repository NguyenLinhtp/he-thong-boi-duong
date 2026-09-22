import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { xacThucDangNhap } from "@/lib/auth/xac-thuc";
import {
  taoTaiKhoan,
  khoaTaiKhoan,
  ganVaiTro,
  MatKhauYeuError,
  TenDangNhapTrungError,
} from "@/server/services/qt/qt-01-quan-ly-tai-khoan";

const taiKhoanTaoTrongTest: string[] = [];

async function taoTaiKhoanTest() {
  const tenDangNhap = `qt01_test_${crypto.randomUUID()}`;
  const taiKhoan = await taoTaiKhoan({
    tenDangNhap,
    matKhau: "MatKhau123",
    hoTen: "Người test QT-01",
    vaiTros: ["GIANG_VIEN"],
  });
  taiKhoanTaoTrongTest.push(taiKhoan.id);
  return taiKhoan;
}

afterAll(async () => {
  await prisma.nguoiDungVaiTro.deleteMany({
    where: { nguoiDungId: { in: taiKhoanTaoTrongTest } },
  });
  await prisma.nguoiDung.deleteMany({ where: { id: { in: taiKhoanTaoTrongTest } } });
});

describe("QT-01 quản lý tài khoản người dùng", () => {
  it("tạo tài khoản mới thành công và gán được vai trò", async () => {
    const taiKhoan = await taoTaiKhoanTest();
    expect(taiKhoan.vaiTros.map((v) => v.vaiTro.ma)).toEqual(["GIANG_VIEN"]);
  });

  it("chặn tạo tài khoản trùng tên đăng nhập", async () => {
    const taiKhoan = await taoTaiKhoanTest();
    await expect(
      taoTaiKhoan({
        tenDangNhap: taiKhoan.tenDangNhap,
        matKhau: "MatKhau123",
        hoTen: "Trùng tên",
        vaiTros: ["GIANG_VIEN"],
      }),
    ).rejects.toThrow(TenDangNhapTrungError);
  });

  it("chặn mật khẩu không đạt chính sách tối thiểu (yêu cầu chữ + số, >=8 ký tự)", async () => {
    await expect(
      taoTaiKhoan({
        tenDangNhap: `qt01_test_${crypto.randomUUID()}`,
        matKhau: "yeu",
        hoTen: "Mật khẩu yếu",
        vaiTros: ["GIANG_VIEN"],
      }),
    ).rejects.toThrow(MatKhauYeuError);
  });

  it("khóa tài khoản thì không đăng nhập được nữa", async () => {
    const taiKhoan = await taoTaiKhoanTest();

    const truocKhiKhoa = await xacThucDangNhap(taiKhoan.tenDangNhap, "MatKhau123");
    expect(truocKhiKhoa).not.toBeNull();

    await khoaTaiKhoan(taiKhoan.id);

    const sauKhiKhoa = await xacThucDangNhap(taiKhoan.tenDangNhap, "MatKhau123");
    expect(sauKhiKhoa).toBeNull();
  });

  it("gán được nhiều vai trò cho 1 tài khoản (một tài khoản có thể giữ nhiều vai trò)", async () => {
    const taiKhoan = await taoTaiKhoanTest();
    await ganVaiTro(taiKhoan.id, ["GIANG_VIEN", "CAN_BO_QUAN_LY_DAO_TAO"]);

    const capNhat = await prisma.nguoiDung.findUniqueOrThrow({
      where: { id: taiKhoan.id },
      include: { vaiTros: { include: { vaiTro: true } } },
    });
    const vaiTros = capNhat.vaiTros.map((v) => v.vaiTro.ma).sort();
    expect(vaiTros).toEqual(["CAN_BO_QUAN_LY_DAO_TAO", "GIANG_VIEN"]);
  });
});
