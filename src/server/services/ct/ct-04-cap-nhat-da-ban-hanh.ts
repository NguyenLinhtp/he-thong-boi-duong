import { prisma } from "@/lib/db/prisma";
import type { DonViThoiLuong } from "@/generated/prisma/client";
import { tenDonViThoiLuong } from "@/lib/don-vi-thoi-luong";
import { ghiThaoTac, HE_THONG, type NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";
import {
  SaiTrangThaiChuongTrinhError,
  KhongTimThayChuongTrinhError,
} from "@/server/services/ct/loi-chuong-trinh";

// (sửa 08/10/2026) được đổi tổng thời lượng/loại hình cả khi có khóa hoạt động (khóa dùng theo chương
// trình nên cập nhật theo) - nhưng bắt buộc ghi lý do
export class SuaTruongAnhHuongKhoaDangChayError extends Error {
  constructor() {
    super("Chương trình đang có khóa hoạt động - đổi tổng thời lượng, đơn vị thời lượng hoặc loại hình cần nhập lý do sửa (các khóa sẽ dùng giá trị mới)");
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
  donViThoiLuong?: DonViThoiLuong;
  loaiHinhBoiDuongId: string;
  lyDoSua?: string | null;
};

/**
 * CT-04: sửa chương trình đã ban hành - luôn lưu snapshot nội dung TRƯỚC
 * khi sửa vào ChuongTrinhPhienBan và tăng phienBanHienTai. Nếu chương
 * trình đang có khóa hoạt động: (sửa 08/10/2026) vẫn đổi được tongThoiLuong /
 * loaiHinhBoiDuongId - mọi khóa của chương trình dùng giá trị mới - nhưng bắt buộc lý do sửa.
 */
export async function suaChuongTrinhDaBanHanh(
  id: string,
  input: SuaChuongTrinhDaBanHanhInput,
  nguoi: NguoiThucHien = HE_THONG,
) {
  const chuongTrinh = await prisma.chuongTrinh.findUnique({ where: { id } });
  if (!chuongTrinh) throw new KhongTimThayChuongTrinhError();
  if (chuongTrinh.trangThai !== "DA_BAN_HANH") {
    throw new SaiTrangThaiChuongTrinhError(
      "Chỉ chương trình ở trạng thái Đã ban hành mới sửa theo CT-04 (chương trình Dự thảo sửa trực tiếp theo CT-01)",
    );
  }

  const doiThoiLuong = input.tongThoiLuong !== undefined && input.tongThoiLuong !== chuongTrinh.tongThoiLuong;
  const doiDonVi = input.donViThoiLuong !== undefined && input.donViThoiLuong !== chuongTrinh.donViThoiLuong;
  const doiLoaiHinh = input.loaiHinhBoiDuongId !== chuongTrinh.loaiHinhBoiDuongId;
  const anhHuongKhoa = (doiThoiLuong || doiDonVi || doiLoaiHinh) && (await coKhoaDangHoatDong(id));
  if (anhHuongKhoa && !input.lyDoSua?.trim()) throw new SuaTruongAnhHuongKhoaDangChayError();
  // (sửa 19/10/2026) không còn bắt tổng thời lượng khớp tổng thời lượng học phần - màn hình Khung
  // chương trình và CT-03 chỉ cảnh báo khi lệch (chương trình tính theo tiết/tín chỉ/buổi)

  return prisma.$transaction(async (tx) => {
    await tx.chuongTrinhPhienBan.create({
      data: {
        chuongTrinhId: id,
        phienBan: chuongTrinh.phienBanHienTai,
        ten: chuongTrinh.ten,
        mucTieu: chuongTrinh.mucTieu,
        doiTuongApDung: chuongTrinh.doiTuongApDung,
        tongThoiLuong: chuongTrinh.tongThoiLuong,
        donViThoiLuong: chuongTrinh.donViThoiLuong,
        loaiHinhBoiDuongId: chuongTrinh.loaiHinhBoiDuongId,
        lyDoSua: input.lyDoSua,
      },
    });

    const sau = await tx.chuongTrinh.update({
      where: { id },
      data: {
        ten: input.ten,
        mucTieu: input.mucTieu,
        doiTuongApDung: input.doiTuongApDung,
        tongThoiLuong: input.tongThoiLuong,
        donViThoiLuong: input.donViThoiLuong,
        loaiHinhBoiDuongId: input.loaiHinhBoiDuongId,
        phienBanHienTai: chuongTrinh.phienBanHienTai + 1,
      },
    });
    await ghiThaoTac(
      nguoi,
      "SUA_CHUONG_TRINH_DA_BAN_HANH",
      "ChuongTrinh",
      id,
      `${sau.maCT}: phiên bản ${chuongTrinh.phienBanHienTai} -> ${sau.phienBanHienTai}` +
        (doiThoiLuong || doiDonVi
          ? `; tổng thời lượng ${chuongTrinh.tongThoiLuong ?? "—"} ${tenDonViThoiLuong(chuongTrinh.donViThoiLuong)} -> ${sau.tongThoiLuong ?? "—"} ${tenDonViThoiLuong(sau.donViThoiLuong)}`
          : "") +
        (doiLoaiHinh ? "; đổi loại hình" : "") +
        (anhHuongKhoa ? "; áp dụng cho các khóa đang hoạt động" : "") +
        (input.lyDoSua ? ` - lý do: ${input.lyDoSua}` : ""),
      tx,
    );
    return sau;
  });
}

export async function lichSuPhienBan(chuongTrinhId: string) {
  return prisma.chuongTrinhPhienBan.findMany({
    where: { chuongTrinhId },
    orderBy: { phienBan: "desc" },
  });
}
