import { prisma } from "@/lib/db/prisma";
import { ghiNhatKy } from "@/server/services/qt/qt-03-nhat-ky";

export async function danhSachThamSo() {
  return prisma.thamSoHeThong.findMany({ orderBy: { ma: "asc" } });
}

export async function layThamSo(ma: string): Promise<string | null> {
  const thamSo = await prisma.thamSoHeThong.findUnique({ where: { ma } });
  return thamSo?.giaTri ?? null;
}

/**
 * Đọc tham số dạng số, dùng cho những nơi trước đây hardcode hằng số (vd
 * SO_NGAY_HAN_NOP_GIAY ở HV-01/11/12) - trả về macDinh nếu chưa cấu hình
 * hoặc giá trị lưu không parse được thành số.
 */
export async function layThamSoSo(ma: string, macDinh: number): Promise<number> {
  const giaTri = await layThamSo(ma);
  if (giaTri === null) return macDinh;
  const so = Number(giaTri);
  return Number.isFinite(so) ? so : macDinh;
}

export type CapNhatThamSoInput = {
  ma: string;
  giaTri: string;
  moTa?: string | null;
  nguoiThucHienId?: string | null;
  nguoiThucHienTen: string;
};

// QT-05: "Thay đổi cấu hình được ghi vào nhật ký thao tác" (QT-03).
export async function capNhatThamSo(input: CapNhatThamSoInput) {
  const truoc = await prisma.thamSoHeThong.findUnique({ where: { ma: input.ma } });

  const sau = await prisma.thamSoHeThong.upsert({
    where: { ma: input.ma },
    create: { ma: input.ma, giaTri: input.giaTri, moTa: input.moTa ?? null },
    update: { giaTri: input.giaTri, moTa: input.moTa ?? undefined },
  });

  await ghiNhatKy({
    nguoiThucHienId: input.nguoiThucHienId,
    nguoiThucHienTen: input.nguoiThucHienTen,
    hanhDong: truoc ? "CAP_NHAT_THAM_SO" : "TAO_THAM_SO",
    doiTuong: "ThamSoHeThong",
    doiTuongId: sau.id,
    chiTiet: `${input.ma}: "${truoc?.giaTri ?? ""}" -> "${input.giaTri}"`,
  });

  return sau;
}

export async function xoaThamSo(
  ma: string,
  nguoiThucHien: { id?: string | null; ten: string },
) {
  const thamSo = await prisma.thamSoHeThong.delete({ where: { ma } });

  await ghiNhatKy({
    nguoiThucHienId: nguoiThucHien.id,
    nguoiThucHienTen: nguoiThucHien.ten,
    hanhDong: "XOA_THAM_SO",
    doiTuong: "ThamSoHeThong",
    doiTuongId: thamSo.id,
    chiTiet: `${ma}: "${thamSo.giaTri}"`,
  });

  return thamSo;
}
