import { prisma } from "@/lib/db/prisma";
import { ghiThaoTac, HE_THONG, type NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";
import { cuoiNgayVN } from "@/server/services/kh/kh-05-trang-thai-si-so";
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
  // (bổ sung 01/10/2026) "yyyy-mm-dd" - nhận đăng ký đến hết ngày này
  hanDangKy?: string | null;
};

/**
 * KH-01: khởi tạo khóa từ 1 chương trình Đã ban hành - "chỉ khởi tạo từ
 * chương trình Đã ban hành". Khóa "kế thừa phương thức đăng ký đã khai báo
 * ở chương trình" bằng cách đọc qua quan hệ chuongTrinh.phuongThucDangKy
 * (CT-07) khi cần, không sao chép lại thành trường riêng trên Khoa - tránh
 * 2 nơi lưu cùng 1 giá trị có thể lệch nhau.
 */
export async function khoiTaoKhoa(input: KhoiTaoKhoaInput, nguoi: NguoiThucHien = HE_THONG) {
  const chuongTrinh = await prisma.chuongTrinh.findUnique({
    where: { id: input.chuongTrinhId },
  });
  if (!chuongTrinh) throw new KhongTimThayChuongTrinhError();
  if (chuongTrinh.trangThai !== "DA_BAN_HANH") {
    throw new SaiTrangThaiChuongTrinhError(
      "Chỉ khởi tạo khóa từ chương trình ở trạng thái Đã ban hành",
    );
  }

  const khoa = await taoKhoaVoiMaTuSinh((maKhoa) =>
    prisma.khoa.create({
      data: {
        maKhoa,
        chuongTrinhId: input.chuongTrinhId,
        thoiGianKhaiGiang: input.thoiGianKhaiGiang ? new Date(input.thoiGianKhaiGiang) : null,
        thoiGianBeGiang: input.thoiGianBeGiang ? new Date(input.thoiGianBeGiang) : null,
        siSoToiDa: input.siSoToiDa,
        mucHocPhi: input.mucHocPhi ?? null,
        dotTuyenSinhId: input.dotTuyenSinhId ?? null,
        hanDangKy: input.hanDangKy ? cuoiNgayVN(input.hanDangKy) : null,
      },
      include: { chuongTrinh: true },
    }),
  );
  // QT-03 (mã khóa tự sinh có thử lại khi trùng -> ghi sau khi tạo xong)
  await ghiThaoTac(
    nguoi,
    "KHOI_TAO_KHOA",
    "Khoa",
    khoa.id,
    `${khoa.maKhoa} từ chương trình ${chuongTrinh.maCT} - sĩ số ${khoa.siSoToiDa}`,
  );
  return khoa;
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
