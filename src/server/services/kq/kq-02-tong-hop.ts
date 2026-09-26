import { prisma } from "@/lib/db/prisma";
import {
  thamSoKetQua,
  lamTron2,
  soHoacNull,
  layKhoaKemChuongTrinh,
  laKhoaChiDuThi,
  hocVienTinhKetQua,
  chanNeuDaPheDuyet,
} from "@/server/services/kq/dung-chung";
import { KhoaChiDuThiError } from "@/server/services/kq/loi-ket-qua";

type HocPhanTinhDiem = { id: string; ten: string; soTiet: number };

/**
 * KQ-02: "Công thức tính theo trọng số học phần do chương trình quy định" -
 * trọng số của mỗi học phần là số tiết chương trình đã quy định cho học phần
 * đó (CT-02). Chương trình mà tổng số tiết = 0 thì lấy trung bình cộng.
 */
export function tinhDiemTongKet(
  hocPhans: HocPhanTinhDiem[],
  diemTheoHocPhan: Map<string, number | null>,
): { diemTongKet: number | null; hocPhanThieuDiem: string[] } {
  const hocPhanThieuDiem = hocPhans
    .filter((hp) => diemTheoHocPhan.get(hp.id) == null)
    .map((hp) => hp.ten);
  if (hocPhans.length === 0 || hocPhanThieuDiem.length > 0) {
    return { diemTongKet: null, hocPhanThieuDiem };
  }

  const tongTrongSo = hocPhans.reduce((tong, hp) => tong + hp.soTiet, 0);
  const tongDiem = hocPhans.reduce(
    (tong, hp) => tong + diemTheoHocPhan.get(hp.id)! * (tongTrongSo > 0 ? hp.soTiet : 1),
    0,
  );
  return {
    diemTongKet: lamTron2(tongDiem / (tongTrongSo > 0 ? tongTrongSo : hocPhans.length)),
    hocPhanThieuDiem,
  };
}

/**
 * Đạt học tập = đủ điểm mọi học phần, điểm tổng kết >= điểm đạt, và chuyên
 * cần >= mức tối thiểu (khi khóa đã có buổi điểm danh). Dùng lại khi phúc
 * khảo (KQ-04) và nhập kết quả thi (KQ-06, không có chuyên cần).
 */
export function danhGiaHocTap(
  input: { diemTongKet: number | null; hocPhanThieuDiem: string[]; tyLeChuyenCan: number | null },
  thamSo: { diemDat: number; chuyenCanToiThieu: number },
): { datHocTap: boolean; ghiChu: string | null } {
  const ghiChu: string[] = [];
  if (input.diemTongKet === null && input.hocPhanThieuDiem.length === 0) ghiChu.push("Chưa có điểm");
  if (input.hocPhanThieuDiem.length > 0) {
    ghiChu.push(`Thiếu điểm: ${input.hocPhanThieuDiem.join(", ")}`);
  }
  if (input.tyLeChuyenCan !== null && input.tyLeChuyenCan < thamSo.chuyenCanToiThieu) {
    ghiChu.push(`Chuyên cần ${input.tyLeChuyenCan}% < ${thamSo.chuyenCanToiThieu}%`);
  }
  if (input.diemTongKet !== null && input.diemTongKet < thamSo.diemDat) {
    ghiChu.push(`Điểm tổng kết ${input.diemTongKet} < ${thamSo.diemDat}`);
  }
  return { datHocTap: ghiChu.length === 0, ghiChu: ghiChu.join("; ") || null };
}

/**
 * Tỷ lệ chuyên cần (%) = số buổi có mặt / số buổi đã tổ chức. "Đã tổ chức" =
 * buổi không bị hủy (GD-03) và đã được điểm danh (GD-01) - buổi chưa điểm danh
 * (chưa diễn ra) không tính. Học viên không có dòng điểm danh ở buổi đã điểm
 * danh coi như vắng (mặc định VANG_KHONG_PHEP của DiemDanh). Vắng có phép vẫn
 * là vắng khi tính tỷ lệ có mặt.
 */
async function tyLeChuyenCanTheoHocVien(khoaId: string): Promise<Map<string, number> | null> {
  const dsBuoiDaToChuc = await prisma.buoiHoc.findMany({
    where: { khoaId, daHuy: false, diemDanhs: { some: {} } },
    include: { diemDanhs: true },
  });
  if (dsBuoiDaToChuc.length === 0) return null;

  const soBuoiCoMat = new Map<string, number>();
  for (const buoi of dsBuoiDaToChuc) {
    for (const dd of buoi.diemDanhs) {
      if (dd.trangThai === "CO_MAT") {
        soBuoiCoMat.set(dd.hocVienId, (soBuoiCoMat.get(dd.hocVienId) ?? 0) + 1);
      }
    }
  }

  const ketQua = new Map<string, number>();
  for (const [hocVienId, soBuoi] of soBuoiCoMat) {
    ketQua.set(hocVienId, lamTron2((soBuoi / dsBuoiDaToChuc.length) * 100));
  }
  return ketQua;
}

/**
 * KQ-02 (Hệ thống/Cán bộ quản lý đào tạo): tổng hợp kết quả toàn khóa cho mọi
 * học viên chính thức. Tổng hợp lại được nhiều lần cho tới khi phê duyệt
 * (KQ-04); mỗi lần tổng hợp xóa kết quả xét điều kiện (KQ-03) cũ để phải xét lại.
 */
export async function tongHopKetQuaKhoa(khoaId: string) {
  const khoa = await layKhoaKemChuongTrinh(khoaId);
  if (laKhoaChiDuThi(khoa)) throw new KhoaChiDuThiError();
  await chanNeuDaPheDuyet(khoaId);

  const [dsDangKy, dsKetQuaHocPhan, chuyenCan, { diemDat, chuyenCanToiThieu }] = await Promise.all([
    hocVienTinhKetQua(khoaId),
    prisma.ketQuaHocTap.findMany({ where: { khoaId } }),
    tyLeChuyenCanTheoHocVien(khoaId),
    thamSoKetQua(),
  ]);
  const hocPhans = khoa.chuongTrinh.hocPhans;

  await prisma.$transaction(
    dsDangKy.map((dk) => {
      const diemTheoHocPhan = new Map(
        dsKetQuaHocPhan
          .filter((kq) => kq.hocVienId === dk.hocVienId)
          .map((kq) => [kq.hocPhanId, soHoacNull(kq.diemHocPhan)]),
      );
      const { diemTongKet, hocPhanThieuDiem } = tinhDiemTongKet(hocPhans, diemTheoHocPhan);
      const tyLeChuyenCan = chuyenCan === null ? null : (chuyenCan.get(dk.hocVienId) ?? 0);

      const data = {
        diemTongKet,
        tyLeChuyenCan,
        ...danhGiaHocTap(
          { diemTongKet, hocPhanThieuDiem, tyLeChuyenCan },
          { diemDat, chuyenCanToiThieu },
        ),
        duDieuKienHocPhi: null,
        hoanThanh: null,
      };
      return prisma.ketQuaKhoa.upsert({
        where: { hocVienId_khoaId: { hocVienId: dk.hocVienId, khoaId } },
        update: data,
        create: { hocVienId: dk.hocVienId, khoaId, ...data },
      });
    }),
  );

  return bangTongHopKetQua(khoaId);
}

export async function bangTongHopKetQua(khoaId: string) {
  return prisma.ketQuaKhoa.findMany({
    where: { khoaId },
    include: { hocVien: true },
    orderBy: { hocVien: { hoTen: "asc" } },
  });
}

/** Bảng điểm chi tiết theo học phần của cả khóa (để cán bộ xem khi tổng hợp). */
export async function bangDiemChiTietKhoa(khoaId: string) {
  return prisma.ketQuaHocTap.findMany({
    where: { khoaId },
    include: { hocVien: true, hocPhan: true },
    orderBy: [{ hocVien: { hoTen: "asc" } }, { hocPhan: { thuTu: "asc" } }],
  });
}
