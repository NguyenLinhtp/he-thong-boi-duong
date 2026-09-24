import { prisma } from "@/lib/db/prisma";
import type { HinhThucGiangDay } from "@/generated/prisma/client";
import {
  KhongTimThayKhoaError,
  KhoaKhongPhaiTrucTuyenError,
  ThieuLinkTrucTuyenError,
} from "@/server/services/kh/loi-khoa";

/**
 * KH-04: khóa trực tiếp gán phòng học/địa điểm (đã có ở KH-03, mỗi buổi học
 * chọn phongHocId); khóa trực tuyến gán link cho từng buổi học - có thể dán
 * tay (khóa ít buổi, link tạo sẵn ngoài Zoom/Teams, cũng qua trường
 * linkTrucTuyen ở KH-03) hoặc sinh hàng loạt tự động (khóa nhiều buổi/nhiều
 * lớp diễn ra cùng lúc, không thể dùng chung 1 link). Chưa có tích hợp API
 * Zoom/MS Teams thật (chưa có tài khoản/API key) - link sinh tự động là
 * link giữ chỗ nội bộ, thay bằng lệnh gọi API thật khi có credentials.
 */
export async function thietLapHinhThucGiangDay(khoaId: string, hinhThucGiangDay: HinhThucGiangDay) {
  const khoa = await prisma.khoa.findUnique({ where: { id: khoaId } });
  if (!khoa) throw new KhongTimThayKhoaError();

  return prisma.khoa.update({ where: { id: khoaId }, data: { hinhThucGiangDay } });
}

function sinhLinkGiuCho(): string {
  return `https://hop-truc-tuyen.he-thong-boi-duong.local/${crypto.randomUUID()}`;
}

/**
 * Sinh link giữ chỗ cho mọi buổi học của khóa trực tuyến hiện còn thiếu
 * link, mỗi buổi 1 link riêng (đáp ứng trường hợp nhiều buổi/nhiều lớp diễn
 * ra cùng lúc, không thể dùng chung 1 link). Trả về số buổi vừa được gán.
 */
export async function tuDongTaoLinkTrucTuyen(khoaId: string): Promise<number> {
  const khoa = await prisma.khoa.findUnique({ where: { id: khoaId } });
  if (!khoa) throw new KhongTimThayKhoaError();
  if (khoa.hinhThucGiangDay !== "TRUC_TUYEN") throw new KhoaKhongPhaiTrucTuyenError();

  const buoiChuaCoLink = await prisma.buoiHoc.findMany({
    where: { khoaId, linkTrucTuyen: null },
  });
  if (buoiChuaCoLink.length === 0) return 0;

  await prisma.$transaction(
    buoiChuaCoLink.map((bh) =>
      prisma.buoiHoc.update({ where: { id: bh.id }, data: { linkTrucTuyen: sinhLinkGiuCho() } }),
    ),
  );
  return buoiChuaCoLink.length;
}

export type TinhTrangLinkTrucTuyen =
  | { apDung: false }
  | { apDung: true; tongBuoi: number; buoiThieuLink: number; daDu: boolean };

export async function tinhTrangLinkTrucTuyen(khoaId: string): Promise<TinhTrangLinkTrucTuyen> {
  const khoa = await prisma.khoa.findUnique({ where: { id: khoaId } });
  if (!khoa) throw new KhongTimThayKhoaError();
  if (khoa.hinhThucGiangDay !== "TRUC_TUYEN") return { apDung: false };

  const [tongBuoi, buoiThieuLink] = await Promise.all([
    prisma.buoiHoc.count({ where: { khoaId } }),
    prisma.buoiHoc.count({ where: { khoaId, linkTrucTuyen: null } }),
  ]);
  return { apDung: true, tongBuoi, buoiThieuLink, daDu: tongBuoi > 0 && buoiThieuLink === 0 };
}

/**
 * KH-04: "Khóa trực tuyến bắt buộc phải có link trước ngày khai giảng" -
 * cổng kiểm tra tường minh để gọi trước khi xác nhận khóa sẵn sàng khai
 * giảng (KH-05 sẽ dùng lại khi quản lý chuyển trạng thái khóa).
 */
export async function xacNhanSanSangTrucTuyen(khoaId: string): Promise<void> {
  const tinhTrang = await tinhTrangLinkTrucTuyen(khoaId);
  if (tinhTrang.apDung && !tinhTrang.daDu) throw new ThieuLinkTrucTuyenError();
}
