import { prisma } from "@/lib/db/prisma";
import type { MucBoSung, TruongForm } from "@/lib/form-dang-ky";
import { cauHinhHieuLuc } from "@/server/services/hv/form-dang-ky";
import { chuanHoaSoDinhDanh } from "@/server/services/hv/hv-03-danh-sach-sinh-vien";
import { chuanHoaEmail, laEmailHopLe } from "@/lib/email";
import { chuanHoaSoDienThoai } from "@/server/services/hv/hv-05-dang-ky-du-thi";
import { khoaDaPheDuyetKetQua } from "@/server/services/kq/dung-chung";
import { ghiThaoTac, type NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";
import {
  CccdTrungError,
  DieuChinhThongTinKhongHopLeError,
  KhongTimThayDangKyError,
} from "@/server/services/hv/loi-hoc-vien";

/**
 * (bổ sung 05/10/2026 - HV-06) Cán bộ đào tạo điều chỉnh thông tin thí sinh khi
 * thẩm định hồ sơ (gõ sai họ tên/CCCD/ngày sinh...): sửa hồ sơ học viên (dùng
 * chung mọi khóa - HV-08), câu trả lời trường tùy chỉnh và số điện thoại xác thực
 * (Phương thức 3) của hồ sơ đăng ký. Bắt buộc lý do, ghi nhật ký từng trường đổi;
 * không điều chỉnh sau khi kết quả khóa đã phê duyệt (KQ-04).
 */

// trường tùy chỉnh sửa được ở đây (tệp minh chứng do thí sinh nộp, không sửa thay)
const truongSuaDuoc = (t: TruongForm) => !t.coSan && t.kieu !== "TEP" && t.hien;

export async function thongTinDieuChinh(dangKyId: string) {
  const dangKy = await prisma.dangKyHoc.findUnique({
    where: { id: dangKyId },
    include: { hocVien: true, khoa: { include: { chuongTrinh: true } } },
  });
  if (!dangKy) throw new KhongTimThayDangKyError();
  const { cauHinh } = await cauHinhHieuLuc(dangKy.khoaId);
  const boSung = Array.isArray(dangKy.thongTinBoSung) ? (dangKy.thongTinBoSung as MucBoSung[]) : [];
  return {
    dangKy,
    laDuThi: dangKy.khoa.chuongTrinh.phuongThucDangKys.includes("CHI_DU_THI"),
    daPheDuyet: await khoaDaPheDuyetKetQua(dangKy.khoaId),
    dsTruong: cauHinh.truong.filter(truongSuaDuoc).map((t) => ({ ...t, giaTri: boSung.find((b) => b.ma === t.ma)?.giaTri ?? "" })),
  };
}

export type DieuChinhThongTinInput = {
  hoTen: string;
  soCCCD: string;
  ngaySinh: string | null;
  soDienThoai: string | null;
  email: string | null;
  donViCongTac: string | null;
  // chỉ áp dụng khóa Phương thức 3
  soDienThoaiXacThuc?: string | null;
  boSung: Record<string, string>;
  lyDo: string;
};

export async function dieuChinhThongTinThiSinh(dangKyId: string, input: DieuChinhThongTinInput, nguoi: NguoiThucHien) {
  const { dangKy, laDuThi, daPheDuyet, dsTruong } = await thongTinDieuChinh(dangKyId);
  const loi = (lyDo: string) => new DieuChinhThongTinKhongHopLeError(lyDo);
  if (daPheDuyet) throw loi("kết quả khóa đã được phê duyệt (KQ-04)");
  const lyDo = input.lyDo.trim();
  if (!lyDo) throw loi("chưa nhập lý do điều chỉnh");

  const hoTen = input.hoTen.trim().replace(/\s+/g, " ");
  if (!hoTen) throw loi("họ tên không được để trống");
  // (sửa 07/10/2026) nhận cả số hộ chiếu của thí sinh nước ngoài
  const soCCCD = chuanHoaSoDinhDanh(input.soCCCD);
  if (!soCCCD) throw loi("chưa nhập số CCCD/hộ chiếu");
  const ngaySinh = input.ngaySinh?.trim() || null;
  if (ngaySinh && Number.isNaN(Date.parse(ngaySinh))) throw loi("ngày sinh không hợp lệ");
  const email = chuanHoaEmail(input.email) || null;
  if (email && !laEmailHopLe(email)) throw loi("email chưa đúng định dạng (ví dụ: ten@gmail.com)");
  let soDienThoaiXacThuc = dangKy.soDienThoaiXacThuc;
  if (laDuThi) {
    soDienThoaiXacThuc = chuanHoaSoDienThoai(input.soDienThoaiXacThuc);
    if (!soDienThoaiXacThuc) throw loi("số điện thoại xác thực không hợp lệ (10 chữ số, bắt đầu bằng 0)");
  }

  // trường tùy chỉnh: theo cấu hình form hiện tại của khóa
  const boSungMoi: MucBoSung[] = [];
  for (const t of dsTruong) {
    const giaTri = t.coDinh && t.macDinh ? t.macDinh : (input.boSung[t.ma] ?? "").trim();
    if (t.batBuoc && !giaTri) throw loi(`"${t.nhan}" là trường bắt buộc`);
    if (giaTri && t.luaChon.length > 0 && !t.luaChon.includes(giaTri)) throw loi(`"${t.nhan}": giá trị không thuộc danh sách chọn`);
    if (giaTri && t.kieu === "SO" && !Number.isFinite(Number(giaTri))) throw loi(`"${t.nhan}" phải là số`);
    if (giaTri && t.kieu === "NGAY" && Number.isNaN(Date.parse(giaTri))) throw loi(`"${t.nhan}" phải là ngày`);
    if (giaTri.length > 1000) throw loi(`"${t.nhan}" quá dài`);
    if (giaTri) boSungMoi.push({ ma: t.ma, nhan: t.nhan, kieu: t.kieu, giaTri });
  }

  const hv = dangKy.hocVien;
  if (soCCCD !== hv.soCCCD && (await prisma.hocVien.findUnique({ where: { soCCCD } }))) throw new CccdTrungError();

  const ngay = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");
  const doi: string[] = [];
  const ghi = (nhan: string, cu: string | null | undefined, moi: string | null | undefined) => {
    if ((cu ?? "") !== (moi ?? "")) doi.push(`${nhan}: "${cu ?? ""}" -> "${moi ?? ""}"`);
  };
  ghi("Họ tên", hv.hoTen, hoTen);
  ghi("Số CCCD", hv.soCCCD, soCCCD);
  ghi("Ngày sinh", ngay(hv.ngaySinh), ngaySinh ?? "");
  ghi("Số điện thoại", hv.soDienThoai, input.soDienThoai?.trim() || null);
  ghi("Email", hv.email, email);
  ghi("Đơn vị công tác", hv.donViCongTac, input.donViCongTac?.trim() || null);
  if (laDuThi) ghi("SĐT xác thực", dangKy.soDienThoaiXacThuc, soDienThoaiXacThuc);
  const boSungCu = Array.isArray(dangKy.thongTinBoSung) ? (dangKy.thongTinBoSung as MucBoSung[]) : [];
  for (const t of dsTruong) ghi(t.nhan, boSungCu.find((b) => b.ma === t.ma)?.giaTri, boSungMoi.find((b) => b.ma === t.ma)?.giaTri);
  if (doi.length === 0) throw loi("không có thông tin nào thay đổi");

  // giữ câu trả lời của trường không còn trong form hiện tại (nhãn tại thời điểm đăng ký)
  const giuLai = boSungCu.filter((b) => !dsTruong.some((t) => t.ma === b.ma));
  return prisma.$transaction(async (tx) => {
    await tx.hocVien.update({
      where: { id: hv.id },
      data: {
        hoTen,
        soCCCD,
        ngaySinh: ngaySinh ? new Date(ngaySinh) : null,
        soDienThoai: input.soDienThoai?.trim() || null,
        email,
        donViCongTac: input.donViCongTac?.trim() || null,
      },
    });
    const sau = await tx.dangKyHoc.update({
      where: { id: dangKy.id },
      data: { soDienThoaiXacThuc, thongTinBoSung: [...giuLai, ...boSungMoi] },
      include: { hocVien: true },
    });
    await ghiThaoTac(
      nguoi,
      "DIEU_CHINH_THONG_TIN_THI_SINH",
      "DangKyHoc",
      dangKy.id,
      `${hv.maHocVien} - khóa ${dangKy.khoa.maKhoa}: ${doi.join("; ")} - lý do: ${lyDo}`,
      tx,
    );
    return sau;
  });
}
