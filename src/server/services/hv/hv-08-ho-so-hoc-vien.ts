import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { KhongTimThayHocVienError, CccdTrungError, NgoaiPhamViHoSoHocVienError, ThongTinDangKyKhongHopLeError } from "@/server/services/hv/loi-hoc-vien";
import { chuanHoaEmail, laEmailHopLe } from "@/lib/email";
import { hocVienCuaTaiKhoan } from "@/server/services/kq/kq-05-tra-cuu";
import bcrypt from "bcryptjs";
import { ghiThaoTac, HE_THONG, type NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";
import { datLaiMatKhau, kiemTraChinhSachMatKhau } from "@/server/services/qt/qt-01-quan-ly-tai-khoan";
import { chuanHoaSoDinhDanh } from "@/server/services/hv/hv-03-danh-sach-sinh-vien";
import { bienTheSoCCCD } from "@/server/services/hv/kiem-tra-trung-khoa";
import { taoHocVienVoiMaTuSinh } from "@/server/services/hv/dung-chung";

/** (bổ sung 08/10/2026) lỗi thao tác quản lý học viên của cán bộ (thêm/xóa/tài khoản/mật khẩu). */
export class QuanLyHocVienError extends Error {}

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
export async function capNhatHoSoHocVien(
  id: string,
  input: CapNhatHoSoHocVienInput,
  phamVi: PhamViHoSoHocVien,
  nguoi: NguoiThucHien = HE_THONG,
) {
  kiemTraPhamVi(phamVi, id);
  const hocVien = await prisma.hocVien.findUnique({ where: { id }, include: { nguoiDung: true } });
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

  if (input.hoTen !== undefined && !input.hoTen.trim()) throw new ThongTinDangKyKhongHopLeError("Họ tên không được để trống");
  if (input.soCCCD && input.soCCCD.trim() !== hocVien.soCCCD) {
    if (await prisma.hocVien.findFirst({ where: { id: { not: id }, soCCCD: input.soCCCD.trim() } })) throw new CccdTrungError();
    // (bổ sung 08/10/2026) chuẩn hóa như danh sách sinh viên; không trùng học viên khác kể cả cách ghi khác
    const chuan = chuanHoaSoDinhDanh(input.soCCCD);
    if (!chuan) throw new ThongTinDangKyKhongHopLeError("Số CCCD/hộ chiếu dài quá 30 ký tự");
    input = { ...input, soCCCD: chuan };
    const trung = await prisma.hocVien.findFirst({ where: { id: { not: id }, soCCCD: { in: bienTheSoCCCD(chuan) } } });
    if (trung) throw new CccdTrungError();
  }
  const tk = hocVien.nguoiDung;
  const doiCccd = input.soCCCD !== undefined && (input.soCCCD || null) !== hocVien.soCCCD;
  // tài khoản tự đăng ký dùng số CCCD làm tên đăng nhập - đổi CCCD thì đổi tên đăng nhập theo
  const doiTenDangNhap = !!tk && doiCccd && !!input.soCCCD && tk.tenDangNhap === hocVien.soCCCD;
  if (tk && doiCccd && input.soCCCD) {
    const trungTk = await prisma.nguoiDung.findFirst({
      where: { id: { not: tk.id }, OR: [{ soCCCD: input.soCCCD }, ...(doiTenDangNhap ? [{ tenDangNhap: input.soCCCD }] : [])] },
    });
    if (trungTk) throw new CccdTrungError();
  }

  const sau = await prisma.$transaction(async (tx) => {
    const hv = await tx.hocVien.update({
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
    // (bổ sung 08/10/2026) đồng bộ sang tài khoản đăng nhập của học viên
    if (tk) {
      // email tài khoản là duy nhất: email đã thuộc tài khoản khác thì không đồng bộ (vẫn lưu ở hồ sơ)
      const emailTrung = !!input.email && !!(await tx.nguoiDung.findFirst({ where: { id: { not: tk.id }, email: input.email } }));
      await tx.nguoiDung.update({
        where: { id: tk.id },
        data: {
          hoTen: hv.hoTen,
          email: input.email !== undefined && !emailTrung ? input.email : undefined,
          soCCCD: doiCccd ? hv.soCCCD : undefined,
          tenDangNhap: doiTenDangNhap ? hv.soCCCD! : undefined,
        },
      });
    }
    const doi = (["hoTen", "ngaySinh", "donViCongTac", "chucDanhHocViId", "soCCCD", "soDienThoai", "email"] as const).filter((k) => {
      const truoc = hocVien[k] instanceof Date ? (hocVien[k] as Date).toISOString().slice(0, 10) : (hocVien[k] ?? null);
      const moi = hv[k] instanceof Date ? (hv[k] as Date).toISOString().slice(0, 10) : (hv[k] ?? null);
      return truoc !== moi;
    });
    if (doi.length > 0) {
      await ghiThaoTac(
        nguoi,
        phamVi.toanBo ? "SUA_HO_SO_HOC_VIEN" : "HOC_VIEN_TU_CAP_NHAT_HO_SO",
        "HocVien",
        id,
        `${hv.maHocVien}: sửa ${doi.join(", ")}${doiCccd ? ` (CCCD ${hocVien.soCCCD ?? "—"} -> ${hv.soCCCD})` : ""}${doiTenDangNhap ? "; tên đăng nhập đổi theo CCCD mới" : ""}`,
        tx,
      );
    }
    return hv;
  });
  return sau;
}

// ---------------- (bổ sung 08/10/2026) cán bộ quản lý học viên ----------------

function chiCanBo(phamVi: PhamViHoSoHocVien) {
  if (!phamVi.toanBo) throw new NgoaiPhamViHoSoHocVienError("Chỉ cán bộ quản lý đào tạo được thực hiện thao tác này");
}

export type ThemHocVienInput = CapNhatHoSoHocVienInput & {
  hoTen: string;
  soCCCD: string;
  /** cấp luôn tài khoản đăng nhập (tên đăng nhập = số CCCD) với mật khẩu này */
  matKhau?: string | null;
};

/** Thêm hồ sơ học viên mới (mã học viên tự sinh); số CCCD/hộ chiếu bắt buộc, không trùng. */
export async function themHocVien(input: ThemHocVienInput, phamVi: PhamViHoSoHocVien, nguoi: NguoiThucHien = HE_THONG) {
  chiCanBo(phamVi);
  const hoTen = input.hoTen?.trim();
  if (!hoTen) throw new QuanLyHocVienError("Chưa nhập họ tên");
  const soCCCD = chuanHoaSoDinhDanh(input.soCCCD);
  if (!soCCCD) throw new QuanLyHocVienError(input.soCCCD?.trim() ? "Số CCCD/hộ chiếu dài quá 30 ký tự" : "Chưa nhập số CCCD/hộ chiếu");
  const trung = await prisma.hocVien.findFirst({ where: { soCCCD: { in: bienTheSoCCCD(soCCCD) } } });
  if (trung) throw new QuanLyHocVienError(`Số CCCD ${soCCCD} đã có hồ sơ học viên ${trung.maHocVien} - ${trung.hoTen}`);
  const email = chuanHoaEmail(input.email) || null;
  if (email && !laEmailHopLe(email)) throw new QuanLyHocVienError("Email chưa đúng định dạng (ví dụ: ten@gmail.com)");
  if (input.matKhau) {
    kiemTraChinhSachMatKhau(input.matKhau);
    if (await prisma.nguoiDung.findFirst({ where: { OR: [{ tenDangNhap: soCCCD }, { soCCCD }] } })) {
      throw new QuanLyHocVienError(`Đã có tài khoản đăng nhập ${soCCCD}`);
    }
  }

  const hocVien = await taoHocVienVoiMaTuSinh((maHocVien) =>
    prisma.hocVien.create({
      data: {
        maHocVien,
        hoTen,
        soCCCD,
        ngaySinh: input.ngaySinh ? new Date(input.ngaySinh) : null,
        soDienThoai: input.soDienThoai?.trim() || null,
        email,
        donViCongTac: input.donViCongTac?.trim() || null,
        chucDanhHocViId: input.chucDanhHocViId || null,
      },
    }),
  );
  await ghiThaoTac(nguoi, "THEM_HOC_VIEN", "HocVien", hocVien.id, `${hocVien.maHocVien} - ${hoTen} (CCCD ${soCCCD})`);
  if (input.matKhau) await capTaiKhoanHocVien(hocVien.id, input.matKhau, phamVi, nguoi);
  return hocVien;
}

/** Tài khoản đăng nhập gắn với hồ sơ (hiển thị cho cán bộ). */
export async function taiKhoanCuaHocVien(id: string) {
  const hv = await prisma.hocVien.findUnique({ where: { id }, include: { nguoiDung: { include: { vaiTros: { include: { vaiTro: true } } } } } });
  const tk = hv?.nguoiDung;
  if (!tk) return null;
  return { tenDangNhap: tk.tenDangNhap, trangThai: tk.trangThai as string, laCanBo: tk.vaiTros.some((v) => v.vaiTro.ma !== "HOC_VIEN") };
}

/** Dữ liệu nghiệp vụ còn gắn với học viên (có thì không xóa hồ sơ). */
export async function duLieuCuaHocVien(id: string) {
  const [dangKy, hocPhi, diem, ketQua, chungChi, diemDanh, tracNghiem, baiNop] = await Promise.all([
    prisma.dangKyHoc.count({ where: { hocVienId: id } }),
    prisma.hocPhi.count({ where: { hocVienId: id } }),
    prisma.ketQuaHocTap.count({ where: { hocVienId: id } }),
    prisma.ketQuaKhoa.count({ where: { hocVienId: id } }),
    prisma.chungChi.count({ where: { hocVienId: id } }),
    prisma.diemDanh.count({ where: { hocVienId: id } }),
    prisma.lanLamTracNghiem.count({ where: { hocVienId: id } }),
    prisma.baiNopSanPham.count({ where: { hocVienId: id } }),
  ]);
  return [
    dangKy && `${dangKy} hồ sơ đăng ký khóa/kỳ thi`,
    hocPhi && `${hocPhi} khoản học phí`,
    diem && `${diem} điểm học phần`,
    ketQua && `${ketQua} kết quả khóa`,
    chungChi && `${chungChi} văn bằng`,
    diemDanh && `${diemDanh} lượt điểm danh`,
    tracNghiem && `${tracNghiem} lần làm trắc nghiệm`,
    baiNop && `${baiNop} bài nộp`,
  ].filter(Boolean) as string[];
}

/** Xóa hồ sơ học viên tạo sai/trùng: chỉ khi chưa có dữ liệu nghiệp vụ; xóa kèm tài khoản chỉ có vai trò Học viên. */
export async function xoaHocVien(id: string, phamVi: PhamViHoSoHocVien, nguoi: NguoiThucHien = HE_THONG) {
  chiCanBo(phamVi);
  const hv = await prisma.hocVien.findUnique({ where: { id }, include: { nguoiDung: { include: { vaiTros: { include: { vaiTro: true } } } } } });
  if (!hv) throw new KhongTimThayHocVienError();
  const conDuLieu = await duLieuCuaHocVien(id);
  if (conDuLieu.length > 0) {
    throw new QuanLyHocVienError(`Không xóa được học viên đã có ${conDuLieu.join(", ")} - rút khỏi khóa (HV-09) hoặc giữ hồ sơ`);
  }
  const tk = hv.nguoiDung;
  const chiHocVien = !!tk && tk.vaiTros.every((v) => v.vaiTro.ma === "HOC_VIEN");
  await prisma.$transaction(async (tx) => {
    await tx.tienDoHocTap.deleteMany({ where: { hocVienId: id } });
    await tx.hocVien.delete({ where: { id } });
    if (tk && chiHocVien) await tx.nguoiDung.delete({ where: { id: tk.id } });
    await ghiThaoTac(
      nguoi,
      "XOA_HOC_VIEN",
      "HocVien",
      id,
      `${hv.maHocVien} - ${hv.hoTen} (CCCD ${hv.soCCCD ?? "—"})${tk ? (chiHocVien ? `; xóa kèm tài khoản ${tk.tenDangNhap}` : `; giữ tài khoản ${tk.tenDangNhap} (có vai trò khác)`) : ""}`,
      tx,
    );
  });
}

/** Cấp tài khoản đăng nhập cho học viên chưa có: tên đăng nhập = số CCCD, vai trò Học viên. */
export async function capTaiKhoanHocVien(id: string, matKhau: string, phamVi: PhamViHoSoHocVien, nguoi: NguoiThucHien = HE_THONG) {
  chiCanBo(phamVi);
  const hv = await prisma.hocVien.findUnique({ where: { id } });
  if (!hv) throw new KhongTimThayHocVienError();
  if (hv.nguoiDungId) throw new QuanLyHocVienError("Học viên đã có tài khoản đăng nhập - dùng Đặt lại mật khẩu");
  if (!hv.soCCCD) throw new QuanLyHocVienError("Hồ sơ chưa có số CCCD/hộ chiếu - cập nhật trước khi cấp tài khoản");
  kiemTraChinhSachMatKhau(matKhau);
  if (await prisma.nguoiDung.findFirst({ where: { OR: [{ tenDangNhap: hv.soCCCD }, { soCCCD: hv.soCCCD }] } })) {
    throw new QuanLyHocVienError(`Đã có tài khoản đăng nhập ${hv.soCCCD} (chưa gắn hồ sơ này) - xử lý ở Quản trị tài khoản`);
  }
  const vaiTro = await prisma.vaiTroModel.findUniqueOrThrow({ where: { ma: "HOC_VIEN" } });
  const matKhauHash = await bcrypt.hash(matKhau, 10);
  // email tài khoản là duy nhất - email đã thuộc tài khoản khác thì tạo tài khoản không kèm email
  const email = hv.email && !(await prisma.nguoiDung.findFirst({ where: { email: hv.email } })) ? hv.email : null;
  return prisma.$transaction(async (tx) => {
    const tk = await tx.nguoiDung.create({
      data: {
        tenDangNhap: hv.soCCCD!,
        soCCCD: hv.soCCCD,
        hoTen: hv.hoTen,
        email,
        matKhauHash,
        vaiTros: { create: [{ vaiTroId: vaiTro.id }] },
      },
    });
    await tx.hocVien.update({ where: { id }, data: { nguoiDungId: tk.id } });
    await ghiThaoTac(nguoi, "CAP_TAI_KHOAN_HOC_VIEN", "HocVien", id, `${hv.maHocVien}: tài khoản ${tk.tenDangNhap}`, tx);
    return tk;
  });
}

/** Cán bộ đặt lại mật khẩu tài khoản học viên (chỉ tài khoản chỉ có vai trò Học viên). */
export async function datLaiMatKhauHocVien(id: string, matKhau: string, phamVi: PhamViHoSoHocVien, nguoi: NguoiThucHien = HE_THONG) {
  chiCanBo(phamVi);
  const hv = await prisma.hocVien.findUnique({ where: { id }, include: { nguoiDung: { include: { vaiTros: { include: { vaiTro: true } } } } } });
  if (!hv) throw new KhongTimThayHocVienError();
  const tk = hv.nguoiDung;
  if (!tk) throw new QuanLyHocVienError("Học viên chưa có tài khoản đăng nhập - dùng Cấp tài khoản");
  if (!tk.vaiTros.every((v) => v.vaiTro.ma === "HOC_VIEN")) {
    throw new QuanLyHocVienError("Tài khoản có vai trò cán bộ - đặt lại mật khẩu ở Quản trị tài khoản (QT-01)");
  }
  await datLaiMatKhau(tk.id, matKhau, nguoi);
  await ghiThaoTac(nguoi, "DAT_LAI_MAT_KHAU_HOC_VIEN", "HocVien", id, `${hv.maHocVien}: tài khoản ${tk.tenDangNhap}`);
}

/** Người dùng tự đổi mật khẩu của mình (học viên): phải đúng mật khẩu hiện tại, mật khẩu mới theo chính sách. */
export async function doiMatKhauCuaToi(nguoiDungId: string, matKhauCu: string, matKhauMoi: string) {
  const tk = await prisma.nguoiDung.findUnique({ where: { id: nguoiDungId } });
  if (!tk) throw new QuanLyHocVienError("Không tìm thấy tài khoản");
  if (!(await bcrypt.compare(matKhauCu, tk.matKhauHash))) throw new QuanLyHocVienError("Mật khẩu hiện tại không đúng");
  if (matKhauMoi === matKhauCu) throw new QuanLyHocVienError("Mật khẩu mới phải khác mật khẩu hiện tại");
  kiemTraChinhSachMatKhau(matKhauMoi);
  await prisma.nguoiDung.update({ where: { id: tk.id }, data: { matKhauHash: await bcrypt.hash(matKhauMoi, 10) } });
  await ghiThaoTac({ nguoiThucHienId: tk.id, nguoiThucHienTen: tk.hoTen }, "DOI_MAT_KHAU", "NguoiDung", tk.id, tk.tenDangNhap);
}
