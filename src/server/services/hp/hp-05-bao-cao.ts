import { prisma } from "@/lib/db/prisma";
import { dieuKienChiemCho } from "@/server/services/kh/kh-05-trang-thai-si-so";

export type LocBaoCaoHocPhi = {
  tuNgay?: Date;
  denNgay?: Date;
  khoaId?: string;
  // BC-03: lọc theo nhiều khóa (vd mọi khóa của 1 đợt); khoaId ưu tiên nếu có cả hai
  khoaIds?: string[];
};

function locKhoa(loc: { khoaId?: string; khoaIds?: string[] }) {
  if (loc.khoaId) return loc.khoaId;
  return loc.khoaIds ? { in: loc.khoaIds } : undefined;
}

// HP-05: "Số liệu khớp với tổng các phiếu thu đã lập" - doanh thu luôn tính
// bằng tổng PhieuThu.soTien trong khoảng lọc, không tính lại từ HocPhi.
export async function baoCaoDoanhThu(loc: LocBaoCaoHocPhi = {}) {
  const dsPhieuThu = await prisma.phieuThu.findMany({
    where: {
      daHuy: false,
      ngayLap: { gte: loc.tuNgay, lte: loc.denNgay },
      hocPhi: loc.khoaId || loc.khoaIds ? { khoaId: locKhoa(loc) } : undefined,
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

export async function baoCaoCongNo(loc: { khoaId?: string; khoaIds?: string[] } = {}) {
  const dsConNo = await prisma.hocPhi.findMany({
    where: { trangThai: { in: ["CHUA_NOP", "CON_NO"] }, khoaId: locKhoa(loc) },
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

/**
 * (bổ sung 06/10/2026) Tổng hợp nhanh theo khóa cho màn hình "Học phí theo khóa":
 * số học viên đăng ký (đăng ký còn hiệu lực - KH-05), số đã xác nhận học phí
 * (nộp đủ/miễn giảm/qua ĐVLK đã hoàn tất/được bỏ chặn), số còn nợ (chưa nộp/nộp
 * thiếu, chưa bỏ chặn) và tổng tiền đã thu (tổng phiếu thu chưa hủy - khớp HP-05).
 * Không hiện "mức học phí" vì 1 khóa có thể có nhiều mức theo đối tượng (HP-01).
 */
export type TongHopHocPhiKhoa = { soDangKy: number; soDaXacNhan: number; soConNo: number; daThu: number };

export async function tongHopHocPhiTheoKhoa(khoaIds: string[]): Promise<Map<string, TongHopHocPhiKhoa>> {
  const [dangKy, hocPhi, phieuThu] = await Promise.all([
    prisma.dangKyHoc.groupBy({
      by: ["khoaId"],
      where: { ...dieuKienChiemCho(""), khoaId: { in: khoaIds } },
      _count: { _all: true },
    }),
    prisma.hocPhi.findMany({
      where: { khoaId: { in: khoaIds } },
      select: { id: true, khoaId: true, trangThai: true, boQuaKiemTra: true },
    }),
    prisma.phieuThu.findMany({
      where: { daHuy: false, hocPhi: { khoaId: { in: khoaIds } } },
      select: { soTien: true, hocPhi: { select: { khoaId: true } } },
    }),
  ]);
  const kq = new Map<string, TongHopHocPhiKhoa>(khoaIds.map((id) => [id, { soDangKy: 0, soDaXacNhan: 0, soConNo: 0, daThu: 0 }]));
  for (const d of dangKy) kq.get(d.khoaId)!.soDangKy = d._count._all;
  for (const h of hocPhi) {
    const k = kq.get(h.khoaId)!;
    if (h.boQuaKiemTra || ["DA_NOP_DU", "MIEN_GIAM", "DA_HOAN_TAT"].includes(h.trangThai)) k.soDaXacNhan++;
    else if (["CHUA_NOP", "CON_NO"].includes(h.trangThai)) k.soConNo++;
  }
  for (const pt of phieuThu) kq.get(pt.hocPhi.khoaId)!.daThu += Number(pt.soTien);
  return kq;
}
