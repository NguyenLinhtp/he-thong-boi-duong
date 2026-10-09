import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { luuHoSoBoSung } from "@/server/services/hv/form-dang-ky";
import { coTheNhanDangKy } from "@/server/services/kh/kh-05-trang-thai-si-so";
import {
  timHoacTaoHocVien,
  soNgayHanNopGiay,
  type ThongTinHocVienInput,
  chuanBiThongTinDangKy,
} from "@/server/services/hv/dung-chung";
import { donViLienKetCuaTaiKhoan } from "@/server/services/dvlk/dvlk-02-tai-khoan";
import { guiThongBao } from "@/server/services/hv/hv-10-thong-bao";
import {
  KhongTimThayKhoaError,
  SaiPhuongThucDangKyError,
  KhoaKhongMoDangKyError,
  DaDangKyKhoaNayError,
  KhongPhaiTaiKhoanDonViLienKetError,
  KhongCoHopDongLienKetHieuLucError,
} from "@/server/services/hv/loi-hoc-vien";
import { kiemTraChuaCoTrongKhoa } from "@/server/services/hv/kiem-tra-trung-khoa";

export type DangKyThayMatInput = ThongTinHocVienInput & { khoaId: string };

/**
 * HV-11 (Phương thức 4a): cán bộ đơn vị liên kết dùng tài khoản được cấp
 * đăng ký thay mặt học viên. "Chỉ thực hiện được trên các khóa đã có hợp
 * đồng liên kết còn hiệu lực với đơn vị của tài khoản đăng nhập" - gắn hồ sơ
 * với đúng hợp đồng đó. Trạng thái ban đầu dùng chung CHO_NOP_GIAY (tương
 * đương "Chờ đơn vị liên kết thu hồ sơ giấy" - cùng bản chất "đã đăng ký,
 * chờ nộp bản giấy" như Phương thức 1, khác ở nơi nộp).
 */
export async function dangKyThayMatDonViLienKet(nguoiDungId: string, input: DangKyThayMatInput) {
  const donVi = await donViLienKetCuaTaiKhoan(nguoiDungId);
  if (!donVi) throw new KhongPhaiTaiKhoanDonViLienKetError();

  const khoa = await prisma.khoa.findUnique({
    where: { id: input.khoaId },
    include: { chuongTrinh: true },
  });
  if (!khoa) throw new KhongTimThayKhoaError();

  if (!khoa.chuongTrinh.phuongThucDangKys.includes("QUA_DON_VI_LIEN_KET")) {
    throw new SaiPhuongThucDangKyError("Phương thức 4 (đăng ký qua đơn vị liên kết)");
  }

  const hopDong = await prisma.hopDongLienKet.findFirst({
    where: { khoaId: khoa.id, donViLienKetId: donVi.id, trangThai: "DANG_TRIEN_KHAI" },
  });
  if (!hopDong) throw new KhongCoHopDongLienKetHieuLucError();

  // (bổ sung 08/10/2026) khóa nhiều phương thức: đã có trong khóa (theo số CCCD, kể cả đã có trong
  // danh sách được cử đi học) thì báo đã tồn tại, không tạo hồ sơ thứ 2
  await kiemTraChuaCoTrongKhoa(khoa.id, { soCCCD: input.soCCCD });
  const conMo = await coTheNhanDangKy(khoa.id);
  if (!conMo) throw new KhoaKhongMoDangKyError();

  // (bổ sung 30/09/2026) kiểm tra theo form đăng ký cấu hình của khóa trước khi tạo hồ sơ
  const { input: thongTin, boSung } = await chuanBiThongTinDangKy(khoa.id, input);
  const hocVien = await timHoacTaoHocVien(thongTin);

  const hanNopGiay = new Date();
  hanNopGiay.setDate(hanNopGiay.getDate() + (await soNgayHanNopGiay()));

  let dangKy;
  try {
    dangKy = await prisma.dangKyHoc.create({
      data: {
        hocVienId: hocVien.id,
        khoaId: khoa.id,
        trangThai: "CHO_NOP_GIAY",
        hanNopGiay,
        hopDongLienKetId: hopDong.id,
      },
      include: {
        hocVien: true,
        khoa: { include: { chuongTrinh: true } },
        hopDongLienKet: { include: { donViLienKet: true } },
      },
    });
  } catch (error) {
    const laLoiTrungDangKy =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
    if (laLoiTrungDangKy) {
      await kiemTraChuaCoTrongKhoa(khoa.id, { hocVienId: hocVien.id, soCCCD: input.soCCCD });
      throw new DaDangKyKhoaNayError();
    }
    throw error;
  }
  await luuHoSoBoSung(dangKy.id, boSung);

  await guiThongBao(
    hocVien.id,
    "NHAC_NOP_HO_SO_GIAY",
    `Đăng ký khóa ${khoa.maKhoa} thành công`,
    `Bạn đã được đăng ký khóa ${khoa.maKhoa} qua đơn vị liên kết ${donVi.ten}. Vui lòng nộp bản giấy hồ sơ đăng ký cho đơn vị liên kết trước ngày ${hanNopGiay.toLocaleDateString("vi-VN")}.`,
  );

  return dangKy;
}
