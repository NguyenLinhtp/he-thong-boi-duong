import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { LoaiVanBang } from "@/generated/prisma/client";
import { tienToSoVaoSo } from "@/server/services/cc/van-bang";
import { ghiNhatKy } from "@/server/services/qt/qt-03-nhat-ky";
import { lyDoKhongDuDieuKien } from "@/server/services/cc/cc-01-de-nghi";
import {
  KhongTimThayChungChiError,
  KhongTimThayHopDongError,
  SaiTrangThaiChungChiError,
  SaiKenhNhanChungChiError,
  HopDongChuaThanhLyError,
  KhongConDuDieuKienError,
  ThieuThongTinError,
  LoTrongError,
} from "@/server/services/cc/loi-chung-chi";

type NguoiThucHien = { nguoiThucHienId?: string | null; nguoiThucHienTen: string };
type Tx = Prisma.TransactionClient;

/**
 * Chạy 1 thao tác vào sổ trong transaction, cấp liên tiếp các số vào sổ
 * <tiền tố><năm>-<5 chữ số> - sổ cấp riêng cho chứng chỉ (mặc định "SC") và
 * giấy chứng nhận (mặc định "SN"), tiền tố cấu hình ở QT-05 (van-bang.ts) - bắt
 * đầu từ số lớn nhất đã có + 1. Trùng số do thao tác đồng thời (P2002) ->
 * làm lại CẢ transaction (không để 1 lô vào sổ dở dang).
 */
async function vaoSoTrongTransaction<T>(
  loai: LoaiVanBang,
  thaoTac: (tx: Tx, soVaoSoKeTiep: () => string) => Promise<T>,
): Promise<T> {
  const tienTo = `${await tienToSoVaoSo(loai)}${new Date().getFullYear()}-`;
  for (let lanThu = 0; lanThu < 5; lanThu++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const lonNhat = await tx.chungChi.findFirst({
          where: { soVaoSo: { startsWith: tienTo } },
          orderBy: { soVaoSo: "desc" },
        });
        let so = lonNhat?.soVaoSo ? Number(lonNhat.soVaoSo.slice(tienTo.length)) : 0;
        return thaoTac(tx, () => `${tienTo}${String(++so).padStart(5, "0")}`);
      });
    } catch (error) {
      const laLoiTrung = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!laLoiTrung) throw error;
    }
  }
  throw new Error("Không cấp được số vào sổ sau nhiều lần thử");
}

export type TraTrucTiepInput = NguoiThucHien & { nguoiNhan: string; ngayNhan?: Date | string | null };

/**
 * CC-04 kênh 1: trao trực tiếp cho học viên TỰ ĐĂNG KÝ (không qua đơn vị liên
 * kết). "Chỉ chứng chỉ đã ký duyệt mới được trả" (CC-03); điều kiện cấp được
 * kiểm tra lại lần cuối trước khi vào sổ.
 */
export async function traTrucTiep(chungChiId: string, input: TraTrucTiepInput) {
  const chungChi = await prisma.chungChi.findUnique({ where: { id: chungChiId } });
  if (!chungChi) throw new KhongTimThayChungChiError();
  if (chungChi.trangThai !== "DA_KY_DUYET") throw new SaiTrangThaiChungChiError("đã ký duyệt (CC-03)");
  if (!input.nguoiNhan?.trim()) throw new ThieuThongTinError("người nhận");

  const dangKy = await prisma.dangKyHoc.findUnique({
    where: { hocVienId_khoaId: { hocVienId: chungChi.hocVienId, khoaId: chungChi.khoaId } },
  });
  if (dangKy?.hopDongLienKetId) throw new SaiKenhNhanChungChiError(true);
  const lyDo = await lyDoKhongDuDieuKien(chungChi.hocVienId, chungChi.khoaId);
  if (lyDo) throw new KhongConDuDieuKienError(lyDo);

  const sau = await vaoSoTrongTransaction(chungChi.loaiVanBang, (tx, soKeTiep) =>
    tx.chungChi.update({
      where: { id: chungChiId, trangThai: "DA_KY_DUYET" },
      data: {
        trangThai: "DA_CAP",
        kenhNhan: "TRUC_TIEP",
        nguoiNhan: input.nguoiNhan.trim(),
        ngayNhan: input.ngayNhan ? new Date(input.ngayNhan) : new Date(),
        soVaoSo: soKeTiep(),
      },
    }),
  );

  await ghiNhatKy({
    nguoiThucHienId: input.nguoiThucHienId,
    nguoiThucHienTen: input.nguoiThucHienTen,
    hanhDong: "TRA_CHUNG_CHI_TRUC_TIEP",
    doiTuong: "ChungChi",
    doiTuongId: chungChiId,
    chiTiet: `${sau.soHieu}, sổ ${sau.soVaoSo}, người nhận ${sau.nguoiNhan}`,
  });
  return sau;
}

// thông tin bàn giao chỉ để quản lý, đều có thể để trống (ngày trống = hôm nay)
export type BanGiaoLoInput = NguoiThucHien & {
  nguoiDaiDienNhan?: string | null;
  ngayBanGiao?: Date | string | null;
  ghiChu?: string | null;
};

/**
 * CC-04 kênh 2: bàn giao THEO LÔ về đơn vị liên kết mọi chứng chỉ đã ký duyệt
 * của học viên thuộc 1 hợp đồng liên kết - "chỉ bàn giao theo lô sau khi hợp
 * đồng liên kết đã thanh lý" (kể cả khi học phí đã được bỏ chặn thủ công ở
 * HP-06). Học viên không còn đủ điều kiện bị loại khỏi lô và trả về kèm lý do.
 */
export async function banGiaoTheoLo(hopDongLienKetId: string, input: BanGiaoLoInput) {
  const hopDong = await prisma.hopDongLienKet.findUnique({
    where: { id: hopDongLienKetId },
    include: { donViLienKet: true, banGiaos: true },
  });
  if (!hopDong) throw new KhongTimThayHopDongError();
  if (hopDong.trangThai !== "DA_THANH_LY") throw new HopDongChuaThanhLyError();

  const dsHocVienHopDong = await prisma.dangKyHoc.findMany({
    where: { hopDongLienKetId, khoaId: hopDong.khoaId },
    select: { hocVienId: true },
  });
  const dsChoGiao = await prisma.chungChi.findMany({
    where: {
      khoaId: hopDong.khoaId,
      trangThai: "DA_KY_DUYET",
      hocVienId: { in: dsHocVienHopDong.map((dk) => dk.hocVienId) },
    },
    include: { hocVien: true },
    orderBy: { soHieu: "asc" },
  });

  const biLoai: { hoTen: string; lyDo: string }[] = [];
  const dsGiao: typeof dsChoGiao = [];
  for (const cc of dsChoGiao) {
    const lyDo = await lyDoKhongDuDieuKien(cc.hocVienId, cc.khoaId);
    if (lyDo) biLoai.push({ hoTen: cc.hocVien.hoTen, lyDo });
    else dsGiao.push(cc);
  }
  if (dsGiao.length === 0) throw new LoTrongError();

  const ngayBanGiao = input.ngayBanGiao ? new Date(input.ngayBanGiao) : new Date();
  if (Number.isNaN(ngayBanGiao.getTime())) throw new ThieuThongTinError("ngày bàn giao hợp lệ");
  const daiDien = input.nguoiDaiDienNhan?.trim() || null;
  // cùng 1 hợp đồng = cùng 1 khóa = cùng 1 chương trình -> cùng 1 loại văn bằng
  const lo = await vaoSoTrongTransaction(dsGiao[0].loaiVanBang, async (tx, soKeTiep) => {
    const soLoDaCo = await tx.banGiaoChungChi.count({ where: { hopDongLienKetId } });
    const banGiao = await tx.banGiaoChungChi.create({
      data: {
        maLo: `LO-${hopDong.maHopDong}-${String(soLoDaCo + 1).padStart(2, "0")}`,
        hopDongLienKetId,
        ngayBanGiao,
        nguoiDaiDienNhan: daiDien,
        nguoiBanGiao: input.nguoiThucHienTen,
        ghiChu: input.ghiChu?.trim() || null,
      },
    });
    for (const cc of dsGiao) {
      await tx.chungChi.update({
        where: { id: cc.id, trangThai: "DA_KY_DUYET" },
        data: {
          trangThai: "DA_CAP",
          kenhNhan: "BAN_GIAO_DVLK",
          banGiaoId: banGiao.id,
          nguoiNhan: daiDien ? `${daiDien} (${hopDong.donViLienKet.ten})` : hopDong.donViLienKet.ten,
          ngayNhan: ngayBanGiao,
          soVaoSo: soKeTiep(),
        },
      });
    }
    return banGiao;
  });

  await ghiNhatKy({
    nguoiThucHienId: input.nguoiThucHienId,
    nguoiThucHienTen: input.nguoiThucHienTen,
    hanhDong: "BAN_GIAO_CHUNG_CHI_THEO_LO",
    doiTuong: "HopDongLienKet",
    doiTuongId: hopDongLienKetId,
    chiTiet: `Lô ${lo.maLo} về ${hopDong.donViLienKet.ten}: ${dsGiao.map((cc) => cc.soHieu).join(", ")}`,
  });

  return { lo, soChungChi: dsGiao.length, biLoai };
}

/** Hợp đồng liên kết của khóa kèm số chứng chỉ đã ký duyệt đang chờ bàn giao và các lô đã giao. */
export async function hopDongChoBanGiao(khoaId: string) {
  const dsHopDong = await prisma.hopDongLienKet.findMany({
    where: { khoaId },
    include: { donViLienKet: true, banGiaos: { orderBy: { createdAt: "asc" } }, dangKys: { select: { hocVienId: true } } },
    orderBy: { maHopDong: "asc" },
  });
  const dsDaKy = await prisma.chungChi.findMany({ where: { khoaId, trangThai: "DA_KY_DUYET" } });
  return dsHopDong.map(({ dangKys, ...hd }) => {
    const hocVienIds = dangKys.map((dk) => dk.hocVienId);
    return {
      ...hd,
      hocVienIds,
      soChoBanGiao: dsDaKy.filter((cc) => hocVienIds.includes(cc.hocVienId)).length,
    };
  });
}

export type BoLocSoCap = { tuKhoa?: string | null; khoaId?: string | null; nam?: number | null };

/**
 * CC-04: sổ cấp chứng chỉ điện tử = mọi chứng chỉ đã vào sổ, theo số vào sổ.
 * Hồ sơ lưu vĩnh viễn - module không có thao tác xóa/sửa sau khi vào sổ.
 */
export async function soCapChungChi(boLoc: BoLocSoCap = {}) {
  const tuKhoa = boLoc.tuKhoa?.trim();
  return prisma.chungChi.findMany({
    where: {
      trangThai: "DA_CAP",
      khoaId: boLoc.khoaId || undefined,
      ngayNhan: boLoc.nam
        ? { gte: new Date(`${boLoc.nam}-01-01`), lt: new Date(`${boLoc.nam + 1}-01-01`) }
        : undefined,
      OR: tuKhoa
        ? [
            { soHieu: { contains: tuKhoa, mode: "insensitive" } },
            { soVaoSo: { contains: tuKhoa, mode: "insensitive" } },
            { hocVien: { hoTen: { contains: tuKhoa, mode: "insensitive" } } },
            { hocVien: { maHocVien: { contains: tuKhoa, mode: "insensitive" } } },
          ]
        : undefined,
    },
    include: { hocVien: true, khoa: { include: { chuongTrinh: true } }, banGiao: true },
    orderBy: { soVaoSo: "asc" },
  });
}
