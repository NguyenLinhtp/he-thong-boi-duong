import { prisma } from "@/lib/db/prisma";
import { ghiThaoTac, HE_THONG, type NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";
import { tongTietDaKhopThoiLuong } from "@/server/services/ct/ct-02-hoc-phan";
import {
  SaiTrangThaiChuongTrinhError,
  KhongTimThayChuongTrinhError,
} from "@/server/services/ct/loi-chuong-trinh";

// QT-03: vòng đời chương trình (trình - phê duyệt - trả về) ghi nhật ký
const DOI_TUONG = "ChuongTrinh";
const moTa = (ct: { maCT: string; ten: string }, yKien?: string | null) =>
  `${ct.maCT} - ${ct.ten}${yKien ? ` - ý kiến: ${yKien}` : ""}`;

export class ChuaSanSangTrinhDuyetError extends Error {
  constructor() {
    super(
      "Tổng số tiết học phần chưa khớp tổng thời lượng chương trình, chưa thể trình duyệt",
    );
  }
}

/**
 * CT-03 bước 1: Dự thảo -> Chờ thẩm định. Cổng chặn: tổng số tiết học phần
 * phải khớp tổng thời lượng chương trình (quy tắc nghiệp vụ CT-02/CT-03) -
 * đây là lúc gate được áp dụng, không chặn từng lần thêm học phần lẻ tẻ.
 */
export async function trinhThamDinh(
  chuongTrinhId: string,
  yKienThamDinh?: string | null,
  nguoi: NguoiThucHien = HE_THONG,
) {
  const chuongTrinh = await prisma.chuongTrinh.findUnique({ where: { id: chuongTrinhId } });
  if (!chuongTrinh) throw new KhongTimThayChuongTrinhError();
  if (chuongTrinh.trangThai !== "DU_THAO") {
    throw new SaiTrangThaiChuongTrinhError(
      "Chỉ chương trình ở trạng thái Dự thảo mới trình thẩm định được",
    );
  }
  if (!(await tongTietDaKhopThoiLuong(chuongTrinhId))) {
    throw new ChuaSanSangTrinhDuyetError();
  }

  return prisma.$transaction(async (tx) => {
    const sau = await tx.chuongTrinh.update({
      where: { id: chuongTrinhId },
      data: { trangThai: "CHO_THAM_DINH", yKienThamDinh },
    });
    await ghiThaoTac(nguoi, "TRINH_THAM_DINH_CHUONG_TRINH", DOI_TUONG, chuongTrinhId, moTa(sau, yKienThamDinh), tx);
    return sau;
  });
}

export type PheDuyetInput = { soQuyetDinh: string; yKienThamDinh?: string | null };

// CT-03 bước 2: Chờ thẩm định -> Đã ban hành, kèm số quyết định.
export async function pheDuyet(chuongTrinhId: string, input: PheDuyetInput, nguoi: NguoiThucHien = HE_THONG) {
  const chuongTrinh = await prisma.chuongTrinh.findUnique({ where: { id: chuongTrinhId } });
  if (!chuongTrinh) throw new KhongTimThayChuongTrinhError();
  if (chuongTrinh.trangThai !== "CHO_THAM_DINH") {
    throw new SaiTrangThaiChuongTrinhError(
      "Chỉ chương trình ở trạng thái Chờ thẩm định mới phê duyệt được",
    );
  }
  if (!input.soQuyetDinh?.trim()) {
    throw new Error("Số quyết định ban hành là bắt buộc");
  }

  return prisma.$transaction(async (tx) => {
    const sau = await tx.chuongTrinh.update({
      where: { id: chuongTrinhId },
      data: {
        trangThai: "DA_BAN_HANH",
        soQuyetDinh: input.soQuyetDinh,
        yKienThamDinh: input.yKienThamDinh ?? chuongTrinh.yKienThamDinh,
        ngayBanHanh: new Date(),
      },
    });
    await ghiThaoTac(nguoi, "PHE_DUYET_CHUONG_TRINH", DOI_TUONG, chuongTrinhId, `${moTa(sau)} - QĐ ${input.soQuyetDinh}`, tx);
    return sau;
  });
}

// Trả chương trình đang "Chờ thẩm định" về "Dự thảo" để sửa lại nếu thẩm
// định không đạt - workflow tự nhiên cần có đường lùi, đặc tả không nêu
// tường minh nhưng thiếu thì chương trình bị thẩm định từ chối sẽ bị kẹt.
export async function traVeDuThao(
  chuongTrinhId: string,
  yKienThamDinh?: string | null,
  nguoi: NguoiThucHien = HE_THONG,
) {
  const chuongTrinh = await prisma.chuongTrinh.findUnique({ where: { id: chuongTrinhId } });
  if (!chuongTrinh) throw new KhongTimThayChuongTrinhError();
  if (chuongTrinh.trangThai !== "CHO_THAM_DINH") {
    throw new SaiTrangThaiChuongTrinhError(
      "Chỉ chương trình ở trạng thái Chờ thẩm định mới trả về Dự thảo được",
    );
  }

  return prisma.$transaction(async (tx) => {
    const sau = await tx.chuongTrinh.update({
      where: { id: chuongTrinhId },
      data: { trangThai: "DU_THAO", yKienThamDinh },
    });
    await ghiThaoTac(nguoi, "TRA_VE_DU_THAO_CHUONG_TRINH", DOI_TUONG, chuongTrinhId, moTa(sau, yKienThamDinh), tx);
    return sau;
  });
}
