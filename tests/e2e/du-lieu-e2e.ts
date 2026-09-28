import "dotenv/config";
import bcrypt from "bcryptjs";
import type { VaiTro } from "../../src/generated/prisma/client";
import { prisma } from "../../src/lib/db/prisma";

/**
 * Dữ liệu dùng chung cho e2e: tài khoản theo vai trò (mật khẩu chỉ dùng cho
 * môi trường test) và 1 loại hình bồi dưỡng. Mọi thứ đánh dấu tiền tố E2E để
 * teardown dọn sạch.
 */
export const MAT_KHAU_E2E = "E2eMatKhau2026";
export const TAI_KHOAN_E2E: Record<"daoTao" | "taiChinh", { tenDangNhap: string; hoTen: string; vaiTro: VaiTro }> = {
  daoTao: { tenDangNhap: "e2e_dao_tao", hoTen: "E2E Cán bộ đào tạo", vaiTro: "CAN_BO_QUAN_LY_DAO_TAO" },
  taiChinh: { tenDangNhap: "e2e_tai_chinh", hoTen: "E2E Cán bộ tài chính", vaiTro: "CAN_BO_TAI_CHINH" },
};
export const LOAI_HINH_E2E = { ma: "E2E_LH", ten: "E2E Loại hình bồi dưỡng" };
export const TIEN_TO_CHUONG_TRINH = "E2E Chương trình";

export async function taoDuLieuE2E() {
  const matKhauHash = await bcrypt.hash(MAT_KHAU_E2E, 10);
  for (const tk of Object.values(TAI_KHOAN_E2E)) {
    const vaiTro = await prisma.vaiTroModel.findUniqueOrThrow({ where: { ma: tk.vaiTro } });
    await prisma.nguoiDung.upsert({
      where: { tenDangNhap: tk.tenDangNhap },
      update: { matKhauHash, trangThai: "HOAT_DONG" },
      create: {
        tenDangNhap: tk.tenDangNhap,
        matKhauHash,
        hoTen: tk.hoTen,
        vaiTros: { create: [{ vaiTroId: vaiTro.id }] },
      },
    });
  }
  await prisma.loaiHinhBoiDuong.upsert({ where: { ma: LOAI_HINH_E2E.ma }, update: {}, create: LOAI_HINH_E2E });
}

export async function donDuLieuE2E() {
  const dsCt = await prisma.chuongTrinh.findMany({
    where: { ten: { startsWith: TIEN_TO_CHUONG_TRINH } },
    select: { id: true },
  });
  const ctIds = dsCt.map((c) => c.id);
  await prisma.hocPhan.deleteMany({ where: { chuongTrinhId: { in: ctIds } } });
  await prisma.chuongTrinhPhienBan.deleteMany({ where: { chuongTrinhId: { in: ctIds } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: ctIds } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { ma: LOAI_HINH_E2E.ma } });
  await prisma.nguoiDung.deleteMany({
    where: { tenDangNhap: { in: Object.values(TAI_KHOAN_E2E).map((t) => t.tenDangNhap) } },
  });
  await prisma.$disconnect();
}
