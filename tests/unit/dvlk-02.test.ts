import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { taoDonViLienKet } from "@/server/services/dvlk/dvlk-01-danh-muc";
import {
  capTaiKhoanDonViLienKet,
  thuHoiTaiKhoanDonViLienKet,
  khoaDuocPhanCong,
  kiemTraHopDongThuocTaiKhoan,
} from "@/server/services/dvlk/dvlk-02-tai-khoan";
import {
  DonViDaCoTaiKhoanError,
  TaiKhoanKhongHopLeError,
  ThieuThongTinDvlkError,
  NgoaiPhamViDonViLienKetError,
  KhongPhaiTaiKhoanDvlkError,
} from "@/server/services/dvlk/loi-dvlk";

const uid = () => crypto.randomUUID().slice(0, 8);
const donViIds: string[] = [];
const nguoiDungIds: string[] = [];
const loaiHinhIds: string[] = [];
const chuongTrinhIds: string[] = [];
const khoaIds: string[] = [];
const NGUOI = { nguoiThucHienTen: "Admin test DVLK-02" };
const MAT_KHAU = "MatKhau123";

afterAll(async () => {
  await prisma.hopDongLienKet.deleteMany({ where: { donViLienKetId: { in: donViIds } } });
  await prisma.donViLienKet.deleteMany({ where: { id: { in: donViIds } } });
  await prisma.nguoiDung.deleteMany({ where: { id: { in: nguoiDungIds } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaIds } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinhIds } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinhIds } } });
});

async function taoDonVi() {
  const dv = await taoDonViLienKet({ ma: `DV02_${uid()}`, ten: "Đơn vị test DVLK-02" });
  donViIds.push(dv.id);
  return dv;
}

async function cap(donViId: string, tenDangNhap = `dvlk_${uid()}`) {
  const tk = await capTaiKhoanDonViLienKet(donViId, { tenDangNhap, matKhau: MAT_KHAU, hoTen: "Cán bộ A" }, NGUOI);
  nguoiDungIds.push(tk.id);
  return tk;
}

async function taoHopDong(donViLienKetId: string, trangThai: "DANG_TRIEN_KHAI" | "DA_THANH_LY" = "DANG_TRIEN_KHAI") {
  const lh = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH02_${uid()}`, ten: "LH" } });
  loaiHinhIds.push(lh.id);
  const ct = await prisma.chuongTrinh.create({
    data: { maCT: `CT02_${uid()}`, ten: "CT", loaiHinhBoiDuongId: lh.id, trangThai: "DA_BAN_HANH" },
  });
  chuongTrinhIds.push(ct.id);
  const khoa = await prisma.khoa.create({ data: { maKhoa: `K02_${uid()}`, chuongTrinhId: ct.id, siSoToiDa: 30 } });
  khoaIds.push(khoa.id);
  return prisma.hopDongLienKet.create({
    data: { maHopDong: `HD02_${uid()}`, donViLienKetId, khoaId: khoa.id, trangThai },
  });
}

describe("DVLK-02 cấp và quản lý tài khoản đơn vị liên kết", () => {
  it("cấp tài khoản vai trò Cán bộ đơn vị liên kết và gắn cho đơn vị; ghi nhật ký", async () => {
    const dv = await taoDonVi();
    const tk = await cap(dv.id);

    expect(tk.vaiTros.map((v) => v.vaiTro.ma)).toEqual(["CAN_BO_DON_VI_LIEN_KET"]);
    expect((await prisma.donViLienKet.findUniqueOrThrow({ where: { id: dv.id } })).taiKhoanId).toBe(tk.id);
    expect(await prisma.nhatKyThaoTac.count({ where: { hanhDong: "CAP_TAI_KHOAN_DVLK", doiTuongId: dv.id } })).toBe(1);
  });

  it("chặn: đơn vị đã có tài khoản, mật khẩu yếu, tên đăng nhập trùng, thiếu họ tên - không tạo tài khoản", async () => {
    const dv = await taoDonVi();
    const tk = await cap(dv.id);
    await expect(cap(dv.id)).rejects.toThrow(DonViDaCoTaiKhoanError);

    const dv2 = await taoDonVi();
    const tenMoi = `dvlk_${uid()}`;
    await expect(
      capTaiKhoanDonViLienKet(dv2.id, { tenDangNhap: tenMoi, matKhau: "123", hoTen: "B" }),
    ).rejects.toThrow(TaiKhoanKhongHopLeError);
    await expect(
      capTaiKhoanDonViLienKet(dv2.id, { tenDangNhap: tk.tenDangNhap, matKhau: MAT_KHAU, hoTen: "B" }),
    ).rejects.toThrow(TaiKhoanKhongHopLeError);
    await expect(
      capTaiKhoanDonViLienKet(dv2.id, { tenDangNhap: tenMoi, matKhau: MAT_KHAU, hoTen: " " }),
    ).rejects.toThrow(ThieuThongTinDvlkError);
    expect(await prisma.nguoiDung.count({ where: { tenDangNhap: tenMoi } })).toBe(0);
    expect((await prisma.donViLienKet.findUniqueOrThrow({ where: { id: dv2.id } })).taiKhoanId).toBeNull();
  });

  it("thu hồi: bỏ gắn và tạm khóa tài khoản (không xóa); sau đó cấp được tài khoản mới", async () => {
    const dv = await taoDonVi();
    const tk = await cap(dv.id);

    await thuHoiTaiKhoanDonViLienKet(dv.id, NGUOI);

    expect((await prisma.donViLienKet.findUniqueOrThrow({ where: { id: dv.id } })).taiKhoanId).toBeNull();
    expect((await prisma.nguoiDung.findUniqueOrThrow({ where: { id: tk.id } })).trangThai).toBe("TAM_KHOA");
    expect(await khoaDuocPhanCong(tk.id)).toEqual([]);
    await expect(thuHoiTaiKhoanDonViLienKet(dv.id)).rejects.toThrow(ThieuThongTinDvlkError);
    const moi = await cap(dv.id);
    expect(moi.id).not.toBe(tk.id);
  });

  it("chỉ thấy khóa/hợp đồng của đơn vị mình; không truy cập được hợp đồng đơn vị khác", async () => {
    const dvA = await taoDonVi();
    const dvB = await taoDonVi();
    const tkA = await cap(dvA.id);
    const hdA1 = await taoHopDong(dvA.id);
    const hdA2 = await taoHopDong(dvA.id, "DA_THANH_LY");
    const hdB = await taoHopDong(dvB.id);

    expect((await khoaDuocPhanCong(tkA.id)).map((hd) => hd.id).sort()).toEqual([hdA1.id, hdA2.id].sort());
    expect((await khoaDuocPhanCong(tkA.id, { conHieuLuc: true })).map((hd) => hd.id)).toEqual([hdA1.id]);
    expect((await kiemTraHopDongThuocTaiKhoan(tkA.id, hdA2.id)).id).toBe(hdA2.id);
    await expect(kiemTraHopDongThuocTaiKhoan(tkA.id, hdB.id)).rejects.toThrow(NgoaiPhamViDonViLienKetError);
    await expect(kiemTraHopDongThuocTaiKhoan(tkA.id, "khong-ton-tai")).rejects.toThrow(NgoaiPhamViDonViLienKetError);

    const khongPhaiDvlk = await prisma.nguoiDung.create({
      data: { tenDangNhap: `thuong_${uid()}`, matKhauHash: "x", hoTen: "X" },
    });
    nguoiDungIds.push(khongPhaiDvlk.id);
    await expect(kiemTraHopDongThuocTaiKhoan(khongPhaiDvlk.id, hdA1.id)).rejects.toThrow(KhongPhaiTaiKhoanDvlkError);
  });

  it("vai trò Cán bộ đơn vị liên kết không có quyền học phí/kết quả/chứng chỉ hay quản trị DVLK", async () => {
    const quyen = await prisma.vaiTroChucNang.findMany({
      where: { vaiTro: { ma: "CAN_BO_DON_VI_LIEN_KET" } },
      include: { chucNangHeThong: true },
    });
    const dsMa = quyen.map((q) => q.chucNangHeThong.maCN).sort();

    expect(dsMa).toEqual(["DVLK-04", "DVLK-05", "HV-11"]);
    expect(dsMa.some((ma) => /^(HP|KQ|CC|BC)-/.test(ma))).toBe(false);
  });
});
