import { prisma } from "@/lib/db/prisma";
import { ghiThaoTac, HE_THONG, type NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";
import { cuoiNgayVN } from "@/server/services/kh/kh-05-trang-thai-si-so";
import { taoKhoaVoiMaTuSinh } from "@/server/services/kh/dung-chung";
import {
  SaiTrangThaiChuongTrinhError,
  KhongTimThayChuongTrinhError,
} from "@/server/services/ct/loi-chuong-trinh";
import { KhongTimThayKhoaError, KhongXoaDuocKhoaError, TenKhoaKhongHopLeError } from "@/server/services/kh/loi-khoa";

export type KhoiTaoKhoaInput = {
  chuongTrinhId: string;
  // (bổ sung 06/10/2026) tên khóa, vd. "Thi chuẩn đầu ra tiếng Anh đợt tháng 11 năm 2026"
  tenKhoa?: string | null;
  thoiGianKhaiGiang?: Date | string | null;
  thoiGianBeGiang?: Date | string | null;
  siSoToiDa: number;
  mucHocPhi?: number | string | null;
  dotTuyenSinhId?: string | null;
  // (bổ sung 01/10/2026) "yyyy-mm-dd" - nhận đăng ký đến hết ngày này
  hanDangKy?: string | null;
};

/**
 * KH-01: khởi tạo khóa từ 1 chương trình Đã ban hành - "chỉ khởi tạo từ
 * chương trình Đã ban hành". Khóa "kế thừa phương thức đăng ký đã khai báo
 * ở chương trình" bằng cách đọc qua quan hệ chuongTrinh.phuongThucDangKy
 * (CT-07) khi cần, không sao chép lại thành trường riêng trên Khoa - tránh
 * 2 nơi lưu cùng 1 giá trị có thể lệch nhau.
 */
export async function khoiTaoKhoa(input: KhoiTaoKhoaInput, nguoi: NguoiThucHien = HE_THONG) {
  const chuongTrinh = await prisma.chuongTrinh.findUnique({
    where: { id: input.chuongTrinhId },
  });
  if (!chuongTrinh) throw new KhongTimThayChuongTrinhError();
  if (chuongTrinh.trangThai !== "DA_BAN_HANH") {
    throw new SaiTrangThaiChuongTrinhError(
      "Chỉ khởi tạo khóa từ chương trình ở trạng thái Đã ban hành",
    );
  }

  const tenKhoa = chuanHoaTenKhoa(input.tenKhoa);

  const khoa = await taoKhoaVoiMaTuSinh((maKhoa) =>
    prisma.khoa.create({
      data: {
        maKhoa,
        tenKhoa,
        chuongTrinhId: input.chuongTrinhId,
        thoiGianKhaiGiang: input.thoiGianKhaiGiang ? new Date(input.thoiGianKhaiGiang) : null,
        thoiGianBeGiang: input.thoiGianBeGiang ? new Date(input.thoiGianBeGiang) : null,
        siSoToiDa: input.siSoToiDa,
        mucHocPhi: input.mucHocPhi ?? null,
        dotTuyenSinhId: input.dotTuyenSinhId ?? null,
        hanDangKy: input.hanDangKy ? cuoiNgayVN(input.hanDangKy) : null,
      },
      include: { chuongTrinh: true },
    }),
  );
  // QT-03 (mã khóa tự sinh có thử lại khi trùng -> ghi sau khi tạo xong)
  await ghiThaoTac(
    nguoi,
    "KHOI_TAO_KHOA",
    "Khoa",
    khoa.id,
    `${khoa.maKhoa}${tenKhoa ? ` "${tenKhoa}"` : ""} từ chương trình ${chuongTrinh.maCT} - sĩ số ${khoa.siSoToiDa}`,
  );
  return khoa;
}

export const TEN_KHOA_TOI_DA = 200;

/** null/undefined = không đặt tên (hiển thị theo tên chương trình); chuỗi rỗng sau khi cắt khoảng trắng bị chặn. */
function chuanHoaTenKhoa(ten: string | null | undefined) {
  if (ten === null || ten === undefined) return null;
  const t = ten.trim().replace(/\s+/g, " ");
  if (!t) throw new TenKhoaKhongHopLeError("Chưa nhập tên khóa");
  if (t.length > TEN_KHOA_TOI_DA) throw new TenKhoaKhongHopLeError(`Tên khóa tối đa ${TEN_KHOA_TOI_DA} ký tự`);
  return t;
}

/** Tên hiển thị của khóa: tên khóa đã đặt, chưa đặt thì theo tên chương trình. */
export const tenHienThiKhoa = (k: { tenKhoa: string | null; chuongTrinh: { ten: string } }) => k.tenKhoa ?? k.chuongTrinh.ten;

/**
 * (bổ sung 06/10/2026 - KH-01) Xóa khóa tạo sai: chỉ khi khóa chưa có hồ sơ đăng ký nào (kể cả đã
 * hủy/không hợp lệ) và chưa phát sinh dữ liệu nghiệp vụ (học phí, hợp đồng liên kết, kết quả, văn
 * bằng, tài liệu, bài làm). Buổi học, phân công giảng viên, lớp, thành phần lệ phí của khóa bị xóa
 * theo. Ghi nhật ký. Khóa hàng khóa (FOR UPDATE) để không xóa khi đang có người đăng ký cùng lúc.
 */
export async function xoaKhoa(khoaId: string, nguoi: NguoiThucHien = HE_THONG) {
  return prisma.$transaction(async (tx) => {
    const dsKhoa = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM khoa WHERE id = ${khoaId} FOR UPDATE`;
    if (dsKhoa.length === 0) throw new KhongTimThayKhoaError();
    const khoa = await tx.khoa.findUniqueOrThrow({
      where: { id: khoaId },
      include: {
        chuongTrinh: { select: { maCT: true, ten: true } },
        _count: {
          select: {
            dangKys: true,
            hocPhis: true,
            hopDongs: true,
            ketQuas: true,
            ketQuaKhoas: true,
            chungChis: true,
            quyetDinhCapVanBangs: true,
            taiLieus: true,
            lanLamTracNghiems: true,
            baiNopSanPhams: true,
          },
        },
      },
    });
    const c = khoa._count;
    if (c.dangKys > 0) throw new KhongXoaDuocKhoaError(`khóa đã có ${c.dangKys} hồ sơ đăng ký`);
    const vuong = [
      [c.hocPhis, "khoản học phí"],
      [c.hopDongs, "hợp đồng liên kết"],
      [c.ketQuas + c.ketQuaKhoas, "kết quả học tập"],
      [c.chungChis + c.quyetDinhCapVanBangs, "văn bằng/quyết định cấp"],
      [c.taiLieus, "tài liệu học tập"],
      [c.lanLamTracNghiems + c.baiNopSanPhams, "bài làm/bài nộp"],
    ].filter(([n]) => (n as number) > 0);
    if (vuong.length > 0) throw new KhongXoaDuocKhoaError(`khóa đã có ${vuong.map(([n, ten]) => `${n} ${ten}`).join(", ")}`);

    await tx.buoiHoc.deleteMany({ where: { khoaId } });
    await tx.giangVienHocPhan.deleteMany({ where: { khoaId } });
    await tx.thanhPhanLePhi.deleteMany({ where: { khoaId } });
    await tx.lopHoc.deleteMany({ where: { khoaId } });
    await tx.khoa.delete({ where: { id: khoaId } });
    await ghiThaoTac(
      nguoi,
      "XOA_KHOA",
      "Khoa",
      khoaId,
      `${khoa.maKhoa} · ${tenHienThiKhoa(khoa)} (chương trình ${khoa.chuongTrinh.maCT}) - xóa khóa tạo sai, chưa có đăng ký`,
      tx,
    );
    return { maKhoa: khoa.maKhoa };
  });
}

export async function danhSachKhoa() {
  return prisma.khoa.findMany({
    include: { chuongTrinh: true, _count: { select: { dangKys: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function layKhoa(id: string) {
  return prisma.khoa.findUnique({
    where: { id },
    include: {
      chuongTrinh: { include: { hocPhans: { orderBy: { thuTu: "asc" } } } },
      dotTuyenSinh: true,
    },
  });
}
