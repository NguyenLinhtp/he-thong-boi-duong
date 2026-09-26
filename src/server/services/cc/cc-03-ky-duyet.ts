import { prisma } from "@/lib/db/prisma";
import { ghiNhatKy } from "@/server/services/qt/qt-03-nhat-ky";
import { guiThongBao } from "@/server/services/hv/hv-10-thong-bao";
import { sinhSoHieu } from "@/server/services/cc/cc-02-so-hieu";
import {
  KhongTimThayKhoaError,
  KhongTimThayLopError,
  SaiTrangThaiChungChiError,
  ThieuThongTinError,
} from "@/server/services/cc/loi-chung-chi";
import { nhanVanBang } from "@/server/services/cc/van-bang";

export type KyDuyetInput = {
  soQuyetDinh: string;
  ngayKy: Date | string;
  nguoiKy: string;
  nguoiThucHienId?: string | null;
  nguoiThucHienTen: string;
  // phạm vi quyết định: 1 lớp của khóa (KH-07); bỏ trống = cả khóa
  lopId?: string | null;
  // bỏ trống = mọi văn bằng Đề nghị/Chờ ký duyệt trong phạm vi
  chungChiIds?: string[];
};

/** Văn bằng chờ quyết định: đã đề nghị (chưa có số - sẽ cấp số khi nhập QĐ) hoặc đã có số, chờ ký. */
const TRANG_THAI_CHO_QUYET_DINH = ["DE_NGHI", "CHO_KY_DUYET"] as const;

/** Học viên thuộc lớp (DangKyHoc.lopId); null = không lọc theo lớp. Lớp phải thuộc khóa. */
async function hocVienTrongPhamVi(khoaId: string, lopId?: string | null) {
  if (!lopId) return null;
  const lop = await prisma.lopHoc.findFirst({ where: { id: lopId, khoaId } });
  if (!lop) throw new KhongTimThayLopError();
  const dsDangKy = await prisma.dangKyHoc.findMany({ where: { khoaId, lopId }, select: { hocVienId: true } });
  return dsDangKy.map((dk) => dk.hocVienId);
}

/**
 * CC-03 (Ban giám hiệu/Cán bộ quản lý đào tạo) - bổ sung 26/09/2026: sau khi
 * ban hành quyết định cấp văn bằng (căn cứ danh sách hoàn thành xuất ở
 * CC-01), nhập số quyết định/ngày ký/người ký THEO KHÓA hoặc THEO LỚP. Lưu 1
 * bản ghi QuyetDinhCapVanBang, gắn các văn bằng trong phạm vi -> Đã ký duyệt.
 *  - Văn bằng còn Đề nghị được cấp số hiệu trước (CC-02, kiểm tra lại điều
 *    kiện); người không còn đủ điều kiện bị bỏ qua, trả về trong boQua.
 *  - chungChiIds (tùy chọn) phải cùng thuộc khóa/lớp và chờ quyết định, nếu
 *    không thì không ghi gì cả.
 * "Chỉ chứng chỉ đã ký duyệt mới được trả cho học viên" - thực thi ở CC-04.
 */
export async function kyDuyetChungChi(khoaId: string, input: KyDuyetInput) {
  if (!input.soQuyetDinh?.trim()) throw new ThieuThongTinError("số quyết định");
  if (!input.nguoiKy?.trim()) throw new ThieuThongTinError("người ký");
  const ngayKy = new Date(input.ngayKy);
  if (Number.isNaN(ngayKy.getTime())) throw new ThieuThongTinError("ngày ký");
  const soQuyetDinh = input.soQuyetDinh.trim();
  const nguoiKy = input.nguoiKy.trim();
  const lopId = input.lopId || null;

  const khoa = await prisma.khoa.findUnique({ where: { id: khoaId }, include: { chuongTrinh: true } });
  if (!khoa) throw new KhongTimThayKhoaError();
  const hocVienLop = await hocVienTrongPhamVi(khoaId, lopId);

  const dsUngVien = await prisma.chungChi.findMany({
    where: {
      khoaId,
      trangThai: { in: [...TRANG_THAI_CHO_QUYET_DINH] },
      ...(hocVienLop ? { hocVienId: { in: hocVienLop } } : {}),
      ...(input.chungChiIds ? { id: { in: input.chungChiIds } } : {}),
    },
  });
  if (dsUngVien.length === 0 || (input.chungChiIds && dsUngVien.length !== input.chungChiIds.length)) {
    throw new SaiTrangThaiChungChiError(
      `đề nghị hoặc chờ ký duyệt, thuộc ${lopId ? "lớp" : "khóa"} này - không có văn bằng nào chờ quyết định`,
    );
  }

  const nguoi = { nguoiThucHienId: input.nguoiThucHienId, nguoiThucHienTen: input.nguoiThucHienTen };
  const deNghiIds = dsUngVien.filter((cc) => cc.trangThai === "DE_NGHI").map((cc) => cc.id);
  const { daCapSo, boQua } = deNghiIds.length
    ? await sinhSoHieu(khoaId, nguoi, deNghiIds)
    : { daCapSo: [], boQua: [] };
  const idsKy = [
    ...dsUngVien.filter((cc) => cc.trangThai === "CHO_KY_DUYET").map((cc) => cc.id),
    ...daCapSo.map((c) => c.chungChiId),
  ];
  if (idsKy.length === 0) {
    throw new SaiTrangThaiChungChiError(
      `đủ điều kiện cấp - mọi văn bằng trong phạm vi đều không còn đủ điều kiện (${boQua.map((b) => `${b.hoTen}: ${b.lyDo}`).join("; ")})`,
    );
  }

  // cả lô hoặc không: văn bằng bị đổi trạng thái đồng thời -> rollback cả quyết định
  const quyetDinh = await prisma.$transaction(async (tx) => {
    const qd = await tx.quyetDinhCapVanBang.create({
      data: {
        soQuyetDinh,
        ngayKy,
        nguoiKy,
        loaiVanBang: khoa.chuongTrinh.loaiVanBang,
        khoaId,
        lopId,
        nguoiNhap: input.nguoiThucHienTen,
      },
      include: { lop: true },
    });
    const { count } = await tx.chungChi.updateMany({
      where: { id: { in: idsKy }, trangThai: "CHO_KY_DUYET" },
      data: { trangThai: "DA_KY_DUYET", soQuyetDinh, ngayCap: ngayKy, nguoiKy, quyetDinhId: qd.id },
    });
    if (count !== idsKy.length) throw new SaiTrangThaiChungChiError("chờ ký duyệt (dữ liệu vừa thay đổi, thử lại)");
    return qd;
  });

  const dsChungChi = await prisma.chungChi.findMany({
    where: { id: { in: idsKy } },
    include: { hocVien: true },
    orderBy: { soHieu: "asc" },
  });

  await ghiNhatKy({
    nguoiThucHienId: input.nguoiThucHienId,
    nguoiThucHienTen: input.nguoiThucHienTen,
    hanhDong: "KY_DUYET_CHUNG_CHI",
    doiTuong: "QuyetDinhCapVanBang",
    doiTuongId: quyetDinh.id,
    chiTiet:
      `QĐ ${soQuyetDinh}, ${nguoiKy} ký ngày ${ngayKy.toLocaleDateString("vi-VN")}, ` +
      `khóa ${khoa.maKhoa}${quyetDinh.lop ? ` lớp ${quyetDinh.lop.maLop}` : ""}: ` +
      dsChungChi.map((cc) => cc.soHieu).join(", "),
  });

  // HV-10 sự kiện "cấp chứng chỉ": báo đã ký duyệt + kênh nhận (CC-04)
  const dsDangKy = await prisma.dangKyHoc.findMany({
    where: { khoaId, hocVienId: { in: dsChungChi.map((cc) => cc.hocVienId) } },
    include: { hopDongLienKet: { include: { donViLienKet: true } } },
  });
  const donViLienKetTheoHocVien = new Map(
    dsDangKy.map((dk) => [dk.hocVienId, dk.hopDongLienKet?.donViLienKet.ten ?? null]),
  );
  for (const cc of dsChungChi) {
    const donViLienKet = donViLienKetTheoHocVien.get(cc.hocVienId);
    const nhan = nhanVanBang(cc.loaiVanBang);
    const Nhan = nhan.charAt(0).toUpperCase() + nhan.slice(1);
    await guiThongBao(
      cc.hocVienId,
      "CAP_CHUNG_CHI",
      `${Nhan} khóa ${khoa.maKhoa} đã được ký duyệt`,
      `${Nhan} số hiệu ${cc.soHieu} của bạn đã được ký duyệt theo quyết định ${soQuyetDinh}. ` +
        (donViLienKet
          ? `${Nhan} sẽ được bàn giao về ${donViLienKet} để phát lại cho bạn.`
          : `Vui lòng liên hệ Phòng/Trung tâm bồi dưỡng để nhận ${nhan}.`),
    );
  }

  return { quyetDinh, dsChungChi, boQua };
}

/** Các quyết định cấp văn bằng đã nhập của khóa (mới nhất trước), kèm số văn bằng. */
export async function danhSachQuyetDinhCuaKhoa(khoaId: string) {
  return prisma.quyetDinhCapVanBang.findMany({
    where: { khoaId },
    include: { lop: true, _count: { select: { chungChis: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Số văn bằng chờ quyết định theo phạm vi để hiển thị lựa chọn: tổng cả khóa
 * và theo từng lớp (học viên chưa xếp lớp chỉ tính vào cả khóa).
 */
export async function soVanBangChoQuyetDinh(khoaId: string) {
  const dsChungChi = await prisma.chungChi.findMany({
    where: { khoaId, trangThai: { in: [...TRANG_THAI_CHO_QUYET_DINH] } },
    select: { hocVienId: true },
  });
  const dsDangKy = await prisma.dangKyHoc.findMany({
    where: { khoaId, hocVienId: { in: dsChungChi.map((cc) => cc.hocVienId) } },
    select: { lopId: true },
  });
  const theoLop = new Map<string, number>();
  for (const dk of dsDangKy) {
    if (dk.lopId) theoLop.set(dk.lopId, (theoLop.get(dk.lopId) ?? 0) + 1);
  }
  return { caKhoa: dsChungChi.length, theoLop };
}
