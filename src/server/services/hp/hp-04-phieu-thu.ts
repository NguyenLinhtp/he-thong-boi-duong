import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

/**
 * HP-04: "Số phiếu thu sinh tự động, tăng dần, không trùng". Phiếu thu được
 * lập TRONG transaction của HP-02 nên không dùng cách thử lại khi trùng (lỗi
 * P2002 làm hỏng cả transaction Postgres) - thay bằng khóa tư vấn theo
 * transaction: các lần lập phiếu xếp hàng tuần tự, số kế tiếp = số lớn nhất
 * trong năm + 1; khóa tự nhả khi transaction kết thúc.
 */
async function soPhieuKeTiep(tx: Prisma.TransactionClient) {
  await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext('HP04_SO_PHIEU_THU'))`);
  const tienTo = `PT${new Date().getFullYear()}`;
  const cuoi = await tx.phieuThu.findFirst({
    where: { soPhieu: { startsWith: tienTo } },
    orderBy: { soPhieu: "desc" },
    select: { soPhieu: true },
  });
  const soThuTu = cuoi ? Number(cuoi.soPhieu.slice(tienTo.length)) + 1 : 1;
  return `${tienTo}${String(soThuTu).padStart(5, "0")}`;
}

export type LapPhieuThuInput = {
  hocPhiId: string;
  soTien: number;
  hinhThucNop?: string | null;
  nguoiLapId?: string | null;
  nguoiLapTen?: string | null;
  // (bổ sung 06/10/2026) phiếu thu của 1 thành phần lệ phí
  hocPhiThanhPhanId?: string | null;
};

// Được gọi từ HP-02 ngay sau khi 1 khoản nộp được xác nhận, trong cùng
// transaction - mỗi lần xác nhận thanh toán sinh đúng 1 phiếu thu.
export async function lapPhieuThu(input: LapPhieuThuInput, tx: Prisma.TransactionClient) {
  return tx.phieuThu.create({
    data: {
      soPhieu: await soPhieuKeTiep(tx),
      hocPhiId: input.hocPhiId,
      soTien: input.soTien,
      hinhThucNop: input.hinhThucNop ?? null,
      nguoiLapId: input.nguoiLapId ?? null,
      nguoiLapTen: input.nguoiLapTen ?? null,
      hocPhiThanhPhanId: input.hocPhiThanhPhanId ?? null,
    },
  });
}

export async function chiTietPhieuThu(id: string) {
  return prisma.phieuThu.findUnique({
    where: { id },
    include: { hocPhi: { include: { hocVien: true, khoa: true } } },
  });
}

export async function danhSachPhieuThu(khoaId?: string) {
  return prisma.phieuThu.findMany({
    where: khoaId ? { hocPhi: { khoaId } } : undefined,
    include: { hocPhi: { include: { hocVien: true, khoa: true } } },
    orderBy: { ngayLap: "desc" },
  });
}
