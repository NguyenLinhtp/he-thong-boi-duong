import { prisma } from "@/lib/db/prisma";
import { ghiThaoTac, HE_THONG, type NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";
import { giangVienHieuLuc } from "@/server/services/kh/kh-03-thoi-khoa-bieu";
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

/**
 * Học phần giảng viên được phân công (KH-02) ở các khóa có giảng dạy - gom
 * theo (khóa, học phần) vì 1 giảng viên có thể được phân công ở nhiều lớp
 * (KH-07) của cùng học phần; tên các lớp đi kèm để hiển thị.
 */
export async function hocPhanPhuTrach(giangVienId: string) {
  const dsPhanCong = await prisma.giangVienHocPhan.findMany({
    where: { giangVienId, khoa: { trangThai: { not: "HUY" } } },
    include: { khoa: { include: { chuongTrinh: true } }, hocPhan: true, lop: true },
    orderBy: [{ khoa: { maKhoa: "asc" } }, { hocPhan: { thuTu: "asc" } }],
  });
  const theoKhoaHocPhan = new Map<string, (typeof dsPhanCong)[number] & { tenLops: string[] }>();
  for (const pc of dsPhanCong.filter((pc) => !laKhoaChiDuThi(pc.khoa))) {
    const khoa = `${pc.khoaId}|${pc.hocPhanId}`;
    const daCo = theoKhoaHocPhan.get(khoa) ?? { ...pc, tenLops: [] };
    daCo.tenLops.push(pc.lop?.maLop ?? "Cả khóa");
    theoKhoaHocPhan.set(khoa, daCo);
  }
  return [...theoKhoaHocPhan.values()];
}

/**
 * KQ-01: "Chỉ nhập được cho học phần mình phụ trách" - phụ trách xác định qua
 * phân công KH-02. Khi khóa chia lớp (KH-07), mỗi học viên theo giảng viên
 * hiệu lực của lớp hiện tại của mình; điểm vẫn gắn theo khóa nên học viên
 * chuyển lớp giữa chừng giữ nguyên điểm đã nhập, giảng viên lớp mới nhập tiếp.
 */
async function kiemTraPhuTrach(giangVienId: string, khoaId: string, hocPhanId: string) {
  const khoa = await layKhoaKemChuongTrinh(khoaId);
  if (laKhoaChiDuThi(khoa)) throw new KhoaChiDuThiError();

  const [dsDangKy, dsPhanCong] = await Promise.all([
    hocVienTinhKetQua(khoaId),
    prisma.giangVienHocPhan.findMany({ where: { khoaId, hocPhanId } }),
  ]);
  const dsPhuTrach = dsDangKy.filter(
    (dk) => giangVienHieuLuc(dsPhanCong, khoaId, hocPhanId, dk.lopId) === giangVienId,
  );
  const coPhanCong = dsPhanCong.some((pc) => pc.giangVienId === giangVienId);
  if (!coPhanCong) throw new KhongPhuTrachHocPhanError();

  return { khoa, dsDangKy, dsPhuTrach };
}

export async function bangDiemHocPhan(giangVienId: string, khoaId: string, hocPhanId: string) {
  const { khoa, dsPhuTrach } = await kiemTraPhuTrach(giangVienId, khoaId, hocPhanId);
  const hocPhan = khoa.chuongTrinh.hocPhans.find((hp) => hp.id === hocPhanId)!;

  const dsKetQua = await prisma.ketQuaHocTap.findMany({ where: { khoaId, hocPhanId } });
  const ketQuaTheoHocVien = new Map(dsKetQua.map((kq) => [kq.hocVienId, kq]));

  return {
    khoa,
    hocPhan,
    dong: dsPhuTrach.map((dk) => {
      const kq = ketQuaTheoHocVien.get(dk.hocVienId);
      return {
        hocVienId: dk.hocVienId,
        maHocVien: dk.hocVien.maHocVien,
        hoTen: dk.hocVien.hoTen,
        maLop: dk.lop?.maLop ?? null,
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
  nguoi: NguoiThucHien = HE_THONG,
) {
  const { khoa, dsDangKy, dsPhuTrach } = await kiemTraPhuTrach(giangVienId, khoaId, hocPhanId);

  for (const dong of danhSach) {
    kiemTraDiem(dong.diemThanhPhan);
    kiemTraDiem(dong.diemKetThuc);
  }

  const hocVienTrongKhoa = new Set(dsDangKy.map((dk) => dk.hocVienId));
  if (danhSach.some((dong) => !hocVienTrongKhoa.has(dong.hocVienId))) {
    throw new HocVienKhongThuocKhoaError();
  }
  // học viên ở lớp do giảng viên khác phụ trách học phần này
  const hocVienPhuTrach = new Set(dsPhuTrach.map((dk) => dk.hocVienId));
  if (danhSach.some((dong) => !hocVienPhuTrach.has(dong.hocVienId))) {
    throw new KhongPhuTrachHocPhanError();
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

  // QT-03: ghi lại điểm đã nhập (mã học viên: thành phần/kết thúc)
  const diem = (d: number | null) => (d === null ? "-" : String(d));
  const maHocVien = new Map(dsDangKy.map((dk) => [dk.hocVienId, dk.hocVien.maHocVien]));
  const hocPhan = khoa.chuongTrinh.hocPhans.find((hp) => hp.id === hocPhanId);
  const nhatKy = ghiThaoTac(
    nguoi,
    "NHAP_DIEM_HOC_PHAN",
    "Khoa",
    khoaId,
    `${khoa.maKhoa} - ${hocPhan?.ten ?? hocPhanId}: ` +
      danhSach
        .map((d) => `${maHocVien.get(d.hocVienId) ?? d.hocVienId} ${diem(d.diemThanhPhan)}/${diem(d.diemKetThuc)}`)
        .join("; "),
  );

  await prisma.$transaction([
    nhatKy,
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
