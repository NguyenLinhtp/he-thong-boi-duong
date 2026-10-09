import path from "node:path";
import { prisma } from "@/lib/db/prisma";
import { ghiNhatKy } from "@/server/services/qt/qt-03-nhat-ky";
import { layThamSoSo } from "@/server/services/qt/qt-05-tham-so";
import { hocVienCuaTaiKhoan } from "@/server/services/kq/kq-05-tra-cuu";
import { giangVienCuaTaiKhoan } from "@/server/services/gd/dung-chung";
import { timGiangVienChoHocPhan } from "@/server/services/kh/kh-03-thoi-khoa-bieu";
import { luuTep, xoaTep } from "@/server/services/gd/luu-tru-hoc-lieu";
import {
  DaChamKhongNopLaiError,
  DanhGiaKhongHopLeError,
  HetGioLamBaiError,
  HetLuotLamBaiError,
  KhongDuocLamDanhGiaError,
  KhongDuocXemTaiLieuError,
  TaiLieuKhongHopLeError,
} from "@/server/services/gd/loi-giang-day";

/**
 * GD-04 (bổ sung 28/09/2026) phía học viên: xem học liệu khung của chương
 * trình, làm bài trắc nghiệm trực tuyến, nộp sản phẩm cuối khóa.
 */

/** Định dạng sản phẩm học viên được nộp. */
export const DUOI_SAN_PHAM = [
  ".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".txt",
  ".zip", ".rar", ".7z", ".jpg", ".jpeg", ".png", ".mp4",
];

// khóa đã vào giai đoạn học mới làm bài/nộp sản phẩm
const TRANG_THAI_KHOA_LAM_BAI = ["DANG_DIEN_RA", "DA_KET_THUC"] as const;
// gia hạn nộp bài trắc nghiệm để bù trễ mạng khi hết giờ tự nộp
const GIA_HAN_NOP_GIAY = 120;

export async function ketQuaKhoaDaPheDuyet(khoaId: string) {
  return (await prisma.ketQuaKhoa.count({ where: { khoaId, daPheDuyet: true } })) > 0;
}

/**
 * Điều kiện chung để học viên làm trắc nghiệm/nộp sản phẩm của 1 học phần
 * trong 1 khóa: là học viên chính thức, khóa có giảng dạy (không phải PT3),
 * đang diễn ra/đã kết thúc, kết quả chưa phê duyệt, học phần thuộc chương
 * trình của khóa.
 */
async function kiemTraDuocLam(nguoiDungId: string, khoaId: string, hocPhanId: string) {
  const hocVien = await hocVienCuaTaiKhoan(nguoiDungId);
  if (!hocVien) throw new KhongDuocLamDanhGiaError("Tài khoản chưa gắn với hồ sơ học viên");
  const dangKy = await prisma.dangKyHoc.findUnique({
    where: { hocVienId_khoaId: { hocVienId: hocVien.id, khoaId } },
    include: { khoa: { include: { chuongTrinh: true } } },
  });
  if (!dangKy || dangKy.trangThai !== "CHINH_THUC") throw new KhongDuocLamDanhGiaError("Chỉ học viên chính thức của khóa mới làm bài/nộp sản phẩm");
  const { khoa } = dangKy;
  if (khoa.chuongTrinh.phuongThucDangKys.includes("CHI_DU_THI")) throw new KhongDuocLamDanhGiaError("Khóa chỉ dự thi (Phương thức 3) không áp dụng học liệu/đánh giá trực tuyến");
  if (!(TRANG_THAI_KHOA_LAM_BAI as readonly string[]).includes(khoa.trangThai)) throw new KhongDuocLamDanhGiaError("Khóa chưa vào giai đoạn học");
  if (await ketQuaKhoaDaPheDuyet(khoaId)) throw new KhongDuocLamDanhGiaError("Kết quả khóa đã phê duyệt - không nhận bài làm/sản phẩm nữa");
  const hocPhan = await prisma.hocPhan.findUnique({ where: { id: hocPhanId } });
  if (!hocPhan || hocPhan.chuongTrinhId !== khoa.chuongTrinhId) throw new KhongDuocLamDanhGiaError("Học phần không thuộc chương trình của khóa");
  return { hocVien, dangKy, khoa };
}

// ---------------- trắc nghiệm ----------------

const hetHanLuc = (batDauLuc: Date, thoiGianPhut: number | null) =>
  thoiGianPhut ? new Date(batDauLuc.getTime() + thoiGianPhut * 60_000) : null;

/**
 * Bắt đầu (hoặc tiếp tục lần đang làm dở còn hạn) 1 lần làm bài. Mỗi lần bắt
 * đầu tính 1 lượt trong số lần làm tối đa. Câu hỏi trả về KHÔNG kèm đáp án.
 */
export async function batDauLamBai(nguoiDungId: string, khoaId: string, baiId: string) {
  const bai = await prisma.baiTracNghiem.findUnique({ where: { id: baiId }, include: { cauHois: { orderBy: { thuTu: "asc" } } } });
  if (!bai) throw new DanhGiaKhongHopLeError("không tìm thấy bài trắc nghiệm");
  if (bai.cauHois.length === 0) throw new KhongDuocLamDanhGiaError("Bài trắc nghiệm chưa có câu hỏi");
  const { hocVien } = await kiemTraDuocLam(nguoiDungId, khoaId, bai.hocPhanId);

  const dsLan = await prisma.lanLamTracNghiem.findMany({ where: { baiId, khoaId, hocVienId: hocVien.id }, orderBy: { batDauLuc: "desc" } });
  const dangLam = dsLan.find((l) => !l.nopLuc && (!bai.thoiGianPhut || hetHanLuc(l.batDauLuc, bai.thoiGianPhut)! > new Date()));
  const lan =
    dangLam ??
    (await (async () => {
      if (bai.soLanToiDa && dsLan.length >= bai.soLanToiDa) throw new HetLuotLamBaiError(bai.soLanToiDa);
      return prisma.lanLamTracNghiem.create({ data: { baiId, khoaId, hocVienId: hocVien.id } });
    })());
  return {
    lanLamId: lan.id,
    bai: { id: bai.id, tieuDe: bai.tieuDe, moTa: bai.moTa, thoiGianPhut: bai.thoiGianPhut },
    hetHanLuc: hetHanLuc(lan.batDauLuc, bai.thoiGianPhut),
    cauHois: bai.cauHois.map((c) => ({ id: c.id, noiDung: c.noiDung, phuongAn: c.phuongAn, nhieuDapAn: c.dapAnDung.length > 1 })),
  };
}

/** Lần làm đang dở của chính học viên (để hiển thị lại trang làm bài). */
export async function layLanLamDangDo(nguoiDungId: string, lanLamId: string) {
  const hocVien = await hocVienCuaTaiKhoan(nguoiDungId);
  const lan = await prisma.lanLamTracNghiem.findUnique({ where: { id: lanLamId } });
  if (!hocVien || !lan || lan.hocVienId !== hocVien.id) throw new KhongDuocLamDanhGiaError("Không tìm thấy lần làm bài của bạn");
  return lan;
}

/**
 * Mở lại 1 lần làm của chính học viên: đang làm dở -> câu hỏi (không kèm đáp
 * án) + hạn nộp; đã nộp -> kết quả.
 */
export async function moLanLam(nguoiDungId: string, lanLamId: string) {
  const lan = await layLanLamDangDo(nguoiDungId, lanLamId);
  const bai = await prisma.baiTracNghiem.findUniqueOrThrow({
    where: { id: lan.baiId },
    include: { cauHois: { orderBy: { thuTu: "asc" } }, hocPhan: true },
  });
  const khoa = await prisma.khoa.findUniqueOrThrow({ where: { id: lan.khoaId } });
  return {
    lan,
    khoa,
    bai: { id: bai.id, tieuDe: bai.tieuDe, moTa: bai.moTa, thoiGianPhut: bai.thoiGianPhut, hocPhan: bai.hocPhan.ten },
    hetHanLuc: hetHanLuc(lan.batDauLuc, bai.thoiGianPhut),
    cauHois: lan.nopLuc
      ? []
      : bai.cauHois.map((c) => ({ id: c.id, noiDung: c.noiDung, phuongAn: c.phuongAn, nhieuDapAn: c.dapAnDung.length > 1 })),
  };
}

/** Câu đúng khi tập phương án chọn trùng khớp tập đáp án đúng. */
export function chamCau(dapAnDung: number[], chon: number[]) {
  const a = [...new Set(dapAnDung)].sort((x, y) => x - y);
  const b = [...new Set(chon)].sort((x, y) => x - y);
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/** Nộp bài: chấm tự động, điểm thang 10 làm tròn 2 chữ số. */
export async function nopBaiTracNghiem(nguoiDungId: string, lanLamId: string, traLoi: Record<string, number[]>) {
  const lan = await layLanLamDangDo(nguoiDungId, lanLamId);
  if (lan.nopLuc) throw new KhongDuocLamDanhGiaError("Lần làm bài này đã nộp");
  const bai = await prisma.baiTracNghiem.findUniqueOrThrow({ where: { id: lan.baiId }, include: { cauHois: true } });
  await kiemTraDuocLam(nguoiDungId, lan.khoaId, bai.hocPhanId);
  const han = hetHanLuc(lan.batDauLuc, bai.thoiGianPhut);
  if (han && Date.now() > han.getTime() + GIA_HAN_NOP_GIAY * 1000) throw new HetGioLamBaiError();

  const soCauDung = bai.cauHois.filter((c) => chamCau(c.dapAnDung, traLoi[c.id] ?? [])).length;
  const tongSoCau = bai.cauHois.length;
  const diem = Math.round((soCauDung / tongSoCau) * 1000) / 100;
  // chỉ nộp được 1 lần: điều kiện nopLuc = null trong where chặn nộp trùng đồng thời
  const capNhat = await prisma.lanLamTracNghiem.updateMany({
    where: { id: lanLamId, nopLuc: null },
    data: { nopLuc: new Date(), traLoi, soCauDung, tongSoCau, diem },
  });
  if (capNhat.count === 0) throw new KhongDuocLamDanhGiaError("Lần làm bài này đã nộp");
  return { soCauDung, tongSoCau, diem };
}

// ---------------- sản phẩm cuối khóa ----------------

export type NopSanPhamInput = { khoaId: string; yeuCauId: string; ghiChu?: string | null; tep: { ten: string; loai: string; noiDung: Buffer } };

/** Nộp (hoặc nộp lại khi chưa chấm) sản phẩm cuối khóa - 1 tệp, ≤ SP_NOP_TOI_DA_MB (mặc định 50MB). */
export async function nopSanPham(nguoiDungId: string, input: NopSanPhamInput) {
  const yeuCau = await prisma.yeuCauSanPham.findUnique({ where: { id: input.yeuCauId } });
  if (!yeuCau) throw new DanhGiaKhongHopLeError("không tìm thấy yêu cầu sản phẩm");
  const { hocVien, khoa } = await kiemTraDuocLam(nguoiDungId, input.khoaId, yeuCau.hocPhanId);
  const tep = input.tep;
  if (!tep || tep.noiDung.length === 0) throw new TaiLieuKhongHopLeError("chưa chọn tệp sản phẩm");
  const duoi = path.extname(tep.ten).toLowerCase();
  if (!DUOI_SAN_PHAM.includes(duoi)) throw new TaiLieuKhongHopLeError(`định dạng ${duoi || "(không có đuôi)"} không được phép`);
  const toiDaMb = await layThamSoSo("SP_NOP_TOI_DA_MB", 50);
  if (tep.noiDung.length > toiDaMb * 1024 * 1024) throw new TaiLieuKhongHopLeError(`tệp vượt ${toiDaMb}MB`);

  const cu = await prisma.baiNopSanPham.findUnique({
    where: { yeuCauId_khoaId_hocVienId: { yeuCauId: yeuCau.id, khoaId: khoa.id, hocVienId: hocVien.id } },
  });
  if (cu?.diem != null) throw new DaChamKhongNopLaiError();

  const khoaLuuTru = await luuTep(tep.noiDung, duoi);
  const duLieu = {
    tenFile: path.basename(tep.ten),
    loaiFile: tep.loai || "application/octet-stream",
    kichThuoc: tep.noiDung.length,
    khoaLuuTru,
    ghiChu: input.ghiChu?.trim() || null,
    nopLuc: new Date(),
  };
  try {
    const baiNop = await prisma.$transaction(async (tx) => {
      const bn = await tx.baiNopSanPham.upsert({
        where: { yeuCauId_khoaId_hocVienId: { yeuCauId: yeuCau.id, khoaId: khoa.id, hocVienId: hocVien.id } },
        create: { yeuCauId: yeuCau.id, khoaId: khoa.id, hocVienId: hocVien.id, ...duLieu },
        update: duLieu,
      });
      await ghiNhatKy(
        {
          nguoiThucHienId: nguoiDungId,
          nguoiThucHienTen: hocVien.hoTen,
          hanhDong: cu ? "NOP_LAI_SAN_PHAM" : "NOP_SAN_PHAM",
          doiTuong: "BaiNopSanPham",
          doiTuongId: bn.id,
          chiTiet: `Khóa ${khoa.maKhoa}: ${yeuCau.tieuDe} - ${duLieu.tenFile}`,
        },
        tx,
      );
      return bn;
    });
    if (cu) await xoaTep(cu.khoaLuuTru); // bỏ tệp của lần nộp trước
    return baiNop;
  } catch (error) {
    await xoaTep(khoaLuuTru);
    throw error;
  }
}

// ---------------- tổng hợp phía học viên ----------------

/**
 * Học tập của học viên theo khóa (chính thức/hoàn thành, trừ PT3): học liệu
 * khung theo học phần, tài liệu giảng viên bổ sung (khóa + lớp mình), bài
 * trắc nghiệm kèm điểm cao nhất/số lần đã làm, yêu cầu sản phẩm kèm bài nộp.
 */
export async function hocTapCuaHocVien(nguoiDungId: string) {
  const hocVien = await hocVienCuaTaiKhoan(nguoiDungId);
  if (!hocVien) return { hocVien: null, dsKhoa: [] };
  const dsDangKy = await prisma.dangKyHoc.findMany({
    where: {
      hocVienId: hocVien.id,
      trangThai: { in: ["CHINH_THUC", "HOAN_THANH"] },
      khoa: { chuongTrinh: { NOT: { phuongThucDangKys: { has: "CHI_DU_THI" } } } },
    },
    include: { khoa: { include: { chuongTrinh: true } }, lop: true },
    orderBy: { khoa: { thoiGianKhaiGiang: "desc" } },
  });

  const dsKhoa = await Promise.all(
    dsDangKy.map(async (dk) => {
      const [dsHocPhan, dsTaiLieuGv, dsLan, dsBaiNop, daPheDuyet] = await Promise.all([
        prisma.hocPhan.findMany({
          where: { chuongTrinhId: dk.khoa.chuongTrinhId },
          orderBy: { thuTu: "asc" },
          include: {
            hocLieus: { orderBy: [{ thuTu: "asc" }, { createdAt: "asc" }] },
            baiTracNghiems: { orderBy: [{ thuTu: "asc" }, { createdAt: "asc" }], include: { _count: { select: { cauHois: true } } } },
            yeuCauSanPhams: { orderBy: [{ thuTu: "asc" }, { createdAt: "asc" }] },
          },
        }),
        prisma.taiLieuHocTap.findMany({
          where: { khoaId: dk.khoaId, OR: [{ lopId: null }, ...(dk.lopId ? [{ lopId: dk.lopId }] : [])] },
          orderBy: { createdAt: "desc" },
        }),
        prisma.lanLamTracNghiem.findMany({ where: { khoaId: dk.khoaId, hocVienId: hocVien.id } }),
        prisma.baiNopSanPham.findMany({ where: { khoaId: dk.khoaId, hocVienId: hocVien.id } }),
        ketQuaKhoaDaPheDuyet(dk.khoaId),
      ]);
      const duocLam =
        dk.trangThai === "CHINH_THUC" && (TRANG_THAI_KHOA_LAM_BAI as readonly string[]).includes(dk.khoa.trangThai) && !daPheDuyet;
      return {
        khoa: dk.khoa,
        lop: dk.lop,
        duocLam,
        dsHocPhan: dsHocPhan.map((hp) => ({
          ...hp,
          dsTaiLieuGv: dsTaiLieuGv.filter((t) => t.hocPhanId === hp.id),
          baiTracNghiems: hp.baiTracNghiems.map((bai) => {
            const daNop = dsLan.filter((l) => l.baiId === bai.id && l.nopLuc);
            const diemCaoNhat = daNop.reduce<number | null>((m, l) => Math.max(m ?? 0, Number(l.diem)), null);
            return { ...bai, soLanDaLam: dsLan.filter((l) => l.baiId === bai.id).length, diemCaoNhat };
          }),
          yeuCauSanPhams: hp.yeuCauSanPhams.map((yc) => ({ ...yc, baiNop: dsBaiNop.find((b) => b.yeuCauId === yc.id) ?? null })),
        })),
      };
    }),
  );
  return { hocVien, dsKhoa };
}

/** Xem/tải bài nộp: chính học viên nộp, giảng viên phụ trách, cán bộ quản lý kết quả (KQ-02). */
export async function kiemTraQuyenXemBaiNop(phien: { userId: string; maCNDuocPhep: string[] }, id: string) {
  const baiNop = await prisma.baiNopSanPham.findUnique({ where: { id }, include: { yeuCau: true } });
  if (!baiNop) throw new DanhGiaKhongHopLeError("không tìm thấy bài nộp");
  if (phien.maCNDuocPhep.includes("KQ-02")) return baiNop;
  const hocVien = await hocVienCuaTaiKhoan(phien.userId);
  if (hocVien?.id === baiNop.hocVienId) return baiNop;
  const giangVien = await giangVienCuaTaiKhoan(phien.userId);
  if (giangVien) {
    const dk = await prisma.dangKyHoc.findUnique({ where: { hocVienId_khoaId: { hocVienId: baiNop.hocVienId, khoaId: baiNop.khoaId } } });
    if ((await timGiangVienChoHocPhan(baiNop.khoaId, baiNop.yeuCau.hocPhanId, dk?.lopId ?? null)) === giangVien.id) return baiNop;
  }
  throw new KhongDuocXemTaiLieuError();
}
