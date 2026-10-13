import { prisma } from "@/lib/db/prisma";
import { ghiThaoTac, type NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";
import { chanNeuDaPheDuyet, khoaDaPheDuyetKetQua, laKhoaChiDuThi, layKhoaKemChuongTrinh, thamSoKetQua } from "@/server/services/kq/dung-chung";
import { danhGiaHocTap, tongHopKetQuaKhoa } from "@/server/services/kq/kq-02-tong-hop";
import { danhGiaHoanThanh } from "@/server/services/kq/kq-03-xet-hoan-thanh";
import { LoiKetQua } from "@/server/services/kq/loi-ket-qua";

/**
 * (bổ sung 13/10/2026 - KQ-02/KQ-06) Điều kiện đạt (điểm tổng kết/điểm thi tối thiểu) cài đặt ở chương
 * trình, từng khóa sửa riêng được; khóa để trống thì theo chương trình, chương trình để trống thì theo
 * tham số chung KQ_DIEM_DAT. Đổi điều kiện khi kết quả khóa chưa phê duyệt thì tính lại Đạt/Không đạt
 * cho điểm đã nhập; khóa đã phê duyệt kết quả giữ nguyên (không sửa điều kiện riêng của khóa đó).
 */

export class DieuKienDatError extends LoiKetQua {}

function chuanHoa(diemDat: number | null) {
  if (diemDat === null) return null;
  if (!Number.isFinite(diemDat) || diemDat < 0 || diemDat > 10) throw new DieuKienDatError("Điểm đạt phải là số từ 0 đến 10");
  return Math.round(diemDat * 100) / 100;
}

/** (bổ sung 13/10/2026) chuyên cần tối thiểu 0-100%; null = theo cấp trên; undefined = giữ nguyên. */
function chuanHoaChuyenCan(v: number | null | undefined) {
  if (v === undefined || v === null) return v;
  if (!Number.isFinite(v) || v < 0 || v > 100) throw new DieuKienDatError("Chuyên cần tối thiểu phải từ 0 đến 100%");
  return Math.round(v * 100) / 100;
}

/** Tính lại Đạt/Không đạt của khóa (chưa phê duyệt) theo điều kiện đạt hiện hành. Trả số kết quả đã tính lại. */
export async function tinhLaiKetQuaTheoDieuKien(khoaId: string) {
  if (await khoaDaPheDuyetKetQua(khoaId)) return 0;
  const khoa = await layKhoaKemChuongTrinh(khoaId);
  const thamSo = await thamSoKetQua(khoaId);
  if (laKhoaChiDuThi(khoa)) {
    const dsKq = await prisma.ketQuaKhoa.findMany({ where: { khoaId, daPheDuyet: false } });
    for (const kq of dsKq) {
      const diem = kq.diemTongKet == null ? null : Number(kq.diemTongKet);
      const hocTap = danhGiaHocTap({ diemTongKet: diem, hocPhanThieuDiem: [], tyLeChuyenCan: null }, thamSo);
      await prisma.ketQuaKhoa.update({
        where: { id: kq.id },
        data: { ...hocTap, ...(await danhGiaHoanThanh({ hocVienId: kq.hocVienId, khoaId, ...hocTap })) },
      });
    }
    return dsKq.length;
  }
  // khóa có giảng dạy: đạt từng học phần theo điểm đạt mới, rồi tổng hợp lại toàn khóa nếu đã tổng hợp
  const dsHp = await prisma.ketQuaHocTap.findMany({ where: { khoaId, daPheDuyet: false, diemHocPhan: { not: null } } });
  for (const hp of dsHp) {
    await prisma.ketQuaHocTap.update({ where: { id: hp.id }, data: { dat: Number(hp.diemHocPhan) >= thamSo.diemDat } });
  }
  if ((await prisma.ketQuaKhoa.count({ where: { khoaId } })) > 0) {
    try {
      return (await tongHopKetQuaKhoa(khoaId)).length;
    } catch (error) {
      if (error instanceof LoiKetQua) return 0;
      throw error;
    }
  }
  return 0;
}

export async function datDiemDatChuongTrinh(chuongTrinhId: string, diemDat: number | null, nguoi: NguoiThucHien, chuyenCan?: number | null) {
  const ct = await prisma.chuongTrinh.findUnique({ where: { id: chuongTrinhId }, include: { khoas: { select: { id: true, diemDat: true, chuyenCanToiThieu: true } } } });
  if (!ct) throw new DieuKienDatError("Không tìm thấy chương trình");
  if (ct.trangThai === "NGUNG_HIEU_LUC") throw new DieuKienDatError("Chương trình đã ngừng hiệu lực");
  const moi = chuanHoa(diemDat);
  const cc = chuanHoaChuyenCan(chuyenCan);
  const cu = ct.diemDat == null ? null : Number(ct.diemDat);
  await prisma.chuongTrinh.update({ where: { id: chuongTrinhId }, data: { diemDat: moi, ...(cc !== undefined ? { chuyenCanToiThieu: cc } : {}) } });
  await ghiThaoTac(
    nguoi,
    "DAT_DIEU_KIEN_DAT",
    "ChuongTrinh",
    chuongTrinhId,
    `${ct.maCT}: điểm đạt ${cu ?? "theo tham số chung"} -> ${moi ?? "theo tham số chung"}` +
      (cc !== undefined ? `; chuyên cần tối thiểu ${ct.chuyenCanToiThieu == null ? "theo tham số chung" : `${Number(ct.chuyenCanToiThieu)}%`} -> ${cc === null ? "theo tham số chung" : `${cc}%`}` : ""),
  );
  // khóa không đặt điều kiện riêng thì dùng điều kiện của chương trình -> tính lại
  let soKhoa = 0;
  for (const k of ct.khoas.filter((x) => x.diemDat == null || (cc !== undefined && x.chuyenCanToiThieu == null))) {
    if ((await tinhLaiKetQuaTheoDieuKien(k.id)) > 0) soKhoa++;
  }
  return { diemDat: moi, soKhoaTinhLai: soKhoa };
}

export async function datDiemDatKhoa(khoaId: string, diemDat: number | null, nguoi: NguoiThucHien, chuyenCan?: number | null) {
  const khoa = await layKhoaKemChuongTrinh(khoaId);
  await chanNeuDaPheDuyet(khoaId);
  const moi = chuanHoa(diemDat);
  const cc = chuanHoaChuyenCan(chuyenCan);
  const cu = khoa.diemDat == null ? null : Number(khoa.diemDat);
  await prisma.khoa.update({ where: { id: khoaId }, data: { diemDat: moi, ...(cc !== undefined ? { chuyenCanToiThieu: cc } : {}) } });
  await ghiThaoTac(
    nguoi,
    "DAT_DIEU_KIEN_DAT",
    "Khoa",
    khoaId,
    `${khoa.maKhoa}: điểm đạt ${cu ?? "theo chương trình"} -> ${moi ?? "theo chương trình"}` +
      (cc !== undefined ? `; chuyên cần tối thiểu ${khoa.chuyenCanToiThieu == null ? "theo chương trình" : `${Number(khoa.chuyenCanToiThieu)}%`} -> ${cc === null ? "theo chương trình" : `${cc}%`}` : ""),
  );
  return { diemDat: moi, soTinhLai: await tinhLaiKetQuaTheoDieuKien(khoaId) };
}
