import type { TrangThaiDangKy } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ghiNhatKy } from "@/server/services/qt/qt-03-nhat-ky";
import { guiThongBao } from "@/server/services/hv/hv-10-thong-bao";
import { khoaDaPheDuyetKetQua } from "@/server/services/kq/dung-chung";
import { nhanVanBang } from "@/server/services/cc/van-bang";
import type { NguoiThucHien } from "@/server/services/dvlk/dvlk-01-danh-muc";
import {
  KhongTimThayHopDongDvlkError,
  HopDongDaThanhLyError,
  ChuaPheDuyetKetQuaDvlkError,
  SoLieuHopDongKhongHopLeError,
  ThieuThongTinDvlkError,
  HopDongChuaThanhLyDvlkError,
} from "@/server/services/dvlk/loi-dvlk";

/**
 * "Học viên hợp lệ thuộc hợp đồng" = đã được nhận vào khóa (Chính thức/Hoàn
 * thành) kể cả người thôi học giữa chừng - đơn vị liên kết quyết toán cho cả
 * họ. Hồ sơ bị hủy/không hợp lệ hoặc chưa xử lý xong không tính.
 */
export const TRANG_THAI_HOP_LE: TrangThaiDangKy[] = ["CHINH_THUC", "HOAN_THANH", "THOI_HOC"];
const TRANG_THAI_KHONG_TINH: TrangThaiDangKy[] = ["HUY_QUA_HAN_NOP_GIAY", "KHONG_HOP_LE"];

export type PhanLoaiThanhLy = "HOAN_THANH" | "KHONG_DAT" | "CHUA_CO_KET_QUA" | "THOI_HOC" | "CHUA_XU_LY" | "KHONG_TINH";

export const NHAN_PHAN_LOAI: Record<PhanLoaiThanhLy, string> = {
  HOAN_THANH: "Hoàn thành (đạt)",
  KHONG_DAT: "Không đạt",
  CHUA_CO_KET_QUA: "Chưa có kết quả được phê duyệt",
  THOI_HOC: "Thôi học",
  CHUA_XU_LY: "Hồ sơ chưa xử lý xong",
  KHONG_TINH: "Không tính (hủy/không hợp lệ)",
};

/**
 * DVLK-06 bước 1 - đối chiếu số học viên hoàn thành/thôi học thực tế với hợp
 * đồng. "Hoàn thành" ở đây = đạt kết quả học tập/thi đã phê duyệt (KQ-04),
 * không dùng KetQuaKhoa.hoanThanh vì cờ đó đã tính cả điều kiện tài chính mà
 * học viên ĐVLK chỉ đủ SAU khi thanh lý. Số tiền gợi ý = đơn giá thỏa thuận ×
 * số học viên hợp lệ; người thanh lý nhập số quyết toán thực tế.
 */
export async function doiChieuThanhLy(hopDongLienKetId: string) {
  const hopDong = await prisma.hopDongLienKet.findUnique({
    where: { id: hopDongLienKetId },
    include: {
      donViLienKet: true,
      khoa: { include: { chuongTrinh: true } },
      dangKys: { include: { hocVien: true }, orderBy: { hocVien: { hoTen: "asc" } } },
    },
  });
  if (!hopDong) throw new KhongTimThayHopDongDvlkError();

  const [dsKetQua, ketQuaDaPheDuyet] = await Promise.all([
    prisma.ketQuaKhoa.findMany({
      where: { khoaId: hopDong.khoaId, hocVienId: { in: hopDong.dangKys.map((dk) => dk.hocVienId) } },
    }),
    khoaDaPheDuyetKetQua(hopDong.khoaId),
  ]);
  const ketQuaTheoHocVien = new Map(dsKetQua.map((kq) => [kq.hocVienId, kq]));

  const dong = hopDong.dangKys.map((dk) => {
    const kq = ketQuaTheoHocVien.get(dk.hocVienId);
    let phanLoai: PhanLoaiThanhLy;
    if (TRANG_THAI_KHONG_TINH.includes(dk.trangThai)) phanLoai = "KHONG_TINH";
    else if (dk.trangThai === "THOI_HOC") phanLoai = "THOI_HOC";
    else if (!TRANG_THAI_HOP_LE.includes(dk.trangThai)) phanLoai = "CHUA_XU_LY";
    else if (!kq?.daPheDuyet) phanLoai = "CHUA_CO_KET_QUA";
    else phanLoai = kq.datHocTap === true ? "HOAN_THANH" : "KHONG_DAT";
    return {
      dangKyId: dk.id,
      hocVienId: dk.hocVienId,
      maHocVien: dk.hocVien.maHocVien,
      hoTen: dk.hocVien.hoTen,
      trangThaiDangKy: dk.trangThai,
      diemTongKet: kq?.diemTongKet == null ? null : Number(kq.diemTongKet),
      phanLoai,
      hopLe: TRANG_THAI_HOP_LE.includes(dk.trangThai),
    };
  });

  const dem = (pl: PhanLoaiThanhLy) => dong.filter((d) => d.phanLoai === pl).length;
  const soHopLe = dong.filter((d) => d.hopLe).length;
  const donGia = hopDong.donGiaThoaThuan == null ? null : Number(hopDong.donGiaThoaThuan);
  return {
    hopDong,
    dong,
    ketQuaDaPheDuyet,
    tong: {
      duKien: hopDong.soLuongDuKien,
      hopLe: soHopLe,
      hoanThanh: dem("HOAN_THANH"),
      khongDat: dem("KHONG_DAT"),
      chuaCoKetQua: dem("CHUA_CO_KET_QUA"),
      thoiHoc: dem("THOI_HOC"),
      chuaXuLy: dem("CHUA_XU_LY"),
      khongTinh: dem("KHONG_TINH"),
    },
    soTienGoiY: donGia == null ? null : donGia * soHopLe,
  };
}

export type ThanhLyInput = NguoiThucHien & {
  soTienQuyetToan: number | null;
  ngayThanhLy?: Date | string | null;
  ghiChu?: string | null;
};

/**
 * DVLK-06 bước 2 (Cán bộ tài chính) - lập biên bản thanh lý: chốt số liệu đối
 * chiếu, ghi số tiền quyết toán, chuyển hợp đồng Đã thanh lý và cập nhật hàng
 * loạt học phí "Đã hoàn tất" cho học viên hợp lệ thuộc hợp đồng (tạo dòng học
 * phí nếu chưa có). Tất cả trong 1 transaction. Sau đó học viên đạt của hợp
 * đồng mới được xét cấp văn bằng (HP-06/CC-01) và bàn giao theo lô (CC-04).
 * Điều kiện: kết quả khóa đã phê duyệt (KQ-04) - đối chiếu "số hoàn thành".
 */
export async function thanhLyHopDong(hopDongLienKetId: string, input: ThanhLyInput) {
  const soTien = input.soTienQuyetToan;
  if (soTien == null || Number.isNaN(soTien)) throw new ThieuThongTinDvlkError("số tiền quyết toán");
  if (!Number.isFinite(soTien) || soTien < 0) throw new SoLieuHopDongKhongHopLeError("số tiền quyết toán không được âm");
  const ngayThanhLy = input.ngayThanhLy ? new Date(input.ngayThanhLy) : new Date();
  if (Number.isNaN(ngayThanhLy.getTime())) throw new ThieuThongTinDvlkError("ngày thanh lý hợp lệ");

  const doiChieu = await doiChieuThanhLy(hopDongLienKetId);
  const { hopDong, dong, tong } = doiChieu;
  if (hopDong.trangThai === "DA_THANH_LY") throw new HopDongDaThanhLyError();
  if (!doiChieu.ketQuaDaPheDuyet) throw new ChuaPheDuyetKetQuaDvlkError();

  const dsHopLe = dong.filter((d) => d.hopLe);
  const soBienBan = `BBTL-${hopDong.maHopDong}`;

  const sau = await prisma.$transaction(async (tx) => {
    const { count } = await tx.hopDongLienKet.updateMany({
      where: { id: hopDong.id, trangThai: "DANG_TRIEN_KHAI" },
      data: {
        trangThai: "DA_THANH_LY",
        ngayQuyetToan: ngayThanhLy,
        soTienQuyetToan: soTien,
        soLuongThucTe: tong.hopLe,
        soHocVienHoanThanh: tong.hoanThanh,
        soHocVienThoiHoc: tong.thoiHoc,
        soBienBanThanhLy: soBienBan,
        nguoiThanhLy: input.nguoiThucHienTen,
        ghiChuThanhLy: input.ghiChu?.trim() || null,
      },
    });
    if (count !== 1) throw new HopDongDaThanhLyError();

    for (const d of dsHopLe) {
      await tx.hocPhi.upsert({
        where: { hocVienId_khoaId: { hocVienId: d.hocVienId, khoaId: hopDong.khoaId } },
        update: { trangThai: "DA_HOAN_TAT" },
        create: { hocVienId: d.hocVienId, khoaId: hopDong.khoaId, soTienPhaiNop: 0, trangThai: "DA_HOAN_TAT" },
      });
    }

    // KQ-03/KQ-04: điều kiện tài chính của học viên hợp đồng nay đã đủ - làm
    // mới cờ hoàn thành (điểm/kết quả học tập đã phê duyệt giữ nguyên) để
    // BC-02 và hồ sơ học viên phản ánh đúng; học viên đạt chuyển Hoàn thành.
    const dsKetQua = await tx.ketQuaKhoa.findMany({
      where: { khoaId: hopDong.khoaId, hocVienId: { in: dsHopLe.map((d) => d.hocVienId) } },
    });
    for (const kq of dsKetQua) {
      const ghiChu =
        (kq.ghiChu ?? "")
          .split("; ")
          .filter((y) => y && !y.startsWith("Chưa hoàn tất nghĩa vụ tài chính"))
          .join("; ") || null;
      await tx.ketQuaKhoa.update({
        where: { id: kq.id },
        data: { duDieuKienHocPhi: true, hoanThanh: kq.hoanThanh === null ? null : kq.datHocTap === true, ghiChu },
      });
    }
    await tx.dangKyHoc.updateMany({
      where: {
        hopDongLienKetId: hopDong.id,
        trangThai: "CHINH_THUC",
        hocVienId: { in: dsHopLe.filter((d) => d.phanLoai === "HOAN_THANH").map((d) => d.hocVienId) },
      },
      data: { trangThai: "HOAN_THANH" },
    });
    return tx.hopDongLienKet.findUniqueOrThrow({ where: { id: hopDong.id } });
  });

  await ghiNhatKy({
    nguoiThucHienId: input.nguoiThucHienId,
    nguoiThucHienTen: input.nguoiThucHienTen,
    hanhDong: "THANH_LY_HOP_DONG_LIEN_KET",
    doiTuong: "HopDongLienKet",
    doiTuongId: hopDong.id,
    chiTiet:
      `${soBienBan}: ${hopDong.donViLienKet.ma} - khóa ${hopDong.khoa.maKhoa}; dự kiến ${tong.duKien ?? "?"}, ` +
      `hợp lệ ${tong.hopLe} (hoàn thành ${tong.hoanThanh}, thôi học ${tong.thoiHoc}); quyết toán ${soTien}; ` +
      `cập nhật Đã hoàn tất ${dsHopLe.length} học viên`,
  });

  // HV-10: học viên đạt nay đủ điều kiện tài chính để xét cấp văn bằng
  const vanBang = nhanVanBang(hopDong.khoa.chuongTrinh.loaiVanBang);
  for (const d of dsHopLe.filter((x) => x.phanLoai === "HOAN_THANH")) {
    await guiThongBao(
      d.hocVienId,
      "CAP_CHUNG_CHI",
      `Hợp đồng liên kết khóa ${hopDong.khoa.maKhoa} đã thanh lý`,
      `Hợp đồng liên kết với ${hopDong.donViLienKet.ten} đã được thanh lý. Bạn đã hoàn tất nghĩa vụ tài chính và sẽ được xét cấp ${vanBang}; ${vanBang} được bàn giao về đơn vị liên kết để phát lại cho bạn.`,
    );
  }

  return { hopDong: sau, soHocVienCapNhat: dsHopLe.length };
}

/** Dữ liệu in biên bản thanh lý - chỉ khi hợp đồng đã thanh lý. */
export async function duLieuBienBanThanhLy(hopDongLienKetId: string) {
  const doiChieu = await doiChieuThanhLy(hopDongLienKetId);
  if (doiChieu.hopDong.trangThai !== "DA_THANH_LY") throw new HopDongChuaThanhLyDvlkError();
  return doiChieu;
}
