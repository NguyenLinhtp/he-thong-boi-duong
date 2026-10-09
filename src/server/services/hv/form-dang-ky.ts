import path from "node:path";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  CAU_HINH_MAC_DINH,
  MA_TEP_NOP_PHI,
  apDungSoDienThoaiXacThuc,
  chuanHoaCauHinh,
  docCauHinh,
  kiemTraDuLieu,
  tenInput,
  type CauHinhForm,
  type DuLieuForm,
  type KetQuaKiemTra,
  type MaTruongCoSan,
  type MucBoSung,
} from "@/lib/form-dang-ky";
import { luuTep, xoaTep } from "@/server/services/gd/luu-tru-hoc-lieu";
import { ghiThaoTac, type NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";
import { layThamSoSo } from "@/server/services/qt/qt-05-tham-so";
import { hocVienCuaTaiKhoan } from "@/server/services/kq/kq-05-tra-cuu";
import { KhongTimThayKhoaError, KhongTimThayDangKyError, KhongDuocXemTepHoSoError } from "@/server/services/hv/loi-hoc-vien";
import { donViLienKetCuaTaiKhoan } from "@/server/services/dvlk/dvlk-02-tai-khoan";
import { CauHinhFormKhongHopLeError, ThongTinDangKyKhongHopLeError } from "@/server/services/hv/loi-hoc-vien";

/**
 * Form đăng ký cấu hình theo chương trình, khóa được sửa riêng (bổ sung
 * 30/09/2026 - HV-01/04/05/11/12). Cấu hình hiệu lực của 1 khóa: form riêng
 * của khóa -> form của chương trình -> form mặc định (như trước khi có tính năng).
 */
export type NguonCauHinh = "KHOA" | "CHUONG_TRINH" | "MAC_DINH";

export async function cauHinhHieuLuc(khoaId: string): Promise<{ cauHinh: CauHinhForm; nguon: NguonCauHinh }> {
  const khoa = await prisma.khoa.findUnique({ where: { id: khoaId }, include: { chuongTrinh: true } });
  if (!khoa) throw new KhongTimThayKhoaError();
  const duThi = khoa.chuongTrinh.phuongThucDangKys.includes("CHI_DU_THI");
  // mã sinh viên chỉ dùng cho Phương thức 3 - chương trình đổi phương thức sau đó thì quay về CCCD;
  // (sửa 05/10/2026) form dự thi luôn có số điện thoại xác thực bắt buộc
  const hopLe = (c: CauHinhForm): CauHinhForm =>
    duThi ? apDungSoDienThoaiXacThuc(c) : c.dinhDanh === "MA_SINH_VIEN" ? { ...c, dinhDanh: "CCCD" } : c;
  const cuaKhoa = docCauHinh(khoa.cauHinhFormDangKy);
  if (cuaKhoa) return { cauHinh: hopLe(cuaKhoa), nguon: "KHOA" };
  const cuaCt = docCauHinh(khoa.chuongTrinh.cauHinhFormDangKy);
  if (cuaCt) return { cauHinh: hopLe(cuaCt), nguon: "CHUONG_TRINH" };
  return { cauHinh: hopLe(CAU_HINH_MAC_DINH), nguon: "MAC_DINH" };
}

function chanMaSinhVienNgoaiPT3(cauHinh: CauHinhForm | null, dsPhuongThuc: string[]) {
  if (cauHinh?.dinhDanh === "MA_SINH_VIEN" && !dsPhuongThuc.includes("CHI_DU_THI")) {
    throw new CauHinhFormKhongHopLeError("định danh bằng mã sinh viên chỉ áp dụng cho chương trình Phương thức 3 (đăng ký dự thi)");
  }
}

export async function cauHinhChuongTrinh(chuongTrinhId: string): Promise<CauHinhForm> {
  const ct = await prisma.chuongTrinh.findUnique({ where: { id: chuongTrinhId } });
  if (!ct) throw new CauHinhFormKhongHopLeError("không tìm thấy chương trình");
  return docCauHinh(ct.cauHinhFormDangKy) ?? CAU_HINH_MAC_DINH;
}

function chuanHoaHoacLoi(tho: unknown) {
  const kq = chuanHoaCauHinh(tho);
  if ("loi" in kq) throw new CauHinhFormKhongHopLeError(kq.loi);
  return kq.cauHinh;
}

export async function luuCauHinhChuongTrinh(chuongTrinhId: string, tho: unknown, nguoi: NguoiThucHien) {
  const ct = await prisma.chuongTrinh.findUnique({ where: { id: chuongTrinhId } });
  if (!ct) throw new CauHinhFormKhongHopLeError("không tìm thấy chương trình");
  if (ct.trangThai === "NGUNG_HIEU_LUC") throw new CauHinhFormKhongHopLeError("chương trình đã ngừng hiệu lực");
  const cauHinh = chuanHoaHoacLoi(tho);
  chanMaSinhVienNgoaiPT3(cauHinh, ct.phuongThucDangKys);
  await prisma.$transaction(async (tx) => {
    await tx.chuongTrinh.update({ where: { id: ct.id }, data: { cauHinhFormDangKy: cauHinh } });
    await ghiThaoTac(nguoi, "CAU_HINH_FORM_DANG_KY", "ChuongTrinh", ct.id, `${ct.maCT}: ${moTaCauHinh(cauHinh)}`, tx);
  });
  return cauHinh;
}

/** tho = null: bỏ form riêng, khóa quay về dùng form của chương trình. */
export async function luuCauHinhKhoa(khoaId: string, tho: unknown | null, nguoi: NguoiThucHien) {
  const khoa = await prisma.khoa.findUnique({ where: { id: khoaId }, include: { chuongTrinh: true } });
  if (!khoa) throw new KhongTimThayKhoaError();
  if (khoa.trangThai === "DA_KET_THUC" || khoa.trangThai === "HUY") throw new CauHinhFormKhongHopLeError("khóa đã kết thúc/hủy");
  const cauHinh = tho === null ? null : chuanHoaHoacLoi(tho);
  chanMaSinhVienNgoaiPT3(cauHinh, khoa.chuongTrinh.phuongThucDangKys);
  await prisma.$transaction(async (tx) => {
    await tx.khoa.update({ where: { id: khoa.id }, data: { cauHinhFormDangKy: cauHinh ?? Prisma.DbNull } });
    await ghiThaoTac(
      nguoi,
      "CAU_HINH_FORM_DANG_KY",
      "Khoa",
      khoa.id,
      `${khoa.maKhoa}: ${cauHinh ? moTaCauHinh(cauHinh) : "dùng lại form của chương trình"}`,
      tx,
    );
  });
  return cauHinh;
}

function moTaCauHinh(c: CauHinhForm) {
  const hien = c.truong.filter((t) => t.hien);
  return `${c.dinhDanh === "MA_SINH_VIEN" ? "định danh bằng mã sinh viên, " : ""}${hien.length} trường (${hien.filter((t) => t.batBuoc).length} bắt buộc, ${c.truong.filter((t) => !t.coSan).length} tùy chỉnh)`;
}

/** Đọc dữ liệu form HTML theo cấu hình: chữ theo tên input, tệp ở input cùng tên. */
export async function docDuLieuForm(cauHinh: CauHinhForm, formData: FormData): Promise<DuLieuForm> {
  const duLieu: DuLieuForm = { giaTri: {}, tep: {} };
  for (const t of cauHinh.truong) {
    const ten = tenInput(t);
    const v = formData.get(ten);
    if (t.kieu === "TEP") {
      if (v instanceof File && v.size > 0) duLieu.tep[ten] = { ten: v.name, loai: v.type || "application/octet-stream", noiDung: Buffer.from(await v.arrayBuffer()) };
    } else if (typeof v === "string") duLieu.giaTri[ten] = v.trim();
  }
  return duLieu;
}

/** Kiểm tra dữ liệu đăng ký theo cấu hình hiệu lực của khóa (throw lỗi nghiệp vụ). */
export async function kiemTraDangKyTheoKhoa(
  khoaId: string,
  duLieu: DuLieuForm,
  hienCo?: Partial<Record<MaTruongCoSan, string | null>>,
): Promise<KetQuaKiemTra> {
  const { cauHinh } = await cauHinhHieuLuc(khoaId);
  const [dsChucDanh, toiDaMb] = await Promise.all([
    prisma.chucDanhHocVi.findMany({ select: { id: true } }),
    layThamSoSo("DK_MINH_CHUNG_TOI_DA_MB", 10),
  ]);
  const kq = kiemTraDuLieu(cauHinh, duLieu, { dsChucDanhId: dsChucDanh.map((c) => c.id), hienCo, toiDaMb });
  if ("loi" in kq) throw new ThongTinDangKyKhongHopLeError(kq.loi);
  return kq.ketQua;
}

/** Lưu câu trả lời trường tùy chỉnh + tệp minh chứng của 1 hồ sơ đăng ký (ghi đè theo mã trường). */
export async function luuHoSoBoSung(dangKyId: string, kq: KetQuaKiemTra) {
  if (kq.boSung.length === 0 && kq.tep.length === 0) return;
  const dangKy = await prisma.dangKyHoc.findUnique({ where: { id: dangKyId }, include: { tepHoSos: true } });
  if (!dangKy) throw new KhongTimThayDangKyError();
  const cu = Array.isArray(dangKy.thongTinBoSung) ? (dangKy.thongTinBoSung as MucBoSung[]) : [];
  const moi = [...cu.filter((c) => !kq.boSung.some((b) => b.ma === c.ma)), ...kq.boSung];
  const daLuu: string[] = [];
  try {
    for (const { ma, nhan, tep } of kq.tep) {
      const khoaLuuTru = await luuTep(Buffer.from(tep.noiDung), path.extname(tep.ten).toLowerCase());
      daLuu.push(khoaLuuTru);
      const cuTep = dangKy.tepHoSos.find((x) => x.maTruong === ma);
      await prisma.tepHoSoDangKy.upsert({
        where: { dangKyId_maTruong: { dangKyId, maTruong: ma } },
        create: { dangKyId, maTruong: ma, nhanTruong: nhan, tenFile: tep.ten, loaiFile: tep.loai, kichThuoc: tep.noiDung.length, khoaLuuTru },
        update: { nhanTruong: nhan, tenFile: tep.ten, loaiFile: tep.loai, kichThuoc: tep.noiDung.length, khoaLuuTru, taiLenLuc: new Date() },
      });
      if (cuTep) await xoaTep(cuTep.khoaLuuTru).catch(() => {});
    }
    if (kq.boSung.length > 0) await prisma.dangKyHoc.update({ where: { id: dangKyId }, data: { thongTinBoSung: moi } });
  } catch (error) {
    for (const k of daLuu) await xoaTep(k).catch(() => {});
    throw error;
  }
}

/** Thông tin bổ sung + tệp minh chứng của 1 hồ sơ để hiển thị (đơn in, thẩm định). */
export async function hoSoBoSung(dangKyId: string) {
  const dangKy = await prisma.dangKyHoc.findUnique({
    where: { id: dangKyId },
    include: { tepHoSos: { orderBy: { taiLenLuc: "asc" } } },
  });
  if (!dangKy) throw new KhongTimThayDangKyError();
  return {
    thongTin: Array.isArray(dangKy.thongTinBoSung) ? (dangKy.thongTinBoSung as MucBoSung[]) : [],
    tep: dangKy.tepHoSos.map((t) => ({ id: t.id, maTruong: t.maTruong, nhan: t.nhanTruong, tenFile: t.tenFile, kichThuoc: t.kichThuoc })),
  };
}

/** Tên các tệp minh chứng BẮT BUỘC (theo cấu hình hiệu lực hiện tại) mà hồ sơ chưa nộp - HV-06. */
export async function minhChungConThieu(dangKyId: string): Promise<string[]> {
  const dangKy = await prisma.dangKyHoc.findUnique({ where: { id: dangKyId }, include: { tepHoSos: true } });
  if (!dangKy) throw new KhongTimThayDangKyError();
  const { cauHinh } = await cauHinhHieuLuc(dangKy.khoaId);
  return cauHinh.truong
    .filter((t) => t.hien && t.batBuoc && t.kieu === "TEP" && !dangKy.tepHoSos.some((x) => x.maTruong === t.ma))
    .map((t) => t.nhan);
}

/**
 * Tự điền từ hồ sơ cũ - CHỈ cho học viên đang đăng nhập (không tra theo CCCD
 * người ẩn danh gõ vào, tránh lộ thông tin người khác). Trường tùy chỉnh lấy
 * câu trả lời gần nhất có cùng tên trường ở các lần đăng ký trước.
 */
export async function giaTriTuHoSo(nguoiDungId: string | null | undefined, cauHinh: CauHinhForm) {
  if (!nguoiDungId) return null;
  const hv = await hocVienCuaTaiKhoan(nguoiDungId);
  if (!hv) return null;
  const giaTri: Record<string, string> = {
    hoTen: hv.hoTen,
    soCCCD: hv.soCCCD ?? "",
    ngaySinh: hv.ngaySinh ? hv.ngaySinh.toISOString().slice(0, 10) : "",
    soDienThoai: hv.soDienThoai ?? "",
    email: hv.email ?? "",
    donViCongTac: hv.donViCongTac ?? "",
    chucDanhHocViId: hv.chucDanhHocViId ?? "",
  };
  const dsDangKy = await prisma.dangKyHoc.findMany({
    where: { hocVienId: hv.id, NOT: { thongTinBoSung: { equals: Prisma.DbNull } } },
    orderBy: { ngayDangKy: "desc" },
    select: { thongTinBoSung: true },
  });
  const chuan = (s: string) => s.trim().toLowerCase();
  for (const t of cauHinh.truong) {
    if (t.coSan || t.kieu === "TEP") continue;
    for (const dk of dsDangKy) {
      const muc = (dk.thongTinBoSung as MucBoSung[]).find((m) => chuan(m.nhan) === chuan(t.nhan));
      if (muc && (t.luaChon.length === 0 || t.luaChon.includes(muc.giaTri))) {
        giaTri[tenInput(t)] = muc.giaTri;
        break;
      }
    }
  }
  return { giaTri, hoTen: hv.hoTen, maHocVien: hv.maHocVien };
}

// cán bộ xử lý hồ sơ tuyển sinh (xác nhận giấy, thẩm định, quản lý danh sách khóa)
const QUYEN_XEM_MOI_HO_SO = ["HV-02", "HV-06", "HV-09"];

/**
 * Tệp minh chứng chỉ xem được bởi: cán bộ xử lý hồ sơ tuyển sinh; chính học
 * viên của hồ sơ; cán bộ đơn vị liên kết của hợp đồng gắn với hồ sơ (DVLK-02:
 * không xem dữ liệu của đơn vị khác).
 */
export async function kiemTraQuyenXemTepHoSo(phien: { userId: string; maCNDuocPhep: string[] }, tepId: string) {
  const tep = await prisma.tepHoSoDangKy.findUnique({ where: { id: tepId }, include: { dangKy: { include: { hopDongLienKet: true } } } });
  if (!tep) throw new KhongDuocXemTepHoSoError();
  if (QUYEN_XEM_MOI_HO_SO.some((ma) => phien.maCNDuocPhep.includes(ma))) return tep;
  // (bổ sung 01/10/2026) cán bộ tài chính đối soát lệ phí: chỉ xem minh chứng chuyển khoản
  if (tep.maTruong === MA_TEP_NOP_PHI && phien.maCNDuocPhep.includes("HP-02")) return tep;
  const hv = await hocVienCuaTaiKhoan(phien.userId);
  if (hv && hv.id === tep.dangKy.hocVienId) return tep;
  const dv = await donViLienKetCuaTaiKhoan(phien.userId);
  if (dv && tep.dangKy.hopDongLienKet?.donViLienKetId === dv.id) return tep;
  throw new KhongDuocXemTepHoSoError();
}

export type HoSoBoSungRutGon = {
  thongTin: MucBoSung[];
  tep: { id: string; nhan: string; tenFile: string }[];
};

/** Thông tin bổ sung + tệp của nhiều hồ sơ (bảng cán bộ) - 1 truy vấn. */
export async function hoSoBoSungTheoDs(dangKyIds: string[]): Promise<Map<string, HoSoBoSungRutGon>> {
  const ds = await prisma.dangKyHoc.findMany({
    where: { id: { in: dangKyIds } },
    select: { id: true, thongTinBoSung: true, tepHoSos: { orderBy: { taiLenLuc: "asc" } } },
  });
  return new Map(
    ds.map((d) => [
      d.id,
      {
        thongTin: Array.isArray(d.thongTinBoSung) ? (d.thongTinBoSung as MucBoSung[]) : [],
        tep: d.tepHoSos.map((t) => ({ id: t.id, nhan: t.nhanTruong, tenFile: t.tenFile })),
      },
    ]),
  );
}
