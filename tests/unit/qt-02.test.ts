import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { layPhienDangNhap } from "@/lib/auth/permissions";
import { capNhatQuyen, layMaTranPhanQuyen } from "@/server/services/qt/qt-02-phan-quyen";
import { taoTaiKhoan } from "@/server/services/qt/qt-01-quan-ly-tai-khoan";
import functions from "../../docs/functions.json";

const taiKhoanTaoTrongTest: string[] = [];

// Dùng 1 mã CN có thật trong seed nhưng không phải QT-01/QT-02 để test không
// ảnh hưởng tới ma trận phân quyền thật đang seed sẵn cho các quy trình khác.
const MA_CN_TEST = "DM-01";

afterAll(async () => {
  // trả ma trận phân quyền của GIANG_VIEN với DM-01 về trạng thái ban đầu (không có quyền)
  await capNhatQuyen("GIANG_VIEN", MA_CN_TEST, false);
  await prisma.nguoiDungVaiTro.deleteMany({
    where: { nguoiDungId: { in: taiKhoanTaoTrongTest } },
  });
  await prisma.nguoiDung.deleteMany({ where: { id: { in: taiKhoanTaoTrongTest } } });
});

describe("QT-02 phân quyền theo vai trò (RBAC)", () => {
  it("gán quyền mới cho vai trò -> tài khoản thuộc vai trò đó có quyền ở lần đăng nhập sau", async () => {
    const taiKhoan = await taoTaiKhoan({
      tenDangNhap: `qt02_test_${crypto.randomUUID()}`,
      matKhau: "MatKhau123",
      hoTen: "Người test QT-02",
      vaiTros: ["GIANG_VIEN"],
    });
    taiKhoanTaoTrongTest.push(taiKhoan.id);

    const truocKhiGan = await layPhienDangNhap(taiKhoan.id);
    expect(truocKhiGan?.maCNDuocPhep).not.toContain(MA_CN_TEST);

    await capNhatQuyen("GIANG_VIEN", MA_CN_TEST, true);

    const sauKhiGan = await layPhienDangNhap(taiKhoan.id);
    expect(sauKhiGan?.maCNDuocPhep).toContain(MA_CN_TEST);
  });

  it("thu hồi quyền -> tài khoản mất quyền ở lần đăng nhập sau", async () => {
    const taiKhoan = await taoTaiKhoan({
      tenDangNhap: `qt02_test_${crypto.randomUUID()}`,
      matKhau: "MatKhau123",
      hoTen: "Người test QT-02",
      vaiTros: ["GIANG_VIEN"],
    });
    taiKhoanTaoTrongTest.push(taiKhoan.id);

    await capNhatQuyen("GIANG_VIEN", MA_CN_TEST, true);
    expect((await layPhienDangNhap(taiKhoan.id))?.maCNDuocPhep).toContain(MA_CN_TEST);

    await capNhatQuyen("GIANG_VIEN", MA_CN_TEST, false);
    expect((await layPhienDangNhap(taiKhoan.id))?.maCNDuocPhep).not.toContain(MA_CN_TEST);
  });

  it("ma trận phân quyền trả về đủ 6 vai trò và mọi chức năng trong functions.json đã seed", async () => {
    const maTran = await layMaTranPhanQuyen();
    expect(maTran.vaiTros).toHaveLength(6);
    // 69 chức năng gốc + mở rộng (vd KH-07) - luôn bám đúng functions.json
    expect(maTran.chucNangs).toHaveLength(functions.length);
  });
});
