import { prisma } from "@/lib/db/prisma";

export type LocBaoCaoHocPhi = {
  tuNgay?: Date;
  denNgay?: Date;
  khoaId?: string;
};

// HP-05: "Số liệu khớp với tổng các phiếu thu đã lập" - doanh thu luôn tính
// bằng tổng PhieuThu.soTien trong khoảng lọc, không tính lại từ HocPhi.
export async function baoCaoDoanhThu(loc: LocBaoCaoHocPhi = {}) {
  const dsPhieuThu = await prisma.phieuThu.findMany({
    where: {
      ngayLap: { gte: loc.tuNgay, lte: loc.denNgay },
      hocPhi: loc.khoaId ? { khoaId: loc.khoaId } : undefined,
    },
    include: { hocPhi: { include: { khoa: true } } },
  });

  const tongDoanhThu = dsPhieuThu.reduce((tong, pt) => tong + Number(pt.soTien), 0);

  const theoKhoa = new Map<string, { maKhoa: string; soTien: number; soPhieu: number }>();
  for (const pt of dsPhieuThu) {
    const key = pt.hocPhi.khoaId;
    const hienCo = theoKhoa.get(key) ?? { maKhoa: pt.hocPhi.khoa.maKhoa, soTien: 0, soPhieu: 0 };
    hienCo.soTien += Number(pt.soTien);
    hienCo.soPhieu += 1;
    theoKhoa.set(key, hienCo);
  }

  return {
    tongDoanhThu,
    soPhieuThu: dsPhieuThu.length,
    theoKhoa: [...theoKhoa.values()],
  };
}

export async function baoCaoCongNo(loc: { khoaId?: string } = {}) {
  const dsConNo = await prisma.hocPhi.findMany({
    where: { trangThai: { in: ["CHUA_NOP", "CON_NO"] }, khoaId: loc.khoaId },
    include: { khoa: true },
  });

  const tongConNo = dsConNo.reduce(
    (tong, hp) => tong + (Number(hp.soTienPhaiNop) - Number(hp.soTienDaNop)),
    0,
  );

  const theoKhoa = new Map<string, { maKhoa: string; soConNo: number; soHocVien: number }>();
  for (const hp of dsConNo) {
    const key = hp.khoaId;
    const hienCo = theoKhoa.get(key) ?? { maKhoa: hp.khoa.maKhoa, soConNo: 0, soHocVien: 0 };
    hienCo.soConNo += Number(hp.soTienPhaiNop) - Number(hp.soTienDaNop);
    hienCo.soHocVien += 1;
    theoKhoa.set(key, hienCo);
  }

  return {
    tongConNo,
    soHocVienConNo: dsConNo.length,
    theoKhoa: [...theoKhoa.values()],
  };
}
