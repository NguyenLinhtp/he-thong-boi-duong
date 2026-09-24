import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

/**
 * Sinh mã khóa tự động dạng KH{năm}{số thứ tự 3 chữ số}, không trùng
 * (KH-01: "Mã khóa sinh tự động"). Cùng cách làm với CT-01
 * (taoChuongTrinhVoiMaTuSinh): retry khi đụng unique constraint.
 */
export async function taoKhoaVoiMaTuSinh<T>(taoVoiMa: (maKhoa: string) => Promise<T>): Promise<T> {
  const nam = new Date().getFullYear();
  const tienTo = `KH${nam}`;
  const soLuongDaCo = await prisma.khoa.count({
    where: { maKhoa: { startsWith: tienTo } },
  });

  for (let lanThu = 0; lanThu < 10; lanThu++) {
    const soThuTu = soLuongDaCo + 1 + lanThu;
    const maKhoa = `${tienTo}${String(soThuTu).padStart(3, "0")}`;
    try {
      return await taoVoiMa(maKhoa);
    } catch (error) {
      const laLoiTrungMa =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!laLoiTrungMa) throw error;
    }
  }

  throw new Error("Không sinh được mã khóa sau nhiều lần thử");
}

/**
 * Danh sách giảng viên để chọn khi phân công (KH-02). Chưa có chức năng
 * riêng quản lý danh mục giảng viên trong 69 CN - đây chỉ là truy vấn đọc
 * hỗ trợ dropdown, không phải 1 CN mới.
 */
export async function danhSachGiangVien() {
  return prisma.giangVien.findMany({ orderBy: { hoTen: "asc" } });
}

