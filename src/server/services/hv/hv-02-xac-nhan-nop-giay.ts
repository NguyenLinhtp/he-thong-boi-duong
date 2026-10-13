import { prisma } from "@/lib/db/prisma";
import {
  KhongTimThayDangKyError,
  SaiTrangThaiXacNhanNopGiayError,
  DaQuaHanNopGiayError,
  HoSoQuaDonViLienKetError,
} from "@/server/services/hv/loi-hoc-vien";
import { damBaoHocPhiChoDuyet } from "@/server/services/hp/hp-01-thiet-lap";
import { guiThongBao } from "@/server/services/hv/hv-10-thong-bao";

const INCLUDE_DANG_KY = {
  hocVien: true,
  khoa: { include: { chuongTrinh: true } },
} as const;

/**
 * HV-02: "hồ sơ không được xác nhận nộp giấy trong thời hạn quy định sẽ tự
 * động hủy đăng ký" - kiểm tra lười (lazy): mỗi lần hồ sơ CHO_NOP_GIAY được
 * đọc/thao tác mà đã quá hanNopGiay thì tự chuyển HUY_QUA_HAN_NOP_GIAY ngay
 * lúc đó, không cần tiến trình nền/cron riêng.
 */
async function tuDongHuyNeuQuaHan(dangKyId: string) {
  const dangKy = await prisma.dangKyHoc.findUnique({
    where: { id: dangKyId },
    include: INCLUDE_DANG_KY,
  });
  if (!dangKy) throw new KhongTimThayDangKyError();

  if (dangKy.trangThai === "CHO_NOP_GIAY" && dangKy.hanNopGiay && dangKy.hanNopGiay < new Date()) {
    return prisma.dangKyHoc.update({
      where: { id: dangKyId },
      data: { trangThai: "HUY_QUA_HAN_NOP_GIAY" },
      include: INCLUDE_DANG_KY,
    });
  }
  return dangKy;
}

export async function xacNhanNopGiay(dangKyId: string) {
  const dangKy = await tuDongHuyNeuQuaHan(dangKyId);

  if (dangKy.hopDongLienKetId) throw new HoSoQuaDonViLienKetError();
  if (dangKy.trangThai === "HUY_QUA_HAN_NOP_GIAY") throw new DaQuaHanNopGiayError();
  if (dangKy.trangThai !== "CHO_NOP_GIAY") throw new SaiTrangThaiXacNhanNopGiayError();

  const sau = await prisma.dangKyHoc.update({
    where: { id: dangKyId },
    data: { trangThai: "DA_NOP_GIAY" },
    include: INCLUDE_DANG_KY,
  });
  // (bổ sung 11/10/2026) hồ sơ phải nộp học phí trước khi được duyệt chính thức: lập khoản và nhắc nộp
  if ((await damBaoHocPhiChoDuyet(sau.khoaId)) > 0) {
    const hocPhi = await prisma.hocPhi.findUnique({ where: { hocVienId_khoaId: { hocVienId: sau.hocVienId, khoaId: sau.khoaId } } });
    if (hocPhi && Number(hocPhi.soTienPhaiNop) > 0) {
      await guiThongBao(
        sau.hocVienId,
        "NHAC_HOC_PHI",
        `Nộp học phí khóa ${sau.khoa.maKhoa}`,
        `Nhà trường đã nhận hồ sơ giấy của bạn. Vui lòng nộp học phí ${Number(hocPhi.soTienPhaiNop).toLocaleString("vi-VN")} đ - hồ sơ được xét duyệt vào danh sách chính thức sau khi học phí được xác nhận.`,
      );
    }
  }
  return sau;
}

/**
 * Danh sách hồ sơ Phương thức 1 của 1 khóa đang chờ xác nhận nộp giấy - tự
 * lọc bỏ (chuyển trạng thái) các hồ sơ đã quá hạn trước khi trả về, để danh
 * sách hiển thị luôn phản ánh đúng hồ sơ còn thực sự chờ xử lý.
 */
export async function danhSachChoNopGiay(khoaId: string) {
  const dsChoNopGiay = await prisma.dangKyHoc.findMany({
    // hồ sơ qua đơn vị liên kết theo dõi ở DVLK-04/05, không thuộc danh sách HV-02
    where: { khoaId, trangThai: "CHO_NOP_GIAY", hopDongLienKetId: null },
    include: INCLUDE_DANG_KY,
  });

  const ketQua = await Promise.all(dsChoNopGiay.map((dk) => tuDongHuyNeuQuaHan(dk.id)));
  return ketQua.filter((dk) => dk.trangThai === "CHO_NOP_GIAY");
}
