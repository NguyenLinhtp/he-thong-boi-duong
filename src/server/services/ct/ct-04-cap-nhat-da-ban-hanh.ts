import { prisma } from "@/lib/db/prisma";
import {
  SaiTrangThaiChuongTrinhError,
  KhongTimThayChuongTrinhError,
} from "@/server/services/ct/loi-chuong-trinh";

export class SuaTruongAnhHuongKhoaDangChayError extends Error {
  constructor() {
    super(
      "Chương trình đang có khóa hoạt động, chỉ được sửa tên/mục tiêu/đối tượng áp dụng - không được đổi tổng thời lượng hoặc loại hình",
    );
  }
}

const KHOA_DANG_HOAT_DONG: Array<"CHUAN_BI" | "DANG_TUYEN_SINH" | "DANG_DIEN_RA"> = [
  "CHUAN_BI",
  "DANG_TUYEN_SINH",
  "DANG_DIEN_RA",
];

export async function coKhoaDangHoatDong(chuongTrinhId: string): Promise<boolean> {
  const soLuong = await prisma.khoa.count({
    where: { chuongTrinhId, trangThai: { in: KHOA_DANG_HOAT_DONG } },
  });
  return soLuong > 0;
}

export type SuaChuongTrinhDaBanHanhInput = {
  ten: string;
  mucTieu?: string | null;
  doiTuongApDung?: string | null;
  tongThoiLuong?: number | null;
  loaiHinhBoiDuongId: string;
  lyDoSua?: string | null;
};

/**
 * CT-04: sửa chương trình đã ban hành - luôn lưu snapshot nội dung TRƯỚC
 * khi sửa vào ChuongTrinhPhienBan và tăng phienBanHienTai. Nếu chương
 * trình đang có khóa hoạt động, chỉ cho đổi các trường không ảnh hưởng
 * khóa đang chạy (ten/mucTieu/doiTuongApDung) - chặn đổi tongThoiLuong
 * hoặc loaiHinhBoiDuongId.
 */
export async function suaChuongTrinhDaBanHanh(
  id: string,
  input: SuaChuongTrinhDaBanHanhInput,
) {
  const chuongTrinh = await prisma.chuongTrinh.findUnique({ where: { id } });
  if (!chuongTrinh) throw new KhongTimThayChuongTrinhError();
  if (chuongTrinh.trangThai !== "DA_BAN_HANH") {
    throw new SaiTrangThaiChuongTrinhError(
      "Chỉ chương trình ở trạng thái Đã ban hành mới sửa theo CT-04 (chương trình Dự thảo sửa trực tiếp theo CT-01)",
    );
  }

  if (await coKhoaDangHoatDong(id)) {
    const doiThoiLuong = input.tongThoiLuong !== chuongTrinh.tongThoiLuong;
    const doiLoaiHinh = input.loaiHinhBoiDuongId !== chuongTrinh.loaiHinhBoiDuongId;
    if (doiThoiLuong || doiLoaiHinh) throw new SuaTruongAnhHuongKhoaDangChayError();
  }

  return prisma.$transaction(async (tx) => {
    await tx.chuongTrinhPhienBan.create({
      data: {
        chuongTrinhId: id,
        phienBan: chuongTrinh.phienBanHienTai,
        ten: chuongTrinh.ten,
        mucTieu: chuongTrinh.mucTieu,
        doiTuongApDung: chuongTrinh.doiTuongApDung,
        tongThoiLuong: chuongTrinh.tongThoiLuong,
        loaiHinhBoiDuongId: chuongTrinh.loaiHinhBoiDuongId,
        lyDoSua: input.lyDoSua,
      },
    });

    return tx.chuongTrinh.update({
      where: { id },
      data: {
        ten: input.ten,
        mucTieu: input.mucTieu,
        doiTuongApDung: input.doiTuongApDung,
        tongThoiLuong: input.tongThoiLuong,
        loaiHinhBoiDuongId: input.loaiHinhBoiDuongId,
        phienBanHienTai: chuongTrinh.phienBanHienTai + 1,
      },
    });
  });
}

export async function lichSuPhienBan(chuongTrinhId: string) {
  return prisma.chuongTrinhPhienBan.findMany({
    where: { chuongTrinhId },
    orderBy: { phienBan: "desc" },
  });
}
