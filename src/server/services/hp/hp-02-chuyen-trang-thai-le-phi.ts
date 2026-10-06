import { prisma } from "@/lib/db/prisma";
import { xacNhanThanhToan } from "@/server/services/hp/hp-02-thanh-toan";
import { ghiNhanThanhPhan, huyGhiNhanThanhPhan } from "@/server/services/hp/hp-01-thanh-phan-le-phi";
import { khoaDaPheDuyetKetQua } from "@/server/services/kq/dung-chung";
import { ghiThaoTac, type NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";
import {
  ChuyenTrangThaiLePhiKhongHopLeError,
  HocPhiQuaDonViLienKetError,
  KhongTimThayHocPhiError,
} from "@/server/services/hp/loi-hoc-phi";

/**
 * (bổ sung 06/10/2026 - HP-02) Chuyển trạng thái lệ phí ngay trên từng dòng
 * của bảng đối soát:
 * - Chưa đóng/Nộp thiếu -> Đã đóng: ghi nhận số còn thiếu (lập phiếu thu HP-04)
 *   như khi đối soát Excel.
 * - Đã đóng/Nộp thiếu -> Chưa đóng: hủy ghi nhận - bắt buộc lý do; phiếu thu
 *   của khoản chuyển Đã hủy (giữ số, không xóa, không cấp lại số), số đã nộp
 *   về 0, ghi nhật ký; khóa dự thi: hồ sơ Chính thức trả về Hợp lệ (danh sách
 *   chính thức = thí sinh đã xác nhận lệ phí). Không chuyển ngược khoản Miễn giảm/qua đơn vị liên
 *   kết, khi kết quả khóa đã phê duyệt (KQ-04) hoặc thí sinh đã có văn bằng.
 * - (bổ sung 06/10/2026) khóa có thành phần lệ phí: truyền hocPhiThanhPhanId để xác nhận/hủy
 *   riêng 1 thành phần (phiếu thu của phần đó); hủy thành phần bắt buộc của thí sinh Chính
 *   thức thì hồ sơ trả về Hợp lệ, hủy thành phần tùy chọn không ảnh hưởng danh sách chính thức.
 */
export type TrangThaiDongPhi = "DA_DONG" | "CHUA_DONG";

const QUA_DVLK = ["CHO_THANH_LY_HOP_DONG", "DA_HOAN_TAT"];
export const HINH_THUC_TREN_DANH_SACH = "Chuyển khoản (xác nhận trên danh sách đối soát)";

export async function chuyenTrangThaiLePhi(
  hocPhiId: string,
  trangThai: TrangThaiDongPhi,
  lyDo: string | null | undefined,
  nguoi: NguoiThucHien,
  hocPhiThanhPhanId?: string | null,
) {
  const hocPhi = await prisma.hocPhi.findUnique({ where: { id: hocPhiId }, include: { thanhPhans: { include: { thanhPhan: true } } } });
  if (!hocPhi) throw new KhongTimThayHocPhiError();
  if (QUA_DVLK.includes(hocPhi.trangThai)) throw new HocPhiQuaDonViLienKetError();
  const dong = hocPhiThanhPhanId ? hocPhi.thanhPhans.find((d) => d.id === hocPhiThanhPhanId) : undefined;
  if (hocPhiThanhPhanId && !dong) throw new ChuyenTrangThaiLePhiKhongHopLeError("thành phần không thuộc khoản lệ phí của thí sinh");

  if (trangThai === "DA_DONG" && dong) {
    if (dong.trangThai === "DA_NOP_DU") throw new ChuyenTrangThaiLePhiKhongHopLeError(`"${dong.thanhPhan.ten}" đã được ghi nhận đóng đủ`);
    if (dong.trangThai === "MIEN_GIAM") throw new ChuyenTrangThaiLePhiKhongHopLeError(`"${dong.thanhPhan.ten}" thuộc diện miễn giảm`);
    return prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`, `HP02:${hocPhiId}`);
      return ghiNhanThanhPhan(tx, dong.id, null, HINH_THUC_TREN_DANH_SACH, nguoi);
    });
  }

  if (trangThai === "DA_DONG") {
    if (hocPhi.trangThai === "DA_NOP_DU") throw new ChuyenTrangThaiLePhiKhongHopLeError("thí sinh đã được ghi nhận đóng đủ lệ phí");
    if (hocPhi.trangThai === "MIEN_GIAM") throw new ChuyenTrangThaiLePhiKhongHopLeError("thí sinh thuộc diện miễn giảm, không phải đóng");
    const soTien = Number(hocPhi.soTienPhaiNop) - Number(hocPhi.soTienDaNop);
    if (soTien <= 0) throw new ChuyenTrangThaiLePhiKhongHopLeError("khoản lệ phí không còn số phải thu");
    return xacNhanThanhToan(hocPhiId, {
      soTien,
      hinhThucNop: HINH_THUC_TREN_DANH_SACH,
      nguoiXacNhanId: nguoi.nguoiThucHienId,
      nguoiXacNhanTen: nguoi.nguoiThucHienTen,
    });
  }

  const lyDoGon = (lyDo ?? "").trim();
  if (!lyDoGon) throw new ChuyenTrangThaiLePhiKhongHopLeError("cần nhập lý do hủy ghi nhận đã đóng");
  const xet = dong ?? hocPhi;
  if (xet.trangThai === "MIEN_GIAM") throw new ChuyenTrangThaiLePhiKhongHopLeError("khoản miễn giảm không chuyển về Chưa đóng được");
  if (xet.trangThai === "CHUA_NOP" && Number(xet.soTienDaNop) === 0) {
    throw new ChuyenTrangThaiLePhiKhongHopLeError(dong ? `"${dong.thanhPhan.ten}" đang ở trạng thái Chưa đóng` : "thí sinh đang ở trạng thái Chưa đóng");
  }
  if (await khoaDaPheDuyetKetQua(hocPhi.khoaId)) {
    throw new ChuyenTrangThaiLePhiKhongHopLeError("kết quả khóa đã được phê duyệt (KQ-04)");
  }
  const soVanBang = await prisma.chungChi.count({
    where: { hocVienId: hocPhi.hocVienId, khoaId: hocPhi.khoaId, trangThai: { not: "DA_HUY" } },
  });
  if (soVanBang > 0) throw new ChuyenTrangThaiLePhiKhongHopLeError("thí sinh đã có văn bằng của khóa");
  // khóa dự thi: danh sách chính thức = thí sinh đã xác nhận lệ phí (HV-07) -
  // hủy ghi nhận thì hồ sơ Chính thức trả về Hợp lệ
  const dangKy = await prisma.dangKyHoc.findFirst({
    where: { khoaId: hocPhi.khoaId, hocVienId: hocPhi.hocVienId, khoa: { chuongTrinh: { phuongThucDangKy: "CHI_DU_THI" } } },
  });
  if (dangKy?.trangThai === "HOAN_THANH") throw new ChuyenTrangThaiLePhiKhongHopLeError("thí sinh đã hoàn thành khóa");
  // thành phần tùy chọn (vd. ôn thi) không quyết định danh sách chính thức dự thi
  const traVeHopLe = dangKy?.trangThai === "CHINH_THUC" && (!dong || dong.thanhPhan.batBuoc);

  return prisma.$transaction(async (tx) => {
    // cùng khóa tư vấn với HP-02 để không chạy song song với 1 lần ghi nhận
    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`, `HP02:${hocPhiId}`);
    if (hocPhi.thanhPhans.length > 0) {
      // hủy 1 thành phần, hoặc mọi thành phần đã có tiền
      const dsHuy = dong ? [dong] : hocPhi.thanhPhans.filter((d) => Number(d.soTienDaNop) > 0 || d.trangThai === "DA_NOP_DU");
      const kq = [];
      for (const d of dsHuy) kq.push(await huyGhiNhanThanhPhan(tx, d.id, lyDoGon, nguoi));
      if (traVeHopLe) await tx.dangKyHoc.update({ where: { id: dangKy.id }, data: { trangThai: "HOP_LE" } });
      const phieuDaHuy = kq.flatMap((k) => k.phieuDaHuy);
      await ghiThaoTac(
        nguoi,
        "HUY_GHI_NHAN_THANH_TOAN",
        "HocPhi",
        hocPhiId,
        `Hủy ghi nhận ${kq.map((k) => `${k.thanhPhan.ten} ${k.tongHuy.toLocaleString("vi-VN")}đ`).join(", ")}; phiếu thu hủy: ${
          phieuDaHuy.join(", ") || "không có"
        }${traVeHopLe ? "; hồ sơ Chính thức -> Hợp lệ" : ""}. Lý do: ${lyDoGon}`,
        tx,
      );
      const hocPhiSau = await tx.hocPhi.findUniqueOrThrow({ where: { id: hocPhiId } });
      return { hocPhi: hocPhiSau, phieuDaHuy, traVeHopLe };
    }
    const dsPhieu = await tx.phieuThu.findMany({ where: { hocPhiId, daHuy: false }, orderBy: { soPhieu: "asc" } });
    await tx.phieuThu.updateMany({
      where: { id: { in: dsPhieu.map((p) => p.id) } },
      data: { daHuy: true, lyDoHuy: lyDoGon, huyLuc: new Date(), nguoiHuyTen: nguoi.nguoiThucHienTen },
    });
    const hocPhiSau = await tx.hocPhi.update({
      where: { id: hocPhiId },
      data: { soTienDaNop: 0, trangThai: "CHUA_NOP", ngayNop: null, hinhThucNop: null, nguoiXacNhanId: null },
    });
    if (traVeHopLe) {
      await tx.dangKyHoc.update({ where: { id: dangKy.id }, data: { trangThai: "HOP_LE" } });
    }
    const tong = dsPhieu.reduce((t, p) => t + Number(p.soTien), 0);
    await ghiThaoTac(
      nguoi,
      "HUY_GHI_NHAN_THANH_TOAN",
      "HocPhi",
      hocPhiId,
      `Hủy ghi nhận ${Number(hocPhi.soTienDaNop).toLocaleString("vi-VN")}đ (${hocPhi.trangThai} -> CHUA_NOP); phiếu thu hủy: ${
        dsPhieu.map((p) => p.soPhieu).join(", ") || "không có"
      } (${tong.toLocaleString("vi-VN")}đ)${traVeHopLe ? "; hồ sơ Chính thức -> Hợp lệ" : ""}. Lý do: ${lyDoGon}`,
      tx,
    );
    return { hocPhi: hocPhiSau, phieuDaHuy: dsPhieu.map((p) => p.soPhieu), traVeHopLe };
  });
}
