import { prisma } from "@/lib/db/prisma";
import { ghiThaoTac, HE_THONG, type NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";
import {
  KhongTimThayKhoaError,
  DanhSachXetDuyetRongError,
  DanhSachXetDuyetKhongHopLeError,
  VuotSiSoKhiXetDuyetError,
  ChuaXacNhanLePhiKhiXetDuyetError,
  ThieuMinhChungKhiDuyetError,
} from "@/server/services/hv/loi-hoc-vien";
import { guiThongBao } from "@/server/services/hv/hv-10-thong-bao";
import { damBaoHocPhiChoDuyet, taoHocPhiSauKhiChinhThuc } from "@/server/services/hp/hp-01-thiet-lap";
import { canXacNhanHocPhiTruoc, lePhiDaXacNhan, TRANG_THAI_CHO_DUYET } from "@/server/services/hp/thanh-phan-le-phi-chung";
import { minhChungConThieu } from "@/server/services/hv/form-dang-ky";
import type { TrangThaiDangKy } from "@/generated/prisma/client";

/**
 * HV-07 (actor "Lãnh đạo đơn vị" - đã gộp vào vai trò CAN_BO_QUAN_LY_DAO_TAO,
 * xem quyết định RBAC 6 vai trò): duyệt 1 lô hồ sơ đã Hợp lệ (HV-06) thành
 * danh sách chính thức. "Số lượng chính thức không vượt sĩ số tối đa" - so
 * đếm CHINH_THUC hiện có + số hồ sơ sắp duyệt trong lô này, không tính
 * chung với các trạng thái khác (HOP_LE dù đang chiếm 1 chỗ tạm tính ở
 * KH-05 vẫn có thể không được chọn duyệt hết nếu vượt sĩ số - ví dụ tuyển
 * chọn cạnh tranh).
 * (sửa 11/10/2026) hồ sơ Phương thức 1/3 phải được xác nhận học phí/lệ phí trước
 * (canXacNhanHocPhiTruoc) - trước đây chỉ khóa dự thi.
 */
export async function xetDuyetDanhSachChinhThuc(
  khoaId: string,
  dsDangKyId: string[],
  nguoi: NguoiThucHien = HE_THONG,
) {
  return duyetLo(khoaId, dsDangKyId, ["HOP_LE"], nguoi);
}

/**
 * (bổ sung 11/10/2026 - HV-06/HV-07 gộp 1 bước) Cán bộ đào tạo duyệt thẳng hồ sơ đang chờ
 * (đã nộp giấy, đã xác nhận tham gia, chờ duyệt, Hợp lệ) vào danh sách chính thức - không
 * qua bước thẩm định Hợp lệ riêng. Chặn cả lô khi có hồ sơ: không còn chờ duyệt, thiếu minh
 * chứng bắt buộc, chưa được xác nhận học phí/lệ phí (PT1, PT3), hoặc vượt sĩ số.
 */
export async function duyetHoSoChinhThuc(khoaId: string, dsDangKyId: string[], nguoi: NguoiThucHien = HE_THONG) {
  const ds = [...new Set(dsDangKyId)];
  const thieu: string[] = [];
  for (const dk of await prisma.dangKyHoc.findMany({ where: { id: { in: ds }, khoaId }, include: { hocVien: true } })) {
    if ((await minhChungConThieu(dk.id)).length > 0) thieu.push(`${dk.hocVien.hoTen} (${dk.hocVien.maHocVien})`);
  }
  if (thieu.length > 0) throw new ThieuMinhChungKhiDuyetError(thieu);
  return duyetLo(khoaId, ds, [...TRANG_THAI_CHO_DUYET], nguoi);
}

async function duyetLo(khoaId: string, dsDangKyId: string[], trangThaiNhan: TrangThaiDangKy[], nguoi: NguoiThucHien) {
  const khoa = await prisma.khoa.findUnique({ where: { id: khoaId }, include: { chuongTrinh: true } });
  if (!khoa) throw new KhongTimThayKhoaError();
  if (dsDangKyId.length === 0) throw new DanhSachXetDuyetRongError();

  // kiểm tra hợp lệ + sĩ số + cập nhật + nhật ký trong 1 transaction, khóa theo
  // khóa học: 2 lần duyệt đồng thời không cùng lọt qua kiểm tra sĩ số
  const ketQua = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`, `HV07:${khoaId}`);
    const dsHopLe = await tx.dangKyHoc.findMany({
      where: { id: { in: dsDangKyId }, khoaId, trangThai: { in: trangThaiNhan } },
    });
    if (dsHopLe.length !== dsDangKyId.length) throw new DanhSachXetDuyetKhongHopLeError();
    const canXacNhan = dsHopLe.filter((dk) => canXacNhanHocPhiTruoc(dk, khoa.chuongTrinh.phuongThucDangKys));
    const chuaXacNhan = await hocVienChuaXacNhanLePhi(khoa, canXacNhan.map((dk) => dk.hocVienId), tx);
    if (chuaXacNhan.size > 0) {
      const ds = await tx.hocVien.findMany({ where: { id: { in: [...chuaXacNhan] } }, select: { hoTen: true, maHocVien: true } });
      throw new ChuaXacNhanLePhiKhiXetDuyetError(ds.map((hv) => `${hv.hoTen} (${hv.maHocVien})`));
    }

    const soChinhThucHienTai = await tx.dangKyHoc.count({
      where: { khoaId, trangThai: "CHINH_THUC" },
    });
    const choConLai = khoa.siSoToiDa - soChinhThucHienTai;
    if (dsHopLe.length > choConLai) throw new VuotSiSoKhiXetDuyetError(Math.max(choConLai, 0));

    await tx.dangKyHoc.updateMany({
      where: { id: { in: dsDangKyId } },
      data: { trangThai: "CHINH_THUC" },
    });
    const daDuyet = await tx.dangKyHoc.findMany({
      where: { id: { in: dsDangKyId } },
      include: { hocVien: true },
    });
    await ghiThaoTac(
      nguoi,
      "XET_DUYET_CHINH_THUC",
      "Khoa",
      khoaId,
      `${khoa.maKhoa}: duyệt ${daDuyet.length} học viên - ${daDuyet.map((dk) => dk.hocVien.maHocVien).join(", ")}`,
      tx,
    );
    return daDuyet;
  });

  for (const dk of ketQua) {
    await guiThongBao(
      dk.hocVienId,
      "TRUNG_TUYEN",
      `Trúng tuyển chính thức khóa ${khoa.maKhoa}`,
      `Chúc mừng bạn đã trúng tuyển chính thức vào khóa ${khoa.maKhoa}.`,
    );
    await taoHocPhiSauKhiChinhThuc(dk.id);
  }

  return ketQua;
}

/**
 * Các học viên (trong danh sách) chưa được xác nhận lệ phí của khóa (bổ sung 06/10/2026 -
 * khóa có thành phần lệ phí: xét các thành phần bắt buộc - xem lePhiDaXacNhan).
 */
export async function hocVienChuaXacNhanLePhi(
  khoa: { id: string; mucHocPhi: unknown },
  dsHocVienId: string[],
  db: Pick<typeof prisma, "hocPhi"> = prisma,
) {
  const coLePhi = khoa.mucHocPhi !== null && Number(khoa.mucHocPhi) > 0;
  const dsHocPhi = await db.hocPhi.findMany({
    where: { khoaId: khoa.id, hocVienId: { in: dsHocVienId } },
    include: { thanhPhans: { include: { thanhPhan: true } } },
  });
  const theoHv = new Map(dsHocPhi.map((h) => [h.hocVienId, h]));
  return new Set(dsHocVienId.filter((id) => !lePhiDaXacNhan(theoHv.get(id), coLePhi)));
}

export async function danhSachHopLeChoXetDuyet(khoaId: string) {
  const [khoa, ds] = await Promise.all([
    prisma.khoa.findUnique({ where: { id: khoaId }, include: { chuongTrinh: true } }),
    prisma.dangKyHoc.findMany({
      where: { khoaId, trangThai: "HOP_LE" },
      include: { hocVien: true },
      orderBy: { ngayDangKy: "asc" },
    }),
  ]);
  const chuaXacNhan = khoa
    ? await hocVienChuaXacNhanLePhi(
        khoa,
        ds.filter((dk) => canXacNhanHocPhiTruoc(dk, khoa.chuongTrinh.phuongThucDangKys)).map((dk) => dk.hocVienId),
      )
    : new Set<string>();
  return ds.map((dk) => ({ ...dk, chuaXacNhanLePhi: chuaXacNhan.has(dk.hocVienId) }));
}

const NHAN_HOC_PHI: Record<string, string> = {
  CHUA_NOP: "Chưa nộp",
  CON_NO: "Nộp thiếu",
  DA_NOP_DU: "Đã nộp đủ",
  MIEN_GIAM: "Miễn giảm",
};

/**
 * (bổ sung 11/10/2026 - HV-06/HV-07 gộp 1 bước) Hồ sơ chờ cán bộ đào tạo duyệt của khóa, kèm
 * tình trạng học phí/lệ phí: hocPhi = null khi hồ sơ không phải xác nhận trước (PT2, PT4,
 * khóa không thu); duocDuyet = đã xác nhận (hoặc không phải xác nhận). Lập bù khoản học phí
 * còn thiếu cho hồ sơ PT1 trước khi đọc (damBaoHocPhiChoDuyet).
 */
export async function danhSachChoDuyet(khoaId: string) {
  await damBaoHocPhiChoDuyet(khoaId);
  const [khoa, ds] = await Promise.all([
    prisma.khoa.findUnique({ where: { id: khoaId }, include: { chuongTrinh: true } }),
    prisma.dangKyHoc.findMany({
      where: { khoaId, trangThai: { in: [...TRANG_THAI_CHO_DUYET] } },
      include: { hocVien: true },
      orderBy: { ngayDangKy: "asc" },
    }),
  ]);
  if (!khoa) return [];
  const coLePhi = khoa.mucHocPhi !== null && Number(khoa.mucHocPhi) > 0;
  const canXacNhan = new Set(ds.filter((dk) => canXacNhanHocPhiTruoc(dk, khoa.chuongTrinh.phuongThucDangKys)).map((dk) => dk.id));
  const dsHocPhi = await prisma.hocPhi.findMany({
    where: { khoaId, hocVienId: { in: ds.filter((dk) => canXacNhan.has(dk.id)).map((dk) => dk.hocVienId) } },
    include: { thanhPhans: { include: { thanhPhan: true } } },
  });
  const theoHv = new Map(dsHocPhi.map((h) => [h.hocVienId, h]));
  return ds.map((dk) => {
    if (!canXacNhan.has(dk.id) || !coLePhi) return { ...dk, hocPhi: null, duocDuyet: true };
    const hp = theoHv.get(dk.hocVienId);
    const daXacNhan = lePhiDaXacNhan(hp, coLePhi);
    const nhan = !hp
      ? "Chưa lập khoản"
      : hp.boQuaKiemTra && !lePhiDaXacNhan({ ...hp, boQuaKiemTra: false }, coLePhi)
        ? "Bỏ chặn (HP-06)"
        : (NHAN_HOC_PHI[hp.trangThai] ?? hp.trangThai);
    return { ...dk, hocPhi: { nhan, daXacNhan }, duocDuyet: daXacNhan };
  });
}

export async function danhSachChinhThuc(khoaId: string) {
  return prisma.dangKyHoc.findMany({
    where: { khoaId, trangThai: "CHINH_THUC" },
    include: { hocVien: true },
    orderBy: { ngayDangKy: "asc" },
  });
}
