import type { PhienDangNhap } from "@/lib/auth/permissions";

export class KhongCoQuyenError extends Error {
  readonly status: number;

  constructor(maCN: string) {
    super(`Không có quyền thực hiện chức năng ${maCN}`);
    this.status = 403;
  }
}

export class ChuaDangNhapError extends Error {
  readonly status = 401;

  constructor() {
    super("Chưa đăng nhập");
  }
}

/**
 * Logic thuần kiểm tra quyền, không phụ thuộc next/server hay next-auth để
 * test được trực tiếp (requirePermission() ở guard.ts cần request context
 * thật của Next.js nên không test trực tiếp được).
 */
export function kiemTraQuyen(
  phienDangNhap: PhienDangNhap | null | undefined,
  maCN: string,
): PhienDangNhap {
  if (!phienDangNhap) throw new ChuaDangNhapError();
  if (!phienDangNhap.maCNDuocPhep.includes(maCN)) {
    throw new KhongCoQuyenError(maCN);
  }
  return phienDangNhap;
}

/** Có ít nhất 1 trong các mã chức năng (trang/API dùng chung cho nhiều vai trò). */
export function kiemTraMotTrongCacQuyen(
  phienDangNhap: PhienDangNhap | null | undefined,
  dsMaCN: string[],
): PhienDangNhap {
  if (!phienDangNhap) throw new ChuaDangNhapError();
  if (!dsMaCN.some((ma) => phienDangNhap.maCNDuocPhep.includes(ma))) {
    throw new KhongCoQuyenError(dsMaCN.join("/"));
  }
  return phienDangNhap;
}
