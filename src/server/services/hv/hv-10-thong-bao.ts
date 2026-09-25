import nodemailer from "nodemailer";
import { prisma } from "@/lib/db/prisma";
import { layCauHinhSmtpNoiBo } from "@/server/services/hv/cau-hinh-smtp";
import type { LoaiSuKienThongBao } from "@/generated/prisma/client";

// HV-10: "Gửi trong vòng 24 giờ kể từ khi sự kiện phát sinh" - hàm này được
// gọi NGAY tại thời điểm sự kiện xảy ra (đăng ký, trúng tuyển, khai
// giảng...) nên luôn thỏa quy tắc, không cần hàng đợi/lập lịch riêng.
//
// Gửi email là nỗ lực tốt nhất (best-effort): mọi lỗi (chưa cấu hình SMTP,
// sai thông tin, người nhận không có email, mất kết nối...) đều bị bắt lại
// và ghi vào ThongBao.loiGuiEmail - KHÔNG BAO GIỜ throw ra ngoài, vì nghiệp
// vụ gọi hàm này (vd HV-07 xét duyệt chính thức, GD-03 đổi lịch) không được
// phép fail chỉ vì gửi email lỗi. Dòng ThongBao luôn được ghi lại, đóng vai
// trò "trung tâm thông báo trong hệ thống" - hiện chưa có cổng đăng nhập
// học viên/giảng viên nên cán bộ xem trực tiếp trong hồ sơ học viên (HV-08)
// hoặc trang giảng viên.
async function guiThongBaoNoiBo(input: {
  data: { hocVienId: string } | { giangVienId: string };
  emailNguoiNhan: string | null;
  loaiSuKien: LoaiSuKienThongBao;
  tieuDe: string;
  noiDung: string;
}) {
  const thongBao = await prisma.thongBao.create({
    data: {
      ...input.data,
      loaiSuKien: input.loaiSuKien,
      tieuDe: input.tieuDe,
      noiDung: input.noiDung,
    },
  });

  if (!input.emailNguoiNhan) {
    return prisma.thongBao.update({
      where: { id: thongBao.id },
      data: { loiGuiEmail: "Người nhận chưa có địa chỉ email" },
    });
  }

  const cauHinh = await layCauHinhSmtpNoiBo();
  if (!cauHinh) {
    return prisma.thongBao.update({
      where: { id: thongBao.id },
      data: { loiGuiEmail: "Chưa cấu hình SMTP" },
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: cauHinh.host,
      port: cauHinh.port,
      secure: cauHinh.port === 465,
      auth: { user: cauHinh.taiKhoan, pass: cauHinh.matKhau },
      connectionTimeout: 5_000,
    });
    await transporter.sendMail({
      from: cauHinh.tuDiaChi,
      to: input.emailNguoiNhan,
      subject: input.tieuDe,
      text: input.noiDung,
    });
    return await prisma.thongBao.update({
      where: { id: thongBao.id },
      data: { daGuiEmail: true },
    });
  } catch (error) {
    return prisma.thongBao.update({
      where: { id: thongBao.id },
      data: { loiGuiEmail: error instanceof Error ? error.message : String(error) },
    });
  }
}

export async function guiThongBao(
  hocVienId: string,
  loaiSuKien: LoaiSuKienThongBao,
  tieuDe: string,
  noiDung: string,
) {
  const hocVien = await prisma.hocVien.findUnique({ where: { id: hocVienId } });
  if (!hocVien) return null;

  return guiThongBaoNoiBo({
    data: { hocVienId },
    emailNguoiNhan: hocVien.email,
    loaiSuKien,
    tieuDe,
    noiDung,
  });
}

// GD-03: nhánh "giảng viên" của cùng cơ chế thông báo - giảng viên mời
// giảng có thể không có tài khoản đăng nhập nên lấy email trực tiếp từ
// GiangVien.email (không qua NguoiDung).
export async function guiThongBaoGiangVien(
  giangVienId: string,
  loaiSuKien: LoaiSuKienThongBao,
  tieuDe: string,
  noiDung: string,
) {
  const giangVien = await prisma.giangVien.findUnique({ where: { id: giangVienId } });
  if (!giangVien) return null;

  return guiThongBaoNoiBo({
    data: { giangVienId },
    emailNguoiNhan: giangVien.email,
    loaiSuKien,
    tieuDe,
    noiDung,
  });
}

export async function danhSachThongBaoCuaHocVien(hocVienId: string) {
  return prisma.thongBao.findMany({
    where: { hocVienId },
    orderBy: { createdAt: "desc" },
  });
}

export async function danhSachThongBaoCuaGiangVien(giangVienId: string) {
  return prisma.thongBao.findMany({
    where: { giangVienId },
    orderBy: { createdAt: "desc" },
  });
}
