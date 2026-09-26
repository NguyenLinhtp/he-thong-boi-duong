import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ghiNhatKy } from "@/server/services/qt/qt-03-nhat-ky";
import { guiThongBao } from "@/server/services/hv/hv-10-thong-bao";
import type { NguoiThucHien } from "@/server/services/dvlk/dvlk-01-danh-muc";
import { donViLienKetCuaTaiKhoan } from "@/server/services/dvlk/dvlk-02-tai-khoan";
import {
  ThieuThongTinDvlkError,
  KhongPhaiTaiKhoanDvlkError,
  NgoaiPhamViDonViLienKetError,
  HoSoKhongChoThuError,
  HopDongDaThanhLyError,
} from "@/server/services/dvlk/loi-dvlk";

/**
 * DVLK-05 "hồ sơ không được đơn vị liên kết xác nhận thu trong thời hạn quy
 * định sẽ tự động hủy đăng ký" - kiểm tra lười như HV-02: mỗi lần đọc/thao tác
 * hồ sơ của hợp đồng, hồ sơ Chờ thu giấy đã quá hạn nộp chuyển Hủy quá hạn.
 */
export async function tuDongHuyQuaHan(hopDongIds: string[]) {
  const { count } = await prisma.dangKyHoc.updateMany({
    where: {
      hopDongLienKetId: { in: hopDongIds },
      trangThai: "CHO_NOP_GIAY",
      hanNopGiay: { lt: new Date() },
    },
    data: { trangThai: "HUY_QUA_HAN_NOP_GIAY" },
  });
  return count;
}

/**
 * Ai xác nhận: cán bộ đơn vị liên kết (chỉ hồ sơ thuộc hợp đồng của đơn vị
 * mình - DVLK-02) hoặc cán bộ quản lý đào tạo phía trường (khi đơn vị mang hồ
 * sơ giấy trực tiếp về trường).
 */
export type PhamViXacNhan = { loai: "DVLK"; nguoiDungId: string } | { loai: "TRUONG" };

export type XacNhanThuHoSoInput = NguoiThucHien & {
  dangKyIds: string[];
  // thông tin lô chỉ để quản lý, đều có thể để trống (ngày trống = hôm nay)
  ngayGui?: Date | string | null;
  hinhThuc?: string | null;
  ghiChu?: string | null;
};

/**
 * DVLK-05: đơn vị liên kết xác nhận đã thu đủ đơn giấy do học viên ký, tổng
 * hợp gửi về trường theo lô -> hồ sơ "Đã nộp hồ sơ giấy - chờ duyệt" (HV-06
 * thẩm định tiếp). Các hồ sơ chọn được gom thành 1 lô cho mỗi hợp đồng. Cả
 * lượt hoặc không: có hồ sơ ngoài phạm vi, không còn chờ thu (đã xác nhận,
 * đã hủy do quá hạn...) hoặc hợp đồng đã thanh lý thì không ghi gì.
 */
export async function xacNhanThuHoSo(phamVi: PhamViXacNhan, input: XacNhanThuHoSoInput) {
  const dangKyIds = [...new Set(input.dangKyIds)];
  if (dangKyIds.length === 0) throw new ThieuThongTinDvlkError("hồ sơ cần xác nhận");
  const ngayGui = input.ngayGui ? new Date(input.ngayGui) : new Date();
  if (Number.isNaN(ngayGui.getTime())) throw new ThieuThongTinDvlkError("ngày gửi hợp lệ");

  let dsHoSo = await prisma.dangKyHoc.findMany({
    where: { id: { in: dangKyIds } },
    include: { hocVien: true, hopDongLienKet: { include: { donViLienKet: true } }, khoa: true },
  });
  if (dsHoSo.length !== dangKyIds.length || dsHoSo.some((dk) => !dk.hopDongLienKet)) {
    throw new NgoaiPhamViDonViLienKetError();
  }
  if (phamVi.loai === "DVLK") {
    const donVi = await donViLienKetCuaTaiKhoan(phamVi.nguoiDungId);
    if (!donVi) throw new KhongPhaiTaiKhoanDvlkError();
    if (dsHoSo.some((dk) => dk.hopDongLienKet!.donViLienKetId !== donVi.id)) throw new NgoaiPhamViDonViLienKetError();
  }
  if (dsHoSo.some((dk) => dk.hopDongLienKet!.trangThai === "DA_THANH_LY")) throw new HopDongDaThanhLyError();

  const hopDongIds = [...new Set(dsHoSo.map((dk) => dk.hopDongLienKetId!))];
  if ((await tuDongHuyQuaHan(hopDongIds)) > 0) {
    dsHoSo = await prisma.dangKyHoc.findMany({
      where: { id: { in: dangKyIds } },
      include: { hocVien: true, hopDongLienKet: { include: { donViLienKet: true } }, khoa: true },
    });
  }
  const khongChoThu = dsHoSo.filter((dk) => dk.trangThai !== "CHO_NOP_GIAY");
  if (khongChoThu.length > 0) {
    throw new HoSoKhongChoThuError(
      khongChoThu.map((dk) => `${dk.hocVien.hoTen} (${dk.trangThai === "HUY_QUA_HAN_NOP_GIAY" ? "đã hủy do quá hạn" : "không còn chờ thu"})`),
    );
  }

  const dsLo = await taoLoTrongTransaction(hopDongIds, dsHoSo, { ...input, ngayGui });

  for (const lo of dsLo) {
    await ghiNhatKy({
      nguoiThucHienId: input.nguoiThucHienId,
      nguoiThucHienTen: input.nguoiThucHienTen,
      hanhDong: "XAC_NHAN_THU_HO_SO_DVLK",
      doiTuong: "HopDongLienKet",
      doiTuongId: lo.hopDongLienKetId,
      chiTiet: `Lô ${lo.maLo} (${phamVi.loai === "DVLK" ? "đơn vị liên kết" : "phía trường"} xác nhận): ${lo.dangKys.map((dk) => dk.hocVien.hoTen).join(", ")}`,
    });
  }
  // HV-10: báo học viên hồ sơ giấy đã được tiếp nhận, chờ trường thẩm định
  for (const dk of dsHoSo) {
    await guiThongBao(
      dk.hocVienId,
      "NHAC_NOP_HO_SO_GIAY",
      `Hồ sơ khóa ${dk.khoa.maKhoa} đã được tiếp nhận`,
      `Đơn vị liên kết ${dk.hopDongLienKet!.donViLienKet.ten} đã xác nhận thu hồ sơ giấy của bạn và gửi về trường. Hồ sơ đang chờ thẩm định.`,
    );
  }
  return dsLo;
}

/** Sinh mã lô NHS-<mã hợp đồng>-<nn> (tăng dần theo hợp đồng); trùng do đồng thời -> làm lại cả transaction. */
async function taoLoTrongTransaction(
  hopDongIds: string[],
  dsHoSo: { id: string; hopDongLienKetId: string | null }[],
  input: XacNhanThuHoSoInput & { ngayGui: Date },
) {
  for (let lanThu = 0; lanThu < 5; lanThu++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const dsLo = [];
        for (const hopDongId of hopDongIds) {
          const hopDong = await tx.hopDongLienKet.findUniqueOrThrow({ where: { id: hopDongId } });
          const soLo = await tx.loNopHoSo.count({ where: { hopDongLienKetId: hopDongId } });
          const ids = dsHoSo.filter((dk) => dk.hopDongLienKetId === hopDongId).map((dk) => dk.id);
          const lo = await tx.loNopHoSo.create({
            data: {
              maLo: `NHS-${hopDong.maHopDong}-${String(soLo + 1).padStart(2, "0")}`,
              hopDongLienKetId: hopDongId,
              ngayGui: input.ngayGui,
              hinhThuc: input.hinhThuc?.trim() || null,
              ghiChu: input.ghiChu?.trim() || null,
              nguoiXacNhan: input.nguoiThucHienTen,
            },
          });
          const { count } = await tx.dangKyHoc.updateMany({
            where: { id: { in: ids }, trangThai: "CHO_NOP_GIAY" },
            data: { trangThai: "DA_NOP_GIAY", loNopHoSoId: lo.id },
          });
          if (count !== ids.length) throw new HoSoKhongChoThuError(["dữ liệu vừa thay đổi, thử lại"]);
          dsLo.push(
            await tx.loNopHoSo.findUniqueOrThrow({
              where: { id: lo.id },
              include: { dangKys: { include: { hocVien: true } } },
            }),
          );
        }
        return dsLo;
      });
    } catch (error) {
      const laLoiTrung = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!laLoiTrung) throw error;
    }
  }
  throw new Error("Không sinh được mã lô sau nhiều lần thử");
}

/** Các lô hồ sơ đã gửi về trường của 1 hợp đồng. */
export async function danhSachLoNopHoSo(hopDongLienKetId: string) {
  return prisma.loNopHoSo.findMany({
    where: { hopDongLienKetId },
    include: { _count: { select: { dangKys: true } } },
    orderBy: { createdAt: "asc" },
  });
}
