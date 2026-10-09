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
  LoiLopHoc,
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
  if (khoa.chuongTrinh.phuongThucDangKys.includes("CHI_DU_THI")) throw new KhoaChiDuThiKhongChiaLopError();
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
    include: { _count: { select: { dangKys: true, buoiHocs: true, phanCongs: true, lichSuDens: true, lichSuTus: true, taiLieus: true } } },
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

/** Bỏ dấu tiếng Việt + chữ thường + gộp khoảng trắng - so khớp tên/đơn vị không phụ thuộc cách gõ. */
export function chuanHoaChuoi(chuoi: string | null | undefined): string {
  return (chuoi ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export type BoLocHocVienLop = {
  // tìm theo họ tên / mã học viên / CCCD, không phân biệt dấu và hoa thường
  tuKhoa?: string | null;
  donViCongTac?: string | null;
  donViLienKetId?: string | null;
  // id lớp, hoặc "chua-xep" = chưa có lớp
  lopId?: string | null;
};

/**
 * Học viên chính thức của khóa kèm lớp hiện tại (null = chưa xếp) và đơn vị
 * liên kết (qua hợp đồng, Phương thức 4) - lọc để chia/chuyển lớp thủ công.
 * Lọc trong bộ nhớ (1 khóa chỉ vài trăm học viên) để tìm được tên không dấu.
 */
export async function hocVienTheoLop(khoaId: string, boLoc: BoLocHocVienLop = {}) {
  const ds = await prisma.dangKyHoc.findMany({
    where: { khoaId, trangThai: { in: [...TRANG_THAI_TRONG_LOP] } },
    include: { hocVien: true, lop: true, hopDongLienKet: { include: { donViLienKet: true } } },
    orderBy: { hocVien: { hoTen: "asc" } },
  });

  const tuKhoa = chuanHoaChuoi(boLoc.tuKhoa);
  const donViCongTac = chuanHoaChuoi(boLoc.donViCongTac);
  return ds.filter((dk) => {
    const khopTuKhoa =
      !tuKhoa ||
      [dk.hocVien.hoTen, dk.hocVien.maHocVien, dk.hocVien.soCCCD].some((truong) =>
        chuanHoaChuoi(truong).includes(tuKhoa),
      );
    const khopDonViCongTac = !donViCongTac || chuanHoaChuoi(dk.hocVien.donViCongTac) === donViCongTac;
    const khopDonViLienKet =
      !boLoc.donViLienKetId || dk.hopDongLienKet?.donViLienKetId === boLoc.donViLienKetId;
    const khopLop =
      !boLoc.lopId || (boLoc.lopId === "chua-xep" ? dk.lopId === null : dk.lopId === boLoc.lopId);
    return khopTuKhoa && khopDonViCongTac && khopDonViLienKet && khopLop;
  });
}

/** Giá trị cho các ô lọc: đơn vị công tác (gộp các cách viết khác dấu/hoa thường) và đơn vị liên kết trong khóa. */
export async function tuyChonBoLocLop(khoaId: string) {
  const ds = await hocVienTheoLop(khoaId);
  const donViCongTac = new Map<string, { ten: string; soHocVien: number }>();
  for (const dk of ds) {
    const khoa = chuanHoaChuoi(dk.hocVien.donViCongTac);
    if (!khoa) continue;
    const daCo = donViCongTac.get(khoa);
    donViCongTac.set(khoa, {
      ten: daCo?.ten ?? dk.hocVien.donViCongTac!.trim(),
      soHocVien: (daCo?.soHocVien ?? 0) + 1,
    });
  }
  const donViLienKet = new Map(
    ds.flatMap((dk) =>
      dk.hopDongLienKet ? [[dk.hopDongLienKet.donViLienKetId, dk.hopDongLienKet.donViLienKet.ten] as const] : [],
    ),
  );
  return {
    donViCongTac: [...donViCongTac.values()].sort((a, b) => a.ten.localeCompare(b.ten, "vi")),
    donViLienKet: [...donViLienKet.entries()]
      .map(([id, ten]) => ({ id, ten }))
      .sort((a, b) => a.ten.localeCompare(b.ten, "vi")),
  };
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

type LopConCho = { id: string; maLop: string; siSoHienTai: number; siSoToiDa: number | null };
type HocVienCanXep = { dangKyId: string; hoTen: string; donViCongTac: string | null };

/**
 * KH-07 chia tự động - ƯU TIÊN ĐƠN VỊ CÔNG TÁC TRƯỚC, cân bằng sĩ số sau:
 *  1. Gom nhóm theo đơn vị công tác (so khớp không dấu/hoa thường), xét nhóm
 *     đông trước - cách xếp "nhóm lớn trước vào lớp ít người nhất" tự cân bằng.
 *  2. Nhóm KHÔNG lớn hơn sĩ số bình quân 1 lớp (làm tròn lên) luôn được giữ
 *     nguyên: đặt cả nhóm vào lớp ít học viên nhất còn đủ chỗ theo sĩ số tối
 *     đa thật (muốn khống chế chênh lệch sĩ số thì đặt sĩ số tối đa cho lớp).
 *  3. Nhóm lớn hơn sĩ số bình quân (không thể nằm gọn trong 1 lớp cỡ trung
 *     bình), hoặc không lớp nào còn đủ chỗ cho cả nhóm -> tách, phần lớn nhất
 *     vào lớp còn nhiều chỗ nhất, không vượt sĩ số bình quân.
 *  4. Học viên không khai báo đơn vị xếp sau cùng, từng người vào lớp ít nhất
 *     - lấp chỗ trống để cân bằng lại sĩ số.
 *  5. Còn người chưa xếp vì chạm sĩ số bình quân -> xếp tiếp theo sĩ số tối đa thật.
 * Hàm thuần (không truy cập DB) để kiểm thử trực tiếp.
 */
export function phanBoUuTienDonViCongTac(dsHocVien: HocVienCanXep[], dsLop: LopConCho[]) {
  const siSo = new Map(dsLop.map((l) => [l.id, l.siSoHienTai]));
  const tongSauChia = dsLop.reduce((t, l) => t + l.siSoHienTai, 0) + dsHocVien.length;
  const siSoBinhQuan = dsLop.length === 0 ? 0 : Math.ceil(tongSauChia / dsLop.length);
  // số chỗ còn lại theo sĩ số tối đa thật, hoặc thêm giới hạn "không vượt sĩ số bình quân"
  const conCho = (lop: LopConCho, gioiHanBinhQuan: boolean) =>
    Math.min(lop.siSoToiDa ?? Infinity, gioiHanBinhQuan ? siSoBinhQuan : Infinity) - siSo.get(lop.id)!;
  const itNguoiNhat = (a: LopConCho, b: LopConCho) =>
    siSo.get(a.id)! - siSo.get(b.id)! || a.maLop.localeCompare(b.maLop);

  const ketQua: { dangKyId: string; lopId: string }[] = [];
  const xep = (hv: HocVienCanXep, lop: LopConCho) => {
    ketQua.push({ dangKyId: hv.dangKyId, lopId: lop.id });
    siSo.set(lop.id, siSo.get(lop.id)! + 1);
  };

  const theoTen = (a: HocVienCanXep, b: HocVienCanXep) => a.hoTen.localeCompare(b.hoTen, "vi");
  const nhomTheoDonVi = new Map<string, HocVienCanXep[]>();
  const khongDonVi: HocVienCanXep[] = [];
  for (const hv of dsHocVien) {
    const khoa = chuanHoaChuoi(hv.donViCongTac);
    if (!khoa) khongDonVi.push(hv);
    else nhomTheoDonVi.set(khoa, [...(nhomTheoDonVi.get(khoa) ?? []), hv]);
  }
  const dsNhom = [...nhomTheoDonVi.entries()]
    .map(([khoa, thanhVien]) => ({ khoa, thanhVien: thanhVien.sort(theoTen) }))
    .sort((a, b) => b.thanhVien.length - a.thanhVien.length || a.khoa.localeCompare(b.khoa));

  const conLai: HocVienCanXep[] = [];
  let soNhomBiTach = 0;
  for (const { thanhVien } of dsNhom) {
    const vuaNguyenNhom =
      thanhVien.length <= siSoBinhQuan
        ? dsLop.filter((l) => conCho(l, false) >= thanhVien.length).sort(itNguoiNhat)[0]
        : undefined;
    if (vuaNguyenNhom) {
      thanhVien.forEach((hv) => xep(hv, vuaNguyenNhom));
      continue;
    }

    soNhomBiTach++;
    const chuaXep = [...thanhVien];
    while (chuaXep.length > 0) {
      const lop = dsLop
        .filter((l) => conCho(l, true) > 0)
        .sort((a, b) => conCho(b, true) - conCho(a, true) || itNguoiNhat(a, b))[0];
      if (!lop) break;
      chuaXep.splice(0, conCho(lop, true)).forEach((hv) => xep(hv, lop));
    }
    conLai.push(...chuaXep);
  }

  for (const hv of [...khongDonVi.sort(theoTen), ...conLai]) {
    const lop =
      dsLop.filter((l) => conCho(l, true) > 0).sort(itNguoiNhat)[0] ??
      dsLop.filter((l) => conCho(l, false) > 0).sort(itNguoiNhat)[0];
    if (lop) xep(hv, lop);
  }

  return { ketQua, soNhomDonVi: dsNhom.length, soNhomBiTach };
}

/**
 * KH-07: chia tự động học viên chính thức CHƯA có lớp, ưu tiên giữ học viên
 * cùng đơn vị công tác chung lớp (phanBoUuTienDonViCongTac). Hết chỗ thì trả
 * về số học viên chưa xếp được để cán bộ tạo thêm lớp/tăng sĩ số.
 */
export async function chiaLopTuDong(khoaId: string, nguoi: NguoiThucHien) {
  await layKhoaChoPhepChiaLop(khoaId);
  const dsLop = await danhSachLop(khoaId);
  const dsChuaXep = await prisma.dangKyHoc.findMany({
    where: { khoaId, trangThai: "CHINH_THUC", lopId: null },
    include: { hocVien: true },
  });

  const { ketQua, soNhomDonVi, soNhomBiTach } = phanBoUuTienDonViCongTac(
    dsChuaXep.map((dk) => ({
      dangKyId: dk.id,
      hoTen: dk.hocVien.hoTen,
      donViCongTac: dk.hocVien.donViCongTac,
    })),
    dsLop,
  );
  for (const { dangKyId, lopId } of ketQua) {
    await xepLop(dangKyId, { ...nguoi, lopId, lyDo: "Chia lớp tự động (ưu tiên đơn vị công tác)" });
  }

  return { soDaXep: ketQua.length, soChuaXep: dsChuaXep.length - ketQua.length, soNhomDonVi, soNhomBiTach };
}

export type KetQuaXepNhieu = { dangKyId: string; hoTen: string; loi: string | null };

/**
 * KH-07 chia thủ công: xếp/chuyển nhiều học viên (đã chọn sau khi lọc theo
 * ĐVCT/ĐVLK/tên) vào cùng 1 lớp. Kiểm tra sĩ số cho cả lô TRƯỚC khi đổi gì;
 * sau đó xếp từng người - lỗi riêng từng người (vd chưa chính thức) được trả
 * về trong kết quả, không làm hỏng cả lô.
 */
export async function xepLopNhieu(khoaId: string, dangKyIds: string[], input: XepLopInput) {
  const lopDich = await prisma.lopHoc.findUnique({ where: { id: input.lopId } });
  if (!lopDich) throw new KhongTimThayLopError();
  if (lopDich.khoaId !== khoaId) throw new LopKhongThuocKhoaError();
  await layKhoaChoPhepChiaLop(khoaId);

  // học viên đã ở sẵn lớp đích thì bỏ qua (SQL "<>" loại cả NULL nên ghi rõ nhánh chưa xếp)
  const dsCanXep = await prisma.dangKyHoc.findMany({
    where: {
      id: { in: dangKyIds },
      khoaId,
      OR: [{ lopId: null }, { lopId: { not: lopDich.id } }],
    },
    include: { hocVien: true },
    orderBy: { hocVien: { hoTen: "asc" } },
  });
  if (lopDich.siSoToiDa !== null && (await siSoLop(lopDich.id)) + dsCanXep.length > lopDich.siSoToiDa) {
    throw new LopDaDuSiSoError();
  }

  const ketQua: KetQuaXepNhieu[] = [];
  for (const dk of dsCanXep) {
    try {
      await xepLop(dk.id, input);
      ketQua.push({ dangKyId: dk.id, hoTen: dk.hocVien.hoTen, loi: null });
    } catch (error) {
      if (!(error instanceof LoiLopHoc)) throw error;
      ketQua.push({ dangKyId: dk.id, hoTen: dk.hocVien.hoTen, loi: error.message });
    }
  }
  return ketQua;
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
