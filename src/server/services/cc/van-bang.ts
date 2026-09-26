import type { LoaiVanBang } from "@/generated/prisma/client";
import { layThamSo } from "@/server/services/qt/qt-05-tham-so";

/**
 * Cấu hình theo loại văn bằng của chương trình (CT-01 bổ sung): chứng chỉ và
 * giấy chứng nhận có dãy số hiệu, sổ cấp và tiêu đề in riêng - mỗi giá trị
 * đổi được qua tham số hệ thống QT-05, mặc định như dưới.
 */
const CAU_HINH: Record<
  LoaiVanBang,
  {
    nhan: string;
    tienToSoHieu: [maThamSo: string, macDinh: string];
    tienToSoVaoSo: [maThamSo: string, macDinh: string];
    tieuDe: [maThamSo: string, macDinh: string];
  }
> = {
  CHUNG_CHI: {
    nhan: "chứng chỉ",
    tienToSoHieu: ["CC_TIEN_TO_SO_HIEU", "CC"],
    tienToSoVaoSo: ["CC_TIEN_TO_SO_VAO_SO", "SC"],
    tieuDe: ["CC_TIEU_DE_CHUNG_CHI", "CHỨNG CHỈ BỒI DƯỠNG"],
  },
  CHUNG_NHAN: {
    nhan: "giấy chứng nhận",
    tienToSoHieu: ["CN_TIEN_TO_SO_HIEU", "CN"],
    tienToSoVaoSo: ["CN_TIEN_TO_SO_VAO_SO", "SN"],
    tieuDe: ["CN_TIEU_DE_CHUNG_NHAN", "GIẤY CHỨNG NHẬN"],
  },
};

/** Nhãn thường ("chứng chỉ"/"giấy chứng nhận") dùng trong thông báo, thông điệp. */
export function nhanVanBang(loai: LoaiVanBang): string {
  return CAU_HINH[loai].nhan;
}

async function thamSoHoacMacDinh([ma, macDinh]: [string, string]) {
  return (await layThamSo(ma)) ?? macDinh;
}

export const tienToSoHieu = (loai: LoaiVanBang) => thamSoHoacMacDinh(CAU_HINH[loai].tienToSoHieu);
export const tienToSoVaoSo = (loai: LoaiVanBang) => thamSoHoacMacDinh(CAU_HINH[loai].tienToSoVaoSo);
export const tieuDeVanBang = (loai: LoaiVanBang) => thamSoHoacMacDinh(CAU_HINH[loai].tieuDe);
