import { prisma } from "@/lib/db/prisma";
import { tenDonViThoiLuong } from "@/lib/don-vi-thoi-luong";
import { ghiThaoTac, HE_THONG, type NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";
import { xoaTep } from "@/server/services/gd/luu-tru-hoc-lieu";
import {
  SaiTrangThaiChuongTrinhError,
  KhongTimThayChuongTrinhError,
} from "@/server/services/ct/loi-chuong-trinh";

/**
 * Nội dung học phần (thêm/sửa/xóa/sắp xếp) thay đổi tự do khi chương trình còn "Dự thảo".
 * (sửa 07/10/2026) Chương trình "Đã ban hành" cũng thêm/sửa/xóa được học phần trên màn hình Khung
 * chương trình nhưng bắt buộc lý do + ghi nhật ký (sắp xếp không cần lý do); không xóa học phần đã
 * phát sinh dữ liệu ở khóa nào, không đổi số tiết học phần đã có kết quả học tập. Chờ thẩm định /
 * Ngừng hiệu lực: chỉ xem.
 */
async function kiemTraDuocSuaHocPhan(chuongTrinhId: string, lyDo: string | null | undefined, canLyDo = true) {
  const chuongTrinh = await prisma.chuongTrinh.findUnique({ where: { id: chuongTrinhId } });
  if (!chuongTrinh) throw new KhongTimThayChuongTrinhError();
  if (chuongTrinh.trangThai !== "DU_THAO" && chuongTrinh.trangThai !== "DA_BAN_HANH") {
    throw new SaiTrangThaiChuongTrinhError(
      "Chỉ chỉnh sửa được học phần khi chương trình ở trạng thái Dự thảo hoặc Đã ban hành",
    );
  }
  const daBanHanh = chuongTrinh.trangThai === "DA_BAN_HANH";
  const lyDoGon = (lyDo ?? "").trim();
  if (daBanHanh && canLyDo && !lyDoGon) {
    throw new SaiTrangThaiChuongTrinhError("Chương trình đã ban hành: cần nhập lý do thay đổi học phần");
  }
  return { chuongTrinh, daBanHanh, lyDo: lyDoGon };
}

function kiemTraNoiDung(input: { ten: string; soTiet: number }) {
  const ten = (input.ten ?? "").trim().replace(/\s+/g, " ");
  if (!ten) throw new SaiTrangThaiChuongTrinhError("Chưa nhập tên học phần");
  if (ten.length > 300) throw new SaiTrangThaiChuongTrinhError("Tên học phần tối đa 300 ký tự");
  if (!Number.isInteger(input.soTiet) || input.soTiet < 1) throw new SaiTrangThaiChuongTrinhError("Thời lượng học phần phải là số nguyên từ 1 trở lên");
  return { ten, soTiet: input.soTiet };
}

/** Dữ liệu đã phát sinh theo học phần ở các khóa - học phần có dữ liệu thì không xóa được. */
async function duLieuCuaHocPhan(hocPhanId: string) {
  const [buoiHoc, phanCong, taiLieu, ketQua, baiLam, baiNop] = await Promise.all([
    prisma.buoiHoc.count({ where: { hocPhanId } }),
    prisma.giangVienHocPhan.count({ where: { hocPhanId } }),
    prisma.taiLieuHocTap.count({ where: { hocPhanId } }),
    prisma.ketQuaHocTap.count({ where: { hocPhanId } }),
    prisma.lanLamTracNghiem.count({ where: { bai: { hocPhanId } } }),
    prisma.baiNopSanPham.count({ where: { yeuCau: { hocPhanId } } }),
  ]);
  return (
    [
      [buoiHoc, "buổi học"],
      [phanCong, "phân công giảng viên"],
      [taiLieu, "tài liệu của khóa"],
      [ketQua, "kết quả học tập"],
      [baiLam, "lần làm trắc nghiệm"],
      [baiNop, "bài nộp sản phẩm"],
    ] as const
  ).filter(([n]) => n > 0);
}

export async function danhSachHocPhan(chuongTrinhId: string) {
  return prisma.hocPhan.findMany({
    where: { chuongTrinhId },
    orderBy: { thuTu: "asc" },
  });
}

export async function tongSoTietHocPhan(chuongTrinhId: string) {
  const ketQua = await prisma.hocPhan.aggregate({
    where: { chuongTrinhId },
    _sum: { soTiet: true },
  });
  return ketQua._sum.soTiet ?? 0;
}

/**
 * CT-02/CT-03: "Tổng số tiết học phần phải khớp tổng thời lượng chương
 * trình" - dùng làm cổng kiểm tra trước khi cho trình duyệt (CT-03), không
 * chặn từng lần thêm/sửa lẻ tẻ vì học phần được xây dần trong lúc Dự thảo.
 */
export async function tongTietDaKhopThoiLuong(chuongTrinhId: string): Promise<boolean> {
  const chuongTrinh = await prisma.chuongTrinh.findUnique({ where: { id: chuongTrinhId } });
  if (!chuongTrinh) throw new KhongTimThayChuongTrinhError();
  if (chuongTrinh.tongThoiLuong == null) return false;

  const tongTiet = await tongSoTietHocPhan(chuongTrinhId);
  return tongTiet === chuongTrinh.tongThoiLuong;
}

/**
 * (sửa 19/10/2026 - CT-03) chương trình tính thời lượng theo tiết/tín chỉ/buổi nên tổng thời lượng
 * học phần lệch tổng thời lượng chương trình chỉ CẢNH BÁO khi trình thẩm định/phê duyệt, không chặn.
 * Trả về nội dung cảnh báo, null nếu khớp hoặc chương trình chỉ dự thi (PT3 - không bắt buộc học phần).
 */
export async function canhBaoThoiLuong(chuongTrinhId: string): Promise<string | null> {
  const chuongTrinh = await prisma.chuongTrinh.findUnique({ where: { id: chuongTrinhId } });
  if (!chuongTrinh) throw new KhongTimThayChuongTrinhError();
  if (chuongTrinh.phuongThucDangKys.includes("CHI_DU_THI")) return null;
  const dv = tenDonViThoiLuong(chuongTrinh.donViThoiLuong);
  const tong = await tongSoTietHocPhan(chuongTrinhId);
  if (chuongTrinh.tongThoiLuong == null) return `Chương trình chưa nhập tổng thời lượng (học phần: ${tong} ${dv})`;
  if (tong === chuongTrinh.tongThoiLuong) return null;
  return `Tổng thời lượng học phần (${tong} ${dv}) chưa khớp tổng thời lượng chương trình (${chuongTrinh.tongThoiLuong} ${dv})`;
}

export type ThemHocPhanInput = { ten: string; soTiet: number; lyDo?: string | null };

export async function themHocPhan(chuongTrinhId: string, input: ThemHocPhanInput, nguoi: NguoiThucHien = HE_THONG) {
  const { chuongTrinh, daBanHanh, lyDo } = await kiemTraDuocSuaHocPhan(chuongTrinhId, input.lyDo);
  const { ten, soTiet } = kiemTraNoiDung(input);

  const hocPhanCuoi = await prisma.hocPhan.findFirst({
    where: { chuongTrinhId },
    orderBy: { thuTu: "desc" },
  });

  const hocPhan = await prisma.hocPhan.create({
    data: { chuongTrinhId, ten, soTiet, thuTu: (hocPhanCuoi?.thuTu ?? 0) + 1 },
  });
  if (daBanHanh) {
    await ghiThaoTac(nguoi, "THEM_HOC_PHAN", "HocPhan", hocPhan.id, `${chuongTrinh.maCT} (đã ban hành): thêm "${ten}" ${soTiet} tiết. Lý do: ${lyDo}`);
  }
  return hocPhan;
}

export type SuaHocPhanInput = { ten: string; soTiet: number; lyDo?: string | null };

export async function suaHocPhan(id: string, input: SuaHocPhanInput, nguoi: NguoiThucHien = HE_THONG) {
  const hocPhan = await prisma.hocPhan.findUnique({ where: { id } });
  if (!hocPhan) throw new Error("Không tìm thấy học phần");
  const { chuongTrinh, daBanHanh, lyDo } = await kiemTraDuocSuaHocPhan(hocPhan.chuongTrinhId, input.lyDo);
  const { ten, soTiet } = kiemTraNoiDung(input);
  if (soTiet !== hocPhan.soTiet && (await prisma.ketQuaHocTap.count({ where: { hocPhanId: id } })) > 0) {
    throw new SaiTrangThaiChuongTrinhError(`Học phần "${hocPhan.ten}" đã có kết quả học tập - không đổi được số tiết`);
  }

  const sau = await prisma.hocPhan.update({ where: { id }, data: { ten, soTiet } });
  if (daBanHanh) {
    await ghiThaoTac(
      nguoi,
      "SUA_HOC_PHAN",
      "HocPhan",
      id,
      `${chuongTrinh.maCT} (đã ban hành): "${hocPhan.ten}" ${hocPhan.soTiet} tiết -> "${ten}" ${soTiet} tiết. Lý do: ${lyDo}`,
    );
  }
  return sau;
}

export async function xoaHocPhan(id: string, lyDo?: string | null, nguoi: NguoiThucHien = HE_THONG) {
  const hocPhan = await prisma.hocPhan.findUnique({ where: { id } });
  if (!hocPhan) throw new Error("Không tìm thấy học phần");
  const kt = await kiemTraDuocSuaHocPhan(hocPhan.chuongTrinhId, lyDo);
  const vuong = await duLieuCuaHocPhan(id);
  if (vuong.length > 0) {
    throw new SaiTrangThaiChuongTrinhError(
      `Không xóa được học phần "${hocPhan.ten}": đã có ${vuong.map(([n, ten]) => `${n} ${ten}`).join(", ")}`,
    );
  }

  // học liệu khung, bài trắc nghiệm (chưa có lần làm), yêu cầu sản phẩm (chưa có bài nộp) xóa theo;
  // tệp học liệu trên đĩa xóa sau khi xóa xong
  const dsTep = await prisma.hocLieuHocPhan.findMany({ where: { hocPhanId: id, khoaLuuTru: { not: null } }, select: { khoaLuuTru: true } });
  const daXoa = await prisma.hocPhan.delete({ where: { id } });
  for (const t of dsTep) await xoaTep(t.khoaLuuTru!).catch(() => undefined);
  await prisma.$transaction(async (tx) => {
    const conLai = await tx.hocPhan.findMany({ where: { chuongTrinhId: hocPhan.chuongTrinhId }, orderBy: { thuTu: "asc" } });
    for (const [i, hp] of conLai.entries()) if (hp.thuTu !== i + 1) await tx.hocPhan.update({ where: { id: hp.id }, data: { thuTu: i + 1 } });
  });
  if (kt.daBanHanh) {
    await ghiThaoTac(nguoi, "XOA_HOC_PHAN", "HocPhan", id, `${kt.chuongTrinh.maCT} (đã ban hành): xóa "${hocPhan.ten}" ${hocPhan.soTiet} tiết. Lý do: ${kt.lyDo}`);
  }
  return daXoa;
}

/**
 * Sắp xếp lại thứ tự học phần trong 1 chương trình: nhận đúng danh sách id
 * học phần theo thứ tự mới mong muốn, ghi lại thuTu = vị trí trong mảng.
 */
export async function sapXepHocPhan(chuongTrinhId: string, thuTuIdMoi: string[]) {
  await kiemTraDuocSuaHocPhan(chuongTrinhId, null, false);

  const hocPhanHienCo = await prisma.hocPhan.findMany({ where: { chuongTrinhId } });
  const idHienCo = new Set(hocPhanHienCo.map((hp) => hp.id));

  if (
    thuTuIdMoi.length !== hocPhanHienCo.length ||
    !thuTuIdMoi.every((id) => idHienCo.has(id))
  ) {
    throw new Error("Danh sách sắp xếp không khớp với các học phần hiện có của chương trình");
  }

  await prisma.$transaction(
    thuTuIdMoi.map((id, viTri) =>
      prisma.hocPhan.update({ where: { id }, data: { thuTu: viTri + 1 } }),
    ),
  );
}
