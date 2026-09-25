import nodemailer from "nodemailer";
import { prisma } from "@/lib/db/prisma";
import { layCauHinhSmtpNoiBo } from "@/server/services/hv/cau-hinh-smtp";
import type { LoaiSuKienThongBao } from "@/generated/prisma/client";

// HV-10: "Gửi trong vòng 24 giờ kể từ khi sự kiện phát sinh" - hàm này được
// gọi NGAY tại thời điểm sự kiện xảy ra (đăng ký, trúng tuyển, khai
// giảng...) nên luôn thỏa quy tắc, không cần hàng đợi/lập lịch riêng.
//
// Gửi email là nỗ lực tốt nhất (best-effort): mọi lỗi (chưa cấu hình SMTP,
// sai thông tin, học viên không có email, mất kết nối...) đều bị bắt lại và
// ghi vào ThongBao.loiGuiEmail - KHÔNG BAO GIỜ throw ra ngoài, vì nghiệp vụ
// gọi hàm này (vd HV-07 xét duyệt chính thức) không được phép fail chỉ vì
// gửi email lỗi. Dòng ThongBao luôn được ghi lại, đóng vai trò "trung tâm
// thông báo trong hệ thống" - hiện chưa có cổng đăng nhập học viên nên cán
// bộ xem trực tiếp trong hồ sơ học viên (HV-08).
export async function guiThongBao(
  hocVienId: string,
  loaiSuKien: LoaiSuKienThongBao,
  tieuDe: string,
  noiDung: string,
) {
  const hocVien = await prisma.hocVien.findUnique({ where: { id: hocVienId } });
  if (!hocVien) return null;

  const thongBao = await prisma.thongBao.create({
    data: { hocVienId, loaiSuKien, tieuDe, noiDung },
  });

  if (!hocVien.email) {
    return prisma.thongBao.update({
      where: { id: thongBao.id },
      data: { loiGuiEmail: "Học viên chưa có địa chỉ email" },
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
      to: hocVien.email,
      subject: tieuDe,
      text: noiDung,
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

export async function danhSachThongBaoCuaHocVien(hocVienId: string) {
  return prisma.thongBao.findMany({
    where: { hocVienId },
    orderBy: { createdAt: "desc" },
  });
}
