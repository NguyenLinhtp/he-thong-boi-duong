import { prisma } from "@/lib/db/prisma";
import { taoKhoaVoiMaTuSinh } from "@/server/services/kh/dung-chung";
import {
  SaiTrangThaiChuongTrinhError,
  KhongTimThayChuongTrinhError,
} from "@/server/services/ct/loi-chuong-trinh";

export type KhoiTaoKhoaInput = {
  chuongTrinhId: string;
  thoiGianKhaiGiang?: Date | string | null;
  thoiGianBeGiang?: Date | string | null;
  siSoToiDa: number;
  mucHocPhi?: number | string | null;
  dotTuyenSinhId?: string | null;
};

/**
 * KH-01: khởi tạo khóa từ 1 chương trình Đã ban hành - "chỉ khởi tạo từ
 * chương trình Đã ban hành". Khóa "kế thừa phương thức đăng ký đã khai báo
 * ở chương trình" bằng cách đọc qua quan hệ chuongTrinh.phuongThucDangKy
 * (CT-07) khi cần, không sao chép lại thành trường riêng trên Khoa - tránh
 * 2 nơi lưu cùng 1 giá trị có thể lệch nhau.
 */
export async function khoiTaoKhoa(input: KhoiTaoKhoaInput) {
  const chuongTrinh = await prisma.chuongTrinh.findUnique({
    where: { id: input.chuongTrinhId },
  });
  if (!chuongTrinh) throw new KhongTimThayChuongTrinhError();
  if (chuongTrinh.trangThai !== "DA_BAN_HANH") {
    throw new SaiTrangThaiChuongTrinhError(
      "Chỉ khởi tạo khóa từ chương trình ở trạng thái Đã ban hành",
    );
  }

  return taoKhoaVoiMaTuSinh((maKhoa) =>
    prisma.khoa.create({
      data: {
        maKhoa,
        chuongTrinhId: input.chuongTrinhId,
        thoiGianKhaiGiang: input.thoiGianKhaiGiang ? new Date(input.thoiGianKhaiGiang) : null,
        thoiGianBeGiang: input.thoiGianBeGiang ? new Date(input.thoiGianBeGiang) : null,
        siSoToiDa: input.siSoToiDa,
        mucHocPhi: input.mucHocPhi ?? null,
        dotTuyenSinhId: input.dotTuyenSinhId ?? null,
      },
      include: { chuongTrinh: true },
    }),
  );
}

export async function danhSachKhoa() {
  return prisma.khoa.findMany({
    include: { chuongTrinh: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function layKhoa(id: string) {
  return prisma.khoa.findUnique({
    where: { id },
    include: {
      chuongTrinh: { include: { hocPhans: { orderBy: { thuTu: "asc" } } } },
      dotTuyenSinh: true,
    },
  });
}
