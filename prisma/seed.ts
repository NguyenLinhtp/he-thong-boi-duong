import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type VaiTro } from "../src/generated/prisma/client.js";
import bcrypt from "bcryptjs";
import functions from "../docs/functions.json" with { type: "json" };

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const TEN_HIEN_THI: Record<VaiTro, string> = {
  ADMIN: "Quản trị hệ thống",
  CAN_BO_QUAN_LY_DAO_TAO: "Cán bộ quản lý đào tạo",
  CAN_BO_TAI_CHINH: "Cán bộ tài chính",
  GIANG_VIEN: "Giảng viên",
  HOC_VIEN: "Học viên",
  CAN_BO_DON_VI_LIEN_KET: "Cán bộ đơn vị liên kết",
};

// Đặc tả gốc mục 3.3 liệt kê thêm vai trò "Lãnh đạo/Ban giám hiệu" (phê duyệt
// chương trình/kết quả/chứng chỉ), nhưng đã chốt gộp quyền phê duyệt này vào
// Cán bộ quản lý đào tạo để giữ đúng 6 vai trò đã quy ước cho dự án.
function actorTextToVaiTros(actor: string): VaiTro[] {
  const roles = new Set<VaiTro>();

  if (actor.includes("Quản trị hệ thống")) roles.add("ADMIN");
  if (actor.includes("Cán bộ tài chính")) roles.add("CAN_BO_TAI_CHINH");
  if (actor.includes("Giảng viên")) roles.add("GIANG_VIEN");
  if (actor.includes("Học viên")) roles.add("HOC_VIEN");
  if (actor.includes("đơn vị liên kết")) roles.add("CAN_BO_DON_VI_LIEN_KET");

  // Các actor nghiệp vụ này đều quy về Cán bộ quản lý đào tạo (gộp cả vai trò
  // phê duyệt của Lãnh đạo/Ban giám hiệu/Hội đồng theo quyết định đã chốt).
  if (
    actor.includes("Cán bộ quản lý đào tạo") ||
    actor.includes("Tổ chuyên môn") ||
    actor.includes("Trưởng đơn vị chuyên môn") ||
    actor.includes("Phòng/Trung tâm bồi dưỡng") ||
    actor.includes("Lãnh đạo") ||
    actor.includes("Ban giám hiệu") ||
    actor.includes("Hội đồng")
  ) {
    roles.add("CAN_BO_QUAN_LY_DAO_TAO");
  }

  // "Tất cả người dùng nội bộ" / "Hệ thống (tự động)" không map trực tiếp
  // sang 1 actor cụ thể -> coi là mọi vai trò cán bộ nội bộ được quyền.
  if (actor.includes("Tất cả người dùng nội bộ")) {
    roles.add("ADMIN");
    roles.add("CAN_BO_QUAN_LY_DAO_TAO");
    roles.add("CAN_BO_TAI_CHINH");
    roles.add("GIANG_VIEN");
  }

  return [...roles];
}

async function seedVaiTro() {
  const vaiTroIds: Record<VaiTro, string> = {} as Record<VaiTro, string>;
  for (const ma of Object.keys(TEN_HIEN_THI) as VaiTro[]) {
    const vt = await prisma.vaiTroModel.upsert({
      where: { ma },
      update: { tenHienThi: TEN_HIEN_THI[ma] },
      create: { ma, tenHienThi: TEN_HIEN_THI[ma] },
    });
    vaiTroIds[ma] = vt.id;
  }
  return vaiTroIds;
}

async function seedChucNangVaPhanQuyen(vaiTroIds: Record<VaiTro, string>) {
  for (const fn of functions as Array<{
    ma_cn: string;
    nhom_chuc_nang: string;
    ten_chuc_nang: string;
    actor: string;
  }>) {
    const cn = await prisma.chucNangHeThong.upsert({
      where: { maCN: fn.ma_cn },
      update: {
        nhomChucNang: fn.nhom_chuc_nang,
        tenChucNang: fn.ten_chuc_nang,
      },
      create: {
        maCN: fn.ma_cn,
        nhomChucNang: fn.nhom_chuc_nang,
        tenChucNang: fn.ten_chuc_nang,
      },
    });

    const roles = actorTextToVaiTros(fn.actor);
    for (const role of roles) {
      await prisma.vaiTroChucNang.upsert({
        where: {
          vaiTroId_chucNangHeThongId: {
            vaiTroId: vaiTroIds[role],
            chucNangHeThongId: cn.id,
          },
        },
        update: {},
        create: {
          vaiTroId: vaiTroIds[role],
          chucNangHeThongId: cn.id,
        },
      });
    }
  }
}

async function seedAdmin(vaiTroIds: Record<VaiTro, string>) {
  const tenDangNhap = process.env.SEED_ADMIN_USERNAME ?? "admin";
  const matKhau = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";
  const matKhauHash = await bcrypt.hash(matKhau, 10);

  const admin = await prisma.nguoiDung.upsert({
    where: { tenDangNhap },
    update: {},
    create: {
      tenDangNhap,
      matKhauHash,
      hoTen: "Quản trị hệ thống",
    },
  });

  await prisma.nguoiDungVaiTro.upsert({
    where: {
      nguoiDungId_vaiTroId: {
        nguoiDungId: admin.id,
        vaiTroId: vaiTroIds.ADMIN,
      },
    },
    update: {},
    create: {
      nguoiDungId: admin.id,
      vaiTroId: vaiTroIds.ADMIN,
    },
  });

  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.warn(
      `[seed] Dùng mật khẩu Admin mặc định (chỉ cho môi trường dev). Đặt SEED_ADMIN_PASSWORD trong .env để đổi.`,
    );
  }
}

async function main() {
  const vaiTroIds = await seedVaiTro();
  await seedChucNangVaPhanQuyen(vaiTroIds);
  await seedAdmin(vaiTroIds);
  console.log("[seed] Hoàn tất: 6 vai trò, 69 chức năng, ma trận phân quyền, tài khoản admin.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
