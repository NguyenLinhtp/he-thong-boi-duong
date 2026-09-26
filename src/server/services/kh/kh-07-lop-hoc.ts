import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ghiNhatKy } from "@/server/services/qt/qt-03-nhat-ky";
import { guiThongBao } from "@/server/services/hv/hv-10-thong-bao";
import {
  KhongTimThayKhoaError,
  KhongTimThayLopError,
  LopKhongThuocKhoaError,
  KhoaChiDuThiKhongChiaLopError,
  KhoaDaDongKhongChiaLopError,
  TongSiSoLopVuotKhoaError,
  SiSoLopNhoHonHienTaiError,
  LopDaDuSiSoError,
  LopDangSuDungError,
  KhongTimThayDangKyLopError,
  HocVienChuaChinhThucError,
  DaOLopNayError,
} from "@/server/services/kh/loi-khoa";

/** Học viên đang "chiếm chỗ" trong lớp (thôi học trả lại chỗ). */
const TRANG_THAI_TRONG_LOP = ["CHINH_THUC", "HOAN_THANH"] as const;

type NguoiThucHien = { nguoiThucHienId?: string | null; nguoiThucHienTen: string };

function ngayThanhChuoi(ngay: Date | string): string {
  return new Date(ngay).toISOString().slice(0, 10);
}

/**
 * KH-07: lớp của học viên tại 1 ngày học = lớp đích của lần xếp/chuyển gần
 * nhất có ngày hiệu lực <= ngày đó (so theo ngày, buổi đúng ngày chuyển thuộc
 * lớp mới). Chưa có lần xếp nào trước ngày đó -> null (chưa thuộc lớp nào).
 */
export function lopTaiNgay(
  lichSu: { denLopId: string; ngayHieuLuc: Date; createdAt: Date }[],
  ngay: Date | string,
): string | null {
  const ngayXet = ngayThanhChuoi(ngay);
  const truocDo = lichSu
    .filter((ls) => ngayThanhChuoi(ls.ngayHieuLuc) <= ngayXet)
    .sort(
      (a, b) =>
        a.ngayHieuLuc.getTime() - b.ngayHieuLuc.getTime() || a.createdAt.getTime() - b.createdAt.getTime(),
    );
  return truocDo.at(-1)?.denLopId ?? null;
}

async function layKhoaChoPhepChiaLop(khoaId: string) {
  const khoa = await prisma.khoa.findUnique({ where: { id: khoaId }, include: { chuongTrinh: true } });
  if (!khoa) throw new KhongTimThayKhoaError();
  if (khoa.chuongTrinh.phuongThucDangKy === "CHI_DU_THI") throw new KhoaChiDuThiKhongChiaLopError();
  if (khoa.trangThai === "DA_KET_THUC" || khoa.trangThai === "HUY") throw new KhoaDaDongKhongChiaLopError();
  // KQ-04 phê duyệt theo khóa - sau khi duyệt không đổi cơ cấu lớp nữa
  const daPheDuyet = await prisma.ketQuaKhoa.count({ where: { khoaId, daPheDuyet: true } });
  if (daPheDuyet > 0) throw new KhoaDaDongKhongChiaLopError();
  return khoa;
}

async function siSoLop(lopId: string): Promise<number> {
  return prisma.dangKyHoc.count({ where: { lopId, trangThai: { in: [...TRANG_THAI_TRONG_LOP] } } });
}

async function kiemTraTongSiSo(khoa: { id: string; siSoToiDa: number }, siSoMoi: number | null, boQuaLopId?: string) {
  if (siSoMoi === null) return;
  const cacLopKhac = await prisma.lopHoc.findMany({
    where: { khoaId: khoa.id, id: boQuaLopId ? { not: boQuaLopId } : undefined },
  });
  const tong = cacLopKhac.reduce((t, l) => t + (l.siSoToiDa ?? 0), 0) + siSoMoi;
  if (tong > khoa.siSoToiDa) throw new TongSiSoLopVuotKhoaError();
}

export type TaoLopInput = { ten: string; siSoToiDa?: number | null };

/** Mã lớp tự sinh theo khóa: <mã khóa>-L01, -L02... (retry khi trùng như mã học viên). */
export async function taoLop(khoaId: string, input: TaoLopInput) {
  const khoa = await layKhoaChoPhepChiaLop(khoaId);
  const siSoToiDa = input.siSoToiDa ?? null;
  await kiemTraTongSiSo(khoa, siSoToiDa);

  const soLopDaCo = await prisma.lopHoc.count({ where: { khoaId } });
  for (let lanThu = 0; lanThu < 10; lanThu++) {
    const maLop = `${khoa.maKhoa}-L${String(soLopDaCo + 1 + lanThu).padStart(2, "0")}`;
    try {
      return await prisma.lopHoc.create({
        data: { khoaId, maLop, ten: input.ten.trim() || maLop, siSoToiDa },
      });
    } catch (error) {
      const laLoiTrungMa = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!laLoiTrungMa) throw error;
    }
  }
  throw new Error("Không sinh được mã lớp sau nhiều lần thử");
}

export async function capNhatLop(lopId: string, input: TaoLopInput) {
  const lop = await prisma.lopHoc.findUnique({ where: { id: lopId } });
  if (!lop) throw new KhongTimThayLopError();
  const khoa = await layKhoaChoPhepChiaLop(lop.khoaId);

  const siSoToiDa = input.siSoToiDa ?? null;
  if (siSoToiDa !== null && siSoToiDa < (await siSoLop(lopId))) throw new SiSoLopNhoHonHienTaiError();
  await kiemTraTongSiSo(khoa, siSoToiDa, lopId);

  return prisma.lopHoc.update({
    where: { id: lopId },
    data: { ten: input.ten.trim() || lop.ten, siSoToiDa },
  });
}

/** Chỉ xóa lớp "trống" - còn dấu vết (học viên, buổi, phân công, lịch sử) thì giữ để không mất lịch sử. */
export async function xoaLop(lopId: string) {
  const lop = await prisma.lopHoc.findUnique({
    where: { id: lopId },
    include: { _count: { select: { dangKys: true, buoiHocs: true, phanCongs: true, lichSuDens: true, lichSuTus: true } } },
  });
  if (!lop) throw new KhongTimThayLopError();
  if (Object.values(lop._count).some((so) => so > 0)) throw new LopDangSuDungError();
  return prisma.lopHoc.delete({ where: { id: lopId } });
}

export async function danhSachLop(khoaId: string) {
  const dsLop = await prisma.lopHoc.findMany({ where: { khoaId }, orderBy: { maLop: "asc" } });
  const siSo = await prisma.dangKyHoc.groupBy({
    by: ["lopId"],
    where: { khoaId, lopId: { not: null }, trangThai: { in: [...TRANG_THAI_TRONG_LOP] } },
    _count: true,
  });
  const siSoTheoLop = new Map(siSo.map((s) => [s.lopId, s._count]));
  return dsLop.map((lop) => ({ ...lop, siSoHienTai: siSoTheoLop.get(lop.id) ?? 0 }));
}

/** Học viên chính thức của khóa kèm lớp hiện tại (null = chưa xếp). */
export async function hocVienTheoLop(khoaId: string) {
  return prisma.dangKyHoc.findMany({
    where: { khoaId, trangThai: { in: [...TRANG_THAI_TRONG_LOP] } },
    include: { hocVien: true, lop: true },
    orderBy: { hocVien: { hoTen: "asc" } },
  });
}

export type XepLopInput = NguoiThucHien & {
  lopId: string;
  lyDo?: string | null;
  // mặc định hôm nay; buổi học từ ngày này trở đi tính cho lớp mới
  ngayHieuLuc?: Date | string | null;
};

/**
 * KH-07: xếp học viên vào lớp (lần đầu) hoặc chuyển sang lớp khác trong CÙNG
 * khóa. Chỉ đổi DangKyHoc.lopId + ghi lịch sử - điểm (KetQuaHocTap/KetQuaKhoa),
 * điểm danh, học phí, chứng chỉ đều gắn theo khóa/buổi nên được giữ nguyên.
 */
export async function xepLop(dangKyId: string, input: XepLopInput) {
  const dangKy = await prisma.dangKyHoc.findUnique({
    where: { id: dangKyId },
    include: { lop: true, khoa: true },
  });
  if (!dangKy) throw new KhongTimThayDangKyLopError();

  const lopDich = await prisma.lopHoc.findUnique({ where: { id: input.lopId } });
  if (!lopDich) throw new KhongTimThayLopError();
  if (lopDich.khoaId !== dangKy.khoaId) throw new LopKhongThuocKhoaError();
  await layKhoaChoPhepChiaLop(dangKy.khoaId);

  if (dangKy.trangThai !== "CHINH_THUC") throw new HocVienChuaChinhThucError();
  if (dangKy.lopId === lopDich.id) throw new DaOLopNayError();
  if (lopDich.siSoToiDa !== null && (await siSoLop(lopDich.id)) >= lopDich.siSoToiDa) {
    throw new LopDaDuSiSoError();
  }

  const laChuyenLop = dangKy.lopId !== null;
  const ngayHieuLuc = input.ngayHieuLuc ? new Date(input.ngayHieuLuc) : new Date();

  const [dangKySau] = await prisma.$transaction([
    prisma.dangKyHoc.update({
      where: { id: dangKyId },
      data: { lopId: lopDich.id },
      include: { hocVien: true, lop: true },
    }),
    prisma.lichSuChuyenLop.create({
      data: {
        dangKyId,
        tuLopId: dangKy.lopId,
        denLopId: lopDich.id,
        ngayHieuLuc,
        lyDo: input.lyDo || null,
        nguoiThucHienTen: input.nguoiThucHienTen,
      },
    }),
  ]);

  await ghiNhatKy({
    nguoiThucHienId: input.nguoiThucHienId,
    nguoiThucHienTen: input.nguoiThucHienTen,
    hanhDong: laChuyenLop ? "CHUYEN_LOP" : "XEP_LOP",
    doiTuong: "DangKyHoc",
    doiTuongId: dangKyId,
    chiTiet: `${dangKy.lop?.maLop ?? "(chưa xếp)"} -> ${lopDich.maLop}, hiệu lực ${ngayThanhChuoi(ngayHieuLuc)}${input.lyDo ? `: ${input.lyDo}` : ""}`,
  });

  if (laChuyenLop) {
    await guiThongBao(
      dangKy.hocVienId,
      "LICH_HOC_LICH_THI",
      `Chuyển lớp trong khóa ${dangKy.khoa.maKhoa}`,
      `Bạn được chuyển từ lớp ${dangKy.lop!.maLop} sang lớp ${lopDich.maLop} (${lopDich.ten}) từ ngày ${ngayHieuLuc.toLocaleDateString("vi-VN")}. ` +
        "Điểm và kết quả học tập đã có được giữ nguyên; vui lòng theo dõi thời khóa biểu của lớp mới.",
    );
  }

  return dangKySau;
}

/**
 * KH-07: chia đều tự động - xếp lần lượt học viên chính thức CHƯA có lớp (theo
 * họ tên) vào lớp đang ít học viên nhất còn chỗ. Hết chỗ thì dừng, trả về số
 * học viên chưa xếp được để cán bộ tạo thêm lớp/tăng sĩ số.
 */
export async function chiaLopTuDong(khoaId: string, nguoi: NguoiThucHien) {
  await layKhoaChoPhepChiaLop(khoaId);
  const dsLop = await danhSachLop(khoaId);
  const dsChuaXep = await prisma.dangKyHoc.findMany({
    where: { khoaId, trangThai: "CHINH_THUC", lopId: null },
    include: { hocVien: true },
    orderBy: { hocVien: { hoTen: "asc" } },
  });

  const siSo = new Map(dsLop.map((l) => [l.id, l.siSoHienTai]));
  let soDaXep = 0;
  for (const dk of dsChuaXep) {
    const lop = dsLop
      .filter((l) => l.siSoToiDa === null || siSo.get(l.id)! < l.siSoToiDa)
      .sort((a, b) => siSo.get(a.id)! - siSo.get(b.id)! || a.maLop.localeCompare(b.maLop))[0];
    if (!lop) break;
    await xepLop(dk.id, { ...nguoi, lopId: lop.id, lyDo: "Chia lớp tự động" });
    siSo.set(lop.id, siSo.get(lop.id)! + 1);
    soDaXep++;
  }

  return { soDaXep, soChuaXep: dsChuaXep.length - soDaXep };
}

export async function lichSuChuyenLopCuaKhoa(khoaId: string) {
  return prisma.lichSuChuyenLop.findMany({
    where: { dangKy: { khoaId } },
    include: { dangKy: { include: { hocVien: true } }, tuLop: true, denLop: true },
    orderBy: { createdAt: "desc" },
  });
}

/** Lịch sử xếp/chuyển lớp của mọi đăng ký trong khóa, gom theo học viên (dùng cho GD-01, KQ-02). */
export async function lichSuLopTheoHocVien(khoaId: string) {
  const dsLichSu = await prisma.lichSuChuyenLop.findMany({
    where: { dangKy: { khoaId } },
    include: { dangKy: true },
  });
  const theoHocVien = new Map<string, typeof dsLichSu>();
  for (const ls of dsLichSu) {
    theoHocVien.set(ls.dangKy.hocVienId, [...(theoHocVien.get(ls.dangKy.hocVienId) ?? []), ls]);
  }
  return theoHocVien;
}

/**
 * KH-07: học viên chính thức "thuộc" 1 buổi học - buổi chung (lopId null) là
 * cả khóa; buổi của lớp là những học viên ở lớp đó vào đúng ngày học (theo
 * lịch sử chuyển lớp), nên buổi cũ của lớp trước vẫn giữ đúng danh sách cũ.
 */
export async function hocVienThuocBuoi(buoiHoc: { khoaId: string; lopId: string | null; ngayHoc: Date }) {
  const dsChinhThuc = await prisma.dangKyHoc.findMany({
    where: { khoaId: buoiHoc.khoaId, trangThai: "CHINH_THUC" },
    include: { hocVien: true },
  });
  if (!buoiHoc.lopId) return dsChinhThuc;

  const lichSu = await lichSuLopTheoHocVien(buoiHoc.khoaId);
  return dsChinhThuc.filter(
    (dk) => lopTaiNgay(lichSu.get(dk.hocVienId) ?? [], buoiHoc.ngayHoc) === buoiHoc.lopId,
  );
}
