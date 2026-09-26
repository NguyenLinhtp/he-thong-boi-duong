import type { TrangThaiDangKy } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { donViLienKetCuaTaiKhoan } from "@/server/services/dvlk/dvlk-02-tai-khoan";
import { KhongPhaiTaiKhoanDvlkError } from "@/server/services/dvlk/loi-dvlk";
import { tuDongHuyQuaHan } from "@/server/services/dvlk/dvlk-05-xac-nhan-thu-ho-so";

export type BoLocHoSo = { hopDongId?: string | null; trangThai?: TrangThaiDangKy | null; tuKhoa?: string | null };

/**
 * DVLK-04 (tiếp nhận): hồ sơ đăng ký gắn với các hợp đồng của đơn vị của tài
 * khoản đăng nhập - cả hồ sơ đơn vị đăng ký hộ (4a, HV-11) và hồ sơ học viên
 * tự đăng ký chọn đơn vị thu hồ sơ (4b, HV-12). DVLK-02: chỉ trong phạm vi đơn
 * vị mình, chỉ chọn trường thông tin liên hệ/hồ sơ - không trả học phí cá
 * nhân hay kết quả học tập.
 */
export async function hoSoCuaDonVi(nguoiDungId: string, boLoc: BoLocHoSo = {}) {
  const donVi = await donViLienKetCuaTaiKhoan(nguoiDungId);
  if (!donVi) throw new KhongPhaiTaiKhoanDvlkError();
  const tuKhoa = boLoc.tuKhoa?.trim();

  const dsHopDong = await prisma.hopDongLienKet.findMany({
    where: { donViLienKetId: donVi.id },
    include: { khoa: { include: { chuongTrinh: true } } },
    orderBy: { maHopDong: "asc" },
  });
  const idsHopDong = dsHopDong.map((hd) => hd.id);
  await tuDongHuyQuaHan(idsHopDong); // DVLK-05: quá hạn thu hồ sơ -> tự hủy

  const dsHoSo = await prisma.dangKyHoc.findMany({
    where: {
      // hopDongId ngoài phạm vi đơn vị -> lọc ra rỗng, không lộ dữ liệu
      hopDongLienKetId: boLoc.hopDongId
        ? { in: idsHopDong.filter((id) => id === boLoc.hopDongId) }
        : { in: idsHopDong },
      trangThai: boLoc.trangThai || undefined,
      hocVien: tuKhoa
        ? {
            OR: [
              { hoTen: { contains: tuKhoa, mode: "insensitive" } },
              { maHocVien: { contains: tuKhoa, mode: "insensitive" } },
              { soCCCD: { contains: tuKhoa } },
            ],
          }
        : undefined,
    },
    select: {
      id: true,
      trangThai: true,
      ngayDangKy: true,
      hanNopGiay: true,
      hopDongLienKetId: true,
      loNopHoSo: { select: { maLo: true } },
      khoa: { select: { id: true, maKhoa: true } },
      hocVien: {
        select: {
          maHocVien: true,
          hoTen: true,
          soCCCD: true,
          ngaySinh: true,
          soDienThoai: true,
          email: true,
          donViCongTac: true,
        },
      },
    },
    orderBy: [{ ngayDangKy: "desc" }],
  });

  return { donVi, dsHopDong, dsHoSo };
}
