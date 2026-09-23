import { prisma } from "@/lib/db/prisma";
import {
  SaiTrangThaiChuongTrinhError,
  KhongTimThayChuongTrinhError,
} from "@/server/services/ct/loi-chuong-trinh";

// Nội dung học phần (thêm/sửa/xóa/sắp xếp) chỉ thay đổi tự do khi chương
// trình còn "Dự thảo" - cùng lý do với CT-01: sau khi trình duyệt/ban hành,
// thay đổi học phần ảnh hưởng trực tiếp tới khóa đang chạy theo chương
// trình đó, phải qua CT-04 với ràng buộc riêng.
async function kiemTraChuongTrinhDangDuThao(chuongTrinhId: string) {
  const chuongTrinh = await prisma.chuongTrinh.findUnique({ where: { id: chuongTrinhId } });
  if (!chuongTrinh) throw new KhongTimThayChuongTrinhError();
  if (chuongTrinh.trangThai !== "DU_THAO") {
    throw new SaiTrangThaiChuongTrinhError(
      "Chỉ chỉnh sửa được học phần khi chương trình còn ở trạng thái Dự thảo",
    );
  }
  return chuongTrinh;
}

export async function danhSachHocPhan(chuongTrinhId: string) {
  return prisma.hocPhan.findMany({
    where: { chuongTrinhId },
    orderBy: { thuTu: "asc" },
  });
}

export async function tongSoTietHocPhan(chuongTrinhId: string) {
  const ketQua = await prisma.hocPhan.aggregate({
    where: { chuongTrinhId },
    _sum: { soTiet: true },
  });
  return ketQua._sum.soTiet ?? 0;
}

/**
 * CT-02/CT-03: "Tổng số tiết học phần phải khớp tổng thời lượng chương
 * trình" - dùng làm cổng kiểm tra trước khi cho trình duyệt (CT-03), không
 * chặn từng lần thêm/sửa lẻ tẻ vì học phần được xây dần trong lúc Dự thảo.
 */
export async function tongTietDaKhopThoiLuong(chuongTrinhId: string): Promise<boolean> {
  const chuongTrinh = await prisma.chuongTrinh.findUnique({ where: { id: chuongTrinhId } });
  if (!chuongTrinh) throw new KhongTimThayChuongTrinhError();
  if (chuongTrinh.tongThoiLuong == null) return false;

  const tongTiet = await tongSoTietHocPhan(chuongTrinhId);
  return tongTiet === chuongTrinh.tongThoiLuong;
}

export type ThemHocPhanInput = { ten: string; soTiet: number };

export async function themHocPhan(chuongTrinhId: string, input: ThemHocPhanInput) {
  await kiemTraChuongTrinhDangDuThao(chuongTrinhId);

  const hocPhanCuoi = await prisma.hocPhan.findFirst({
    where: { chuongTrinhId },
    orderBy: { thuTu: "desc" },
  });

  return prisma.hocPhan.create({
    data: {
      chuongTrinhId,
      ten: input.ten,
      soTiet: input.soTiet,
      thuTu: (hocPhanCuoi?.thuTu ?? 0) + 1,
    },
  });
}

export type SuaHocPhanInput = { ten: string; soTiet: number };

export async function suaHocPhan(id: string, input: SuaHocPhanInput) {
  const hocPhan = await prisma.hocPhan.findUnique({ where: { id } });
  if (!hocPhan) throw new Error("Không tìm thấy học phần");
  await kiemTraChuongTrinhDangDuThao(hocPhan.chuongTrinhId);

  return prisma.hocPhan.update({ where: { id }, data: input });
}

export async function xoaHocPhan(id: string) {
  const hocPhan = await prisma.hocPhan.findUnique({ where: { id } });
  if (!hocPhan) throw new Error("Không tìm thấy học phần");
  await kiemTraChuongTrinhDangDuThao(hocPhan.chuongTrinhId);

  return prisma.hocPhan.delete({ where: { id } });
}

/**
 * Sắp xếp lại thứ tự học phần trong 1 chương trình: nhận đúng danh sách id
 * học phần theo thứ tự mới mong muốn, ghi lại thuTu = vị trí trong mảng.
 */
export async function sapXepHocPhan(chuongTrinhId: string, thuTuIdMoi: string[]) {
  await kiemTraChuongTrinhDangDuThao(chuongTrinhId);

  const hocPhanHienCo = await prisma.hocPhan.findMany({ where: { chuongTrinhId } });
  const idHienCo = new Set(hocPhanHienCo.map((hp) => hp.id));

  if (
    thuTuIdMoi.length !== hocPhanHienCo.length ||
    !thuTuIdMoi.every((id) => idHienCo.has(id))
  ) {
    throw new Error("Danh sách sắp xếp không khớp với các học phần hiện có của chương trình");
  }

  await prisma.$transaction(
    thuTuIdMoi.map((id, viTri) =>
      prisma.hocPhan.update({ where: { id }, data: { thuTu: viTri + 1 } }),
    ),
  );
}
