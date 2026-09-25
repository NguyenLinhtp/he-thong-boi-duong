import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

/**
 * HP-04: "Số phiếu thu sinh tự động, tăng dần, không trùng" - cùng kỹ thuật
 * đếm + thử lại khi trùng (P2002) như mã học viên ở hv/dung-chung.ts.
 */
async function taoPhieuThuVoiSoTuSinh<T>(
  taoVoiSo: (soPhieu: string) => Promise<T>,
): Promise<T> {
  const nam = new Date().getFullYear();
  const tienTo = `PT${nam}`;
  const soLuongDaCo = await prisma.phieuThu.count({ where: { soPhieu: { startsWith: tienTo } } });

  for (let lanThu = 0; lanThu < 10; lanThu++) {
    const soThuTu = soLuongDaCo + 1 + lanThu;
    const soPhieu = `${tienTo}${String(soThuTu).padStart(5, "0")}`;
    try {
      return await taoVoiSo(soPhieu);
    } catch (error) {
      const laLoiTrungMa =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!laLoiTrungMa) throw error;
    }
  }

  throw new Error("Không sinh được số phiếu thu sau nhiều lần thử");
}

export type LapPhieuThuInput = {
  hocPhiId: string;
  soTien: number;
  hinhThucNop?: string | null;
  nguoiLapId?: string | null;
  nguoiLapTen?: string | null;
};

// Được gọi từ HP-02 ngay sau khi 1 khoản nộp được xác nhận - mỗi lần xác
// nhận thanh toán sinh đúng 1 phiếu thu.
export async function lapPhieuThu(input: LapPhieuThuInput) {
  return taoPhieuThuVoiSoTuSinh((soPhieu) =>
    prisma.phieuThu.create({
      data: {
        soPhieu,
        hocPhiId: input.hocPhiId,
        soTien: input.soTien,
        hinhThucNop: input.hinhThucNop ?? null,
        nguoiLapId: input.nguoiLapId ?? null,
        nguoiLapTen: input.nguoiLapTen ?? null,
      },
    }),
  );
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
