import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { timHoacTaoHocVien, type ThongTinHocVienInput } from "@/server/services/hv/dung-chung";
import { siSoHienTai } from "@/server/services/kh/kh-05-trang-thai-si-so";
import { khoaDaPheDuyetKetQua } from "@/server/services/kq/dung-chung";
import { ghiNhatKy } from "@/server/services/qt/qt-03-nhat-ky";
import {
  KhongTimThayKhoaError,
  KhongTimThayDangKyError,
  DaDangKyKhoaNayError,
  KhongTheXoaHocVienCoKetQuaError,
  DaNopHocPhiKhoaNayError,
  KhoaDichKhongNhanHocVienError,
  HoSoQuaDonViLienKetError,
} from "@/server/services/hv/loi-hoc-vien";

const INCLUDE_DANG_KY = { hocVien: true } as const;

export type NguoiThucHien = { nguoiThucHienId?: string | null; nguoiThucHienTen: string };
const HE_THONG: NguoiThucHien = { nguoiThucHienTen: "Hệ thống" };

/** HV-09 output "lịch sử thay đổi": mỗi thay đổi danh sách ghi 1 dòng nhật ký (QT-03) gắn theo khóa. */
export const HANH_DONG_HV09 = {
  THEM: "HV09_THEM_HOC_VIEN",
  XOA: "HV09_XOA_HOC_VIEN",
  CHUYEN_DI: "HV09_CHUYEN_KHOA_DI",
  CHUYEN_DEN: "HV09_CHUYEN_KHOA_DEN",
  THOI_HOC: "HV09_THOI_HOC",
} as const;

export const NHAN_HANH_DONG_HV09: Record<string, string> = {
  [HANH_DONG_HV09.THEM]: "Thêm vào khóa",
  [HANH_DONG_HV09.XOA]: "Xóa khỏi khóa",
  [HANH_DONG_HV09.CHUYEN_DI]: "Chuyển sang khóa khác",
  [HANH_DONG_HV09.CHUYEN_DEN]: "Chuyển đến từ khóa khác",
  [HANH_DONG_HV09.THOI_HOC]: "Thôi học",
};

export async function danhSachHocVienTheoKhoa(khoaId: string) {
  return prisma.dangKyHoc.findMany({
    where: { khoaId },
    include: INCLUDE_DANG_KY,
    orderBy: { ngayDangKy: "asc" },
  });
}

export async function lichSuThayDoiDanhSach(khoaId: string) {
  return prisma.nhatKyThaoTac.findMany({
    where: { doiTuong: "Khoa", doiTuongId: khoaId, hanhDong: { in: Object.values(HANH_DONG_HV09) } },
    orderBy: { thoiGian: "desc" },
  });
}

/**
 * HV-09: "Học viên đã có điểm/chứng chỉ không được xóa khỏi khóa" - điểm
 * học phần (KetQuaHocTap, KQ-01), kết quả toàn khóa/điểm thi (KetQuaKhoa,
 * KQ-02/KQ-06) và chứng chỉ (ChungChi) đều gắn thẳng theo khóa.
 */
async function coDiemHoacChungChiOKhoa(hocVienId: string, khoaId: string): Promise<boolean> {
  const [soKetQua, soKetQuaKhoa, soChungChi] = await Promise.all([
    prisma.ketQuaHocTap.count({ where: { hocVienId, khoaId } }),
    prisma.ketQuaKhoa.count({ where: { hocVienId, khoaId } }),
    prisma.chungChi.count({ where: { hocVienId, khoaId } }),
  ]);
  return soKetQua > 0 || soKetQuaKhoa > 0 || soChungChi > 0;
}

/**
 * Điều kiện rút 1 đăng ký khỏi khóa (xóa hoặc chuyển đi): không phải hồ sơ
 * qua đơn vị liên kết (gắn đúng 1 hợp đồng - xử lý ở DVLK); chưa có
 * điểm/chứng chỉ; chưa nộp đồng học phí nào (tiền đã thu gắn theo khóa, hoàn/
 * chuyển là việc của tài chính). Dòng học phí chưa thu được xóa kèm đăng ký.
 */
async function kiemTraRutKhoiKhoa(dangKy: { hocVienId: string; khoaId: string; hopDongLienKetId: string | null }) {
  if (dangKy.hopDongLienKetId) throw new HoSoQuaDonViLienKetError();
  if (await coDiemHoacChungChiOKhoa(dangKy.hocVienId, dangKy.khoaId)) throw new KhongTheXoaHocVienCoKetQuaError();
  const hocPhi = await prisma.hocPhi.findUnique({
    where: { hocVienId_khoaId: { hocVienId: dangKy.hocVienId, khoaId: dangKy.khoaId } },
    include: { _count: { select: { phieuThus: { where: { daHuy: false } } } } },
  });
  if (hocPhi && (Number(hocPhi.soTienDaNop) > 0 || hocPhi._count.phieuThus > 0)) throw new DaNopHocPhiKhoaNayError();
  return hocPhi;
}

/**
 * Khóa đích nhận thêm học viên (thêm thủ công hoặc chuyển đến): chưa kết
 * thúc/hủy, kết quả chưa phê duyệt (KQ-04), còn chỗ (KH-05), không phải khóa
 * Phương thức 4 (học viên liên kết phải gắn hợp đồng - đăng ký qua HV-11/12).
 */
async function kiemTraKhoaDich(khoaId: string) {
  const khoa = await prisma.khoa.findUnique({ where: { id: khoaId }, include: { chuongTrinh: true } });
  if (!khoa) throw new KhongTimThayKhoaError();
  if (khoa.trangThai === "DA_KET_THUC" || khoa.trangThai === "HUY") {
    throw new KhoaDichKhongNhanHocVienError("khóa đã kết thúc hoặc đã hủy");
  }
  if (khoa.chuongTrinh.phuongThucDangKy === "QUA_DON_VI_LIEN_KET") {
    throw new KhoaDichKhongNhanHocVienError("khóa tuyển sinh qua đơn vị liên kết - đăng ký qua đơn vị (HV-11/HV-12)");
  }
  if (await khoaDaPheDuyetKetQua(khoaId)) throw new KhoaDichKhongNhanHocVienError("kết quả khóa đã phê duyệt");
  if ((await siSoHienTai(khoaId)) >= khoa.siSoToiDa) throw new KhoaDichKhongNhanHocVienError("đã đủ sĩ số");
  return khoa;
}

const moTa = (hocVien: { hoTen: string; maHocVien: string }, lyDo?: string | null) =>
  `${hocVien.hoTen} (${hocVien.maHocVien})${lyDo ? ` - lý do: ${lyDo}` : ""}`;

function ghiLichSu(
  tx: Prisma.TransactionClient,
  nguoi: NguoiThucHien,
  hanhDong: string,
  khoaId: string,
  chiTiet: string,
) {
  return ghiNhatKy(
    {
      nguoiThucHienId: nguoi.nguoiThucHienId,
      nguoiThucHienTen: nguoi.nguoiThucHienTen,
      hanhDong,
      doiTuong: "Khoa",
      doiTuongId: khoaId,
      chiTiet,
    },
    tx,
  );
}

export type ThemHocVienVaoKhoaInput = ThongTinHocVienInput & { khoaId: string; lyDo?: string | null };

/** HV-09: cán bộ chủ động thêm 1 học viên vào khóa (khác luồng tự đăng ký công khai HV-01/03/05). */
export async function themHocVienVaoKhoa(input: ThemHocVienVaoKhoaInput, nguoi: NguoiThucHien = HE_THONG) {
  const khoa = await kiemTraKhoaDich(input.khoaId);
  const hocVien = await timHoacTaoHocVien(input);

  try {
    return await prisma.$transaction(async (tx) => {
      const dangKy = await tx.dangKyHoc.create({
        data: { hocVienId: hocVien.id, khoaId: khoa.id, lyDoThayDoi: input.lyDo ?? null },
        include: INCLUDE_DANG_KY,
      });
      await ghiLichSu(tx, nguoi, HANH_DONG_HV09.THEM, khoa.id, moTa(hocVien, input.lyDo));
      return dangKy;
    });
  } catch (error) {
    const laLoiTrungDangKy = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
    if (laLoiTrungDangKy) throw new DaDangKyKhoaNayError();
    throw error;
  }
}

export async function xoaHocVienKhoiKhoa(
  dangKyId: string,
  lyDo?: string | null,
  nguoi: NguoiThucHien = HE_THONG,
): Promise<void> {
  const dangKy = await prisma.dangKyHoc.findUnique({ where: { id: dangKyId }, include: { hocVien: true } });
  if (!dangKy) throw new KhongTimThayDangKyError();
  const hocPhi = await kiemTraRutKhoiKhoa(dangKy);

  await prisma.$transaction(async (tx) => {
    if (hocPhi) await tx.hocPhi.delete({ where: { id: hocPhi.id } });
    await tx.dangKyHoc.delete({ where: { id: dangKyId } });
    await ghiLichSu(tx, nguoi, HANH_DONG_HV09.XOA, dangKy.khoaId, moTa(dangKy.hocVien, lyDo));
  });
}

/**
 * Chuyển học viên sang khóa khác: rút khỏi khóa cũ (cùng điều kiện như xóa)
 * rồi tạo đăng ký mới ở khóa đích với trạng thái mặc định (xét duyệt lại
 * theo khóa đích), trong 1 transaction; ghi lịch sử ở cả 2 khóa.
 */
export async function chuyenHocVienSangKhoa(
  dangKyId: string,
  khoaMoiId: string,
  lyDo?: string | null,
  nguoi: NguoiThucHien = HE_THONG,
) {
  const dangKy = await prisma.dangKyHoc.findUnique({
    where: { id: dangKyId },
    include: { hocVien: true, khoa: true },
  });
  if (!dangKy) throw new KhongTimThayDangKyError();
  if (dangKy.khoaId === khoaMoiId) throw new DaDangKyKhoaNayError();

  const daDangKyKhoaMoi = await prisma.dangKyHoc.findUnique({
    where: { hocVienId_khoaId: { hocVienId: dangKy.hocVienId, khoaId: khoaMoiId } },
  });
  if (daDangKyKhoaMoi) throw new DaDangKyKhoaNayError();

  const khoaMoi = await kiemTraKhoaDich(khoaMoiId);
  const hocPhi = await kiemTraRutKhoiKhoa(dangKy);
  const hv = moTa(dangKy.hocVien, lyDo);

  return prisma.$transaction(async (tx) => {
    if (hocPhi) await tx.hocPhi.delete({ where: { id: hocPhi.id } });
    await tx.dangKyHoc.delete({ where: { id: dangKyId } });
    const dangKyMoi = await tx.dangKyHoc.create({
      data: { hocVienId: dangKy.hocVienId, khoaId: khoaMoiId, lyDoThayDoi: lyDo ?? null },
      include: INCLUDE_DANG_KY,
    });
    await ghiLichSu(tx, nguoi, HANH_DONG_HV09.CHUYEN_DI, dangKy.khoaId, `${hv} → khóa ${khoaMoi.maKhoa}`);
    await ghiLichSu(tx, nguoi, HANH_DONG_HV09.CHUYEN_DEN, khoaMoiId, `${hv} ← từ khóa ${dangKy.khoa.maKhoa}`);
    return dangKyMoi;
  });
}

/** "Ghi nhận thôi học" khác "xóa" - vẫn giữ lại hồ sơ, điểm, học phí; chỉ đổi trạng thái. */
export async function ghiNhanThoiHoc(dangKyId: string, lyDo?: string | null, nguoi: NguoiThucHien = HE_THONG) {
  const dangKy = await prisma.dangKyHoc.findUnique({ where: { id: dangKyId }, include: { hocVien: true } });
  if (!dangKy) throw new KhongTimThayDangKyError();

  return prisma.$transaction(async (tx) => {
    const sau = await tx.dangKyHoc.update({
      where: { id: dangKyId },
      data: { trangThai: "THOI_HOC", lyDoThayDoi: lyDo ?? null },
      include: INCLUDE_DANG_KY,
    });
    await ghiLichSu(tx, nguoi, HANH_DONG_HV09.THOI_HOC, dangKy.khoaId, moTa(dangKy.hocVien, lyDo));
    return sau;
  });
}
