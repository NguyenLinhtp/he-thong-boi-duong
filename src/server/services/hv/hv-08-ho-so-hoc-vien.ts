import { prisma } from "@/lib/db/prisma";
import { KhongTimThayHocVienError, CccdTrungError } from "@/server/services/hv/loi-hoc-vien";

export async function danhSachHocVien(tuKhoa?: string) {
  return prisma.hocVien.findMany({
    where: tuKhoa
      ? {
          OR: [
            { hoTen: { contains: tuKhoa, mode: "insensitive" } },
            { maHocVien: { contains: tuKhoa, mode: "insensitive" } },
            { soCCCD: { contains: tuKhoa } },
          ],
        }
      : undefined,
    orderBy: { hoTen: "asc" },
  });
}

/** HV-08: "lịch sử các khóa/kỳ thi đã hoặc đang tham gia của học viên". */
export async function layHoSoHocVien(id: string) {
  const hocVien = await prisma.hocVien.findUnique({
    where: { id },
    include: {
      chucDanhHocVi: true,
      dangKys: {
        include: { khoa: { include: { chuongTrinh: true } } },
        orderBy: { ngayDangKy: "desc" },
      },
    },
  });
  if (!hocVien) throw new KhongTimThayHocVienError();
  return hocVien;
}

export type CapNhatHoSoHocVienInput = {
  hoTen?: string;
  ngaySinh?: string | null;
  donViCongTac?: string | null;
  chucDanhHocViId?: string | null;
  soCCCD?: string | null;
  soDienThoai?: string | null;
  email?: string | null;
};

/**
 * HV-08: "Một học viên chỉ có 1 mã duy nhất dù tham gia nhiều khóa qua các
 * phương thức khác nhau" - khi sửa tay CCCD, chặn trùng với 1 học viên khác
 * đã tồn tại (tránh phá vỡ bất biến 1-CCCD-1-mã-học-viên mà timHoacTaoHocVien
 * đang dựa vào ở HV-01/03/05).
 */
export async function capNhatHoSoHocVien(id: string, input: CapNhatHoSoHocVienInput) {
  const hocVien = await prisma.hocVien.findUnique({ where: { id } });
  if (!hocVien) throw new KhongTimThayHocVienError();

  if (input.soCCCD && input.soCCCD !== hocVien.soCCCD) {
    const trung = await prisma.hocVien.findUnique({ where: { soCCCD: input.soCCCD } });
    if (trung) throw new CccdTrungError();
  }

  return prisma.hocVien.update({
    where: { id },
    data: {
      hoTen: input.hoTen ?? undefined,
      ngaySinh:
        input.ngaySinh !== undefined ? (input.ngaySinh ? new Date(input.ngaySinh) : null) : undefined,
      donViCongTac: input.donViCongTac !== undefined ? input.donViCongTac : undefined,
      chucDanhHocViId: input.chucDanhHocViId !== undefined ? input.chucDanhHocViId : undefined,
      soCCCD: input.soCCCD !== undefined ? input.soCCCD : undefined,
      soDienThoai: input.soDienThoai !== undefined ? input.soDienThoai : undefined,
      email: input.email !== undefined ? input.email : undefined,
    },
  });
}
