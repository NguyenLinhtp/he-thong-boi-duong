import { prisma } from "@/lib/db/prisma";
import {
  MaTrungError,
  DangDuocThamChieuError,
  ChongLapThoiGianError,
} from "@/server/services/shared/loi-danh-muc";

export async function danhSachDotTuyenSinh() {
  return prisma.dotTuyenSinh.findMany({ orderBy: { ngayBatDau: "asc" } });
}

async function kiemTraMaTrung(ma: string, boQuaId?: string) {
  const daTonTai = await prisma.dotTuyenSinh.findUnique({ where: { ma } });
  if (daTonTai && daTonTai.id !== boQuaId) throw new MaTrungError(ma);
}

// "Thời gian các đợt không chồng lấn bất hợp lý" - chặn chồng lấn hoàn toàn:
// 2 khoảng [a1,a2] và [b1,b2] chồng lấn khi a1 <= b2 && b1 <= a2.
async function kiemTraChongLapThoiGian(
  ngayBatDau: Date,
  ngayKetThuc: Date,
  boQuaId?: string,
) {
  if (ngayBatDau >= ngayKetThuc) {
    throw new ChongLapThoiGianError("Thời gian bắt đầu phải trước thời gian kết thúc");
  }

  const cacDotKhac = await prisma.dotTuyenSinh.findMany({
    where: boQuaId ? { id: { not: boQuaId } } : undefined,
  });

  const bChongLap = cacDotKhac.some(
    (dot) => ngayBatDau <= dot.ngayKetThuc && dot.ngayBatDau <= ngayKetThuc,
  );
  if (bChongLap) {
    throw new ChongLapThoiGianError("Thời gian đợt tuyển sinh chồng lấn với đợt khác đã có");
  }
}

export type DotTuyenSinhInput = {
  ma: string;
  ten: string;
  ngayBatDau: Date;
  ngayKetThuc: Date;
};

export async function taoDotTuyenSinh(input: DotTuyenSinhInput) {
  await kiemTraMaTrung(input.ma);
  await kiemTraChongLapThoiGian(input.ngayBatDau, input.ngayKetThuc);
  return prisma.dotTuyenSinh.create({ data: input });
}

export async function suaDotTuyenSinh(id: string, input: DotTuyenSinhInput) {
  await kiemTraMaTrung(input.ma, id);
  await kiemTraChongLapThoiGian(input.ngayBatDau, input.ngayKetThuc, id);
  return prisma.dotTuyenSinh.update({ where: { id }, data: input });
}

export async function xoaDotTuyenSinh(id: string) {
  const soKhoaThamChieu = await prisma.khoa.count({ where: { dotTuyenSinhId: id } });
  if (soKhoaThamChieu > 0) {
    throw new DangDuocThamChieuError("Không thể xóa đợt tuyển sinh đang có khóa mở theo đợt này");
  }
  return prisma.dotTuyenSinh.delete({ where: { id } });
}
