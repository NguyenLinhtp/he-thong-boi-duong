import { prisma } from "@/lib/db/prisma";
import {
  KhongTimThayHocPhiError,
  SoTienKhongHopLeError,
  HocPhiQuaDonViLienKetError,
} from "@/server/services/hp/loi-hoc-phi";
import { lapPhieuThu } from "@/server/services/hp/hp-04-phieu-thu";
import { ghiNhatKy } from "@/server/services/qt/qt-03-nhat-ky";
import { mienGiamThanhPhan, phanBoThanhToan } from "@/server/services/hp/hp-01-thanh-phan-le-phi";

const TRANG_THAI_QUA_DVLK = ["CHO_THANH_LY_HOP_DONG", "DA_HOAN_TAT"];

export type XacNhanThanhToanInput = {
  soTien: number;
  hinhThucNop: string;
  nguoiXacNhanId?: string | null;
  nguoiXacNhanTen: string;
};

/**
 * HP-02 (actor Cán bộ tài chính): ghi nhận 1 khoản nộp, cộng dồn vào
 * soTienDaNop, tự chuyển trạng thái Đã nộp đủ/Còn nợ. "Mọi thay đổi được ghi
 * nhật ký" (QT-03) + tự động lập phiếu thu (HP-04) cho khoản vừa nộp.
 * Cập nhật học phí + phiếu thu + nhật ký trong 1 transaction (không bao giờ có
 * số đã nộp tăng mà thiếu phiếu thu - HP-05/BC-03 đối soát khớp); dòng học phí
 * bị khóa (advisory lock theo khoản) để 2 lần xác nhận đồng thời không ghi
 * đè nhau.
 */
export async function xacNhanThanhToan(hocPhiId: string, input: XacNhanThanhToanInput) {
  if (!(input.soTien > 0) || !Number.isFinite(input.soTien)) throw new SoTienKhongHopLeError();

  return prisma.$transaction(async (tx) => {
    // khóa tư vấn theo khoản học phí (tự nhả khi transaction kết thúc) - không
    // phụ thuộc tên bảng/schema như SELECT ... FOR UPDATE
    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`, `HP02:${hocPhiId}`);
    const hocPhi = await tx.hocPhi.findUnique({ where: { id: hocPhiId } });
    if (!hocPhi) throw new KhongTimThayHocPhiError();
    if (TRANG_THAI_QUA_DVLK.includes(hocPhi.trangThai)) throw new HocPhiQuaDonViLienKetError();
    // (bổ sung 06/10/2026) khóa có thành phần lệ phí: phân bổ vào từng thành phần, mỗi phần 1 phiếu thu
    if ((await tx.hocPhiThanhPhan.count({ where: { hocPhiId } })) > 0) {
      return phanBoThanhToan(tx, hocPhiId, input.soTien, input.hinhThucNop, {
        nguoiThucHienId: input.nguoiXacNhanId,
        nguoiThucHienTen: input.nguoiXacNhanTen,
      });
    }

    const soTienDaNopMoi = Number(hocPhi.soTienDaNop) + input.soTien;
    const trangThaiMoi = soTienDaNopMoi >= Number(hocPhi.soTienPhaiNop) ? "DA_NOP_DU" : "CON_NO";

    const hocPhiSau = await tx.hocPhi.update({
      where: { id: hocPhiId },
      data: {
        soTienDaNop: soTienDaNopMoi,
        ngayNop: new Date(),
        hinhThucNop: input.hinhThucNop,
        trangThai: trangThaiMoi,
        nguoiXacNhanId: input.nguoiXacNhanId ?? null,
      },
    });

    const phieuThu = await lapPhieuThu(
      {
        hocPhiId,
        soTien: input.soTien,
        hinhThucNop: input.hinhThucNop,
        nguoiLapId: input.nguoiXacNhanId,
        nguoiLapTen: input.nguoiXacNhanTen,
      },
      tx,
    );

    await ghiNhatKy(
      {
        nguoiThucHienId: input.nguoiXacNhanId,
        nguoiThucHienTen: input.nguoiXacNhanTen,
        hanhDong: "XAC_NHAN_THANH_TOAN",
        doiTuong: "HocPhi",
        doiTuongId: hocPhiId,
        chiTiet: `Nộp ${input.soTien.toLocaleString("vi-VN")}đ (${input.hinhThucNop}), phiếu ${phieuThu.soPhieu}, trạng thái -> ${trangThaiMoi}`,
      },
      tx,
    );

    return { hocPhi: hocPhiSau, phieuThu };
  });
}

export type XacNhanMienGiamInput = {
  lyDo: string;
  nguoiXacNhanId?: string | null;
  nguoiXacNhanTen: string;
};

// HP-01/HP-02: xác nhận học viên thuộc đối tượng miễn giảm theo chính sách
// của khóa - không cần nộp, coi như đã hoàn tất nghĩa vụ tài chính (HP-06).
export async function xacNhanMienGiam(hocPhiId: string, input: XacNhanMienGiamInput) {
  const hocPhi = await prisma.hocPhi.findUnique({ where: { id: hocPhiId } });
  if (!hocPhi) throw new KhongTimThayHocPhiError();
  if (TRANG_THAI_QUA_DVLK.includes(hocPhi.trangThai)) throw new HocPhiQuaDonViLienKetError();

  const hocPhiSau = await prisma.$transaction(async (tx) => {
    // (bổ sung 06/10/2026) khóa có thành phần lệ phí: các thành phần chưa xong -> Miễn giảm
    await mienGiamThanhPhan(tx, hocPhiId);
    return tx.hocPhi.update({
      where: { id: hocPhiId },
      data: { trangThai: "MIEN_GIAM", hinhThucNop: "Miễn giảm", nguoiXacNhanId: input.nguoiXacNhanId ?? null },
    });
  });

  await ghiNhatKy({
    nguoiThucHienId: input.nguoiXacNhanId,
    nguoiThucHienTen: input.nguoiXacNhanTen,
    hanhDong: "XAC_NHAN_MIEN_GIAM",
    doiTuong: "HocPhi",
    doiTuongId: hocPhiId,
    chiTiet: input.lyDo,
  });

  return hocPhiSau;
}
