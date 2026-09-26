import { prisma } from "@/lib/db/prisma";
import { timGiangVienChoHocPhan } from "@/server/services/kh/kh-03-thoi-khoa-bieu";
import {
  thamSoKetQua,
  kiemTraDiem,
  tinhDiemHocPhan,
  layKhoaKemChuongTrinh,
  laKhoaChiDuThi,
  hocVienTinhKetQua,
} from "@/server/services/kq/dung-chung";
import {
  KhongPhuTrachHocPhanError,
  KhoaChiDuThiError,
  HocVienKhongThuocKhoaError,
  KetQuaDaPheDuyetError,
} from "@/server/services/kq/loi-ket-qua";

export type DongNhapDiemInput = {
  hocVienId: string;
  diemThanhPhan: number | null;
  diemKetThuc: number | null;
};

/** Học phần giảng viên được phân công (KH-02) ở các khóa có giảng dạy. */
export async function hocPhanPhuTrach(giangVienId: string) {
  const dsPhanCong = await prisma.giangVienHocPhan.findMany({
    where: { giangVienId, khoa: { trangThai: { not: "HUY" } } },
    include: { khoa: { include: { chuongTrinh: true } }, hocPhan: true },
    orderBy: [{ khoa: { maKhoa: "asc" } }, { hocPhan: { thuTu: "asc" } }],
  });
  return dsPhanCong.filter((pc) => !laKhoaChiDuThi(pc.khoa));
}

/**
 * KQ-01: "Chỉ nhập được cho học phần mình phụ trách" - phụ trách xác định qua
 * phân công KH-02 (GiangVienHocPhan theo khóa + học phần).
 */
async function kiemTraPhuTrach(giangVienId: string, khoaId: string, hocPhanId: string) {
  const khoa = await layKhoaKemChuongTrinh(khoaId);
  if (laKhoaChiDuThi(khoa)) throw new KhoaChiDuThiError();

  const giangVienPhuTrach = await timGiangVienChoHocPhan(khoaId, hocPhanId);
  if (!giangVienPhuTrach || giangVienPhuTrach !== giangVienId) {
    throw new KhongPhuTrachHocPhanError();
  }
  return khoa;
}

export async function bangDiemHocPhan(giangVienId: string, khoaId: string, hocPhanId: string) {
  const khoa = await kiemTraPhuTrach(giangVienId, khoaId, hocPhanId);
  const hocPhan = khoa.chuongTrinh.hocPhans.find((hp) => hp.id === hocPhanId)!;

  const [dsDangKy, dsKetQua] = await Promise.all([
    hocVienTinhKetQua(khoaId),
    prisma.ketQuaHocTap.findMany({ where: { khoaId, hocPhanId } }),
  ]);
  const ketQuaTheoHocVien = new Map(dsKetQua.map((kq) => [kq.hocVienId, kq]));

  return {
    khoa,
    hocPhan,
    dong: dsDangKy.map((dk) => {
      const kq = ketQuaTheoHocVien.get(dk.hocVienId);
      return {
        hocVienId: dk.hocVienId,
        maHocVien: dk.hocVien.maHocVien,
        hoTen: dk.hocVien.hoTen,
        diemThanhPhan: kq?.diemThanhPhan != null ? Number(kq.diemThanhPhan) : null,
        diemKetThuc: kq?.diemKetThuc != null ? Number(kq.diemKetThuc) : null,
        diemHocPhan: kq?.diemHocPhan != null ? Number(kq.diemHocPhan) : null,
        dat: kq?.dat ?? null,
        daPheDuyet: kq?.daPheDuyet ?? false,
      };
    }),
  };
}

export async function nhapDiemHocPhan(
  giangVienId: string,
  khoaId: string,
  hocPhanId: string,
  danhSach: DongNhapDiemInput[],
) {
  await kiemTraPhuTrach(giangVienId, khoaId, hocPhanId);

  for (const dong of danhSach) {
    kiemTraDiem(dong.diemThanhPhan);
    kiemTraDiem(dong.diemKetThuc);
  }

  const hocVienHopLe = new Set((await hocVienTinhKetQua(khoaId)).map((dk) => dk.hocVienId));
  if (danhSach.some((dong) => !hocVienHopLe.has(dong.hocVienId))) {
    throw new HocVienKhongThuocKhoaError();
  }

  const daDuyet = await prisma.ketQuaHocTap.count({
    where: { khoaId, hocPhanId, daPheDuyet: true, hocVienId: { in: danhSach.map((d) => d.hocVienId) } },
  });
  if (daDuyet > 0) throw new KetQuaDaPheDuyetError();

  const { tyLeThanhPhan, diemDat } = await thamSoKetQua();

  // Kết quả toàn khóa (KQ-02) của học viên vừa đổi điểm không còn đúng - xóa
  // để KQ-03/KQ-04 buộc phải tổng hợp lại, tránh xét/duyệt trên số liệu cũ.
  const xoaKetQuaKhoaCu = prisma.ketQuaKhoa.deleteMany({
    where: { khoaId, daPheDuyet: false, hocVienId: { in: danhSach.map((d) => d.hocVienId) } },
  });

  await prisma.$transaction([
    xoaKetQuaKhoaCu,
    ...danhSach.map((dong) => {
      const diemHocPhan = tinhDiemHocPhan(dong.diemThanhPhan, dong.diemKetThuc, tyLeThanhPhan);
      const data = {
        diemThanhPhan: dong.diemThanhPhan,
        diemKetThuc: dong.diemKetThuc,
        diemHocPhan,
        dat: diemHocPhan === null ? null : diemHocPhan >= diemDat,
      };
      return prisma.ketQuaHocTap.upsert({
        where: { hocVienId_khoaId_hocPhanId: { hocVienId: dong.hocVienId, khoaId, hocPhanId } },
        update: data,
        create: { hocVienId: dong.hocVienId, khoaId, hocPhanId, ...data },
      });
    }),
  ]);

  return bangDiemHocPhan(giangVienId, khoaId, hocPhanId);
}
