import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * GD-04: tệp học liệu lưu trên đĩa máy chủ NGOÀI thư mục public (không truy
 * cập trực tiếp qua URL) - chỉ phục vụ qua API có kiểm tra quyền. Thư mục gốc
 * cấu hình qua biến môi trường HOC_LIEU_DIR (mặc định ./storage/hoc-lieu).
 */
function thuMucGoc() {
  return path.resolve(process.env.HOC_LIEU_DIR ?? path.join(/* turbopackIgnore: true */ process.cwd(), "storage", "hoc-lieu"));
}

/** Đường dẫn tuyệt đối của 1 khóa lưu trữ - chặn thoát ra ngoài thư mục gốc (path traversal). */
function duongDanTuyetDoi(khoaLuuTru: string) {
  const goc = thuMucGoc();
  const day = path.resolve(goc, khoaLuuTru);
  if (!day.startsWith(goc + path.sep)) throw new Error("Khóa lưu trữ không hợp lệ");
  return day;
}

/** Ghi tệp với tên ngẫu nhiên (không dùng tên gốc người dùng gửi), trả về khóa lưu trữ tương đối. */
export async function luuTep(noiDung: Buffer, duoi: string) {
  const khoaLuuTru = `${new Date().getFullYear()}/${randomUUID()}${duoi}`;
  const day = duongDanTuyetDoi(khoaLuuTru);
  await mkdir(path.dirname(day), { recursive: true });
  await writeFile(day, noiDung);
  return khoaLuuTru;
}

export async function docTep(khoaLuuTru: string) {
  return readFile(duongDanTuyetDoi(khoaLuuTru));
}

export async function xoaTep(khoaLuuTru: string) {
  await rm(duongDanTuyetDoi(khoaLuuTru), { force: true });
}
