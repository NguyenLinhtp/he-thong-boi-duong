import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ghiThaoTac, HE_THONG, type NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";
import { KhongTimThayKhoaError, ThieuLyDoDieuChinhHocPhiError } from "@/server/services/hp/loi-hoc-phi";

export type ThietLapHocPhiInput = {
  mucHocPhi: number;
  chinhSachMienGiam?: string | null;
  lyDoDieuChinh?: string | null;
};

/**
 * HP-01: khai báo/điều chỉnh mức học phí của khóa. Đồng bộ luôn dòng HocPhi
 * cho các học viên đã Chính thức (HV-07) - học viên qua đơn vị liên kết
 * (HV-11/12) không tự trả cá nhân nên vào thẳng CHO_THANH_LY_HOP_DONG với số
 * phải nộp = 0 (HP-06 xét theo hợp đồng liên kết, không xét HocPhi này).
 * Mức học phí + đồng bộ HocPhi + nhật ký (QT-03) trong 1 transaction.
 */
export async function thietLapHocPhi(khoaId: string, input: ThietLapHocPhiInput, nguoi: NguoiThucHien = HE_THONG) {
  const khoa = await prisma.khoa.findUnique({ where: { id: khoaId } });
  if (!khoa) throw new KhongTimThayKhoaError();

  const mucCu = khoa.mucHocPhi ? Number(khoa.mucHocPhi) : null;
  const dangDieuChinh = mucCu !== null && mucCu !== input.mucHocPhi;

  if (dangDieuChinh) {
    const coDangKy = await prisma.dangKyHoc.count({ where: { khoaId } });
    if (coDangKy > 0 && !input.lyDoDieuChinh?.trim()) {
      throw new ThieuLyDoDieuChinhHocPhiError();
    }
  }

  return prisma.$transaction(async (tx) => {
    const khoaSau = await tx.khoa.update({
      where: { id: khoaId },
      data: {
        mucHocPhi: input.mucHocPhi,
        chinhSachMienGiam: input.chinhSachMienGiam ?? khoa.chinhSachMienGiam,
        lyDoDieuChinhHocPhi: dangDieuChinh
          ? (input.lyDoDieuChinh?.trim() ?? khoa.lyDoDieuChinhHocPhi)
          : khoa.lyDoDieuChinhHocPhi,
      },
    });

    await dongBoHocPhiTheoKhoa(tx, khoaId, input.mucHocPhi);

    await ghiThaoTac(
      nguoi,
      dangDieuChinh ? "DIEU_CHINH_HOC_PHI" : "THIET_LAP_HOC_PHI",
      "Khoa",
      khoaId,
      `${khoa.maKhoa}: ${mucCu === null ? "chưa có" : mucCu.toLocaleString("vi-VN")} -> ${input.mucHocPhi.toLocaleString("vi-VN")} đ` +
        (dangDieuChinh && input.lyDoDieuChinh?.trim() ? ` - lý do: ${input.lyDoDieuChinh.trim()}` : ""),
      tx,
    );
    return khoaSau;
  }, { timeout: 30_000 }); // khóa đông học viên: đồng bộ nhiều dòng HocPhi
}

async function dongBoHocPhiTheoKhoa(db: Prisma.TransactionClient, khoaId: string, mucHocPhi: number) {
  const dsChinhThuc = await db.dangKyHoc.findMany({
    where: { khoaId, trangThai: "CHINH_THUC" },
  });

  for (const dk of dsChinhThuc) {
    await dongBoMotHocPhi(db, dk.hocVienId, khoaId, dk.hopDongLienKetId !== null, mucHocPhi);
  }
}

async function dongBoMotHocPhi(
  db: Prisma.TransactionClient,
  hocVienId: string,
  khoaId: string,
  quaDonViLienKet: boolean,
  mucHocPhi: number,
) {
  const hienCo = await db.hocPhi.findUnique({
    where: { hocVienId_khoaId: { hocVienId, khoaId } },
  });

  if (!hienCo) {
    return db.hocPhi.create({
      data: {
        hocVienId,
        khoaId,
        soTienPhaiNop: quaDonViLienKet ? 0 : mucHocPhi,
        trangThai: quaDonViLienKet ? "CHO_THANH_LY_HOP_DONG" : "CHUA_NOP",
      },
    });
  }

  // chỉ đồng bộ lại số phải nộp cho các khoản chưa được xử lý xong
  if (!quaDonViLienKet && ["CHUA_NOP", "CON_NO"].includes(hienCo.trangThai)) {
    return db.hocPhi.update({
      where: { id: hienCo.id },
      data: { soTienPhaiNop: mucHocPhi },
    });
  }

  return hienCo;
}

/**
 * HV-07: gọi sau khi 1 đăng ký chuyển sang Chính thức - nếu khóa đã có mức
 * học phí (HP-01 đã chạy) thì tạo ngay dòng công nợ cho học viên đó, không
 * cần cán bộ tài chính bấm lại "Thiết lập học phí". Nếu khóa chưa có mức học
 * phí thì bỏ qua - HP-01 chạy sau sẽ tự đồng bộ bù.
 */
export async function taoHocPhiSauKhiChinhThuc(dangKyId: string) {
  const dangKy = await prisma.dangKyHoc.findUnique({
    where: { id: dangKyId },
    include: { khoa: true },
  });
  if (!dangKy || dangKy.khoa.mucHocPhi === null) return null;

  return dongBoMotHocPhi(
    prisma,
    dangKy.hocVienId,
    dangKy.khoaId,
    dangKy.hopDongLienKetId !== null,
    Number(dangKy.khoa.mucHocPhi),
  );
}

export async function hocPhiCuaKhoa(khoaId: string) {
  return prisma.hocPhi.findMany({
    where: { khoaId },
    include: { hocVien: true },
    orderBy: { hocVien: { hoTen: "asc" } },
  });
}
