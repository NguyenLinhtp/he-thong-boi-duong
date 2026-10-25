import { prisma } from "@/lib/db/prisma";

/**
 * (bổ sung 13/10/2026 - KQ-02) Khóa có đào tạo bồi dưỡng xét hoàn thành theo các bài đánh giá cấu hình trong
 * học liệu chương trình (CT-02): mỗi bài trắc nghiệm / yêu cầu sản phẩm chọn
 *  - chỉ tự kiểm tra: không xét;
 *  - bắt buộc đạt: điểm bài ≥ điểm đạt của bài, không vào điểm cuối khóa;
 *  - tính vào điểm cuối khóa: theo hệ số (điểm đạt riêng của bài tùy chọn).
 * Điểm cuối khóa = trung bình có hệ số các bài tính điểm (trắc nghiệm = lần làm cao nhất, chưa làm = 0;
 * sản phẩm = điểm giảng viên chấm, chưa nộp = 0, đã nộp chưa chấm = chưa đủ để tổng hợp). Đạt khi: mọi bài
 * có điểm đạt đều đạt, điểm cuối khóa ≥ điểm đạt (chương trình/khóa) nếu có bài tính điểm, và chuyên cần ≥
 * mức tối thiểu. Chương trình chưa có bài nào tính điểm/bắt buộc đạt thì vẫn xét theo điểm học phần (KQ-01).
 */

export type MucDanhGia = {
  khoa: string; // TN_<id> | SP_<id>
  loai: "TN" | "SP";
  id: string;
  ten: string;
  hocPhan: string;
  tinhDiem: boolean;
  heSo: number;
  // (bổ sung 25/10/2026) điểm bài và điểm đạt của bài theo thang này; điểm cuối khóa quy về thang 10
  diemDat: number | null;
  thangDiem: number;
};

export type DiemMuc = { diem: number | null; trangThai: "CO_DIEM" | "CHUA_LAM" | "CHUA_CHAM" };

/** Các bài đánh giá có tham gia xét hoàn thành (tính điểm hoặc có điểm đạt), theo thứ tự học phần. */
export async function mucDanhGiaCuaChuongTrinh(chuongTrinhId: string): Promise<MucDanhGia[]> {
  const dsHp = await prisma.hocPhan.findMany({
    where: { chuongTrinhId },
    orderBy: { thuTu: "asc" },
    include: {
      baiTracNghiems: { where: { OR: [{ tinhDiem: true }, { diemDat: { not: null } }] }, orderBy: { thuTu: "asc" } },
      yeuCauSanPhams: { where: { OR: [{ tinhDiem: true }, { diemDat: { not: null } }] }, orderBy: { thuTu: "asc" } },
    },
  });
  return dsHp.flatMap((hp) => [
    ...hp.baiTracNghiems.map((b) => ({
      khoa: `TN_${b.id}`,
      loai: "TN" as const,
      id: b.id,
      ten: b.tieuDe,
      hocPhan: hp.ten,
      tinhDiem: b.tinhDiem,
      heSo: Number(b.heSo),
      diemDat: b.diemDat == null ? null : Number(b.diemDat),
      thangDiem: b.thangDiem,
    })),
    ...hp.yeuCauSanPhams.map((y) => ({
      khoa: `SP_${y.id}`,
      loai: "SP" as const,
      id: y.id,
      ten: y.tieuDe,
      hocPhan: hp.ten,
      tinhDiem: y.tinhDiem,
      heSo: Number(y.heSo),
      diemDat: y.diemDat == null ? null : Number(y.diemDat),
      thangDiem: y.thangDiem,
    })),
  ]);
}

/** Điểm từng bài của các học viên trong khóa. */
export async function diemTheoMuc(khoaId: string, dsMuc: MucDanhGia[], dsHocVienId: string[]) {
  const [dsLan, dsNop] = await Promise.all([
    prisma.lanLamTracNghiem.findMany({
      where: { khoaId, hocVienId: { in: dsHocVienId }, baiId: { in: dsMuc.filter((m) => m.loai === "TN").map((m) => m.id) }, nopLuc: { not: null } },
      select: { baiId: true, hocVienId: true, diem: true },
    }),
    prisma.baiNopSanPham.findMany({
      where: { khoaId, hocVienId: { in: dsHocVienId }, yeuCauId: { in: dsMuc.filter((m) => m.loai === "SP").map((m) => m.id) } },
      select: { yeuCauId: true, hocVienId: true, diem: true },
    }),
  ]);
  const kq = new Map<string, Record<string, DiemMuc>>();
  for (const hocVienId of dsHocVienId) {
    const theoMuc: Record<string, DiemMuc> = {};
    for (const m of dsMuc) {
      if (m.loai === "TN") {
        const ds = dsLan.filter((l) => l.baiId === m.id && l.hocVienId === hocVienId && l.diem != null).map((l) => Number(l.diem));
        theoMuc[m.khoa] = ds.length > 0 ? { diem: Math.max(...ds), trangThai: "CO_DIEM" } : { diem: null, trangThai: "CHUA_LAM" };
      } else {
        const bn = dsNop.find((b) => b.yeuCauId === m.id && b.hocVienId === hocVienId);
        theoMuc[m.khoa] = !bn ? { diem: null, trangThai: "CHUA_LAM" } : bn.diem == null ? { diem: null, trangThai: "CHUA_CHAM" } : { diem: Number(bn.diem), trangThai: "CO_DIEM" };
      }
    }
    kq.set(hocVienId, theoMuc);
  }
  return kq;
}

/** Đánh giá 1 học viên theo các bài đánh giá + chuyên cần. */
export function danhGiaTheoHocLieu(
  dsMuc: MucDanhGia[],
  diem: Record<string, DiemMuc>,
  thamSo: { diemDat: number; chuyenCanToiThieu: number },
  tyLeChuyenCan: number | null,
) {
  const ghiChu: string[] = [];
  const tinhDiem = dsMuc.filter((m) => m.tinhDiem);
  const chuaCham = dsMuc.filter((m) => diem[m.khoa]?.trangThai === "CHUA_CHAM");
  let diemTongKet: number | null = null;
  if (tinhDiem.length > 0 && !chuaCham.some((m) => m.tinhDiem)) {
    const tongHeSo = tinhDiem.reduce((t, m) => t + m.heSo, 0);
    diemTongKet = Math.round((tinhDiem.reduce((t, m) => t + m.heSo * (((diem[m.khoa]?.diem ?? 0) / m.thangDiem) * 10), 0) / tongHeSo) * 100) / 100;
  }
  if (chuaCham.length > 0) ghiChu.push(`Chưa chấm: ${chuaCham.map((m) => m.ten).join(", ")}`);
  for (const m of dsMuc.filter((x) => x.diemDat !== null)) {
    const d = diem[m.khoa];
    if (!d || d.trangThai === "CHUA_LAM") ghiChu.push(`${m.loai === "TN" ? "Chưa làm" : "Chưa nộp"}: ${m.ten}`);
    else if (d.trangThai === "CO_DIEM" && (d.diem as number) < (m.diemDat as number)) ghiChu.push(`${m.ten} ${d.diem}/${m.thangDiem} < ${m.diemDat}`);
  }
  if (diemTongKet !== null && diemTongKet < thamSo.diemDat) ghiChu.push(`Điểm cuối khóa ${diemTongKet} < ${thamSo.diemDat}`);
  if (tyLeChuyenCan !== null && tyLeChuyenCan < thamSo.chuyenCanToiThieu) ghiChu.push(`Chuyên cần ${tyLeChuyenCan}% < ${thamSo.chuyenCanToiThieu}%`);
  return {
    diemTongKet,
    datHocTap: ghiChu.length === 0,
    ghiChu: ghiChu.join("; ") || null,
    diemThanhPhan: Object.fromEntries(dsMuc.map((m) => [m.khoa, diem[m.khoa]?.diem ?? null])),
  };
}
