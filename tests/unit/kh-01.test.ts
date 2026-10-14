import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { khoiTaoKhoa, danhSachKhoa, layKhoa, xoaKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { KhongTimThayKhoaError, KhongXoaDuocKhoaError, NgayKhoaThiKhongHopLeError, TenKhoaKhongHopLeError } from "@/server/services/kh/loi-khoa";
import { datHanDangKy } from "@/server/services/kh/kh-05-trang-thai-si-so";
import {
  SaiTrangThaiChuongTrinhError,
  KhongTimThayChuongTrinhError,
} from "@/server/services/ct/loi-chuong-trinh";

const chuongTrinhTaoTrongTest: string[] = [];
const loaiHinhTaoTrongTest: string[] = [];
const khoaTaoTrongTest: string[] = [];
const hocVienTaoTrongTest: string[] = [];

afterAll(async () => {
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: khoaTaoTrongTest } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: hocVienTaoTrongTest } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaTaoTrongTest } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinhTaoTrongTest } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinhTaoTrongTest } } });
});

async function taoChuongTrinh(trangThai: "DU_THAO" | "DA_BAN_HANH" = "DA_BAN_HANH") {
  const lh = await prisma.loaiHinhBoiDuong.create({
    data: { ma: `LH_KH01_${crypto.randomUUID()}`, ten: "Loại hình test KH-01" },
  });
  loaiHinhTaoTrongTest.push(lh.id);

  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_KH01_${crypto.randomUUID()}`,
      ten: "Chương trình test KH-01",
      loaiHinhBoiDuongId: lh.id,
      trangThai,
      ...(trangThai === "DA_BAN_HANH"
        ? { soQuyetDinh: "QD-KH01", ngayBanHanh: new Date() }
        : {}),
    },
  });
  chuongTrinhTaoTrongTest.push(ct.id);
  return ct;
}

describe("KH-01 khởi tạo khóa bồi dưỡng", () => {
  it("khởi tạo thành công từ chương trình Đã ban hành, mã khóa tự sinh, trạng thái Chuẩn bị", async () => {
    const ct = await taoChuongTrinh("DA_BAN_HANH");
    const khoa = await khoiTaoKhoa({
      chuongTrinhId: ct.id,
      siSoToiDa: 30,
      thoiGianKhaiGiang: "2026-10-01",
      thoiGianBeGiang: "2026-12-01",
      mucHocPhi: 1500000,
    });
    khoaTaoTrongTest.push(khoa.id);

    expect(khoa.maKhoa).toMatch(/^KH\d{4}\d{3}$/);
    expect(khoa.trangThai).toBe("CHUAN_BI");
    expect(khoa.siSoToiDa).toBe(30);
    expect(khoa.chuongTrinhId).toBe(ct.id);
  });

  it("2 khóa tạo liên tiếp không trùng mã", async () => {
    const ct = await taoChuongTrinh("DA_BAN_HANH");
    const khoa1 = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa: 20 });
    const khoa2 = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa: 25 });
    khoaTaoTrongTest.push(khoa1.id, khoa2.id);

    expect(khoa1.maKhoa).not.toBe(khoa2.maKhoa);
  });

  it("chặn khởi tạo khóa từ chương trình chưa Đã ban hành (còn Dự thảo)", async () => {
    const ct = await taoChuongTrinh("DU_THAO");
    await expect(
      khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa: 30 }),
    ).rejects.toThrow(SaiTrangThaiChuongTrinhError);
  });

  it("không tìm thấy chương trình", async () => {
    await expect(
      khoiTaoKhoa({ chuongTrinhId: "khong-ton-tai", siSoToiDa: 30 }),
    ).rejects.toThrow(KhongTimThayChuongTrinhError);
  });

  it("danh sách khóa và lấy chi tiết 1 khóa kèm thông tin chương trình", async () => {
    const ct = await taoChuongTrinh("DA_BAN_HANH");
    const khoa = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa: 40 });
    khoaTaoTrongTest.push(khoa.id);

    const ds = await danhSachKhoa();
    expect(ds.map((k) => k.id)).toContain(khoa.id);

    const chiTiet = await layKhoa(khoa.id);
    expect(chiTiet?.chuongTrinh.id).toBe(ct.id);
  });

  it("lấy chi tiết khóa không tồn tại trả về null", async () => {
    const chiTiet = await layKhoa("khong-ton-tai");
    expect(chiTiet).toBeNull();
  });
});

describe("KH-01 tên khóa (bổ sung 06/10/2026)", () => {
  it("lưu tên khóa đã chuẩn hóa khoảng trắng; không truyền tên thì để trống (hiển thị theo chương trình)", async () => {
    const ct = await taoChuongTrinh("DA_BAN_HANH");
    const khoa = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa: 30, tenKhoa: "  Thi chuẩn đầu ra tiếng Anh   đợt tháng 11 năm 2026 " });
    const khongTen = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa: 30 });
    khoaTaoTrongTest.push(khoa.id, khongTen.id);
    expect(khoa.tenKhoa).toBe("Thi chuẩn đầu ra tiếng Anh đợt tháng 11 năm 2026");
    expect(khongTen.tenKhoa).toBeNull();
  });

  it("chặn tên khóa rỗng hoặc quá 200 ký tự - không tạo khóa", async () => {
    const ct = await taoChuongTrinh("DA_BAN_HANH");
    await expect(khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa: 30, tenKhoa: "   " })).rejects.toThrow(TenKhoaKhongHopLeError);
    await expect(khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa: 30, tenKhoa: "x".repeat(201) })).rejects.toThrow(TenKhoaKhongHopLeError);
    expect(await prisma.khoa.count({ where: { chuongTrinhId: ct.id } })).toBe(0);
  });
});

describe("KH-01 xóa khóa tạo sai (bổ sung 06/10/2026)", () => {
  it("xóa được khóa chưa có đăng ký, kèm buổi học của khóa; ghi nhật ký", async () => {
    const ct = await taoChuongTrinh("DA_BAN_HANH");
    const khoa = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa: 30, tenKhoa: "Khóa tạo sai" });
    await prisma.buoiHoc.create({ data: { khoaId: khoa.id, ngayHoc: new Date("2026-11-01") } });

    await expect(xoaKhoa(khoa.id)).resolves.toEqual({ maKhoa: khoa.maKhoa });
    expect(await prisma.khoa.findUnique({ where: { id: khoa.id } })).toBeNull();
    expect(await prisma.buoiHoc.count({ where: { khoaId: khoa.id } })).toBe(0);
    const nk = await prisma.nhatKyThaoTac.findFirst({ where: { doiTuongId: khoa.id, hanhDong: "XOA_KHOA" } });
    expect(nk?.chiTiet).toContain("Khóa tạo sai");
  });

  it("chặn xóa khóa đã có hồ sơ đăng ký (kể cả hồ sơ đã hủy) - khóa giữ nguyên", async () => {
    const ct = await taoChuongTrinh("DA_BAN_HANH");
    const khoa = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa: 30 });
    khoaTaoTrongTest.push(khoa.id);
    const hv = await prisma.hocVien.create({ data: { maHocVien: `HV_KH01_${crypto.randomUUID()}`, hoTen: "Học viên test KH-01" } });
    hocVienTaoTrongTest.push(hv.id);
    await prisma.dangKyHoc.create({ data: { hocVienId: hv.id, khoaId: khoa.id, trangThai: "KHONG_HOP_LE" } });

    await expect(xoaKhoa(khoa.id)).rejects.toThrow(KhongXoaDuocKhoaError);
    await expect(xoaKhoa(khoa.id)).rejects.toThrow(/1 hồ sơ đăng ký/);
    expect(await prisma.khoa.findUnique({ where: { id: khoa.id } })).not.toBeNull();
  });

  it("khóa không tồn tại", async () => {
    await expect(xoaKhoa("khong-ton-tai")).rejects.toThrow(KhongTimThayKhoaError);
  });
});

// (bổ sung 14/10/2026) khóa dự thi (PT3): ngày mở khóa (khai giảng) - ngày thi (bế giảng) - hạn đăng ký
describe("KH-01 ngày của khóa dự thi", () => {
  async function chuongTrinhDuThi() {
    const ct = await taoChuongTrinh("DA_BAN_HANH");
    await prisma.chuongTrinh.update({ where: { id: ct.id }, data: { phuongThucDangKys: ["CHI_DU_THI"] } });
    return ct;
  }
  const NGUOI = { nguoiThucHienTen: "test KH-01" };

  it("lưu ngày mở khóa, ngày thi, hạn đăng ký hợp lệ", async () => {
    const ct = await chuongTrinhDuThi();
    const khoa = await khoiTaoKhoa({
      chuongTrinhId: ct.id, tenKhoa: "Thi CNTT 12/2026", siSoToiDa: 200,
      thoiGianKhaiGiang: "2026-10-14", thoiGianBeGiang: "2026-12-20", hanDangKy: "2026-11-20",
    });
    khoaTaoTrongTest.push(khoa.id);
    expect(khoa.thoiGianBeGiang?.toISOString().slice(0, 10)).toBe("2026-12-20");
    // hạn đăng ký trùng ngày thi vẫn được
    await datHanDangKy(khoa.id, "2026-12-20", NGUOI);
  });

  it("chặn ngày thi trước ngày mở khóa", async () => {
    const ct = await chuongTrinhDuThi();
    await expect(
      khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa: 10, thoiGianKhaiGiang: "2026-12-01", thoiGianBeGiang: "2026-11-30" }),
    ).rejects.toThrow(NgayKhoaThiKhongHopLeError);
    expect(await prisma.khoa.count({ where: { chuongTrinhId: ct.id } })).toBe(0);
  });

  it("chặn hạn đăng ký sau ngày thi - cả khi khởi tạo và khi sửa hạn", async () => {
    const ct = await chuongTrinhDuThi();
    await expect(
      khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa: 10, thoiGianBeGiang: "2026-12-20", hanDangKy: "2026-12-21" }),
    ).rejects.toThrow("Hạn đăng ký không được sau ngày thi");

    const khoa = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa: 10, thoiGianBeGiang: "2026-12-20", hanDangKy: "2026-12-01" });
    khoaTaoTrongTest.push(khoa.id);
    await expect(datHanDangKy(khoa.id, "2026-12-25", NGUOI)).rejects.toThrow(NgayKhoaThiKhongHopLeError);
    expect((await prisma.khoa.findUniqueOrThrow({ where: { id: khoa.id } })).hanDangKy?.toISOString()).toBe(khoa.hanDangKy?.toISOString());
  });

  it("chưa có ngày thi thì không đối chiếu hạn đăng ký", async () => {
    const ct = await chuongTrinhDuThi();
    const khoa = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa: 10, hanDangKy: "2026-12-31" });
    khoaTaoTrongTest.push(khoa.id);
    expect(khoa.thoiGianBeGiang).toBeNull();
  });

  it("khóa đào tạo không áp quy tắc ngày của khóa dự thi", async () => {
    const ct = await taoChuongTrinh("DA_BAN_HANH");
    const khoa = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa: 10, thoiGianBeGiang: "2026-12-20", hanDangKy: "2026-12-25" });
    khoaTaoTrongTest.push(khoa.id);
    expect(khoa.hanDangKy).not.toBeNull();
  });
});
