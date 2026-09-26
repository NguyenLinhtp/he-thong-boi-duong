import { prisma } from "@/lib/db/prisma";
import { daHoanTatNghiaVuTaiChinh } from "@/server/services/hp/hp-06-dieu-kien";
import { khoaDaPheDuyetKetQua } from "@/server/services/kq/dung-chung";
import { ghiNhatKy } from "@/server/services/qt/qt-03-nhat-ky";
import {
  KhongTimThayKhoaError,
  ChuaPheDuyetKetQuaError,
  KhongTimThayLopError,
} from "@/server/services/cc/loi-chung-chi";

/** Trạng thái chứng chỉ còn hiệu lực - mỗi (học viên, khóa) chỉ có tối đa 1. */
export const TRANG_THAI_CON_HIEU_LUC = ["DE_NGHI", "CHO_KY_DUYET", "DA_KY_DUYET", "DA_CAP"] as const;

/**
 * Điều kiện cấp chứng chỉ của 1 học viên trong khóa, kiểm tra TẠI THỜI ĐIỂM
 * gọi (dùng chung cho CC-01 và kiểm tra lại ở CC-02/CC-04):
 *  - kết quả toàn khóa đã phê duyệt (KQ-04) và đạt học tập/thi (datHocTap);
 *  - chưa thôi học;
 *  - hoàn tất nghĩa vụ tài chính theo HP-06 - rẽ nhánh học phí cá nhân HOẶC
 *    hợp đồng liên kết đã thanh lý, không áp cả hai.
 * Không dựa vào KetQuaKhoa.hoanThanh (chụp lúc KQ-03): học viên qua ĐVLK
 * thường chỉ đủ điều kiện sau khi hợp đồng thanh lý, muộn hơn lúc phê duyệt.
 * Trả về null nếu đủ điều kiện, ngược lại là lý do không đủ.
 */
export async function lyDoKhongDuDieuKien(hocVienId: string, khoaId: string): Promise<string | null> {
  const [ketQua, dangKy] = await Promise.all([
    prisma.ketQuaKhoa.findUnique({ where: { hocVienId_khoaId: { hocVienId, khoaId } } }),
    prisma.dangKyHoc.findUnique({
      where: { hocVienId_khoaId: { hocVienId, khoaId } },
      include: { hopDongLienKet: { include: { donViLienKet: true } } },
    }),
  ]);
  if (!ketQua?.daPheDuyet) return "Chưa có kết quả được phê duyệt (KQ-04)";
  if (ketQua.datHocTap !== true) {
    return `Không đạt kết quả học tập/thi${ketQua.ghiChu ? ` (${ketQua.ghiChu})` : ""}`;
  }
  if (!dangKy || dangKy.trangThai === "THOI_HOC") return "Đã thôi học/không còn trong khóa";

  if (!(await daHoanTatNghiaVuTaiChinh(hocVienId, khoaId))) {
    const hopDong = dangKy.hopDongLienKet;
    return hopDong
      ? `Chờ thanh lý hợp đồng liên kết ${hopDong.maHopDong} (${hopDong.donViLienKet.ten})`
      : "Chưa hoàn tất học phí cá nhân";
  }
  return null;
}

/**
 * CC-01 (xem trước): phân loại mọi học viên có kết quả đã phê duyệt của khóa
 * thành đủ điều kiện / không đủ (kèm lý do) / đã có chứng chỉ hoặc đề nghị -
 * "không phân biệt phương thức đăng ký ban đầu".
 */
export async function xetDeNghiCapChungChi(khoaId: string) {
  const khoa = await prisma.khoa.findUnique({ where: { id: khoaId } });
  if (!khoa) throw new KhongTimThayKhoaError();
  if (!(await khoaDaPheDuyetKetQua(khoaId))) throw new ChuaPheDuyetKetQuaError();

  const [dsKetQua, dsChungChi] = await Promise.all([
    prisma.ketQuaKhoa.findMany({
      where: { khoaId, daPheDuyet: true },
      include: { hocVien: true },
      orderBy: { hocVien: { hoTen: "asc" } },
    }),
    prisma.chungChi.findMany({ where: { khoaId, trangThai: { in: [...TRANG_THAI_CON_HIEU_LUC] } } }),
  ]);
  const chungChiTheoHocVien = new Map(dsChungChi.map((cc) => [cc.hocVienId, cc]));

  const duDieuKien: typeof dsKetQua = [];
  const khongDuDieuKien: ((typeof dsKetQua)[number] & { lyDo: string })[] = [];
  const daCoChungChi: ((typeof dsKetQua)[number] & { trangThaiChungChi: string })[] = [];
  for (const kq of dsKetQua) {
    const chungChi = chungChiTheoHocVien.get(kq.hocVienId);
    if (chungChi) {
      daCoChungChi.push({ ...kq, trangThaiChungChi: chungChi.trangThai });
      continue;
    }
    const lyDo = await lyDoKhongDuDieuKien(kq.hocVienId, khoaId);
    if (lyDo) khongDuDieuKien.push({ ...kq, lyDo });
    else duDieuKien.push(kq);
  }
  return { duDieuKien, khongDuDieuKien, daCoChungChi };
}

/**
 * CC-01: lập danh sách đề nghị = tạo chứng chỉ trạng thái DE_NGHI cho mọi học
 * viên đủ điều kiện chưa có chứng chỉ. Chạy lại được nhiều lần (vd sau khi 1
 * hợp đồng liên kết được thanh lý) - chỉ bổ sung người mới đủ điều kiện.
 */
export async function lapDanhSachDeNghi(
  khoaId: string,
  nguoi: { nguoiThucHienId?: string | null; nguoiThucHienTen: string },
) {
  const { duDieuKien } = await xetDeNghiCapChungChi(khoaId);
  if (duDieuKien.length === 0) return [];
  // chụp loại văn bằng của chương trình tại thời điểm đề nghị (CT-01 bổ sung)
  const { chuongTrinh } = await prisma.khoa.findUniqueOrThrow({
    where: { id: khoaId },
    include: { chuongTrinh: true },
  });

  const dsTao = await prisma.$transaction(
    duDieuKien.map((kq) =>
      prisma.chungChi.create({
        data: {
          hocVienId: kq.hocVienId,
          khoaId,
          trangThai: "DE_NGHI",
          loaiVanBang: chuongTrinh.loaiVanBang,
          nguoiDeNghi: nguoi.nguoiThucHienTen,
        },
        include: { hocVien: true },
      }),
    ),
  );

  await ghiNhatKy({
    nguoiThucHienId: nguoi.nguoiThucHienId,
    nguoiThucHienTen: nguoi.nguoiThucHienTen,
    hanhDong: "LAP_DE_NGHI_CAP_CHUNG_CHI",
    doiTuong: "Khoa",
    doiTuongId: khoaId,
    chiTiet: `${dsTao.length} học viên: ${dsTao.map((cc) => cc.hocVien.hoTen).join(", ")}`,
  });

  return dsTao;
}

/**
 * CC-01 (bổ sung 26/09/2026): danh sách học viên HOÀN THÀNH chương trình để
 * làm hồ sơ ban hành quyết định cấp văn bằng = đủ điều kiện (xem
 * lyDoKhongDuDieuKien) + đã có văn bằng chưa hủy. Lọc theo 1 lớp (KH-07) hoặc
 * cả khóa (lopId trống).
 */
export async function danhSachHoanThanh(khoaId: string, lopId?: string | null) {
  const { duDieuKien, daCoChungChi } = await xetDeNghiCapChungChi(khoaId);
  const dsKetQua = [...duDieuKien, ...daCoChungChi];
  const hocVienIds = dsKetQua.map((kq) => kq.hocVienId);

  const [khoa, lop, dsDangKy, dsChungChi] = await Promise.all([
    prisma.khoa.findUniqueOrThrow({ where: { id: khoaId }, include: { chuongTrinh: true } }),
    lopId ? prisma.lopHoc.findFirst({ where: { id: lopId, khoaId } }) : null,
    prisma.dangKyHoc.findMany({
      where: { khoaId, hocVienId: { in: hocVienIds } },
      include: { lop: true, hopDongLienKet: { include: { donViLienKet: true } } },
    }),
    prisma.chungChi.findMany({
      where: { khoaId, hocVienId: { in: hocVienIds }, trangThai: { in: [...TRANG_THAI_CON_HIEU_LUC] } },
    }),
  ]);
  if (lopId && !lop) throw new KhongTimThayLopError();
  const dangKyTheoHocVien = new Map(dsDangKy.map((dk) => [dk.hocVienId, dk]));
  const chungChiTheoHocVien = new Map(dsChungChi.map((cc) => [cc.hocVienId, cc]));

  const dong = dsKetQua
    .map((kq) => {
      const dangKy = dangKyTheoHocVien.get(kq.hocVienId);
      const chungChi = chungChiTheoHocVien.get(kq.hocVienId);
      return {
        hocVienId: kq.hocVienId,
        maHocVien: kq.hocVien.maHocVien,
        hoTen: kq.hocVien.hoTen,
        ngaySinh: kq.hocVien.ngaySinh,
        donViCongTac: kq.hocVien.donViCongTac,
        lopId: dangKy?.lopId ?? null,
        maLop: dangKy?.lop?.maLop ?? null,
        donViLienKet: dangKy?.hopDongLienKet?.donViLienKet.ten ?? null,
        diemTongKet: kq.diemTongKet === null ? null : Number(kq.diemTongKet),
        tyLeChuyenCan: kq.tyLeChuyenCan === null ? null : Number(kq.tyLeChuyenCan),
        soHieu: chungChi?.soHieu ?? null,
        soQuyetDinh: chungChi?.soQuyetDinh ?? null,
      };
    })
    .filter((d) => !lopId || d.lopId === lopId)
    .sort((a, b) => a.hoTen.localeCompare(b.hoTen, "vi"));

  return { khoa, lop, dong };
}

export async function danhSachChungChiCuaKhoa(khoaId: string) {
  return prisma.chungChi.findMany({
    where: { khoaId },
    include: {
      hocVien: true,
      banGiao: true,
      khoa: { include: { chuongTrinh: true } },
    },
    orderBy: [{ soHieu: "asc" }, { hocVien: { hoTen: "asc" } }],
  });
}
