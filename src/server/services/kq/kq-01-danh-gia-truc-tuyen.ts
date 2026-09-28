import { prisma } from "@/lib/db/prisma";
import { ghiNhatKy } from "@/server/services/qt/qt-03-nhat-ky";
import { giangVienCuaTaiKhoan } from "@/server/services/gd/dung-chung";
import { timGiangVienChoHocPhan } from "@/server/services/kh/kh-03-thoi-khoa-bieu";
import { ketQuaKhoaDaPheDuyet } from "@/server/services/gd/gd-04-danh-gia";
import {
  DanhGiaKhongHopLeError,
  KhongDuocLamDanhGiaError,
  KhongPhaiTaiKhoanGiangVienError,
  KhongPhuTrachHocPhanError,
} from "@/server/services/gd/loi-giang-day";

/**
 * KQ-01 (bổ sung 28/09/2026): giảng viên phụ trách chấm sản phẩm cuối khóa;
 * điểm đánh giá trực tuyến của học phần = trung bình có hệ số các bài trắc
 * nghiệm (lần làm cao nhất) và sản phẩm (điểm chấm) được chọn tính điểm.
 */

/** Giảng viên phụ trách học phần ở lớp của học viên (phân công lớp, không có thì cấp khóa - KH-07). */
async function giangVienPhuTrachHocVien(khoaId: string, hocPhanId: string, hocVienId: string) {
  const dk = await prisma.dangKyHoc.findUnique({ where: { hocVienId_khoaId: { hocVienId, khoaId } } });
  return timGiangVienChoHocPhan(khoaId, hocPhanId, dk?.lopId ?? null);
}

export async function chamSanPham(nguoiDungId: string, baiNopId: string, input: { diem: number; nhanXet?: string | null }) {
  const giangVien = await giangVienCuaTaiKhoan(nguoiDungId);
  if (!giangVien) throw new KhongPhaiTaiKhoanGiangVienError();
  const baiNop = await prisma.baiNopSanPham.findUnique({ where: { id: baiNopId }, include: { yeuCau: true, hocVien: true, khoa: true } });
  if (!baiNop) throw new DanhGiaKhongHopLeError("không tìm thấy bài nộp");
  if ((await giangVienPhuTrachHocVien(baiNop.khoaId, baiNop.yeuCau.hocPhanId, baiNop.hocVienId)) !== giangVien.id) {
    throw new KhongPhuTrachHocPhanError();
  }
  if (await ketQuaKhoaDaPheDuyet(baiNop.khoaId)) throw new KhongDuocLamDanhGiaError("Kết quả khóa đã phê duyệt - không chấm/sửa điểm sản phẩm");
  if (!(Number.isFinite(input.diem) && input.diem >= 0 && input.diem <= 10)) throw new DanhGiaKhongHopLeError("điểm phải trong khoảng 0-10");
  const diem = Math.round(input.diem * 100) / 100;

  return prisma.$transaction(async (tx) => {
    const moi = await tx.baiNopSanPham.update({
      where: { id: baiNopId },
      data: { diem, nhanXet: input.nhanXet?.trim() || null, nguoiCham: giangVien.hoTen, chamLuc: new Date() },
    });
    await ghiNhatKy(
      {
        nguoiThucHienId: nguoiDungId,
        nguoiThucHienTen: giangVien.hoTen,
        hanhDong: baiNop.diem == null ? "CHAM_SAN_PHAM" : "SUA_DIEM_SAN_PHAM",
        doiTuong: "BaiNopSanPham",
        doiTuongId: baiNopId,
        chiTiet: `Khóa ${baiNop.khoa.maKhoa}, ${baiNop.hocVien.hoTen} - ${baiNop.yeuCau.tieuDe}: ${baiNop.diem ?? "—"} → ${diem}`,
      },
      tx,
    );
    return moi;
  });
}

/** Bài nộp sản phẩm của các học phần/lớp giảng viên đang phụ trách. */
export async function baiNopCuaGiangVien(nguoiDungId: string) {
  const giangVien = await giangVienCuaTaiKhoan(nguoiDungId);
  if (!giangVien) throw new KhongPhaiTaiKhoanGiangVienError();
  const dsPhanCong = await prisma.giangVienHocPhan.findMany({ where: { giangVienId: giangVien.id } });
  const capKhoaHocPhan = [...new Map(dsPhanCong.map((pc) => [`${pc.khoaId}|${pc.hocPhanId}`, pc])).values()];
  if (capKhoaHocPhan.length === 0) return [];
  const dsBaiNop = await prisma.baiNopSanPham.findMany({
    where: { OR: capKhoaHocPhan.map((pc) => ({ khoaId: pc.khoaId, yeuCau: { hocPhanId: pc.hocPhanId } })) },
    include: { yeuCau: { include: { hocPhan: true } }, hocVien: true, khoa: true },
    orderBy: [{ khoa: { maKhoa: "asc" } }, { nopLuc: "asc" }],
  });
  // lọc theo giảng viên hiệu lực ở lớp của từng học viên
  const ketQua = [];
  for (const bn of dsBaiNop) {
    if ((await giangVienPhuTrachHocVien(bn.khoaId, bn.yeuCau.hocPhanId, bn.hocVienId)) === giangVien.id) {
      ketQua.push({ ...bn, daPheDuyet: await ketQuaKhoaDaPheDuyet(bn.khoaId) });
    }
  }
  return ketQua;
}

export type DiemTrucTuyen = {
  hocVienId: string;
  // null khi học phần không có mục nào tính điểm
  diem: number | null;
  // có sản phẩm tính điểm đã nộp nhưng chưa chấm -> chưa đủ để dùng
  chuaDu: boolean;
  chiTiet: { tieuDe: string; heSo: number; diem: number | null }[];
};

/**
 * Điểm đánh giá trực tuyến theo học viên chính thức/hoàn thành của khóa cho 1
 * học phần. Bài trắc nghiệm chưa làm / sản phẩm chưa nộp tính 0 điểm.
 */
export async function diemDanhGiaTrucTuyen(khoaId: string, hocPhanId: string): Promise<DiemTrucTuyen[]> {
  const [dsBai, dsYeuCau, dsDangKy] = await Promise.all([
    prisma.baiTracNghiem.findMany({ where: { hocPhanId, tinhDiem: true }, orderBy: { thuTu: "asc" } }),
    prisma.yeuCauSanPham.findMany({ where: { hocPhanId, tinhDiem: true }, orderBy: { thuTu: "asc" } }),
    prisma.dangKyHoc.findMany({ where: { khoaId, trangThai: { in: ["CHINH_THUC", "HOAN_THANH"] } } }),
  ]);
  const hocVienIds = dsDangKy.map((d) => d.hocVienId);
  const [dsLan, dsBaiNop] = await Promise.all([
    prisma.lanLamTracNghiem.findMany({ where: { khoaId, hocVienId: { in: hocVienIds }, baiId: { in: dsBai.map((b) => b.id) }, nopLuc: { not: null } } }),
    prisma.baiNopSanPham.findMany({ where: { khoaId, hocVienId: { in: hocVienIds }, yeuCauId: { in: dsYeuCau.map((y) => y.id) } } }),
  ]);

  return hocVienIds.map((hocVienId) => {
    let chuaDu = false;
    const chiTiet = [
      ...dsBai.map((bai) => {
        const ds = dsLan.filter((l) => l.baiId === bai.id && l.hocVienId === hocVienId).map((l) => Number(l.diem));
        return { tieuDe: bai.tieuDe, heSo: Number(bai.heSo), diem: ds.length ? Math.max(...ds) : 0 };
      }),
      ...dsYeuCau.map((yc) => {
        const bn = dsBaiNop.find((b) => b.yeuCauId === yc.id && b.hocVienId === hocVienId);
        if (bn && bn.diem == null) chuaDu = true;
        return { tieuDe: yc.tieuDe, heSo: Number(yc.heSo), diem: bn ? (bn.diem == null ? null : Number(bn.diem)) : 0 };
      }),
    ];
    const tongHeSo = chiTiet.reduce((s, c) => s + c.heSo, 0);
    const diem =
      chiTiet.length === 0 || chuaDu
        ? null
        : Math.round((chiTiet.reduce((s, c) => s + c.heSo * (c.diem ?? 0), 0) / tongHeSo) * 100) / 100;
    return { hocVienId, diem, chuaDu, chiTiet };
  });
}
