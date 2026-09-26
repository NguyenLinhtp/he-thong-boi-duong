import { NextResponse } from "next/server";
import * as loi from "@/server/services/kq/loi-ket-qua";
import { KhongPhaiTaiKhoanGiangVienError } from "@/server/services/gd/loi-giang-day";

type LopLoi = new () => Error;

const LOI_THEO_STATUS: [number, LopLoi[]][] = [
  [403, [loi.KhongPhuTrachHocPhanError, loi.KhongPhaiTaiKhoanHocVienError, KhongPhaiTaiKhoanGiangVienError]],
  [404, [loi.KhongTimThayKhoaError, loi.KhongTimThayKetQuaError]],
  [
    400,
    [
      loi.DiemKhongHopLeError,
      loi.HocVienKhongThuocKhoaError,
      loi.KhoaChiDuThiError,
      loi.KhongPhaiKhoaChiDuThiError,
      loi.ThieuSoQuyetDinhError,
    ],
  ],
  [
    409,
    [
      loi.KetQuaDaPheDuyetError,
      loi.ChuaPheDuyetKhongCanPhucKhaoError,
      loi.ChuaTongHopKetQuaError,
      loi.ChuaXetDieuKienError,
    ],
  ],
];

/**
 * Chuẩn hóa lỗi nghiệp vụ module KQ thành response JSON (dùng chung cho mọi
 * route /api/kq thay vì mỗi route tự liệt kê instanceof); lỗi khác ném tiếp.
 */
export function phanHoiLoiKetQua(error: unknown): Response {
  for (const [status, dsLoi] of LOI_THEO_STATUS) {
    if (dsLoi.some((Loi) => error instanceof Loi)) {
      return NextResponse.json({ message: (error as Error).message }, { status });
    }
  }
  throw error;
}
