import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { KhongTimThayHocVienError, CccdTrungError, NgoaiPhamViHoSoHocVienError, ThongTinDangKyKhongHopLeError } from "@/server/services/hv/loi-hoc-vien";
import { chuanHoaEmail, laEmailHopLe } from "@/lib/email";
import { hocVienCuaTaiKhoan } from "@/server/services/kq/kq-05-tra-cuu";

/**
 * HV-08 actor "Cán bộ quản lý đào tạo/Học viên (tự cập nhật thông tin cá
 * nhân)": cán bộ (giữ HV-08 qua 1 vai trò khác Học viên) thao tác mọi hồ sơ;
 * tài khoản chỉ giữ HV-08 qua vai trò Học viên chỉ thao tác hồ sơ của chính
 * mình (liên kết tài khoản - học viên như KQ-05).
 */
export type PhamViHoSoHocVien = { toanBo: true } | { toanBo: false; hocVienId: string | null };

export const PHAM_VI_TOAN_BO: PhamViHoSoHocVien = { toanBo: true };

export async function phamViHoSoHocVien(nguoiDungId: string): Promise<PhamViHoSoHocVien> {
  const quaVaiTroCanBo = await prisma.vaiTroChucNang.count({
    where: {
      chucNangHeThong: { maCN: "HV-08" },
      vaiTro: { ma: { not: "HOC_VIEN" }, nguoiDungs: { some: { nguoiDungId } } },
    },
  });
  if (quaVaiTroCanBo > 0) return PHAM_VI_TOAN_BO;
  const hocVien = await hocVienCuaTaiKhoan(nguoiDungId);
  return { toanBo: false, hocVienId: hocVien?.id ?? null };
}

function kiemTraPhamVi(phamVi: PhamViHoSoHocVien, hocVienId: string) {
  if (!phamVi.toanBo && phamVi.hocVienId !== hocVienId) throw new NgoaiPhamViHoSoHocVienError();
}

function dieuKienTimHocVien(tuKhoa: string | undefined, phamVi: PhamViHoSoHocVien): Prisma.HocVienWhereInput {
  const q = tuKhoa?.trim();
  const ma = q?.replace(/\s+/g, "");
  return {
    id: phamVi.toanBo ? undefined : phamVi.hocVienId!,
    OR: q
      ? [
          { hoTen: { contains: q, mode: "insensitive" } },
          { maHocVien: { contains: ma, mode: "insensitive" } },
          { maSinhVien: { contains: ma, mode: "insensitive" } },
          { soCCCD: { contains: ma } },
        ]
      : undefined,
  };
}

export async function danhSachHocVien(tuKhoa: string | undefined, phamVi: PhamViHoSoHocVien) {
  if (!phamVi.toanBo && !phamVi.hocVienId) return [];
  return prisma.hocVien.findMany({ where: dieuKienTimHocVien(tuKhoa, phamVi), orderBy: { hoTen: "asc" } });
}

/** (bổ sung 06/10/2026) 1 trang danh sách hồ sơ học viên - phân trang trong CSDL. */
export async function trangHoSoHocVien(tuKhoa: string | undefined, phamVi: PhamViHoSoHocVien, boQua: number, soDong: number) {
  if (!phamVi.toanBo && !phamVi.hocVienId) return { ds: [], tong: 0 };
  const where = dieuKienTimHocVien(tuKhoa, phamVi);
  const [ds, tong] = await Promise.all([
    prisma.hocVien.findMany({ where, orderBy: [{ hoTen: "asc" }, { maHocVien: "asc" }], skip: boQua, take: soDong }),
    prisma.hocVien.count({ where }),
  ]);
  return { ds, tong };
}

/** HV-08: "lịch sử các khóa/kỳ thi đã hoặc đang tham gia của học viên". */
export async function layHoSoHocVien(id: string, phamVi: PhamViHoSoHocVien) {
  kiemTraPhamVi(phamVi, id);
  const hocVien = await prisma.hocVien.findUnique({
    where: { id },
    include: {
      chucDanhHocVi: true,
      dangKys: {
        include: { khoa: { include: { chuongTrinh: true } } },
        orderBy: { ngayDangKy: "desc" },
      },
    },
  });
  if (!hocVien) throw new KhongTimThayHocVienError();
  return hocVien;
}

export type CapNhatHoSoHocVienInput = {
  hoTen?: string;
  ngaySinh?: string | null;
  donViCongTac?: string | null;
  chucDanhHocViId?: string | null;
  soCCCD?: string | null;
  soDienThoai?: string | null;
  email?: string | null;
};

/**
 * HV-08: "Một học viên chỉ có 1 mã duy nhất dù tham gia nhiều khóa qua các
 * phương thức khác nhau" - khi sửa tay CCCD, chặn trùng với 1 học viên khác
 * đã tồn tại (tránh phá vỡ bất biến 1-CCCD-1-mã-học-viên mà timHoacTaoHocVien
 * đang dựa vào ở HV-01/03/05).
 */
export async function capNhatHoSoHocVien(id: string, input: CapNhatHoSoHocVienInput, phamVi: PhamViHoSoHocVien) {
  kiemTraPhamVi(phamVi, id);
  const hocVien = await prisma.hocVien.findUnique({ where: { id } });
  if (!hocVien) throw new KhongTimThayHocVienError();

  // học viên tự cập nhật thông tin cá nhân/liên hệ; họ tên và CCCD là định
  // danh (in trên văn bằng, liên kết tài khoản, đối chiếu HV-04) - cán bộ sửa
  if (!phamVi.toanBo) {
    const doiHoTen = input.hoTen !== undefined && input.hoTen.trim() !== hocVien.hoTen;
    const doiCccd = input.soCCCD !== undefined && (input.soCCCD || null) !== hocVien.soCCCD;
    if (doiHoTen || doiCccd) {
      throw new NgoaiPhamViHoSoHocVienError("Học viên không tự đổi họ tên/số CCCD - liên hệ cán bộ quản lý đào tạo");
    }
  }

  // (bổ sung 08/10/2026) email đúng định dạng, lưu viết thường
  if (input.email !== undefined) {
    input = { ...input, email: chuanHoaEmail(input.email) || null };
    if (input.email && !laEmailHopLe(input.email)) throw new ThongTinDangKyKhongHopLeError("Email chưa đúng định dạng (ví dụ: ten@gmail.com)");
  }

  if (input.soCCCD && input.soCCCD !== hocVien.soCCCD) {
    const trung = await prisma.hocVien.findUnique({ where: { soCCCD: input.soCCCD } });
    if (trung) throw new CccdTrungError();
  }

  return prisma.hocVien.update({
    where: { id },
    data: {
      hoTen: input.hoTen ?? undefined,
      ngaySinh:
        input.ngaySinh !== undefined ? (input.ngaySinh ? new Date(input.ngaySinh) : null) : undefined,
      donViCongTac: input.donViCongTac !== undefined ? input.donViCongTac : undefined,
      chucDanhHocViId: input.chucDanhHocViId !== undefined ? input.chucDanhHocViId : undefined,
      soCCCD: input.soCCCD !== undefined ? input.soCCCD : undefined,
      soDienThoai: input.soDienThoai !== undefined ? input.soDienThoai : undefined,
      email: input.email !== undefined ? input.email : undefined,
    },
  });
}
