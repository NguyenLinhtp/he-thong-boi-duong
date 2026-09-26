import { KhoangNgayKhongHopLeError } from "@/server/services/bc/loi-bao-cao";

export type KhoangNgay = { tu?: Date; den?: Date };

/**
 * Chuyển "yyyy-mm-dd" (ô chọn ngày) thành khoảng thời gian theo giờ địa phương:
 * từ 00:00 ngày đầu đến hết 23:59:59.999 ngày cuối - phiếu thu/sự kiện trong
 * chính ngày cuối kỳ vẫn được tính. Bỏ trống = không giới hạn phía đó.
 */
export function khoangNgay(tuNgay?: string | null, denNgay?: string | null): KhoangNgay {
  const doc = (chuoi: string | null | undefined, gio: string, ten: string) => {
    if (!chuoi?.trim()) return undefined;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(chuoi.trim())) throw new KhoangNgayKhongHopLeError(`${ten} sai định dạng`);
    const ngay = new Date(`${chuoi.trim()}T${gio}`);
    if (Number.isNaN(ngay.getTime())) throw new KhoangNgayKhongHopLeError(`${ten} không tồn tại`);
    return ngay;
  };
  const tu = doc(tuNgay, "00:00:00.000", "từ ngày");
  const den = doc(denNgay, "23:59:59.999", "đến ngày");
  if (tu && den && tu > den) throw new KhoangNgayKhongHopLeError("từ ngày sau đến ngày");
  return { tu, den };
}

export const nhanKy = ({ tu, den }: KhoangNgay) =>
  `${tu ? tu.toLocaleDateString("vi-VN") : "…"} - ${den ? den.toLocaleDateString("vi-VN") : "…"}`;
