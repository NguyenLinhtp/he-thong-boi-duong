import { prisma } from "@/lib/db/prisma";
import {
  KhongTimThayKhoaError,
  KhongTimThayGiangVienError,
  HocPhanKhongThuocChuongTrinhError,
  TrungLichGiangVienError,
} from "@/server/services/kh/loi-khoa";

export type PhanCongGiangVienInput = {
  khoaId: string;
  hocPhanId: string;
  giangVienId: string;
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
  const khoa = await prisma.khoa.findUnique({ where: { id: input.khoaId } });
  if (!khoa) throw new KhongTimThayKhoaError();

  const hocPhan = await prisma.hocPhan.findUnique({ where: { id: input.hocPhanId } });
  if (!hocPhan || hocPhan.chuongTrinhId !== khoa.chuongTrinhId) {
    throw new HocPhanKhongThuocChuongTrinhError();
  }

  const giangVien = await prisma.giangVien.findUnique({ where: { id: input.giangVienId } });
  if (!giangVien) throw new KhongTimThayGiangVienError();

  const phanCongKhoaKhac = await prisma.giangVienHocPhan.findMany({
    where: { giangVienId: input.giangVienId, khoaId: { not: input.khoaId } },
    include: { khoa: true },
  });
  const trungLich = phanCongKhoaKhac.some((pc) =>
    coTrungThoiGian(
      { batDau: khoa.thoiGianKhaiGiang, ketThuc: khoa.thoiGianBeGiang },
      { batDau: pc.khoa.thoiGianKhaiGiang, ketThuc: pc.khoa.thoiGianBeGiang },
    ),
  );
  if (trungLich) throw new TrungLichGiangVienError();

  return prisma.giangVienHocPhan.upsert({
    where: { khoaId_hocPhanId: { khoaId: input.khoaId, hocPhanId: input.hocPhanId } },
    create: input,
    update: { giangVienId: input.giangVienId },
    include: { giangVien: true, hocPhan: true },
  });
}

export async function danhSachPhanCong(khoaId: string) {
  return prisma.giangVienHocPhan.findMany({
    where: { khoaId },
    include: { giangVien: true, hocPhan: true },
    orderBy: { hocPhan: { thuTu: "asc" } },
  });
}
