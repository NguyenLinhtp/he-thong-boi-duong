import { prisma } from "@/lib/db/prisma";
import { ghiThaoTac, HE_THONG, type NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";
import { daHoanTatNghiaVuTaiChinh } from "@/server/services/hp/hp-06-dieu-kien";
import {
  layKhoaKemChuongTrinh,
  hocVienTinhKetQua,
  chanNeuDaPheDuyet,
} from "@/server/services/kq/dung-chung";
import { ChuaTongHopKetQuaError } from "@/server/services/kq/loi-ket-qua";

/**
 * Đánh giá 1 học viên: hoàn thành = đạt học tập (KQ-02/KQ-06) VÀ đã hoàn tất
 * nghĩa vụ tài chính (HP-06 - học phí cá nhân, hoặc hợp đồng liên kết đã
 * thanh lý với học viên qua ĐVLK). "Học viên còn nợ học phí không được công
 * nhận hoàn thành dù đủ điểm".
 */
export async function danhGiaHoanThanh(ketQua: {
  hocVienId: string;
  khoaId: string;
  datHocTap: boolean | null;
  ghiChu: string | null;
}) {
  const duDieuKienHocPhi = await daHoanTatNghiaVuTaiChinh(ketQua.hocVienId, ketQua.khoaId);
  const hoanThanh = ketQua.datHocTap === true && duDieuKienHocPhi;

  // ghi chú của bước tổng hợp giữ nguyên, chỉ thêm/bớt phần lý do học phí
  const ghiChuHocTap = (ketQua.ghiChu ?? "")
    .split("; ")
    .filter((y) => y && !y.startsWith("Chưa hoàn tất nghĩa vụ tài chính"));
  if (!duDieuKienHocPhi) ghiChuHocTap.push("Chưa hoàn tất nghĩa vụ tài chính (HP-06)");

  return { duDieuKienHocPhi, hoanThanh, ghiChu: ghiChuHocTap.join("; ") || null };
}

/**
 * KQ-03 (Cán bộ quản lý đào tạo/Cán bộ tài chính): đối chiếu kết quả học tập
 * và điều kiện học phí, lập danh sách đủ/không đủ điều kiện hoàn thành. Áp
 * dụng chung cho khóa có giảng dạy và khóa Phương thức 3 (kết quả thi).
 */
export async function xetDieuKienHoanThanh(khoaId: string, nguoi: NguoiThucHien = HE_THONG) {
  const khoa = await layKhoaKemChuongTrinh(khoaId);
  await chanNeuDaPheDuyet(khoaId);

  const [dsDangKy, dsKetQua] = await Promise.all([
    hocVienTinhKetQua(khoaId),
    prisma.ketQuaKhoa.findMany({ where: { khoaId } }),
  ]);
  const hocVienCoKetQua = new Set(dsKetQua.map((kq) => kq.hocVienId));
  if (dsDangKy.length === 0 || dsDangKy.some((dk) => !hocVienCoKetQua.has(dk.hocVienId))) {
    throw new ChuaTongHopKetQuaError();
  }

  const danhGia = await Promise.all(dsKetQua.map(async (kq) => ({ id: kq.id, data: await danhGiaHoanThanh(kq) })));
  const soHoanThanh = danhGia.filter((d) => d.data.hoanThanh).length;
  await prisma.$transaction([
    ...danhGia.map((d) => prisma.ketQuaKhoa.update({ where: { id: d.id }, data: d.data })),
    ghiThaoTac(
      nguoi,
      "XET_DIEU_KIEN_HOAN_THANH",
      "Khoa",
      khoaId,
      `${khoa.maKhoa}: ${soHoanThanh}/${danhGia.length} học viên đủ điều kiện hoàn thành`,
    ),
  ]);

  return danhSachXetHoanThanh(khoaId);
}

export async function danhSachXetHoanThanh(khoaId: string) {
  const dsKetQua = await prisma.ketQuaKhoa.findMany({
    where: { khoaId },
    include: { hocVien: true },
    orderBy: { hocVien: { hoTen: "asc" } },
  });
  return {
    duDieuKien: dsKetQua.filter((kq) => kq.hoanThanh === true),
    khongDuDieuKien: dsKetQua.filter((kq) => kq.hoanThanh === false),
    chuaXet: dsKetQua.filter((kq) => kq.hoanThanh === null),
  };
}
