import { prisma } from "@/lib/db/prisma";
import { KhongPhaiTaiKhoanHocVienError } from "@/server/services/kq/loi-ket-qua";

/**
 * Hồ sơ học viên của tài khoản đăng nhập: ưu tiên liên kết trực tiếp
 * (HocVien.nguoiDungId), sau đó khớp CCCD / mã số học viên khai báo trên tài
 * khoản (NguoiDung.soCCCD/maSoHocVien - cách học viên đăng nhập theo HV-04).
 */
export async function hocVienCuaTaiKhoan(nguoiDungId: string) {
  const lienKetTrucTiep = await prisma.hocVien.findUnique({ where: { nguoiDungId } });
  if (lienKetTrucTiep) return lienKetTrucTiep;

  const nguoiDung = await prisma.nguoiDung.findUnique({ where: { id: nguoiDungId } });
  if (!nguoiDung) return null;
  if (nguoiDung.soCCCD) {
    const theoCCCD = await prisma.hocVien.findUnique({ where: { soCCCD: nguoiDung.soCCCD } });
    if (theoCCCD) return theoCCCD;
  }
  if (nguoiDung.maSoHocVien) {
    return prisma.hocVien.findUnique({ where: { maHocVien: nguoiDung.maSoHocVien } });
  }
  return null;
}

/**
 * KQ-05: "Chỉ xem được điểm của chính mình" - hàm CHỦ Ý chỉ nhận id tài khoản
 * đăng nhập (không nhận hocVienId từ phía client), nên không thể tra cứu
 * điểm của học viên khác.
 */
export async function bangDiemCaNhan(nguoiDungId: string) {
  const hocVien = await hocVienCuaTaiKhoan(nguoiDungId);
  if (!hocVien) throw new KhongPhaiTaiKhoanHocVienError();

  const [dsDangKy, dsDiemHocPhan, dsKetQuaKhoa] = await Promise.all([
    prisma.dangKyHoc.findMany({
      where: { hocVienId: hocVien.id },
      include: { khoa: { include: { chuongTrinh: true } } },
      orderBy: { ngayDangKy: "desc" },
    }),
    prisma.ketQuaHocTap.findMany({
      where: { hocVienId: hocVien.id },
      include: { hocPhan: true },
      orderBy: { hocPhan: { thuTu: "asc" } },
    }),
    prisma.ketQuaKhoa.findMany({ where: { hocVienId: hocVien.id } }),
  ]);

  return {
    hocVien: { maHocVien: hocVien.maHocVien, hoTen: hocVien.hoTen },
    khoas: dsDangKy.map((dk) => ({
      khoaId: dk.khoaId,
      maKhoa: dk.khoa.maKhoa,
      tenChuongTrinh: dk.khoa.chuongTrinh.ten,
      trangThaiDangKy: dk.trangThai,
      diemHocPhan: dsDiemHocPhan.filter((d) => d.khoaId === dk.khoaId),
      ketQuaKhoa: dsKetQuaKhoa.find((kq) => kq.khoaId === dk.khoaId) ?? null,
    })),
  };
}
