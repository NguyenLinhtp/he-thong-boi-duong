import path from "node:path";
import { prisma } from "@/lib/db/prisma";
import { hocVienCuaTaiKhoan } from "@/server/services/kq/kq-05-tra-cuu";
import { giangVienCuaTaiKhoan } from "@/server/services/gd/dung-chung";
import { ketQuaKhoaDaPheDuyet } from "@/server/services/gd/gd-04-danh-gia";
import { DanhGiaKhongHopLeError, KhongDuocXemTaiLieuError } from "@/server/services/gd/loi-giang-day";

/**
 * GD-04 (bổ sung 29/09/2026): màn hình học theo mẫu taphuan - cấu trúc khóa
 * theo chuyên đề, tiến độ hoàn thành, thảo luận theo mục, ghi chép cá nhân.
 *
 * mucKey: "HL-<id>" học liệu khung, "GV-<id>" tài liệu giảng viên bổ sung,
 * "TN-<id>" bài trắc nghiệm, "SP-<id>" yêu cầu sản phẩm.
 */

export type LoaiMuc = "HL" | "GV" | "TN" | "SP";

export type MucHocTap = {
  key: string;
  loai: LoaiMuc;
  tieuDe: string;
  // nhãn loại hiển thị ở thanh trái (PDF, VIDEO, TRẮC NGHIỆM…)
  nhanLoai: string;
  hoanThanh: boolean;
};

const TRANG_THAI_KHOA_HOC = ["DANG_DIEN_RA", "DA_KET_THUC"] as const;

export function tachMucKey(key: string): { loai: LoaiMuc; id: string } | null {
  const m = /^(HL|GV|TN|SP)-([\w-]+)$/.exec(key);
  return m ? { loai: m[1] as LoaiMuc, id: m[2] } : null;
}

function nhanTheoTep(tenFile: string | null, duongLink: string | null, macDinh: string) {
  if (tenFile) {
    const duoi = path.extname(tenFile).slice(1).toUpperCase();
    return duoi === "MP4" || duoi === "WEBM" ? "VIDEO" : duoi || macDinh;
  }
  if (duongLink) return /youtu\.?be|drive\.google/i.test(duongLink) ? "VIDEO" : "LIÊN KẾT";
  return macDinh;
}

/**
 * Người đang mở màn hình học của 1 khóa: học viên chính thức/hoàn thành, hoặc
 * giảng viên được phân công ở khóa (xem, thảo luận). Khóa Phương thức 3 không
 * có học liệu.
 */
async function nguoiTrongKhoa(nguoiDungId: string, khoaId: string) {
  const khoa = await prisma.khoa.findUnique({ where: { id: khoaId }, include: { chuongTrinh: true } });
  if (!khoa || khoa.chuongTrinh.phuongThucDangKy === "CHI_DU_THI") throw new KhongDuocXemTaiLieuError();
  const hocVien = await hocVienCuaTaiKhoan(nguoiDungId);
  if (hocVien) {
    const dangKy = await prisma.dangKyHoc.findUnique({ where: { hocVienId_khoaId: { hocVienId: hocVien.id, khoaId } }, include: { lop: true } });
    if (dangKy && (dangKy.trangThai === "CHINH_THUC" || dangKy.trangThai === "HOAN_THANH")) {
      return { khoa, hocVien, dangKy, giangVien: null, vaiTro: "Học viên" };
    }
  }
  const giangVien = await giangVienCuaTaiKhoan(nguoiDungId);
  if (giangVien && (await prisma.giangVienHocPhan.count({ where: { khoaId, giangVienId: giangVien.id } })) > 0) {
    return { khoa, hocVien: null, dangKy: null, giangVien, vaiTro: "Giảng viên" };
  }
  throw new KhongDuocXemTaiLieuError();
}

/** Học viên còn được cập nhật tiến độ/làm bài (khóa đang học hoặc đã kết thúc nhưng chưa phê duyệt kết quả). */
async function duocCapNhatTienDo(ng: Awaited<ReturnType<typeof nguoiTrongKhoa>>) {
  return Boolean(
    ng.hocVien &&
      ng.dangKy?.trangThai === "CHINH_THUC" &&
      (TRANG_THAI_KHOA_HOC as readonly string[]).includes(ng.khoa.trangThai) &&
      !(await ketQuaKhoaDaPheDuyet(ng.khoa.id)),
  );
}

/** Cấu trúc khóa học cho thanh trái + tiến độ theo chuyên đề và cả khóa. */
export async function cauTrucKhoaHoc(nguoiDungId: string, khoaId: string) {
  const ng = await nguoiTrongKhoa(nguoiDungId, khoaId);
  const { khoa } = ng;
  const [dsHocPhan, dsTaiLieuGv, dsTienDo, dsLan, dsBaiNop, capNhatTienDo] = await Promise.all([
    prisma.hocPhan.findMany({
      where: { chuongTrinhId: khoa.chuongTrinhId },
      orderBy: { thuTu: "asc" },
      include: {
        hocLieus: { orderBy: [{ thuTu: "asc" }, { createdAt: "asc" }] },
        baiTracNghiems: { orderBy: [{ thuTu: "asc" }, { createdAt: "asc" }] },
        yeuCauSanPhams: { orderBy: [{ thuTu: "asc" }, { createdAt: "asc" }] },
      },
    }),
    prisma.taiLieuHocTap.findMany({
      where: {
        khoaId,
        ...(ng.dangKy ? { OR: [{ lopId: null }, ...(ng.dangKy.lopId ? [{ lopId: ng.dangKy.lopId }] : [])] } : {}),
      },
      orderBy: { createdAt: "asc" },
    }),
    ng.hocVien ? prisma.tienDoHocTap.findMany({ where: { khoaId, hocVienId: ng.hocVien.id } }) : [],
    ng.hocVien ? prisma.lanLamTracNghiem.findMany({ where: { khoaId, hocVienId: ng.hocVien.id, nopLuc: { not: null } } }) : [],
    ng.hocVien ? prisma.baiNopSanPham.findMany({ where: { khoaId, hocVienId: ng.hocVien.id } }) : [],
    duocCapNhatTienDo(ng),
  ]);
  const daXong = new Set(dsTienDo.map((t) => t.mucKey));
  const daLam = new Set(dsLan.map((l) => l.baiId));
  const daNop = new Set(dsBaiNop.map((b) => b.yeuCauId));

  const chuyenDe = dsHocPhan.map((hp) => {
    const dsMuc: MucHocTap[] = [
      ...hp.hocLieus.map((hl) => ({
        key: `HL-${hl.id}`,
        loai: "HL" as const,
        tieuDe: hl.tieuDe,
        nhanLoai: hl.loai === "THONG_TIN" && !hl.tenFile && !hl.duongLink ? "THÔNG TIN" : nhanTheoTep(hl.tenFile, hl.duongLink, hl.loai === "VIDEO" ? "VIDEO" : "TÀI LIỆU"),
        hoanThanh: daXong.has(`HL-${hl.id}`),
      })),
      ...dsTaiLieuGv
        .filter((t) => t.hocPhanId === hp.id)
        .map((t) => ({
          key: `GV-${t.id}`,
          loai: "GV" as const,
          tieuDe: t.tieuDe,
          nhanLoai: `${nhanTheoTep(t.tenFile, t.duongLink, "TÀI LIỆU")} · GIẢNG VIÊN`,
          hoanThanh: daXong.has(`GV-${t.id}`),
        })),
      ...hp.baiTracNghiems.map((b) => ({ key: `TN-${b.id}`, loai: "TN" as const, tieuDe: b.tieuDe, nhanLoai: "TRẮC NGHIỆM", hoanThanh: daLam.has(b.id) })),
      ...hp.yeuCauSanPhams.map((y) => ({ key: `SP-${y.id}`, loai: "SP" as const, tieuDe: y.tieuDe, nhanLoai: "SẢN PHẨM", hoanThanh: daNop.has(y.id) })),
    ];
    const soXong = dsMuc.filter((m) => m.hoanThanh).length;
    return {
      id: hp.id,
      ten: hp.ten,
      soTiet: hp.soTiet,
      dsMuc,
      soXong,
      phanTram: dsMuc.length ? Math.round((soXong / dsMuc.length) * 100) : 0,
    };
  });
  const tong = chuyenDe.reduce((s, c) => s + c.dsMuc.length, 0);
  const xong = chuyenDe.reduce((s, c) => s + c.soXong, 0);
  return {
    khoa,
    lop: ng.dangKy?.lop ?? null,
    vaiTro: ng.vaiTro,
    laHocVien: Boolean(ng.hocVien),
    capNhatTienDo,
    chuyenDe,
    tongMuc: tong,
    soMucXong: xong,
    phanTramKhoa: tong ? Math.round((xong / tong) * 100) : 0,
  };
}

/** Nội dung 1 mục để hiển thị ở màn hình giữa (đã kiểm tra thuộc khóa). */
export async function noiDungMuc(nguoiDungId: string, khoaId: string, mucKey: string) {
  const ng = await nguoiTrongKhoa(nguoiDungId, khoaId);
  const muc = tachMucKey(mucKey);
  if (!muc) throw new DanhGiaKhongHopLeError("mục không hợp lệ");
  const thuocChuongTrinh = (hocPhanId: string) =>
    prisma.hocPhan.count({ where: { id: hocPhanId, chuongTrinhId: ng.khoa.chuongTrinhId } }).then((n) => n > 0);

  if (muc.loai === "HL") {
    const hl = await prisma.hocLieuHocPhan.findUnique({ where: { id: muc.id } });
    if (!hl || !(await thuocChuongTrinh(hl.hocPhanId))) throw new KhongDuocXemTaiLieuError();
    return { loai: "HL" as const, hl };
  }
  if (muc.loai === "GV") {
    const tl = await prisma.taiLieuHocTap.findUnique({ where: { id: muc.id } });
    if (!tl || tl.khoaId !== khoaId || (ng.dangKy && tl.lopId && tl.lopId !== ng.dangKy.lopId)) throw new KhongDuocXemTaiLieuError();
    return { loai: "GV" as const, tl };
  }
  if (muc.loai === "TN") {
    const bai = await prisma.baiTracNghiem.findUnique({ where: { id: muc.id }, include: { _count: { select: { cauHois: true } } } });
    if (!bai || !(await thuocChuongTrinh(bai.hocPhanId))) throw new KhongDuocXemTaiLieuError();
    const dsLan = ng.hocVien
      ? await prisma.lanLamTracNghiem.findMany({ where: { baiId: bai.id, khoaId, hocVienId: ng.hocVien.id }, orderBy: { batDauLuc: "desc" } })
      : [];
    return { loai: "TN" as const, bai, dsLan };
  }
  const yc = await prisma.yeuCauSanPham.findUnique({ where: { id: muc.id } });
  if (!yc || !(await thuocChuongTrinh(yc.hocPhanId))) throw new KhongDuocXemTaiLieuError();
  const baiNop = ng.hocVien
    ? await prisma.baiNopSanPham.findUnique({ where: { yeuCauId_khoaId_hocVienId: { yeuCauId: yc.id, khoaId, hocVienId: ng.hocVien.id } } })
    : null;
  return { loai: "SP" as const, yc, baiNop };
}

/**
 * Đánh dấu hoàn thành 1 mục học liệu (HL/GV). Trả về false (không lỗi) khi
 * không còn được cập nhật tiến độ - khóa đã phê duyệt kết quả, giảng viên xem.
 */
export async function danhDauHoanThanh(nguoiDungId: string, khoaId: string, mucKey: string) {
  const muc = tachMucKey(mucKey);
  if (!muc || (muc.loai !== "HL" && muc.loai !== "GV")) throw new DanhGiaKhongHopLeError("chỉ đánh dấu được mục học liệu");
  await noiDungMuc(nguoiDungId, khoaId, mucKey); // kiểm tra mục thuộc khóa + quyền
  const ng = await nguoiTrongKhoa(nguoiDungId, khoaId);
  if (!(await duocCapNhatTienDo(ng))) return false;
  await prisma.tienDoHocTap.upsert({
    where: { khoaId_hocVienId_mucKey: { khoaId, hocVienId: ng.hocVien!.id, mucKey } },
    create: { khoaId, hocVienId: ng.hocVien!.id, mucKey },
    update: {},
  });
  return true;
}

// ---------------- thảo luận ----------------

/** Thảo luận của 1 mục: trong khóa mình, hoặc mọi khóa cùng bài giảng (học liệu khung/bài của chương trình). */
export async function dsThaoLuan(nguoiDungId: string, khoaId: string, mucKey: string, moiKhoa = false) {
  await noiDungMuc(nguoiDungId, khoaId, mucKey);
  const dsKhoaCungChuongTrinh = moiKhoa ? undefined : [khoaId];
  const ds = await prisma.thaoLuanHocTap.findMany({
    where: { mucKey, ...(dsKhoaCungChuongTrinh ? { khoaId: { in: dsKhoaCungChuongTrinh } } : {}) },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  const khoaKhac = [...new Set(ds.filter((t) => t.khoaId !== khoaId).map((t) => t.khoaId))];
  const maKhoa = new Map(
    (await prisma.khoa.findMany({ where: { id: { in: khoaKhac } }, select: { id: true, maKhoa: true } })).map((k) => [k.id, k.maKhoa]),
  );
  return ds.map((t) => ({ ...t, cuaToi: t.nguoiDungId === nguoiDungId, khoaKhac: t.khoaId === khoaId ? null : (maKhoa.get(t.khoaId) ?? "khóa khác") }));
}

export async function themThaoLuan(nguoiDungId: string, khoaId: string, mucKey: string, noiDung: string) {
  const ng = await nguoiTrongKhoa(nguoiDungId, khoaId);
  await noiDungMuc(nguoiDungId, khoaId, mucKey);
  const nd = noiDung?.trim();
  if (!nd) throw new DanhGiaKhongHopLeError("nội dung thảo luận trống");
  if (nd.length > 4000) throw new DanhGiaKhongHopLeError("thảo luận dài quá 4000 ký tự");
  const nguoiDung = await prisma.nguoiDung.findUniqueOrThrow({ where: { id: nguoiDungId } });
  return prisma.thaoLuanHocTap.create({
    data: { khoaId, mucKey, nguoiDungId, hoTen: ng.hocVien?.hoTen ?? ng.giangVien?.hoTen ?? nguoiDung.hoTen, vaiTro: ng.vaiTro, noiDung: nd },
  });
}

/** Chỉ người viết xóa được thảo luận của mình. */
export async function xoaThaoLuan(nguoiDungId: string, id: string) {
  const tl = await prisma.thaoLuanHocTap.findUnique({ where: { id } });
  if (!tl || tl.nguoiDungId !== nguoiDungId) throw new KhongDuocXemTaiLieuError();
  await prisma.thaoLuanHocTap.delete({ where: { id } });
}

// ---------------- ghi chép ----------------

export async function layGhiChep(nguoiDungId: string, khoaId: string, mucKey: string) {
  await noiDungMuc(nguoiDungId, khoaId, mucKey);
  return (await prisma.ghiChepHocTap.findUnique({ where: { nguoiDungId_khoaId_mucKey: { nguoiDungId, khoaId, mucKey } } }))?.noiDung ?? "";
}

export async function luuGhiChep(nguoiDungId: string, khoaId: string, mucKey: string, noiDung: string) {
  await noiDungMuc(nguoiDungId, khoaId, mucKey);
  if (noiDung.length > 20000) throw new DanhGiaKhongHopLeError("ghi chép dài quá 20000 ký tự");
  if (!noiDung.trim()) {
    await prisma.ghiChepHocTap.deleteMany({ where: { nguoiDungId, khoaId, mucKey } });
    return;
  }
  await prisma.ghiChepHocTap.upsert({
    where: { nguoiDungId_khoaId_mucKey: { nguoiDungId, khoaId, mucKey } },
    create: { nguoiDungId, khoaId, mucKey, noiDung },
    update: { noiDung },
  });
}

/** Các khóa học viên đang/đã học (có học liệu) kèm % tiến độ - trang "Quá trình học tập". */
export async function khoaHocCuaToi(nguoiDungId: string) {
  const hocVien = await hocVienCuaTaiKhoan(nguoiDungId);
  if (!hocVien) return { hocVien: null, dsKhoa: [] };
  const dsDangKy = await prisma.dangKyHoc.findMany({
    where: {
      hocVienId: hocVien.id,
      trangThai: { in: ["CHINH_THUC", "HOAN_THANH"] },
      khoa: { chuongTrinh: { phuongThucDangKy: { not: "CHI_DU_THI" } } },
    },
    include: { khoa: { include: { chuongTrinh: true } } },
    orderBy: { khoa: { thoiGianKhaiGiang: "desc" } },
  });
  const dsKhoa = await Promise.all(
    dsDangKy.map(async (dk) => {
      const ct = await cauTrucKhoaHoc(nguoiDungId, dk.khoaId);
      return { khoa: dk.khoa, trangThaiDangKy: dk.trangThai, phanTram: ct.phanTramKhoa, tongMuc: ct.tongMuc, soMucXong: ct.soMucXong };
    }),
  );
  return { hocVien, dsKhoa };
}
