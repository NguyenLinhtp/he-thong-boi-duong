/**
 * (bổ sung 06/10/2026) Tìm nhanh trong các danh sách theo người: khớp mã số
 * (mã sinh viên, CCCD, mã học viên/mã hồ sơ - bỏ khoảng trắng) hoặc họ tên
 * (không phân biệt hoa thường, có dấu hay không dấu).
 */
export type NguoiTimKiem = {
  hoTen?: string | null;
  soCCCD?: string | null;
  maSinhVien?: string | null;
  maHocVien?: string | null;
};

export const boDau = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

export function khopTuKhoa(nguoi: NguoiTimKiem, tuKhoa: string | null | undefined, them: (string | null | undefined)[] = []) {
  const q = (tuKhoa ?? "").trim();
  if (!q) return true;
  const ma = q.replace(/\s+/g, "").toLowerCase();
  if ([nguoi.maSinhVien, nguoi.soCCCD, nguoi.maHocVien].some((x) => x && x.toLowerCase().includes(ma))) return true;
  const chu = boDau(q).replace(/\s+/g, " ");
  return [nguoi.hoTen, ...them].some((x) => x && boDau(x).replace(/\s+/g, " ").includes(chu));
}
