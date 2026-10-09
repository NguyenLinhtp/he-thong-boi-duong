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
import { hopDongConHieuLucTheoKhoa } from "@/server/services/dvlk/dvlk-03-hop-dong";
import { guiThongBao } from "@/server/services/hv/hv-10-thong-bao";
import {
  KhongTimThayKhoaError,
  SaiPhuongThucDangKyError,
  KhoaKhongMoDangKyError,
  DaDangKyKhoaNayError,
  DonViLienKetKhongHopLeChoKhoaError,
} from "@/server/services/hv/loi-hoc-vien";
import { kiemTraChuaCoTrongKhoa } from "@/server/services/hv/kiem-tra-trung-khoa";

export type DangKyQuaDonViLienKetInput = ThongTinHocVienInput & {
  khoaId: string;
  donViLienKetId: string;
};

/**
 * HV-12 (Phương thức 4b): học viên tự đăng ký trực tuyến như Phương thức 1,
 * nhưng tự chọn đơn vị liên kết sẽ nộp bản giấy - "danh sách đơn vị liên kết
 * hiển thị để chọn chỉ gồm các đơn vị đang có hợp đồng liên kết còn hiệu lực
 * với khóa đó" (kiểm tra lại phía server, không chỉ tin dropdown phía client).
 */
export async function dangKyQuaDonViLienKet(input: DangKyQuaDonViLienKetInput) {
  const khoa = await prisma.khoa.findUnique({
    where: { id: input.khoaId },
    include: { chuongTrinh: true },
  });
  if (!khoa) throw new KhongTimThayKhoaError();

  if (!khoa.chuongTrinh.phuongThucDangKys.includes("QUA_DON_VI_LIEN_KET")) {
    throw new SaiPhuongThucDangKyError("Phương thức 4 (đăng ký qua đơn vị liên kết)");
  }

  const hopDongHopLe = (await hopDongConHieuLucTheoKhoa(khoa.id)).find(
    (hd) => hd.donViLienKetId === input.donViLienKetId,
  );
  if (!hopDongHopLe) throw new DonViLienKetKhongHopLeChoKhoaError();

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
        hopDongLienKetId: hopDongHopLe.id,
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
    `Bạn đã đăng ký thành công khóa ${khoa.maKhoa}. Vui lòng nộp bản giấy hồ sơ đăng ký cho đơn vị liên kết ${hopDongHopLe.donViLienKet.ten} trước ngày ${hanNopGiay.toLocaleDateString("vi-VN")}.`,
  );

  return dangKy;
}

/** Danh sách đơn vị liên kết hợp lệ để hiển thị cho học viên chọn khi đăng ký công khai. */
export async function dsDonViLienKetChoKhoa(khoaId: string) {
  return hopDongConHieuLucTheoKhoa(khoaId);
}
