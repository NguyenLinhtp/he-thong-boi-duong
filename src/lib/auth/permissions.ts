import { prisma } from "@/lib/db/prisma";
import type { VaiTro } from "@/generated/prisma/client";

export type PhienDangNhap = {
  userId: string;
  hoTen: string;
  vaiTros: VaiTro[];
  maCNDuocPhep: string[];
};

/**
 * Tập quyền của 1 tài khoản = hợp (OR) quyền của mọi vai trò tài khoản đang giữ
 * (một tài khoản có thể giữ nhiều vai trò - QT-02).
 */
export async function layPhienDangNhap(nguoiDungId: string): Promise<PhienDangNhap | null> {
  const nguoiDung = await prisma.nguoiDung.findUnique({
    where: { id: nguoiDungId },
    include: {
      vaiTros: {
        include: {
          vaiTro: {
            include: {
              chucNangs: { include: { chucNangHeThong: true } },
            },
          },
        },
      },
    },
  });

  if (!nguoiDung) return null;

  const vaiTros = nguoiDung.vaiTros.map((nv) => nv.vaiTro.ma);
  const maCNDuocPhep = [
    ...new Set(
      nguoiDung.vaiTros.flatMap((nv) =>
        nv.vaiTro.chucNangs.map((c) => c.chucNangHeThong.maCN),
      ),
    ),
  ];

  return { userId: nguoiDung.id, hoTen: nguoiDung.hoTen, vaiTros, maCNDuocPhep };
}
