import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

/**
 * Sinh mã chương trình tự động dạng CT{năm}{số thứ tự 3 chữ số}, không trùng
 * (CT-01: "Mã chương trình sinh tự động, không trùng"). Dùng retry khi đụng
 * unique constraint thay vì lock bảng - đủ an toàn với tần suất tạo chương
 * trình rất thấp (thao tác quản trị, không phải luồng người dùng đông).
 */
export async function taoChuongTrinhVoiMaTuSinh<T>(
  taoVoiMa: (maCT: string) => Promise<T>,
): Promise<T> {
  const nam = new Date().getFullYear();
  const tienTo = `CT${nam}`;
  const soLuongDaCo = await prisma.chuongTrinh.count({
    where: { maCT: { startsWith: tienTo } },
  });

  for (let lanThu = 0; lanThu < 10; lanThu++) {
    const soThuTu = soLuongDaCo + 1 + lanThu;
    const maCT = `${tienTo}${String(soThuTu).padStart(3, "0")}`;
    try {
      return await taoVoiMa(maCT);
    } catch (error) {
      const laLoiTrungMa =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002";
      if (!laLoiTrungMa) throw error;
    }
  }

  throw new Error("Không sinh được mã chương trình sau nhiều lần thử");
}
