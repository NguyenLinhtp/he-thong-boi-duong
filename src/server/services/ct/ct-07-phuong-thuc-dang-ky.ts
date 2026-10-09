import { prisma } from "@/lib/db/prisma";
import { ghiThaoTac, HE_THONG, type NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";
import { coKhoaDangHoatDong } from "@/server/services/ct/ct-04-cap-nhat-da-ban-hanh";
import {
  SaiTrangThaiChuongTrinhError,
  KhongTimThayChuongTrinhError,
} from "@/server/services/ct/loi-chuong-trinh";
import type { PhuongThucDangKy } from "@/generated/prisma/client";
import { laPhuongThucDuThi, loiTapPhuongThuc, nhanNganPhuongThuc, sapXepPhuongThuc } from "@/lib/phuong-thuc";

export class PhuongThucDangKyKhongHopLeError extends Error {
  constructor(lyDo: string) {
    super(lyDo);
  }
}

/**
 * CT-07 (sửa 08/10/2026): chương trình chọn 1 hoặc nhiều phương thức đăng ký trong nhóm đào tạo
 * (PT1, PT2, PT4) hoặc riêng PT3 (chỉ dự thi). Mọi khóa của chương trình dùng theo danh sách hiện
 * hành - sửa ở chương trình là khóa cập nhật theo, kể cả khóa đang hoạt động (khi đó bắt buộc lý
 * do, ghi nhật ký). Hồ sơ đã đăng ký theo phương thức bị bỏ vẫn được xử lý tiếp; chỉ chặn đăng ký
 * mới theo phương thức đó. Không đổi qua lại giữa dự thi và đào tạo khi chương trình đã có khóa.
 * PT4: hợp đồng liên kết còn hiệu lực được kiểm tra khi học viên đăng ký (HV-11/HV-12).
 */
export async function thietLapPhuongThucDangKy(
  chuongTrinhId: string,
  dsNhap: PhuongThucDangKy[] | PhuongThucDangKy,
  lyDo?: string | null,
  nguoi: NguoiThucHien = HE_THONG,
) {
  const ds = sapXepPhuongThuc(Array.isArray(dsNhap) ? dsNhap : [dsNhap]) as PhuongThucDangKy[];
  const loi = loiTapPhuongThuc(Array.isArray(dsNhap) ? [...new Set(dsNhap)] : [dsNhap]);
  if (loi) throw new PhuongThucDangKyKhongHopLeError(loi);

  const chuongTrinh = await prisma.chuongTrinh.findUnique({ where: { id: chuongTrinhId } });
  if (!chuongTrinh) throw new KhongTimThayChuongTrinhError();
  if (chuongTrinh.trangThai === "NGUNG_HIEU_LUC") {
    throw new SaiTrangThaiChuongTrinhError("Chương trình đã ngừng hiệu lực, không thiết lập phương thức đăng ký");
  }
  const cu = chuongTrinh.phuongThucDangKys;
  if (cu.length === ds.length && cu.every((m) => ds.includes(m))) return chuongTrinh;

  const soKhoa = await prisma.khoa.count({ where: { chuongTrinhId } });
  if (cu.length > 0 && soKhoa > 0 && laPhuongThucDuThi(cu) !== laPhuongThucDuThi(ds)) {
    throw new PhuongThucDangKyKhongHopLeError(
      "Chương trình đã có khóa - không đổi qua lại giữa Phương thức 3 (chỉ dự thi) và phương thức đào tạo bồi dưỡng",
    );
  }
  const dangHoatDong = cu.length > 0 && (await coKhoaDangHoatDong(chuongTrinhId));
  const lyDoSach = lyDo?.trim() || null;
  if (dangHoatDong && !lyDoSach) {
    throw new PhuongThucDangKyKhongHopLeError("Chương trình đang có khóa hoạt động - cần nhập lý do thay đổi phương thức đăng ký");
  }

  return prisma.$transaction(async (tx) => {
    const sau = await tx.chuongTrinh.update({ where: { id: chuongTrinhId }, data: { phuongThucDangKys: ds } });
    const bo = cu.filter((m) => !ds.includes(m));
    await ghiThaoTac(
      nguoi,
      "THIET_LAP_PHUONG_THUC_DANG_KY",
      "ChuongTrinh",
      chuongTrinhId,
      `${sau.maCT}: ${nhanNganPhuongThuc(cu, "chưa có")} -> ${nhanNganPhuongThuc(ds)}` +
        (bo.length ? ` (bỏ ${nhanNganPhuongThuc(bo)}: hồ sơ đã có giữ nguyên, ngừng nhận đăng ký mới)` : "") +
        (dangHoatDong ? `; áp dụng cho các khóa đang hoạt động` : "") +
        (lyDoSach ? `; lý do: ${lyDoSach}` : ""),
      tx,
    );
    return sau;
  });
}
