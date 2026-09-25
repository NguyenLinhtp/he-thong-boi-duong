import { prisma } from "@/lib/db/prisma";
import { KhongTimThayHocPhiError } from "@/server/services/hp/loi-hoc-phi";
import { guiThongBao } from "@/server/services/hv/hv-10-thong-bao";

const TRANG_THAI_CON_NO = ["CHUA_NOP", "CON_NO"] as const;

export async function danhSachCongNo(khoaId?: string) {
  return prisma.hocPhi.findMany({
    where: { trangThai: { in: [...TRANG_THAI_CON_NO] }, khoaId },
    include: { hocVien: true, khoa: true },
    orderBy: { hanNop: "asc" },
  });
}

export async function datHanNop(hocPhiId: string, hanNop: Date) {
  const hocPhi = await prisma.hocPhi.findUnique({ where: { id: hocPhiId } });
  if (!hocPhi) throw new KhongTimThayHocPhiError();

  return prisma.hocPhi.update({ where: { id: hocPhiId }, data: { hanNop } });
}

async function guiNhacNoMotHocPhi(hocPhi: {
  id: string;
  hocVienId: string;
  soTienPhaiNop: unknown;
  soTienDaNop: unknown;
  khoaId: string;
}) {
  const khoa = await prisma.khoa.findUnique({ where: { id: hocPhi.khoaId } });
  const conNo = Number(hocPhi.soTienPhaiNop) - Number(hocPhi.soTienDaNop);

  await guiThongBao(
    hocPhi.hocVienId,
    "NHAC_HOC_PHI",
    `Nhắc nộp học phí khóa ${khoa?.maKhoa ?? ""}`,
    `Bạn còn nợ học phí ${conNo.toLocaleString("vi-VN")}đ cho khóa ${khoa?.maKhoa ?? ""}. Vui lòng hoàn tất trước hạn chót.`,
  );

  return prisma.hocPhi.update({ where: { id: hocPhi.id }, data: { lanNhacGanNhat: new Date() } });
}

// Nhắc thủ công (cán bộ tài chính bấm nút cho 1 học viên cụ thể).
export async function guiNhacNoHocPhi(hocPhiId: string) {
  const hocPhi = await prisma.hocPhi.findUnique({ where: { id: hocPhiId } });
  if (!hocPhi) throw new KhongTimThayHocPhiError();
  return guiNhacNoMotHocPhi(hocPhi);
}

const SO_NGAY_TOI_THIEU_TRUOC_HAN = 7;
const SO_NGAY_GIAN_CACH_GIUA_2_LAN_NHAC = 3;

/**
 * HP-03: "Tự động nhắc trước hạn chót tối thiểu 7 ngày" - bộ lập lịch ngoài
 * hệ thống gọi định kỳ (giống cơ chế backup tự động QT-04). Chỉ nhắc các
 * khoản còn nợ có hạn nộp trong vòng 7 ngày tới (hoặc đã quá hạn), và cách
 * lần nhắc trước tối thiểu vài ngày để tránh spam mỗi ngày.
 */
export async function chayNhacNoTuDong() {
  const nguong = new Date();
  nguong.setDate(nguong.getDate() + SO_NGAY_TOI_THIEU_TRUOC_HAN);

  const canhCachLan2 = new Date();
  canhCachLan2.setDate(canhCachLan2.getDate() - SO_NGAY_GIAN_CACH_GIUA_2_LAN_NHAC);

  const dsCanNhac = await prisma.hocPhi.findMany({
    where: {
      trangThai: { in: [...TRANG_THAI_CON_NO] },
      hanNop: { not: null, lte: nguong },
      OR: [{ lanNhacGanNhat: null }, { lanNhacGanNhat: { lte: canhCachLan2 } }],
    },
  });

  const ketQua = [];
  for (const hocPhi of dsCanNhac) {
    ketQua.push(await guiNhacNoMotHocPhi(hocPhi));
  }
  return ketQua;
}
