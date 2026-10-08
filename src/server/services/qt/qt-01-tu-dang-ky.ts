import { laEmailHopLe } from "@/lib/email";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { kiemTraChinhSachMatKhau } from "@/server/services/qt/qt-01-quan-ly-tai-khoan";
import { ghiThaoTac } from "@/server/services/qt/qt-03-nhat-ky";
import { timHoacTaoHocVien } from "@/server/services/hv/dung-chung";
import { chuanHoaCCCD } from "@/server/services/hv/hv-03-danh-sach-sinh-vien";
import { chuanHoaChu } from "@/server/services/chung/bang-tinh";

/**
 * (bổ sung 01/10/2026 - QT-01) Học viên tự đăng ký tài khoản để đăng ký các
 * khóa học cần tài khoản (khóa có giai đoạn học: Phương thức 1, 2, 4b). Tên
 * đăng nhập = số CCCD, vai trò Học viên, gắn với hồ sơ học viên (HV-08) theo CCCD.
 *
 * Hồ sơ học viên đã có sẵn (đăng ký trước đây, được import, đơn vị liên kết
 * đăng ký hộ) chỉ được nhận về tài khoản mới khi họ tên khớp và - nếu hồ sơ có
 * ngày sinh - ngày sinh khớp: người chỉ biết số CCCD của người khác không chiếm
 * được hồ sơ, kết quả học tập của họ.
 */
export class DangKyTaiKhoanError extends Error {
  constructor(lyDo: string) {
    super(lyDo);
  }
}

export type DangKyTaiKhoanInput = {
  hoTen: string;
  soCCCD: string;
  ngaySinh: string;
  soDienThoai: string;
  email?: string | null;
  matKhau: string;
  nhapLaiMatKhau: string;
};

const ngayISO = (d: Date) => d.toISOString().slice(0, 10);

export async function dangKyTaiKhoanHocVien(input: DangKyTaiKhoanInput) {
  const hoTen = input.hoTen.trim().replace(/\s+/g, " ");
  const soCCCD = chuanHoaCCCD(input.soCCCD.trim());
  const email = input.email?.trim().toLowerCase() || null;
  const soDienThoai = input.soDienThoai.trim();
  if (hoTen.length < 2) throw new DangKyTaiKhoanError("Vui lòng nhập họ tên");
  if (!soCCCD) throw new DangKyTaiKhoanError("Số CCCD không hợp lệ (12 chữ số)");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.ngaySinh) || Number.isNaN(Date.parse(input.ngaySinh))) {
    throw new DangKyTaiKhoanError("Ngày sinh không hợp lệ");
  }
  if (!/^[0-9+ .]{9,15}$/.test(soDienThoai)) throw new DangKyTaiKhoanError("Số điện thoại không hợp lệ");
  if (email && !laEmailHopLe(email)) throw new DangKyTaiKhoanError("Email chưa đúng định dạng (ví dụ: ten@gmail.com)");
  if (input.matKhau !== input.nhapLaiMatKhau) throw new DangKyTaiKhoanError("Mật khẩu nhập lại không khớp");
  kiemTraChinhSachMatKhau(input.matKhau);

  const daCoTaiKhoan = await prisma.nguoiDung.findFirst({ where: { OR: [{ tenDangNhap: soCCCD }, { soCCCD }] } });
  if (daCoTaiKhoan) throw new DangKyTaiKhoanError("Số CCCD này đã có tài khoản - vui lòng đăng nhập (quên mật khẩu: liên hệ trung tâm)");
  if (email && (await prisma.nguoiDung.findUnique({ where: { email } }))) {
    throw new DangKyTaiKhoanError("Email đã được dùng cho tài khoản khác");
  }

  const hoSoCu = await prisma.hocVien.findUnique({ where: { soCCCD } });
  if (hoSoCu) {
    const taiKhoanTheoMa = await prisma.nguoiDung.findUnique({ where: { maSoHocVien: hoSoCu.maHocVien } });
    if (hoSoCu.nguoiDungId || taiKhoanTheoMa) throw new DangKyTaiKhoanError("Hồ sơ học viên này đã có tài khoản - vui lòng đăng nhập");
    const khopTen = chuanHoaChu(hoSoCu.hoTen) === chuanHoaChu(hoTen);
    const khopNgaySinh = !hoSoCu.ngaySinh || ngayISO(hoSoCu.ngaySinh) === input.ngaySinh;
    if (!khopTen || !khopNgaySinh) {
      throw new DangKyTaiKhoanError(
        "Số CCCD đã có hồ sơ học viên nhưng họ tên/ngày sinh không khớp - vui lòng kiểm tra lại hoặc liên hệ trung tâm",
      );
    }
  }
  // hồ sơ cũ: chỉ bổ sung chỗ trống (không ghi đè); chưa có thì tạo mới
  const hocVien = await timHoacTaoHocVien({ hoTen, soCCCD, ngaySinh: input.ngaySinh, soDienThoai, email });

  const vaiTro = await prisma.vaiTroModel.findUnique({ where: { ma: "HOC_VIEN" } });
  if (!vaiTro) throw new DangKyTaiKhoanError("Hệ thống chưa khai báo vai trò Học viên - liên hệ quản trị");
  const matKhauHash = await bcrypt.hash(input.matKhau, 10);
  return prisma.$transaction(async (tx) => {
    const taiKhoan = await tx.nguoiDung.create({
      data: {
        tenDangNhap: soCCCD,
        soCCCD,
        maSoHocVien: hocVien.maHocVien,
        matKhauHash,
        hoTen: hocVien.hoTen,
        email,
        vaiTros: { create: [{ vaiTroId: vaiTro.id }] },
      },
    });
    await tx.hocVien.update({ where: { id: hocVien.id }, data: { nguoiDungId: taiKhoan.id } });
    await ghiThaoTac(
      { nguoiThucHienId: taiKhoan.id, nguoiThucHienTen: hocVien.hoTen },
      "TU_DANG_KY_TAI_KHOAN",
      "NguoiDung",
      taiKhoan.id,
      `${soCCCD} (${hocVien.hoTen}) - học viên ${hocVien.maHocVien}${hoSoCu ? " (nhận hồ sơ có sẵn)" : ""}`,
      tx,
    );
    return { taiKhoan, hocVien };
  });
}
