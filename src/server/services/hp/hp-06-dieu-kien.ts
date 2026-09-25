import { prisma } from "@/lib/db/prisma";
import { KhongTimThayHocPhiError, ThieuLyDoBoQuaError } from "@/server/services/hp/loi-hoc-phi";
import { ghiNhatKy } from "@/server/services/qt/qt-03-nhat-ky";

/**
 * HP-06 (actor "Hệ thống - tự động kiểm tra"): cổng điều kiện tài chính dùng
 * chung cho KQ-03 (xét hoàn thành khóa) và CC-01 (đề nghị cấp chứng chỉ).
 * "Học viên còn nợ học phí không được công nhận hoàn thành dù đủ điểm";
 * riêng học viên qua đơn vị liên kết áp dụng điều kiện thanh lý hợp đồng
 * thay cho điều kiện đã nộp học phí cá nhân.
 *
 * Chưa có dòng HocPhi (khóa miễn phí hoặc HP-01 chưa chạy) coi như không có
 * nghĩa vụ tài chính -> luôn đạt.
 */
export async function daHoanTatNghiaVuTaiChinh(hocVienId: string, khoaId: string): Promise<boolean> {
  const hocPhi = await prisma.hocPhi.findUnique({
    where: { hocVienId_khoaId: { hocVienId, khoaId } },
  });
  if (!hocPhi) return true;
  if (hocPhi.boQuaKiemTra) return true;

  if (hocPhi.trangThai === "CHO_THANH_LY_HOP_DONG" || hocPhi.trangThai === "DA_HOAN_TAT") {
    const dangKy = await prisma.dangKyHoc.findUnique({
      where: { hocVienId_khoaId: { hocVienId, khoaId } },
      include: { hopDongLienKet: true },
    });
    return (
      hocPhi.trangThai === "DA_HOAN_TAT" || dangKy?.hopDongLienKet?.trangThai === "DA_THANH_LY"
    );
  }

  return hocPhi.trangThai === "DA_NOP_DU" || hocPhi.trangThai === "MIEN_GIAM";
}

export type BoQuaDieuKienInput = {
  lyDo: string;
  nguoiPheDuyetId?: string | null;
  nguoiPheDuyetTen: string;
};

// "Có thể bỏ chặn thủ công nếu lãnh đạo phê duyệt trường hợp đặc biệt".
export async function boQuaDieuKienHocPhi(hocPhiId: string, input: BoQuaDieuKienInput) {
  const hocPhi = await prisma.hocPhi.findUnique({ where: { id: hocPhiId } });
  if (!hocPhi) throw new KhongTimThayHocPhiError();
  if (!input.lyDo.trim()) throw new ThieuLyDoBoQuaError();

  const hocPhiSau = await prisma.hocPhi.update({
    where: { id: hocPhiId },
    data: { boQuaKiemTra: true, lyDoBoQua: input.lyDo },
  });

  await ghiNhatKy({
    nguoiThucHienId: input.nguoiPheDuyetId,
    nguoiThucHienTen: input.nguoiPheDuyetTen,
    hanhDong: "BO_QUA_DIEU_KIEN_HOC_PHI",
    doiTuong: "HocPhi",
    doiTuongId: hocPhiId,
    chiTiet: input.lyDo,
  });

  return hocPhiSau;
}
