/**
 * (bổ sung 06/10/2026 - HP-01/HP-02/HV-07) Quy tắc dùng chung cho thành phần lệ phí
 * của khóa dự thi - hàm thuần, không truy cập CSDL (dùng được ở mọi service).
 */
export type TrangThaiPhi = "CHUA_NOP" | "DA_NOP_DU" | "CON_NO" | "MIEN_GIAM" | "CHO_THANH_LY_HOP_DONG" | "DA_HOAN_TAT";

export const DA_XONG = ["DA_NOP_DU", "MIEN_GIAM"];

type SoTien = number | { toString(): string };
const so = (x: SoTien) => Number(x.toString());

/** Mức của 1 thành phần cho 1 thí sinh: thí sinh tự do (khóa lệ phí theo đối tượng) theo mức tự do nếu có. */
export function mucThanhPhanChoThiSinh(
  tp: { mucSinhVien: SoTien; mucTuDo: SoTien | null },
  laThiSinhTuDo: boolean,
): number {
  return laThiSinhTuDo && tp.mucTuDo !== null ? so(tp.mucTuDo) : so(tp.mucSinhVien);
}

export type DongThanhPhan = {
  soTienPhaiNop: SoTien;
  soTienDaNop: SoTien;
  trangThai: string;
  thanhPhan: { batBuoc: boolean };
};

/** Trạng thái chung của khoản lệ phí = tổng hợp các thành phần thí sinh đã chọn. */
export function tongHopThanhPhan(ds: Omit<DongThanhPhan, "thanhPhan">[]) {
  const phaiNop = ds.reduce((t, d) => t + so(d.soTienPhaiNop), 0);
  const daNop = ds.reduce((t, d) => t + so(d.soTienDaNop), 0);
  const trangThai: TrangThaiPhi =
    ds.length > 0 && ds.every((d) => DA_XONG.includes(d.trangThai))
      ? ds.every((d) => d.trangThai === "MIEN_GIAM")
        ? "MIEN_GIAM"
        : "DA_NOP_DU"
      : daNop > 0
        ? "CON_NO"
        : "CHUA_NOP";
  return { phaiNop, daNop, trangThai };
}

/** Trạng thái 1 thành phần sau khi số đã nộp thay đổi. */
export function trangThaiTheoSoTien(phaiNop: number, daNop: number): TrangThaiPhi {
  return daNop >= phaiNop ? "DA_NOP_DU" : daNop > 0 ? "CON_NO" : "CHUA_NOP";
}

/**
 * Lệ phí của thí sinh coi là "đã xác nhận" (vào danh sách chính thức, đủ điều kiện tài chính):
 * - được bỏ chặn (HP-06);
 * - có thành phần: mọi thành phần BẮT BUỘC đã nộp đủ/miễn giảm (thành phần tùy chọn không chặn);
 * - không có thành phần: khoản chung đã nộp đủ/miễn giảm;
 * - chưa có khoản lệ phí: chỉ khi khóa không thu lệ phí.
 */
export function lePhiDaXacNhan(
  hocPhi: { trangThai: string; boQuaKiemTra: boolean; thanhPhans?: DongThanhPhan[] } | null | undefined,
  coLePhi: boolean,
) {
  if (!hocPhi) return !coLePhi;
  if (hocPhi.boQuaKiemTra) return true;
  const batBuoc = (hocPhi.thanhPhans ?? []).filter((d) => d.thanhPhan.batBuoc);
  if (hocPhi.thanhPhans && hocPhi.thanhPhans.length > 0) return batBuoc.every((d) => DA_XONG.includes(d.trangThai));
  return DA_XONG.includes(hocPhi.trangThai);
}

/** Số đã nộp tính cho điều kiện chốt danh sách: phần bắt buộc nếu có thành phần, ngược lại khoản chung. */
export function soDaNopPhanBatBuoc(hocPhi: { soTienDaNop: SoTien; thanhPhans?: DongThanhPhan[] }) {
  if (hocPhi.thanhPhans && hocPhi.thanhPhans.length > 0) {
    return hocPhi.thanhPhans.filter((d) => d.thanhPhan.batBuoc).reduce((t, d) => t + so(d.soTienDaNop), 0);
  }
  return so(hocPhi.soTienDaNop);
}
