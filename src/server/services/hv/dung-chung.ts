import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

async function taoHocVienVoiMaTuSinh<T>(taoVoiMa: (maHocVien: string) => Promise<T>): Promise<T> {
  const nam = new Date().getFullYear();
  const tienTo = `HV${nam}`;
  const soLuongDaCo = await prisma.hocVien.count({
    where: { maHocVien: { startsWith: tienTo } },
  });

  for (let lanThu = 0; lanThu < 10; lanThu++) {
    const soThuTu = soLuongDaCo + 1 + lanThu;
    const maHocVien = `${tienTo}${String(soThuTu).padStart(4, "0")}`;
    try {
      return await taoVoiMa(maHocVien);
    } catch (error) {
      const laLoiTrungMa =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!laLoiTrungMa) throw error;
    }
  }

  throw new Error("Không sinh được mã học viên sau nhiều lần thử");
}

export type ThongTinHocVienInput = {
  hoTen: string;
  soCCCD?: string | null;
  ngaySinh?: Date | string | null;
  soDienThoai?: string | null;
  email?: string | null;
  donViCongTac?: string | null;
};

/**
 * HV-08: "Một học viên chỉ có 1 mã duy nhất dù tham gia nhiều khóa qua các
 * phương thức khác nhau" - định danh theo CCCD; nếu đã có hồ sơ với CCCD này
 * thì dùng lại (không tạo mã học viên mới), chỉ tạo mới khi chưa từng có.
 */
export async function timHoacTaoHocVien(input: ThongTinHocVienInput) {
  if (input.soCCCD) {
    const daTonTai = await prisma.hocVien.findUnique({ where: { soCCCD: input.soCCCD } });
    if (daTonTai) return daTonTai;
  }

  return taoHocVienVoiMaTuSinh((maHocVien) =>
    prisma.hocVien.create({
      data: {
        maHocVien,
        hoTen: input.hoTen,
        soCCCD: input.soCCCD ?? null,
        ngaySinh: input.ngaySinh ? new Date(input.ngaySinh) : null,
        soDienThoai: input.soDienThoai ?? null,
        email: input.email ?? null,
        donViCongTac: input.donViCongTac ?? null,
      },
    }),
  );
}
