import { prisma } from "@/lib/db/prisma";
import { KhongTimThayBuoiHocError } from "@/server/services/kh/loi-khoa";

/**
 * GD-05: "Link tự động vô hiệu sau khi buổi học kết thúc" - không có
 * cron/job nền, áp dụng kiểu vô hiệu hóa lười (lazy): link vẫn nằm trong DB
 * (giữ lịch sử) nhưng coi là hết hiệu lực ngay khi đọc nếu buổi đã hủy hoặc
 * đã qua giờ kết thúc. Việc tạo link hàng loạt đã có ở KH-04
 * (tuDongTaoLinkTrucTuyen) - GD-05 chỉ thêm phần kiểm tra hiệu lực + thu hồi
 * thủ công.
 */
export function buoiHocDaKetThuc(buoiHoc: { ngayHoc: Date; gioKetThuc: string | null }): boolean {
  const ngay = new Date(buoiHoc.ngayHoc);
  if (buoiHoc.gioKetThuc) {
    const [gio, phut] = buoiHoc.gioKetThuc.split(":").map(Number);
    ngay.setHours(gio, phut, 0, 0);
  } else {
    // Không có giờ kết thúc cụ thể - coi như hết hiệu lực từ cuối ngày học.
    ngay.setHours(23, 59, 59, 999);
  }
  return ngay.getTime() < Date.now();
}

export type TinhTrangLinkBuoiHoc =
  | { coLink: false }
  | { coLink: true; link: string; conHieuLuc: boolean };

export async function tinhTrangLinkBuoiHoc(buoiHocId: string): Promise<TinhTrangLinkBuoiHoc> {
  const buoiHoc = await prisma.buoiHoc.findUnique({ where: { id: buoiHocId } });
  if (!buoiHoc) throw new KhongTimThayBuoiHocError();
  if (!buoiHoc.linkTrucTuyen) return { coLink: false };

  const conHieuLuc = !buoiHoc.daHuy && !buoiHocDaKetThuc(buoiHoc);
  return { coLink: true, link: buoiHoc.linkTrucTuyen, conHieuLuc };
}

export async function thuHoiLinkTrucTuyen(buoiHocId: string) {
  const buoiHoc = await prisma.buoiHoc.findUnique({ where: { id: buoiHocId } });
  if (!buoiHoc) throw new KhongTimThayBuoiHocError();

  return prisma.buoiHoc.update({
    where: { id: buoiHocId },
    data: { linkTrucTuyen: null },
  });
}
