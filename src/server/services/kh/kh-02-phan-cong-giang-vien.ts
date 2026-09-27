import { prisma } from "@/lib/db/prisma";
import {
  KhongTimThayKhoaError,
  KhongTimThayGiangVienError,
  HocPhanKhongThuocChuongTrinhError,
  TrungLichGiangVienError,
  LopKhongThuocKhoaError,
  KhoaChiDuThiKhongGiangDayError,
} from "@/server/services/kh/loi-khoa";

export type PhanCongGiangVienInput = {
  khoaId: string;
  hocPhanId: string;
  giangVienId: string;
  // KH-07: null/bỏ trống = phân công cấp khóa (áp dụng cho lớp chưa có phân công riêng)
  lopId?: string | null;
};

type KhoangThoiGian = { batDau: Date | null; ketThuc: Date | null };

/**
 * 2 khoảng thời gian được coi là trùng lịch chỉ khi cả 2 khóa đều đã có đủ
 * ngày khai giảng - bế giảng; khóa chưa thiết lập lịch thì chưa đủ căn cứ để
 * chặn (sẽ được kiểm lại khi lịch được điền đủ).
 */
function coTrungThoiGian(a: KhoangThoiGian, b: KhoangThoiGian): boolean {
  if (!a.batDau || !a.ketThuc || !b.batDau || !b.ketThuc) return false;
  return a.batDau <= b.ketThuc && b.batDau <= a.ketThuc;
}

/**
 * KH-02: gán giảng viên cho 1 học phần trong 1 khóa. "Một giảng viên không
 * được phân công trùng lịch ở 2 khóa" - so sánh khoảng thời gian khai giảng
 * - bế giảng của khóa đang phân công với mọi khóa KHÁC mà giảng viên đó đã
 * được phân công ở bất kỳ học phần nào (loại trừ chính khóa đang xét bằng
 * `khoaId: { not: input.khoaId }`) - vì 1 giảng viên được phép dạy nhiều
 * học phần/chuyên đề trong cùng 1 khóa, chỉ chặn khi trùng lịch giữa 2 khóa
 * khác nhau.
 */
export async function phanCongGiangVien(input: PhanCongGiangVienInput) {
  const khoa = await prisma.khoa.findUnique({ where: { id: input.khoaId }, include: { chuongTrinh: true } });
  if (!khoa) throw new KhongTimThayKhoaError();
  if (khoa.chuongTrinh.phuongThucDangKy === "CHI_DU_THI") throw new KhoaChiDuThiKhongGiangDayError();

  const hocPhan = await prisma.hocPhan.findUnique({ where: { id: input.hocPhanId } });
  if (!hocPhan || hocPhan.chuongTrinhId !== khoa.chuongTrinhId) {
    throw new HocPhanKhongThuocChuongTrinhError();
  }

  const giangVien = await prisma.giangVien.findUnique({ where: { id: input.giangVienId } });
  if (!giangVien) throw new KhongTimThayGiangVienError();

  const lopId = input.lopId || null;
  if (lopId) {
    const lop = await prisma.lopHoc.findUnique({ where: { id: lopId } });
    if (!lop || lop.khoaId !== input.khoaId) throw new LopKhongThuocKhoaError();
  }

  const phanCongKhoaKhac = await prisma.giangVienHocPhan.findMany({
    where: {
      giangVienId: input.giangVienId,
      khoaId: { not: input.khoaId },
      // khóa đã hủy không còn "vận hành" nên không tính là chiếm lịch giảng viên
      khoa: { trangThai: { not: "HUY" } },
    },
    include: { khoa: true },
  });
  const trungLich = phanCongKhoaKhac.some((pc) =>
    coTrungThoiGian(
      { batDau: khoa.thoiGianKhaiGiang, ketThuc: khoa.thoiGianBeGiang },
      { batDau: pc.khoa.thoiGianKhaiGiang, ketThuc: pc.khoa.thoiGianBeGiang },
    ),
  );
  if (trungLich) throw new TrungLichGiangVienError();

  // Không dùng upsert theo unique (khoaId, lopId, hocPhanId): Postgres coi NULL
  // là khác nhau nên phân công cấp khóa (lopId null) phải tự tìm rồi cập nhật.
  const daCo = await prisma.giangVienHocPhan.findFirst({
    where: { khoaId: input.khoaId, hocPhanId: input.hocPhanId, lopId },
  });
  const include = { giangVien: true, hocPhan: true, lop: true } as const;
  if (daCo) {
    return prisma.giangVienHocPhan.update({
      where: { id: daCo.id },
      data: { giangVienId: input.giangVienId },
      include,
    });
  }
  return prisma.giangVienHocPhan.create({
    data: { khoaId: input.khoaId, hocPhanId: input.hocPhanId, giangVienId: input.giangVienId, lopId },
    include,
  });
}

export async function danhSachPhanCong(khoaId: string) {
  return prisma.giangVienHocPhan.findMany({
    where: { khoaId },
    include: { giangVien: true, hocPhan: true, lop: true },
    orderBy: [{ hocPhan: { thuTu: "asc" } }, { lop: { maLop: "asc" } }],
  });
}
