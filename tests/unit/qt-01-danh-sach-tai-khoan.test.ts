import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { xacThucDangNhap } from "@/lib/auth/xac-thuc";
import { demTaiKhoanTheoNhom, taoTaiKhoan, trangTaiKhoan } from "@/server/services/qt/qt-01-quan-ly-tai-khoan";
import type { VaiTro } from "@/generated/prisma/client";

// (bổ sung 09/10/2026 - QT-01) màn hình tài khoản chia tab Giảng viên / Cán bộ và Học viên, tìm kiếm, phân trang

const ids: string[] = [];
const MA = `qt01ds_${crypto.randomUUID().slice(0, 8)}`;

afterAll(async () => {
  await prisma.nguoiDungVaiTro.deleteMany({ where: { nguoiDungId: { in: ids } } });
  await prisma.nguoiDung.deleteMany({ where: { id: { in: ids } } });
});

async function tao(duoi: string, vaiTros: VaiTro[]) {
  const tk = await taoTaiKhoan({ tenDangNhap: `${MA}_${duoi}`, matKhau: "MatKhau123", hoTen: `Người ${duoi}`, vaiTros });
  ids.push(tk.id);
  return tk;
}

describe("QT-01 danh sách tài khoản theo nhóm", () => {
  it("tab Học viên chỉ gồm tài khoản chỉ có vai trò Học viên; còn lại (kể cả vừa học viên vừa cán bộ) ở tab Giảng viên / Cán bộ", async () => {
    await tao("hv", ["HOC_VIEN"]);
    await tao("gv", ["GIANG_VIEN"]);
    await tao("kep", ["HOC_VIEN", "CAN_BO_TAI_CHINH"]);
    const ten = (ds: { tenDangNhap: string }[]) => ds.map((t) => t.tenDangNhap.replace(`${MA}_`, "")).sort();
    expect(ten(await trangTaiKhoan("hoc-vien", MA, 0, 50))).toEqual(["hv"]);
    expect(ten(await trangTaiKhoan("can-bo", MA, 0, 50))).toEqual(["gv", "kep"]);
    expect(await demTaiKhoanTheoNhom(MA)).toEqual({ "hoc-vien": 1, "can-bo": 2 });
  });

  it("tìm không phân biệt hoa thường theo tên đăng nhập/họ tên; phân trang theo số dòng", async () => {
    for (const d of ["p1", "p2", "p3"]) await tao(d, ["CAN_BO_QUAN_LY_DAO_TAO"]);
    const tong = (await demTaiKhoanTheoNhom(MA.toUpperCase()))["can-bo"];
    const trang1 = await trangTaiKhoan("can-bo", MA.toUpperCase(), 0, 2);
    const trang2 = await trangTaiKhoan("can-bo", MA, 2, 2);
    expect(trang1).toHaveLength(2);
    expect(new Set([...trang1, ...trang2].map((t) => t.id)).size).toBe(Math.min(tong, 4));
    expect(await trangTaiKhoan("can-bo", `${MA}_khong_co`, 0, 20)).toHaveLength(0);
  });

  it("đăng nhập bỏ khoảng trắng thừa ở ô định danh", async () => {
    await tao("dn", ["GIANG_VIEN"]);
    expect(await xacThucDangNhap(`  ${MA}_dn `, "MatKhau123")).not.toBeNull();
  });
});
