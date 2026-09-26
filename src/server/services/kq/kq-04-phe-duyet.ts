import { prisma } from "@/lib/db/prisma";
import { ghiNhatKy } from "@/server/services/qt/qt-03-nhat-ky";
import { guiThongBao } from "@/server/services/hv/hv-10-thong-bao";
import {
  thamSoKetQua,
  kiemTraDiem,
  tinhDiemHocPhan,
  soHoacNull,
  layKhoaKemChuongTrinh,
  laKhoaChiDuThi,
  hocVienTinhKetQua,
  chanNeuDaPheDuyet,
} from "@/server/services/kq/dung-chung";
import { tinhDiemTongKet, danhGiaHocTap } from "@/server/services/kq/kq-02-tong-hop";
import { danhGiaHoanThanh } from "@/server/services/kq/kq-03-xet-hoan-thanh";
import {
  ChuaTongHopKetQuaError,
  ChuaXetDieuKienError,
  ThieuSoQuyetDinhError,
  KhongTimThayKetQuaError,
  ChuaPheDuyetKhongCanPhucKhaoError,
  KhongPhaiKhoaChiDuThiError,
} from "@/server/services/kq/loi-ket-qua";

type NguoiThucHien = { nguoiThucHienId?: string | null; nguoiThucHienTen: string };

export type PheDuyetKetQuaInput = NguoiThucHien & { soQuyetDinh: string };

/**
 * KQ-04 (Hội đồng/Lãnh đạo - gộp vào Cán bộ quản lý đào tạo theo RBAC 6 vai
 * trò): phê duyệt kết quả toàn khóa kèm số quyết định công nhận. Chỉ duyệt
 * khi mọi học viên đã có kết quả và đã xét điều kiện (KQ-03). Sau khi duyệt:
 * học viên hoàn thành chuyển HOAN_THANH, điểm bị khóa (chỉ sửa qua phúc khảo).
 */
export async function pheDuyetKetQua(khoaId: string, input: PheDuyetKetQuaInput) {
  const khoa = await layKhoaKemChuongTrinh(khoaId);
  if (!input.soQuyetDinh.trim()) throw new ThieuSoQuyetDinhError();
  await chanNeuDaPheDuyet(khoaId);

  const [dsDangKy, dsKetQua] = await Promise.all([
    hocVienTinhKetQua(khoaId),
    prisma.ketQuaKhoa.findMany({ where: { khoaId } }),
  ]);
  const hocVienCoKetQua = new Set(dsKetQua.map((kq) => kq.hocVienId));
  if (dsDangKy.length === 0 || dsDangKy.some((dk) => !hocVienCoKetQua.has(dk.hocVienId))) {
    throw new ChuaTongHopKetQuaError();
  }
  if (dsKetQua.some((kq) => kq.hoanThanh === null)) throw new ChuaXetDieuKienError();

  const hocVienHoanThanh = dsKetQua.filter((kq) => kq.hoanThanh).map((kq) => kq.hocVienId);
  const ngayPheDuyet = new Date();

  await prisma.$transaction([
    prisma.ketQuaKhoa.updateMany({
      where: { khoaId },
      data: {
        daPheDuyet: true,
        soQuyetDinh: input.soQuyetDinh,
        ngayPheDuyet,
        nguoiPheDuyet: input.nguoiThucHienTen,
      },
    }),
    prisma.ketQuaHocTap.updateMany({ where: { khoaId }, data: { daPheDuyet: true } }),
    prisma.dangKyHoc.updateMany({
      where: { khoaId, hocVienId: { in: hocVienHoanThanh }, trangThai: "CHINH_THUC" },
      data: { trangThai: "HOAN_THANH" },
    }),
  ]);

  await ghiNhatKy({
    nguoiThucHienId: input.nguoiThucHienId,
    nguoiThucHienTen: input.nguoiThucHienTen,
    hanhDong: "PHE_DUYET_KET_QUA",
    doiTuong: "Khoa",
    doiTuongId: khoaId,
    chiTiet: `QĐ ${input.soQuyetDinh}: ${hocVienHoanThanh.length}/${dsKetQua.length} học viên hoàn thành`,
  });

  for (const kq of dsKetQua) {
    await guiThongBao(
      kq.hocVienId,
      "KET_QUA",
      `Kết quả khóa ${khoa.maKhoa} đã được phê duyệt`,
      `Kết quả của bạn ở khóa ${khoa.maKhoa} đã được công nhận theo quyết định ${input.soQuyetDinh}: ` +
        (kq.hoanThanh ? "Hoàn thành khóa." : `Chưa hoàn thành (${kq.ghiChu ?? "không đạt"}).`),
    );
  }

  return prisma.ketQuaKhoa.findMany({ where: { khoaId }, include: { hocVien: true } });
}

/**
 * Sau phúc khảo: tính lại đạt học tập + điều kiện hoàn thành cho đúng 1 học
 * viên, giữ nguyên trạng thái đã phê duyệt, cập nhật trạng thái đăng ký.
 */
async function capNhatKetQuaKhoaSauPhucKhao(
  ketQuaKhoa: { id: string; hocVienId: string; khoaId: string },
  danhGia: { diemTongKet: number | null; datHocTap: boolean; ghiChu: string | null },
) {
  const hoanThanh = await danhGiaHoanThanh({ ...ketQuaKhoa, ...danhGia });
  const sau = await prisma.ketQuaKhoa.update({
    where: { id: ketQuaKhoa.id },
    data: { diemTongKet: danhGia.diemTongKet, datHocTap: danhGia.datHocTap, ...hoanThanh },
  });
  await prisma.dangKyHoc.updateMany({
    where: {
      hocVienId: ketQuaKhoa.hocVienId,
      khoaId: ketQuaKhoa.khoaId,
      trangThai: { in: ["CHINH_THUC", "HOAN_THANH"] },
    },
    data: { trangThai: hoanThanh.hoanThanh ? "HOAN_THANH" : "CHINH_THUC" },
  });
  return sau;
}

export type PhucKhaoDiemHocPhanInput = NguoiThucHien & {
  diemThanhPhan: number | null;
  diemKetThuc: number | null;
  soQuyetDinhPhucKhao: string;
};

/** KQ-04: sửa điểm học phần ĐÃ phê duyệt - bắt buộc có quyết định phúc khảo. */
export async function phucKhaoDiemHocPhan(ketQuaHocTapId: string, input: PhucKhaoDiemHocPhanInput) {
  const ketQua = await prisma.ketQuaHocTap.findUnique({ where: { id: ketQuaHocTapId } });
  if (!ketQua) throw new KhongTimThayKetQuaError();
  if (!ketQua.daPheDuyet) throw new ChuaPheDuyetKhongCanPhucKhaoError();
  if (!input.soQuyetDinhPhucKhao.trim()) throw new ThieuSoQuyetDinhError();
  kiemTraDiem(input.diemThanhPhan);
  kiemTraDiem(input.diemKetThuc);

  const thamSo = await thamSoKetQua();
  const diemHocPhan = tinhDiemHocPhan(input.diemThanhPhan, input.diemKetThuc, thamSo.tyLeThanhPhan);

  await prisma.ketQuaHocTap.update({
    where: { id: ketQuaHocTapId },
    data: {
      diemThanhPhan: input.diemThanhPhan,
      diemKetThuc: input.diemKetThuc,
      diemHocPhan,
      dat: diemHocPhan === null ? null : diemHocPhan >= thamSo.diemDat,
      soQuyetDinhPhucKhao: input.soQuyetDinhPhucKhao,
    },
  });

  await ghiNhatKy({
    nguoiThucHienId: input.nguoiThucHienId,
    nguoiThucHienTen: input.nguoiThucHienTen,
    hanhDong: "PHUC_KHAO_DIEM_HOC_PHAN",
    doiTuong: "KetQuaHocTap",
    doiTuongId: ketQuaHocTapId,
    chiTiet:
      `QĐ phúc khảo ${input.soQuyetDinhPhucKhao}: TP ${soHoacNull(ketQua.diemThanhPhan)} -> ${input.diemThanhPhan}, ` +
      `KT ${soHoacNull(ketQua.diemKetThuc)} -> ${input.diemKetThuc}`,
  });

  const ketQuaKhoa = await prisma.ketQuaKhoa.findUnique({
    where: { hocVienId_khoaId: { hocVienId: ketQua.hocVienId, khoaId: ketQua.khoaId } },
  });
  if (!ketQuaKhoa) return null;

  const khoa = await layKhoaKemChuongTrinh(ketQua.khoaId);
  const dsDiem = await prisma.ketQuaHocTap.findMany({
    where: { hocVienId: ketQua.hocVienId, khoaId: ketQua.khoaId },
  });
  const { diemTongKet, hocPhanThieuDiem } = tinhDiemTongKet(
    khoa.chuongTrinh.hocPhans,
    new Map(dsDiem.map((d) => [d.hocPhanId, soHoacNull(d.diemHocPhan)])),
  );
  const danhGia = danhGiaHocTap(
    { diemTongKet, hocPhanThieuDiem, tyLeChuyenCan: soHoacNull(ketQuaKhoa.tyLeChuyenCan) },
    thamSo,
  );
  return capNhatKetQuaKhoaSauPhucKhao(ketQuaKhoa, { diemTongKet, ...danhGia });
}

export type PhucKhaoKetQuaThiInput = NguoiThucHien & {
  diemThi: number;
  soQuyetDinhPhucKhao: string;
};

/** KQ-04 + KQ-06: sửa điểm thi (Phương thức 3) đã phê duyệt theo quyết định phúc khảo. */
export async function phucKhaoKetQuaThi(ketQuaKhoaId: string, input: PhucKhaoKetQuaThiInput) {
  const ketQuaKhoa = await prisma.ketQuaKhoa.findUnique({ where: { id: ketQuaKhoaId } });
  if (!ketQuaKhoa) throw new KhongTimThayKetQuaError();
  // khóa có giảng dạy: điểm tổng kết suy ra từ học phần -> phúc khảo từng học phần
  if (!laKhoaChiDuThi(await layKhoaKemChuongTrinh(ketQuaKhoa.khoaId))) {
    throw new KhongPhaiKhoaChiDuThiError();
  }
  if (!ketQuaKhoa.daPheDuyet) throw new ChuaPheDuyetKhongCanPhucKhaoError();
  if (!input.soQuyetDinhPhucKhao.trim()) throw new ThieuSoQuyetDinhError();
  kiemTraDiem(input.diemThi);

  const thamSo = await thamSoKetQua();
  const danhGia = danhGiaHocTap(
    { diemTongKet: input.diemThi, hocPhanThieuDiem: [], tyLeChuyenCan: null },
    thamSo,
  );

  await ghiNhatKy({
    nguoiThucHienId: input.nguoiThucHienId,
    nguoiThucHienTen: input.nguoiThucHienTen,
    hanhDong: "PHUC_KHAO_KET_QUA_THI",
    doiTuong: "KetQuaKhoa",
    doiTuongId: ketQuaKhoaId,
    chiTiet: `QĐ phúc khảo ${input.soQuyetDinhPhucKhao}: ${soHoacNull(ketQuaKhoa.diemTongKet)} -> ${input.diemThi}`,
  });

  return capNhatKetQuaKhoaSauPhucKhao(ketQuaKhoa, { diemTongKet: input.diemThi, ...danhGia });
}
