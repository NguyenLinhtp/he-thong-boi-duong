import { prisma } from "@/lib/db/prisma";
import { ghiNhatKy } from "@/server/services/qt/qt-03-nhat-ky";
import { guiThongBao } from "@/server/services/hv/hv-10-thong-bao";
import { SaiTrangThaiChungChiError, ThieuThongTinError } from "@/server/services/cc/loi-chung-chi";
import { nhanVanBang } from "@/server/services/cc/van-bang";

export type KyDuyetInput = {
  soQuyetDinh: string;
  ngayKy: Date | string;
  nguoiKy: string;
  nguoiThucHienId?: string | null;
  nguoiThucHienTen: string;
  // bỏ trống = mọi chứng chỉ đang Chờ ký duyệt của khóa
  chungChiIds?: string[];
};

/**
 * CC-03 (Ban giám hiệu/Cán bộ quản lý đào tạo): ghi nhận ký duyệt, đóng dấu
 * (số quyết định, ngày ký, người ký) cho chứng chỉ đã có số hiệu (Chờ ký
 * duyệt) -> Đã ký duyệt. Cả lô hoặc không: có chứng chỉ không ở Chờ ký duyệt
 * (hoặc không thuộc khóa) thì không ký gì cả. "Chỉ chứng chỉ đã ký duyệt mới
 * được trả cho học viên" - ràng buộc thực thi ở CC-04.
 */
export async function kyDuyetChungChi(khoaId: string, input: KyDuyetInput) {
  if (!input.soQuyetDinh?.trim()) throw new ThieuThongTinError("số quyết định");
  if (!input.nguoiKy?.trim()) throw new ThieuThongTinError("người ký");
  const ngayKy = new Date(input.ngayKy);
  if (Number.isNaN(ngayKy.getTime())) throw new ThieuThongTinError("ngày ký");

  const dsChungChi = await prisma.chungChi.findMany({
    where: input.chungChiIds ? { id: { in: input.chungChiIds } } : { khoaId, trangThai: "CHO_KY_DUYET" },
    include: { hocVien: true, khoa: true },
  });
  if (
    dsChungChi.length === 0 ||
    (input.chungChiIds && dsChungChi.length !== input.chungChiIds.length) ||
    dsChungChi.some((cc) => cc.khoaId !== khoaId || cc.trangThai !== "CHO_KY_DUYET")
  ) {
    throw new SaiTrangThaiChungChiError("đã có số hiệu, chờ ký duyệt, thuộc khóa này");
  }

  await prisma.chungChi.updateMany({
    where: { id: { in: dsChungChi.map((cc) => cc.id) }, trangThai: "CHO_KY_DUYET" },
    data: {
      trangThai: "DA_KY_DUYET",
      soQuyetDinh: input.soQuyetDinh.trim(),
      ngayCap: ngayKy,
      nguoiKy: input.nguoiKy.trim(),
    },
  });

  await ghiNhatKy({
    nguoiThucHienId: input.nguoiThucHienId,
    nguoiThucHienTen: input.nguoiThucHienTen,
    hanhDong: "KY_DUYET_CHUNG_CHI",
    doiTuong: "Khoa",
    doiTuongId: khoaId,
    chiTiet: `QĐ ${input.soQuyetDinh.trim()}, ${input.nguoiKy.trim()} ký ngày ${ngayKy.toLocaleDateString("vi-VN")}: ${dsChungChi.map((cc) => cc.soHieu).join(", ")}`,
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
      `${Nhan} khóa ${cc.khoa.maKhoa} đã được ký duyệt`,
      `${Nhan} số hiệu ${cc.soHieu} của bạn đã được ký duyệt theo quyết định ${input.soQuyetDinh.trim()}. ` +
        (donViLienKet
          ? `${Nhan} sẽ được bàn giao về ${donViLienKet} để phát lại cho bạn.`
          : `Vui lòng liên hệ Phòng/Trung tâm bồi dưỡng để nhận ${nhan}.`),
    );
  }

  return prisma.chungChi.findMany({
    where: { id: { in: dsChungChi.map((cc) => cc.id) } },
    include: { hocVien: true },
  });
}
