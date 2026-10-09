import { afterAll, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import {
  PHAM_VI_TOAN_BO,
  capNhatHoSoHocVien,
  capTaiKhoanHocVien,
  datLaiMatKhauHocVien,
  doiMatKhauCuaToi,
  themHocVien,
  xoaHocVien,
} from "@/server/services/hv/hv-08-ho-so-hoc-vien";
import { CccdTrungError, NgoaiPhamViHoSoHocVienError } from "@/server/services/hv/loi-hoc-vien";
import { MatKhauYeuError } from "@/server/services/qt/qt-01-quan-ly-tai-khoan";

// (bổ sung 08/10/2026 - HV-08) cán bộ thêm/sửa/xóa học viên, cấp tài khoản, đặt lại mật khẩu; học viên tự đổi mật khẩu

const NGUOI = { nguoiThucHienId: null, nguoiThucHienTen: "Cán bộ đào tạo test" };
const MK = "MatKhau2026";
const hocVienIds: string[] = [];
const nguoiDungIds: string[] = [];
const loaiHinh: string[] = [];
const chuongTrinh: string[] = [];
const khoaIds: string[] = [];

afterAll(async () => {
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: khoaIds } } });
  const hv = await prisma.hocVien.findMany({ where: { id: { in: hocVienIds } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: hocVienIds } } });
  await prisma.nguoiDungVaiTro.deleteMany({ where: { nguoiDungId: { in: [...nguoiDungIds, ...hv.map((h) => h.nguoiDungId ?? "")] } } });
  await prisma.nguoiDung.deleteMany({ where: { id: { in: [...nguoiDungIds, ...hv.map((h) => h.nguoiDungId ?? "")] } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaIds } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinh } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinh } } });
});

const cccd12 = () => `0${String(Math.floor(Math.random() * 1e11)).padStart(11, "0")}`;

async function them(matKhau: string | null = MK, so = cccd12()) {
  const hv = await themHocVien({ hoTen: "Lê Thị Mai", soCCCD: so, email: "Mai@Gmail.com", matKhau }, PHAM_VI_TOAN_BO, NGUOI);
  hocVienIds.push(hv.id);
  return prisma.hocVien.findUniqueOrThrow({ where: { id: hv.id }, include: { nguoiDung: { include: { vaiTros: { include: { vaiTro: true } } } } } });
}

describe("HV-08 cán bộ thêm học viên", () => {
  it("thêm hồ sơ (CCCD chuẩn hóa, email viết thường) kèm tài khoản đăng nhập = số CCCD, vai trò Học viên; ghi nhật ký", async () => {
    const so = cccd12();
    const hv = await them(MK, ` ${so.slice(1)} `);
    expect(hv.soCCCD).toBe(so);
    expect(hv.email).toBe("mai@gmail.com");
    expect(hv.maHocVien).toMatch(/^HV/);
    expect(hv.nguoiDung?.tenDangNhap).toBe(so);
    expect(hv.nguoiDung?.vaiTros.map((v) => v.vaiTro.ma)).toEqual(["HOC_VIEN"]);
    expect(await bcrypt.compare(MK, hv.nguoiDung!.matKhauHash)).toBe(true);
    expect(await prisma.nhatKyThaoTac.count({ where: { doiTuongId: hv.id, hanhDong: { in: ["THEM_HOC_VIEN", "CAP_TAI_KHOAN_HOC_VIEN"] } } })).toBe(2);
  });

  it("chặn: thiếu họ tên/CCCD, CCCD trùng (kể cả thiếu số 0 đầu), mật khẩu yếu, học viên tự thêm", async () => {
    const hv = await them(null);
    await expect(themHocVien({ hoTen: " ", soCCCD: cccd12() }, PHAM_VI_TOAN_BO, NGUOI)).rejects.toThrow(/họ tên/);
    await expect(themHocVien({ hoTen: "A", soCCCD: "" }, PHAM_VI_TOAN_BO, NGUOI)).rejects.toThrow(/CCCD/);
    await expect(themHocVien({ hoTen: "A", soCCCD: hv.soCCCD!.slice(1) }, PHAM_VI_TOAN_BO, NGUOI)).rejects.toThrow(/đã có hồ sơ học viên/);
    await expect(themHocVien({ hoTen: "A", soCCCD: cccd12(), matKhau: "123" }, PHAM_VI_TOAN_BO, NGUOI)).rejects.toThrow(MatKhauYeuError);
    await expect(themHocVien({ hoTen: "A", soCCCD: cccd12() }, { toanBo: false, hocVienId: hv.id }, NGUOI)).rejects.toThrow(
      NgoaiPhamViHoSoHocVienError,
    );
  });
});

describe("HV-08 cán bộ sửa học viên", () => {
  it("đổi CCCD: đồng bộ tài khoản (tên đăng nhập theo CCCD mới), họ tên; ghi nhật ký các mục đã sửa", async () => {
    const hv = await them();
    const moi = cccd12();
    await capNhatHoSoHocVien(hv.id, { hoTen: "Lê Thị Mai Anh", soCCCD: moi }, PHAM_VI_TOAN_BO, NGUOI);
    const tk = await prisma.nguoiDung.findUniqueOrThrow({ where: { id: hv.nguoiDungId! } });
    expect([tk.tenDangNhap, tk.soCCCD, tk.hoTen]).toEqual([moi, moi, "Lê Thị Mai Anh"]);
    const nk = await prisma.nhatKyThaoTac.findFirst({ where: { doiTuongId: hv.id, hanhDong: "SUA_HO_SO_HOC_VIEN" } });
    expect(nk?.chiTiet).toContain("hoTen, soCCCD");
  });

  it("chặn đổi CCCD trùng học viên khác (kể cả cách ghi khác) và họ tên trống", async () => {
    const a = await them(null);
    const b = await them(null);
    await expect(capNhatHoSoHocVien(b.id, { soCCCD: a.soCCCD!.slice(1) }, PHAM_VI_TOAN_BO, NGUOI)).rejects.toThrow(CccdTrungError);
    await expect(capNhatHoSoHocVien(b.id, { hoTen: "  " }, PHAM_VI_TOAN_BO, NGUOI)).rejects.toThrow(/Họ tên/);
  });
});

describe("HV-08 tài khoản, mật khẩu học viên", () => {
  it("cấp tài khoản cho hồ sơ chưa có; chặn khi đã có tài khoản hoặc chưa có CCCD", async () => {
    const hv = await them(null);
    await capTaiKhoanHocVien(hv.id, MK, PHAM_VI_TOAN_BO, NGUOI);
    await expect(capTaiKhoanHocVien(hv.id, MK, PHAM_VI_TOAN_BO, NGUOI)).rejects.toThrow(/đã có tài khoản/);
    const khongCccd = await prisma.hocVien.create({ data: { maHocVien: `HVQL${crypto.randomUUID().slice(0, 8)}`, hoTen: "Không CCCD" } });
    hocVienIds.push(khongCccd.id);
    await expect(capTaiKhoanHocVien(khongCccd.id, MK, PHAM_VI_TOAN_BO, NGUOI)).rejects.toThrow(/chưa có số CCCD/);
  });

  it("cán bộ đặt lại mật khẩu (theo chính sách); không đặt lại tài khoản có vai trò cán bộ; học viên không tự đặt lại", async () => {
    const hv = await them();
    await expect(datLaiMatKhauHocVien(hv.id, "yeu", PHAM_VI_TOAN_BO, NGUOI)).rejects.toThrow(MatKhauYeuError);
    await datLaiMatKhauHocVien(hv.id, "MatKhauMoi99", PHAM_VI_TOAN_BO, NGUOI);
    const tk = await prisma.nguoiDung.findUniqueOrThrow({ where: { id: hv.nguoiDungId! } });
    expect(await bcrypt.compare("MatKhauMoi99", tk.matKhauHash)).toBe(true);
    await expect(datLaiMatKhauHocVien(hv.id, "MatKhauMoi99", { toanBo: false, hocVienId: hv.id }, NGUOI)).rejects.toThrow(
      NgoaiPhamViHoSoHocVienError,
    );

    const vtCanBo = await prisma.vaiTroModel.findUniqueOrThrow({ where: { ma: "CAN_BO_QUAN_LY_DAO_TAO" } });
    await prisma.nguoiDungVaiTro.create({ data: { nguoiDungId: tk.id, vaiTroId: vtCanBo.id } });
    await expect(datLaiMatKhauHocVien(hv.id, "MatKhauKhac1", PHAM_VI_TOAN_BO, NGUOI)).rejects.toThrow(/vai trò cán bộ/);
  });

  it("học viên tự đổi mật khẩu: đúng mật khẩu hiện tại, mật khẩu mới khác và đủ mạnh", async () => {
    const hv = await them();
    const id = hv.nguoiDungId!;
    await expect(doiMatKhauCuaToi(id, "SaiMatKhau1", "MatKhauMoi1")).rejects.toThrow(/không đúng/);
    await expect(doiMatKhauCuaToi(id, MK, MK)).rejects.toThrow(/phải khác/);
    await expect(doiMatKhauCuaToi(id, MK, "ngan")).rejects.toThrow(MatKhauYeuError);
    await doiMatKhauCuaToi(id, MK, "MatKhauMoi1");
    expect(await bcrypt.compare("MatKhauMoi1", (await prisma.nguoiDung.findUniqueOrThrow({ where: { id } })).matKhauHash)).toBe(true);
  });
});

describe("HV-08 cán bộ xóa học viên", () => {
  it("xóa hồ sơ chưa có dữ liệu nghiệp vụ kèm tài khoản học viên; ghi nhật ký", async () => {
    const hv = await them();
    await xoaHocVien(hv.id, PHAM_VI_TOAN_BO, NGUOI);
    expect(await prisma.hocVien.findUnique({ where: { id: hv.id } })).toBeNull();
    expect(await prisma.nguoiDung.findUnique({ where: { id: hv.nguoiDungId! } })).toBeNull();
    expect(await prisma.nhatKyThaoTac.count({ where: { doiTuongId: hv.id, hanhDong: "XOA_HOC_VIEN" } })).toBe(1);
  });

  it("chặn xóa học viên đã đăng ký khóa (báo rõ dữ liệu còn) và khi người thao tác là học viên", async () => {
    const hv = await them(null);
    const lh = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH_QL_${crypto.randomUUID()}`, ten: "LH" } });
    loaiHinh.push(lh.id);
    const ct = await prisma.chuongTrinh.create({
      data: { maCT: `CT_QL_${crypto.randomUUID()}`, ten: "CT", loaiHinhBoiDuongId: lh.id, trangThai: "DA_BAN_HANH", phuongThucDangKys: ["TRUC_TUYEN_NOP_GIAY"] },
    });
    chuongTrinh.push(ct.id);
    const khoa = await prisma.khoa.create({ data: { maKhoa: `KHQL${crypto.randomUUID().slice(0, 8)}`, chuongTrinhId: ct.id, siSoToiDa: 5 } });
    khoaIds.push(khoa.id);
    await prisma.dangKyHoc.create({ data: { hocVienId: hv.id, khoaId: khoa.id, trangThai: "CHO_NOP_GIAY" } });
    await expect(xoaHocVien(hv.id, PHAM_VI_TOAN_BO, NGUOI)).rejects.toThrow(/1 hồ sơ đăng ký/);
    await expect(xoaHocVien(hv.id, { toanBo: false, hocVienId: hv.id }, NGUOI)).rejects.toThrow(NgoaiPhamViHoSoHocVienError);
    expect(await prisma.hocVien.findUnique({ where: { id: hv.id } })).not.toBeNull();
  });
});
