import { prisma } from "@/lib/db/prisma";
import { tongSoTietHocPhan } from "@/server/services/ct/ct-02-hoc-phan";
import { ghiThaoTac, HE_THONG, type NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";
import {
  SaiTrangThaiChuongTrinhError,
  KhongTimThayChuongTrinhError,
} from "@/server/services/ct/loi-chuong-trinh";

// (sửa 08/10/2026) được đổi tổng thời lượng/loại hình cả khi có khóa hoạt động (khóa dùng theo chương
// trình nên cập nhật theo) - nhưng bắt buộc ghi lý do
export class SuaTruongAnhHuongKhoaDangChayError extends Error {
  constructor() {
    super("Chương trình đang có khóa hoạt động - đổi tổng thời lượng hoặc loại hình cần nhập lý do sửa (các khóa sẽ dùng giá trị mới)");
  }
}

// CT-02 "Tổng số tiết học phần phải khớp tổng thời lượng chương trình": học
// phần đã khóa sau ban hành nên thời lượng mới phải bằng tổng tiết hiện có
export class ThoiLuongLechTongTietError extends Error {
  constructor(tongTiet: number) {
    super(`Tổng thời lượng phải khớp tổng số tiết các học phần (${tongTiet} tiết)`);
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
  const doiLoaiHinh = input.loaiHinhBoiDuongId !== chuongTrinh.loaiHinhBoiDuongId;
  const anhHuongKhoa = (doiThoiLuong || doiLoaiHinh) && (await coKhoaDangHoatDong(id));
  if (anhHuongKhoa && !input.lyDoSua?.trim()) throw new SuaTruongAnhHuongKhoaDangChayError();

  if (input.tongThoiLuong !== undefined && input.tongThoiLuong !== chuongTrinh.tongThoiLuong) {
    const tongTiet = await tongSoTietHocPhan(id);
    if (input.tongThoiLuong !== tongTiet) throw new ThoiLuongLechTongTietError(tongTiet);
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

    const sau = await tx.chuongTrinh.update({
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
    await ghiThaoTac(
      nguoi,
      "SUA_CHUONG_TRINH_DA_BAN_HANH",
      "ChuongTrinh",
      id,
      `${sau.maCT}: phiên bản ${chuongTrinh.phienBanHienTai} -> ${sau.phienBanHienTai}` +
        (doiThoiLuong ? `; tổng thời lượng ${chuongTrinh.tongThoiLuong ?? "—"} -> ${input.tongThoiLuong ?? "—"}` : "") +
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
