import { prisma } from "@/lib/db/prisma";
import type { VaiTro } from "@/generated/prisma/client";

export async function layMaTranPhanQuyen() {
  const vaiTros = await prisma.vaiTroModel.findMany({
    include: { chucNangs: { include: { chucNangHeThong: true } } },
    orderBy: { ma: "asc" },
  });
  const chucNangs = await prisma.chucNangHeThong.findMany({
    orderBy: { maCN: "asc" },
  });

  return {
    chucNangs,
    vaiTros: vaiTros.map((vt) => ({
      ma: vt.ma,
      tenHienThi: vt.tenHienThi,
      maCNDuocPhep: vt.chucNangs.map((c) => c.chucNangHeThong.maCN),
    })),
  };
}

/**
 * QT-02: gán/thu hồi 1 quyền (vaiTro, maCN). Idempotent - gọi lại nhiều lần
 * với cùng trạng thái coQuyen không gây lỗi.
 */
export async function capNhatQuyen(vaiTro: VaiTro, maCN: string, coQuyen: boolean) {
  const vaiTroModel = await prisma.vaiTroModel.findUniqueOrThrow({ where: { ma: vaiTro } });
  const chucNang = await prisma.chucNangHeThong.findUniqueOrThrow({ where: { maCN } });

  if (coQuyen) {
    await prisma.vaiTroChucNang.upsert({
      where: {
        vaiTroId_chucNangHeThongId: {
          vaiTroId: vaiTroModel.id,
          chucNangHeThongId: chucNang.id,
        },
      },
      update: {},
      create: { vaiTroId: vaiTroModel.id, chucNangHeThongId: chucNang.id },
    });
  } else {
    await prisma.vaiTroChucNang.deleteMany({
      where: { vaiTroId: vaiTroModel.id, chucNangHeThongId: chucNang.id },
    });
  }
}
