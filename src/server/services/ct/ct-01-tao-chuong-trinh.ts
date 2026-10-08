import { prisma } from "@/lib/db/prisma";
import { ghiThaoTac, HE_THONG, type NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";
import type { LoaiVanBang } from "@/generated/prisma/client";
import { taoChuongTrinhVoiMaTuSinh } from "@/server/services/ct/dung-chung";
import { xoaTep } from "@/server/services/gd/luu-tru-hoc-lieu";
import {
  SaiTrangThaiChuongTrinhError,
  KhongTimThayChuongTrinhError,
  KhongXoaDuocChuongTrinhError,
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

/**
 * (bổ sung 07/10/2026 - CT-01) Xóa chương trình tạo sai: chỉ khi chưa mở khóa nào từ chương trình
 * (kể cả khóa đã hủy - khóa giữ lịch sử tuyển sinh/thu phí theo chương trình). Học phần, học liệu
 * khung, bài trắc nghiệm, câu hỏi, yêu cầu sản phẩm, lịch sử phiên bản xóa theo (cascade); tệp học
 * liệu trên đĩa xóa sau khi giao dịch thành công. Khóa hàng chương trình (FOR UPDATE); khóa mở cùng
 * lúc vẫn bị khóa ngoại Khoa -> ChuongTrinh chặn. Ghi nhật ký.
 */
export async function xoaChuongTrinh(id: string, nguoi: NguoiThucHien = HE_THONG) {
  const ketQua = await prisma.$transaction(async (tx) => {
    const ds = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM chuong_trinh WHERE id = ${id} FOR UPDATE`;
    if (ds.length === 0) throw new KhongTimThayChuongTrinhError();
    const ct = await tx.chuongTrinh.findUniqueOrThrow({ where: { id }, include: { _count: { select: { khoas: true } } } });
    if (ct._count.khoas > 0) throw new KhongXoaDuocChuongTrinhError(`đã có ${ct._count.khoas} khóa mở từ chương trình (xóa khóa trước hoặc ngừng hiệu lực chương trình - CT-06)`);

    const dsTep = await tx.hocLieuHocPhan.findMany({
      where: { hocPhan: { chuongTrinhId: id }, khoaLuuTru: { not: null } },
      select: { khoaLuuTru: true },
    });
    await tx.chuongTrinh.delete({ where: { id } });
    await ghiThaoTac(
      nguoi,
      "XOA_CHUONG_TRINH",
      "ChuongTrinh",
      id,
      `${ct.maCT} - ${ct.ten} (${ct.trangThai}${ct.soQuyetDinh ? `, QĐ ${ct.soQuyetDinh}` : ""}) - xóa chương trình tạo sai, chưa mở khóa nào`,
      tx,
    );
    return { maCT: ct.maCT, dsTep: dsTep.map((t) => t.khoaLuuTru!) };
  });
  for (const k of ketQua.dsTep) await xoaTep(k).catch(() => undefined);
  return { maCT: ketQua.maCT };
}
