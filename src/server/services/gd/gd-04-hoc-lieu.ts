import path from "node:path";
import { prisma } from "@/lib/db/prisma";
import { ghiNhatKy } from "@/server/services/qt/qt-03-nhat-ky";
import { layThamSoSo } from "@/server/services/qt/qt-05-tham-so";
import { timGiangVienChoHocPhan, giangVienHieuLuc } from "@/server/services/kh/kh-03-thoi-khoa-bieu";
import { hocVienCuaTaiKhoan } from "@/server/services/kq/kq-05-tra-cuu";
import { giangVienCuaTaiKhoan } from "@/server/services/gd/dung-chung";
import { luuTep, docTep, xoaTep } from "@/server/services/gd/luu-tru-hoc-lieu";
import {
  KhongPhaiTaiKhoanGiangVienError,
  KhongDuocXemTaiLieuError,
  KhongPhuTrachHocPhanError,
  TaiLieuKhongHopLeError,
  KhoaKhongGiangDayError,
  KhongTimThayTaiLieuError,
} from "@/server/services/gd/loi-giang-day";

/** Định dạng học liệu cho phép - tài liệu văn phòng, nén, ảnh, âm thanh/video; không nhận tệp thực thi. */
export const DUOI_CHO_PHEP = [
  ".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".txt",
  ".zip", ".rar", ".7z", ".jpg", ".jpeg", ".png", ".mp3", ".mp4",
];

/** Học viên "trong khóa" = đã được nhận chính thức (đang học hoặc đã hoàn thành). */
const TRANG_THAI_TRONG_KHOA = ["CHINH_THUC", "HOAN_THANH"] as const;

export type DangTaiLieuInput = {
  khoaId: string;
  hocPhanId: string;
  lopId?: string | null;
  tieuDe: string;
  moTa?: string | null;
  tep?: { ten: string; loai: string; noiDung: Buffer } | null;
  duongLink?: string | null;
};

/**
 * GD-04 (Giảng viên): tải lên / chia sẻ tài liệu theo học phần cho học viên
 * trong khóa. Chỉ giảng viên đang phụ trách học phần (KH-02, theo lớp nếu
 * chọn lớp - KH-07; cả khóa = phân công cấp khóa). Một tài liệu là 1 tệp
 * (định dạng cho phép, ≤ GD_HOC_LIEU_TOI_DA_MB, mặc định 20MB) hoặc 1 link.
 * Khóa Phương thức 3 không có giảng dạy nên không có học liệu.
 */
export async function dangTaiLieu(nguoiDungId: string, input: DangTaiLieuInput) {
  const giangVien = await giangVienCuaTaiKhoan(nguoiDungId);
  if (!giangVien) throw new KhongPhaiTaiKhoanGiangVienError();

  const tieuDe = input.tieuDe?.trim();
  if (!tieuDe) throw new TaiLieuKhongHopLeError("thiếu tiêu đề");
  const duongLink = input.duongLink?.trim() || null;
  const tep = input.tep && input.tep.noiDung.length > 0 ? input.tep : null;
  if (Boolean(tep) === Boolean(duongLink)) throw new TaiLieuKhongHopLeError("chọn đúng 1 trong 2: tệp tải lên hoặc đường link");
  if (duongLink && !/^https?:\/\/\S+$/i.test(duongLink)) throw new TaiLieuKhongHopLeError("đường link phải bắt đầu bằng http:// hoặc https://");
  let duoi = "";
  if (tep) {
    duoi = path.extname(tep.ten).toLowerCase();
    if (!DUOI_CHO_PHEP.includes(duoi)) throw new TaiLieuKhongHopLeError(`định dạng ${duoi || "(không có đuôi)"} không được phép`);
    const toiDaMb = await layThamSoSo("GD_HOC_LIEU_TOI_DA_MB", 20);
    if (tep.noiDung.length > toiDaMb * 1024 * 1024) throw new TaiLieuKhongHopLeError(`tệp vượt ${toiDaMb}MB`);
  }

  const khoa = await prisma.khoa.findUnique({ where: { id: input.khoaId }, include: { chuongTrinh: true } });
  if (!khoa) throw new TaiLieuKhongHopLeError("không tìm thấy khóa");
  if (khoa.chuongTrinh.phuongThucDangKys.includes("CHI_DU_THI")) throw new KhoaKhongGiangDayError();
  const lopId = input.lopId || null;
  if (lopId && !(await prisma.lopHoc.findFirst({ where: { id: lopId, khoaId: khoa.id } }))) {
    throw new TaiLieuKhongHopLeError("lớp không thuộc khóa");
  }
  if ((await timGiangVienChoHocPhan(khoa.id, input.hocPhanId, lopId)) !== giangVien.id) {
    throw new KhongPhuTrachHocPhanError();
  }

  const khoaLuuTru = tep ? await luuTep(tep.noiDung, duoi) : null;
  try {
    const taiLieu = await prisma.taiLieuHocTap.create({
      data: {
        khoaId: khoa.id,
        hocPhanId: input.hocPhanId,
        lopId,
        tieuDe,
        moTa: input.moTa?.trim() || null,
        tenFile: tep ? path.basename(tep.ten) : null,
        loaiFile: tep ? tep.loai || "application/octet-stream" : null,
        kichThuoc: tep ? tep.noiDung.length : null,
        khoaLuuTru,
        duongLink,
        giangVienId: giangVien.id,
        nguoiDang: giangVien.hoTen,
      },
      include: { hocPhan: true, lop: true },
    });
    await ghiNhatKy({
      nguoiThucHienId: nguoiDungId,
      nguoiThucHienTen: giangVien.hoTen,
      hanhDong: "DANG_TAI_LIEU_HOC_TAP",
      doiTuong: "TaiLieuHocTap",
      doiTuongId: taiLieu.id,
      chiTiet: `Khóa ${khoa.maKhoa}, học phần ${taiLieu.hocPhan.ten}${taiLieu.lop ? `, lớp ${taiLieu.lop.maLop}` : ""}: ${tieuDe}`,
    });
    return taiLieu;
  } catch (error) {
    if (khoaLuuTru) await xoaTep(khoaLuuTru); // không để tệp mồ côi
    throw error;
  }
}

/** GD-04: giảng viên đã đăng xóa tài liệu của mình (xóa cả tệp lưu trữ). */
export async function xoaTaiLieu(nguoiDungId: string, taiLieuId: string) {
  const giangVien = await giangVienCuaTaiKhoan(nguoiDungId);
  if (!giangVien) throw new KhongPhaiTaiKhoanGiangVienError();
  const taiLieu = await prisma.taiLieuHocTap.findUnique({ where: { id: taiLieuId } });
  if (!taiLieu) throw new KhongTimThayTaiLieuError();
  if (taiLieu.giangVienId !== giangVien.id) throw new KhongDuocXemTaiLieuError();
  await prisma.taiLieuHocTap.delete({ where: { id: taiLieuId } });
  if (taiLieu.khoaLuuTru) await xoaTep(taiLieu.khoaLuuTru);
  await ghiNhatKy({
    nguoiThucHienId: nguoiDungId,
    nguoiThucHienTen: giangVien.hoTen,
    hanhDong: "XOA_TAI_LIEU_HOC_TAP",
    doiTuong: "TaiLieuHocTap",
    doiTuongId: taiLieuId,
    chiTiet: taiLieu.tieuDe,
  });
}

/** Các (khóa, học phần, lớp) giảng viên đang phụ trách - để chọn khi đăng + tài liệu đã đăng. */
export async function hocLieuCuaGiangVien(nguoiDungId: string) {
  const giangVien = await giangVienCuaTaiKhoan(nguoiDungId);
  if (!giangVien) throw new KhongPhaiTaiKhoanGiangVienError();
  const [dsPhanCong, dsTaiLieu] = await Promise.all([
    prisma.giangVienHocPhan.findMany({
      where: {
        giangVienId: giangVien.id,
        khoa: { trangThai: { notIn: ["HUY"] }, chuongTrinh: { NOT: { phuongThucDangKys: { has: "CHI_DU_THI" } } } },
      },
      include: { khoa: { include: { chuongTrinh: true } }, hocPhan: true, lop: true },
      orderBy: [{ khoa: { maKhoa: "asc" } }, { hocPhan: { thuTu: "asc" } }],
    }),
    prisma.taiLieuHocTap.findMany({
      where: { giangVienId: giangVien.id },
      include: { khoa: true, hocPhan: true, lop: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return { giangVien, dsPhanCong, dsTaiLieu };
}

/**
 * GD-04 phía học viên: tài liệu của các khóa mình đang học/đã hoàn thành -
 * tài liệu cả khóa + tài liệu riêng của lớp mình (lớp hiện tại).
 */
export async function hocLieuCuaHocVien(nguoiDungId: string) {
  const hocVien = await hocVienCuaTaiKhoan(nguoiDungId);
  if (!hocVien) return { hocVien: null, dsKhoa: [] };
  const dsDangKy = await prisma.dangKyHoc.findMany({
    where: { hocVienId: hocVien.id, trangThai: { in: [...TRANG_THAI_TRONG_KHOA] } },
    include: { khoa: { include: { chuongTrinh: true } }, lop: true },
  });
  const dsKhoa = await Promise.all(
    dsDangKy.map(async (dk) => ({
      khoa: dk.khoa,
      lop: dk.lop,
      dsTaiLieu: await prisma.taiLieuHocTap.findMany({
        where: { khoaId: dk.khoaId, OR: [{ lopId: null }, ...(dk.lopId ? [{ lopId: dk.lopId }] : [])] },
        include: { hocPhan: true, lop: true },
        orderBy: [{ hocPhan: { thuTu: "asc" } }, { createdAt: "desc" }],
      }),
    })),
  );
  return { hocVien, dsKhoa };
}

/**
 * GD-04 "chỉ học viên trong khóa mới xem/tải được tài liệu": học viên chính
 * thức/hoàn thành của khóa (và thuộc đúng lớp nếu tài liệu riêng của lớp),
 * hoặc giảng viên đang phụ trách học phần đó / người đã đăng. Trả về tài liệu
 * nếu được phép.
 */
export async function kiemTraQuyenXemTaiLieu(nguoiDungId: string, taiLieuId: string) {
  const taiLieu = await prisma.taiLieuHocTap.findUnique({ where: { id: taiLieuId } });
  if (!taiLieu) throw new KhongTimThayTaiLieuError();

  const giangVien = await giangVienCuaTaiKhoan(nguoiDungId);
  if (giangVien) {
    if (taiLieu.giangVienId === giangVien.id) return taiLieu;
    const dsPhanCong = await prisma.giangVienHocPhan.findMany({ where: { khoaId: taiLieu.khoaId, hocPhanId: taiLieu.hocPhanId } });
    const phuTrach = taiLieu.lopId
      ? giangVienHieuLuc(dsPhanCong, taiLieu.khoaId, taiLieu.hocPhanId, taiLieu.lopId) === giangVien.id
      : dsPhanCong.some((pc) => pc.giangVienId === giangVien.id);
    if (phuTrach) return taiLieu;
  }

  const hocVien = await hocVienCuaTaiKhoan(nguoiDungId);
  if (hocVien) {
    const dangKy = await prisma.dangKyHoc.findUnique({
      where: { hocVienId_khoaId: { hocVienId: hocVien.id, khoaId: taiLieu.khoaId } },
    });
    const trongKhoa = dangKy && (TRANG_THAI_TRONG_KHOA as readonly string[]).includes(dangKy.trangThai);
    if (trongKhoa && (!taiLieu.lopId || taiLieu.lopId === dangKy.lopId)) return taiLieu;
  }
  throw new KhongDuocXemTaiLieuError();
}

/** Nội dung tệp để tải xuống (sau khi đã kiểm tra quyền). */
export async function noiDungTaiLieu(taiLieu: { khoaLuuTru: string | null }) {
  if (!taiLieu.khoaLuuTru) throw new KhongTimThayTaiLieuError();
  return docTep(taiLieu.khoaLuuTru);
}
