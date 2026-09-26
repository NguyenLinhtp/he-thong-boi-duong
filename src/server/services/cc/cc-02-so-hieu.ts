import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { layThamSo } from "@/server/services/qt/qt-05-tham-so";
import { ghiNhatKy } from "@/server/services/qt/qt-03-nhat-ky";
import { lyDoKhongDuDieuKien } from "@/server/services/cc/cc-01-de-nghi";
import {
  KhongTimThayChungChiError,
  SaiTrangThaiChungChiError,
  ThieuThongTinError,
} from "@/server/services/cc/loi-chung-chi";

type NguoiThucHien = { nguoiThucHienId?: string | null; nguoiThucHienTen: string };

/**
 * CC-02: "Số hiệu tăng dần, không trùng, không cấp lại số đã hủy". Dạng
 * <tiền tố><năm>-<5 chữ số>, tiền tố lấy từ QT-05 (CC_TIEN_TO_SO_HIEU, mặc
 * định "CC"). Số kế tiếp = số LỚN NHẤT đã từng cấp trong năm + 1 - chứng chỉ
 * hủy vẫn giữ dòng + số hiệu (không có thao tác xóa) nên số đã hủy không bao
 * giờ bị dùng lại; unique(soHieu) + thử lại khi trùng chặn tranh chấp đồng thời.
 */
async function capSoHieu(ganSo: (soHieu: string) => Promise<unknown>) {
  const tienTo = `${(await layThamSo("CC_TIEN_TO_SO_HIEU")) ?? "CC"}${new Date().getFullYear()}-`;
  const lonNhat = await prisma.chungChi.findFirst({
    where: { soHieu: { startsWith: tienTo } },
    orderBy: { soHieu: "desc" },
  });
  const soCuoi = lonNhat?.soHieu ? Number(lonNhat.soHieu.slice(tienTo.length)) : 0;

  for (let lanThu = 1; lanThu <= 10; lanThu++) {
    const soHieu = `${tienTo}${String(soCuoi + lanThu).padStart(5, "0")}`;
    try {
      await ganSo(soHieu);
      return soHieu;
    } catch (error) {
      const laLoiTrung = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!laLoiTrung) throw error;
    }
  }
  throw new Error("Không sinh được số hiệu chứng chỉ sau nhiều lần thử");
}

/**
 * CC-02: sinh số hiệu cho các chứng chỉ đang Đề nghị của khóa (hoặc 1 phần
 * được chọn), theo thứ tự họ tên, rồi chuyển sang Chờ ký duyệt (đã in).
 * Kiểm tra lại điều kiện cấp ngay trước khi gán số - người không còn đủ điều
 * kiện (vd phúc khảo hạ điểm) bị bỏ qua và trả về kèm lý do, không cấp số.
 */
export async function sinhSoHieu(khoaId: string, nguoi: NguoiThucHien, chungChiIds?: string[]) {
  const dsDeNghi = await prisma.chungChi.findMany({
    where: { khoaId, trangThai: "DE_NGHI", id: chungChiIds ? { in: chungChiIds } : undefined },
    include: { hocVien: true },
    orderBy: { hocVien: { hoTen: "asc" } },
  });

  const daCapSo: { chungChiId: string; hoTen: string; soHieu: string }[] = [];
  const boQua: { chungChiId: string; hoTen: string; lyDo: string }[] = [];
  for (const cc of dsDeNghi) {
    const lyDo = await lyDoKhongDuDieuKien(cc.hocVienId, khoaId);
    if (lyDo) {
      boQua.push({ chungChiId: cc.id, hoTen: cc.hocVien.hoTen, lyDo });
      continue;
    }
    const soHieu = await capSoHieu((so) =>
      prisma.chungChi.update({
        // điều kiện trạng thái trong where: không gán số 2 lần nếu bấm trùng
        where: { id: cc.id, trangThai: "DE_NGHI" },
        data: { soHieu: so, trangThai: "CHO_KY_DUYET", ngayInSoHieu: new Date() },
      }),
    );
    daCapSo.push({ chungChiId: cc.id, hoTen: cc.hocVien.hoTen, soHieu });
  }

  if (daCapSo.length > 0) {
    await ghiNhatKy({
      nguoiThucHienId: nguoi.nguoiThucHienId,
      nguoiThucHienTen: nguoi.nguoiThucHienTen,
      hanhDong: "SINH_SO_HIEU_CHUNG_CHI",
      doiTuong: "Khoa",
      doiTuongId: khoaId,
      chiTiet: daCapSo.map((c) => `${c.soHieu} ${c.hoTen}`).join("; "),
    });
  }
  return { daCapSo, boQua };
}

/**
 * Hủy chứng chỉ chưa cấp (in sai, học viên không còn đủ điều kiện...). Dòng
 * và số hiệu được giữ lại (không cấp lại số); học viên có thể được đề nghị
 * lại ở CC-01 và nhận 1 chứng chỉ mới với số hiệu mới.
 */
export async function huyChungChi(chungChiId: string, lyDo: string, nguoi: NguoiThucHien) {
  const chungChi = await prisma.chungChi.findUnique({ where: { id: chungChiId } });
  if (!chungChi) throw new KhongTimThayChungChiError();
  if (!["DE_NGHI", "CHO_KY_DUYET", "DA_KY_DUYET"].includes(chungChi.trangThai)) {
    throw new SaiTrangThaiChungChiError("chưa cấp (đề nghị/chờ ký/đã ký)");
  }
  if (!lyDo?.trim()) throw new ThieuThongTinError("lý do hủy");

  const sau = await prisma.chungChi.update({
    where: { id: chungChiId },
    data: { trangThai: "DA_HUY", lyDoHuy: lyDo.trim(), ngayHuy: new Date() },
  });
  await ghiNhatKy({
    nguoiThucHienId: nguoi.nguoiThucHienId,
    nguoiThucHienTen: nguoi.nguoiThucHienTen,
    hanhDong: "HUY_CHUNG_CHI",
    doiTuong: "ChungChi",
    doiTuongId: chungChiId,
    chiTiet: `${chungChi.soHieu ?? "(chưa có số hiệu)"}: ${lyDo.trim()}`,
  });
  return sau;
}

/** Dữ liệu in chứng chỉ theo mẫu (tên cơ quan cấp/tiêu đề cấu hình ở QT-05). */
export async function duLieuInChungChi(chungChiIds: string[]) {
  const [dsChungChi, tenCoQuan, tieuDe] = await Promise.all([
    prisma.chungChi.findMany({
      where: { id: { in: chungChiIds }, soHieu: { not: null }, trangThai: { not: "DA_HUY" } },
      include: { hocVien: true, khoa: { include: { chuongTrinh: true } } },
      orderBy: { soHieu: "asc" },
    }),
    layThamSo("CC_TEN_CO_QUAN_CAP"),
    layThamSo("CC_TIEU_DE_CHUNG_CHI"),
  ]);
  return {
    dsChungChi,
    tenCoQuan: tenCoQuan ?? "CƠ SỞ ĐÀO TẠO, BỒI DƯỠNG",
    tieuDe: tieuDe ?? "CHỨNG CHỈ BỒI DƯỠNG",
  };
}
