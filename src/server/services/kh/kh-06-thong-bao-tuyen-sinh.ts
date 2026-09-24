import { prisma } from "@/lib/db/prisma";
import { coTheNhanDangKy } from "@/server/services/kh/kh-05-trang-thai-si-so";
import { KhongTimThayKhoaError, KhoaChuaMoDangKyError } from "@/server/services/kh/loi-khoa";

const GOC_LINK_DANG_KY = "https://dangky.ued.udn.vn/khoa";

/**
 * KH-06: "Chỉ gửi/sinh link khi khóa Đang tuyển sinh; link tự vô hiệu khi
 * khóa đóng đăng ký hoặc đã đủ sĩ số" - tái dùng coTheNhanDangKy (KH-05) làm
 * điều kiện hiệu lực duy nhất, tính lại mỗi lần gọi (không lưu trạng thái
 * link riêng) nên tự động vô hiệu ngay khi khóa đổi trạng thái/đầy sĩ số.
 */
export async function linkDangKyCongKhai(khoaId: string): Promise<string | null> {
  const khoa = await prisma.khoa.findUnique({ where: { id: khoaId } });
  if (!khoa) throw new KhongTimThayKhoaError();

  const conMo = await coTheNhanDangKy(khoaId);
  return conMo ? `${GOC_LINK_DANG_KY}/${khoa.maKhoa}` : null;
}

export type KenhGui = "WEBSITE" | "EMAIL";

export type PhatHanhThongBaoInput = {
  khoaId: string;
  noiDung: string;
  kenhGui: KenhGui[];
};

export type ThongBaoDaPhatHanh = {
  link: string;
  noiDung: string;
  kenhGui: KenhGui[];
};

/**
 * Chưa có tích hợp gửi email/đăng website thật (chưa có SMTP/CMS
 * credentials) - trả về gói thông báo đã đủ điều kiện phát hành (đúng nội
 * dung cán bộ soạn + link công khai còn hiệu lực) để cán bộ tự gửi qua các
 * kênh đã chọn, không giả lập việc "đã gửi" thành công.
 */
export async function phatHanhThongBao(input: PhatHanhThongBaoInput): Promise<ThongBaoDaPhatHanh> {
  const link = await linkDangKyCongKhai(input.khoaId);
  if (!link) throw new KhoaChuaMoDangKyError();

  return { link, noiDung: input.noiDung, kenhGui: input.kenhGui };
}

export async function layKhoaTheoMa(maKhoa: string) {
  return prisma.khoa.findUnique({ where: { maKhoa }, include: { chuongTrinh: true } });
}
