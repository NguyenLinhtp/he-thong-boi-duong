import { prisma } from "@/lib/db/prisma";
import type { VaiTro } from "@/generated/prisma/client";
import { ghiThaoTac, HE_THONG, type NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";

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
 * với cùng trạng thái coQuyen không gây lỗi. QT-03: ghi nhật ký khi ma trận
 * thực sự thay đổi (gọi lặp không sinh nhật ký rác), cùng transaction.
 */
export async function capNhatQuyen(
  vaiTro: VaiTro,
  maCN: string,
  coQuyen: boolean,
  nguoi: NguoiThucHien = HE_THONG,
) {
  const vaiTroModel = await prisma.vaiTroModel.findUniqueOrThrow({ where: { ma: vaiTro } });
  const chucNang = await prisma.chucNangHeThong.findUniqueOrThrow({ where: { maCN } });
  const khoa = { vaiTroId: vaiTroModel.id, chucNangHeThongId: chucNang.id };

  await prisma.$transaction(async (tx) => {
    const dangCo = (await tx.vaiTroChucNang.count({ where: khoa })) > 0;
    if (dangCo === coQuyen) return;

    if (coQuyen) await tx.vaiTroChucNang.create({ data: khoa });
    else await tx.vaiTroChucNang.deleteMany({ where: khoa });
    await ghiThaoTac(nguoi, coQuyen ? "GAN_QUYEN" : "THU_HOI_QUYEN", "VaiTro", vaiTro, `${vaiTro} - ${maCN}`, tx);
  });
}
