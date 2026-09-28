import { prisma } from "@/lib/db/prisma";
import { ghiThaoTac, HE_THONG, type NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";
import type { LoaiVanBang } from "@/generated/prisma/client";
import { taoChuongTrinhVoiMaTuSinh } from "@/server/services/ct/dung-chung";
import {
  SaiTrangThaiChuongTrinhError,
  KhongTimThayChuongTrinhError,
} from "@/server/services/ct/loi-chuong-trinh";

export type TaoChuongTrinhInput = {
  ten: string;
  mucTieu?: string | null;
  doiTuongApDung?: string | null;
  tongThoiLuong?: number | null;
  loaiHinhBoiDuongId: string;
  // bổ sung 26/09/2026: chứng chỉ hay giấy chứng nhận (mặc định chứng chỉ)
  loaiVanBang?: LoaiVanBang;
};

export async function taoChuongTrinh(input: TaoChuongTrinhInput, nguoi: NguoiThucHien = HE_THONG) {
  const chuongTrinh = await taoChuongTrinhVoiMaTuSinh((maCT) =>
    prisma.chuongTrinh.create({
      data: { ...input, maCT },
      include: { loaiHinhBoiDuong: true },
    }),
  );
  await ghiThaoTac(nguoi, "TAO_CHUONG_TRINH", "ChuongTrinh", chuongTrinh.id, `${chuongTrinh.maCT} - ${chuongTrinh.ten}`);
  return chuongTrinh;
}

export async function layChuongTrinh(id: string) {
  return prisma.chuongTrinh.findUnique({
    where: { id },
    include: { loaiHinhBoiDuong: true, hocPhans: { orderBy: { thuTu: "asc" } } },
  });
}

export type SuaChuongTrinhInput = {
  ten: string;
  mucTieu?: string | null;
  doiTuongApDung?: string | null;
  tongThoiLuong?: number | null;
  loaiHinhBoiDuongId: string;
};

// Chỉnh sửa tự do chỉ áp dụng khi chương trình còn ở trạng thái "Dự thảo"
// (chưa trình duyệt). Sau khi trình duyệt/ban hành, việc sửa phải theo
// CT-04 với ràng buộc riêng cho chương trình đã ban hành.
export async function suaChuongTrinhDuThao(id: string, input: SuaChuongTrinhInput) {
  const chuongTrinh = await prisma.chuongTrinh.findUnique({ where: { id } });
  if (!chuongTrinh) throw new KhongTimThayChuongTrinhError();
  if (chuongTrinh.trangThai !== "DU_THAO") {
    throw new SaiTrangThaiChuongTrinhError(
      "Chỉ chương trình ở trạng thái Dự thảo mới được sửa trực tiếp",
    );
  }

  return prisma.chuongTrinh.update({ where: { id }, data: input });
}
