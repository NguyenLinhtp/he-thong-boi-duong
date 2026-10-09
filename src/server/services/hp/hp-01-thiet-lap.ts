import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { dieuKienChiemCho } from "@/server/services/kh/kh-05-trang-thai-si-so";
import { ghiThaoTac, HE_THONG, type NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";
import { KhongTimThayKhoaError, ThieuLyDoDieuChinhHocPhiError, LePhiTuDoKhongApDungError } from "@/server/services/hp/loi-hoc-phi";
import { cauHinhHieuLuc } from "@/server/services/hv/form-dang-ky";

export type ThietLapHocPhiInput = {
  mucHocPhi: number;
  // (bổ sung 01/10/2026) lệ phí thí sinh tự do của khóa dự thi; undefined = giữ nguyên, null = như sinh viên
  mucHocPhiTuDo?: number | null;
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
  // (bổ sung 06/10/2026) khóa đã chia thành phần lệ phí: mức theo từng thành phần (hp-01-thanh-phan-le-phi)
  if ((await prisma.thanhPhanLePhi.count({ where: { khoaId } })) > 0) {
    throw new LePhiTuDoKhongApDungError("khóa đang chia thành phần lệ phí - điều chỉnh mức ở từng thành phần");
  }

  const mucCu = khoa.mucHocPhi ? Number(khoa.mucHocPhi) : null;
  const tuDoCu = khoa.mucHocPhiTuDo === null ? null : Number(khoa.mucHocPhiTuDo);
  const tuDoMoi = input.mucHocPhiTuDo === undefined ? tuDoCu : input.mucHocPhiTuDo;
  const theoDoiTuong = await apDungLePhiTuDo(khoaId);
  if (tuDoMoi !== null) {
    if (!theoDoiTuong) throw new LePhiTuDoKhongApDungError();
    if (!Number.isFinite(tuDoMoi) || tuDoMoi < 0) throw new LePhiTuDoKhongApDungError("lệ phí thí sinh tự do không hợp lệ");
  }
  const dangDieuChinh = (mucCu !== null && mucCu !== input.mucHocPhi) || (mucCu !== null && tuDoCu !== tuDoMoi);

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
        mucHocPhiTuDo: tuDoMoi,
        chinhSachMienGiam: input.chinhSachMienGiam ?? khoa.chinhSachMienGiam,
        lyDoDieuChinhHocPhi: dangDieuChinh
          ? (input.lyDoDieuChinh?.trim() ?? khoa.lyDoDieuChinhHocPhi)
          : khoa.lyDoDieuChinhHocPhi,
      },
    });

    await dongBoHocPhiTheoKhoa(tx, khoaId, { sinhVien: input.mucHocPhi, tuDo: tuDoMoi }, theoDoiTuong);

    await ghiThaoTac(
      nguoi,
      dangDieuChinh ? "DIEU_CHINH_HOC_PHI" : "THIET_LAP_HOC_PHI",
      "Khoa",
      khoaId,
      `${khoa.maKhoa}: ${mucCu === null ? "chưa có" : mucCu.toLocaleString("vi-VN")} -> ${input.mucHocPhi.toLocaleString("vi-VN")} đ` +
        (tuDoMoi !== tuDoCu ? `; thí sinh tự do: ${tuDoCu?.toLocaleString("vi-VN") ?? "như sinh viên"} -> ${tuDoMoi?.toLocaleString("vi-VN") ?? "như sinh viên"} đ` : "") +
        (dangDieuChinh && input.lyDoDieuChinh?.trim() ? ` - lý do: ${input.lyDoDieuChinh.trim()}` : ""),
      tx,
    );
    return khoaSau;
  }, { timeout: 30_000 }); // khóa đông học viên: đồng bộ nhiều dòng HocPhi
}

/**
 * (bổ sung 01/10/2026) Lệ phí theo đối tượng chỉ áp dụng cho khóa dự thi (PT3) có form
 * định danh bằng mã sinh viên: hồ sơ có mã sinh viên = sinh viên ĐHSP-ĐHĐN (mucHocPhi),
 * không có = thí sinh tự do (mucHocPhiTuDo, chưa đặt thì như sinh viên).
 */
export async function apDungLePhiTuDo(khoaId: string) {
  const khoa = await prisma.khoa.findUnique({ where: { id: khoaId }, include: { chuongTrinh: true } });
  if (!khoa || !khoa.chuongTrinh.phuongThucDangKys.includes("CHI_DU_THI")) return false;
  return (await cauHinhHieuLuc(khoaId)).cauHinh.dinhDanh === "MA_SINH_VIEN";
}

type MucPhi = { sinhVien: number; tuDo: number | null };
const mucChoHocVien = (muc: MucPhi, theoDoiTuong: boolean, hocVien: { maSinhVien: string | null }) =>
  theoDoiTuong && !hocVien.maSinhVien && muc.tuDo !== null ? muc.tuDo : muc.sinhVien;

async function dongBoHocPhiTheoKhoa(db: Prisma.TransactionClient, khoaId: string, muc: MucPhi, theoDoiTuong: boolean) {
  // (bổ sung 01/10/2026) khóa Phương thức 3 thu lệ phí ngay khi đăng ký: đồng bộ cho mọi hồ sơ còn chiếm chỗ
  const khoa = await db.khoa.findUnique({ where: { id: khoaId }, include: { chuongTrinh: true } });
  const dsChinhThuc = await db.dangKyHoc.findMany({
    where:
      khoa?.chuongTrinh.phuongThucDangKys.includes("CHI_DU_THI") ? dieuKienChiemCho(khoaId) : { khoaId, trangThai: "CHINH_THUC" },
    include: { hocVien: true },
  });

  for (const dk of dsChinhThuc) {
    await dongBoMotHocPhi(db, dk.hocVienId, khoaId, dk.hopDongLienKetId !== null, mucChoHocVien(muc, theoDoiTuong, dk.hocVien));
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
    include: { khoa: true, hocVien: true },
  });
  if (!dangKy || dangKy.khoa.mucHocPhi === null) return null;
  // (bổ sung 06/10/2026) khóa có thành phần lệ phí: khoản lệ phí đã lập theo thành phần khi đăng ký,
  // không đồng bộ lại theo 1 mức chung
  if ((await prisma.thanhPhanLePhi.count({ where: { khoaId: dangKy.khoaId } })) > 0) {
    return prisma.hocPhi.findUnique({ where: { hocVienId_khoaId: { hocVienId: dangKy.hocVienId, khoaId: dangKy.khoaId } } });
  }
  const muc = {
    sinhVien: Number(dangKy.khoa.mucHocPhi),
    tuDo: dangKy.khoa.mucHocPhiTuDo === null ? null : Number(dangKy.khoa.mucHocPhiTuDo),
  };

  return dongBoMotHocPhi(
    prisma,
    dangKy.hocVienId,
    dangKy.khoaId,
    dangKy.hopDongLienKetId !== null,
    mucChoHocVien(muc, await apDungLePhiTuDo(dangKy.khoaId), dangKy.hocVien),
  );
}

/**
 * (bổ sung 01/10/2026) khóa Phương thức 3 (dự thi): lệ phí phát sinh ngay khi
 * thí sinh đăng ký (thí sinh chuyển khoản trước, tài chính đối soát rồi mới
 * chốt danh sách chính thức) - không chờ HV-07 như các phương thức khác.
 */
export async function taoLePhiKhiDangKyDuThi(dangKyId: string) {
  return taoHocPhiSauKhiChinhThuc(dangKyId);
}

export async function hocPhiCuaKhoa(khoaId: string) {
  return prisma.hocPhi.findMany({
    where: { khoaId },
    include: { hocVien: true },
    orderBy: { hocVien: { hoTen: "asc" } },
  });
}
