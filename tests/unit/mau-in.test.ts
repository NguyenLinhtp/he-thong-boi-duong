import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { chuanHoaMauDon, docSoTien, thayBien } from "@/lib/mau-in";
import {
  luuMauBienLai,
  luuMauDonChuongTrinh,
  luuMauDonKhoa,
  MauInKhongHopLeError,
  mauDonHieuLuc,
  noiDungInPhieuThu,
} from "@/server/services/chung/mau-in";
import { lapPhieuThu } from "@/server/services/hp/hp-04-phieu-thu";

// (bổ sung 07/10/2026 - HV-01/HV-05/HP-04) mẫu in đơn đăng ký + biên lai thu tiền C45-BB

const NGUOI = { nguoiThucHienId: null, nguoiThucHienTen: "Test mẫu in" };
const loaiHinh: string[] = [];
const chuongTrinh: string[] = [];
const khoaIds: string[] = [];
const hocVienIds: string[] = [];

afterAll(async () => {
  await prisma.phieuThu.deleteMany({ where: { hocPhi: { khoaId: { in: khoaIds } } } });
  await prisma.hocPhi.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: hocVienIds } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaIds } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinh } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinh } } });
});

async function taoKhoa() {
  const lh = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH_MI_${crypto.randomUUID()}`, ten: "LH mẫu in" } });
  loaiHinh.push(lh.id);
  const ct = await prisma.chuongTrinh.create({
    data: { maCT: `CT_MI_${crypto.randomUUID().slice(0, 8)}`, ten: "Thi tin học ứng dụng", loaiHinhBoiDuongId: lh.id, trangThai: "DA_BAN_HANH", phuongThucDangKy: "CHI_DU_THI" },
  });
  chuongTrinh.push(ct.id);
  const khoa = await prisma.khoa.create({
    data: { maKhoa: `KHMI${crypto.randomUUID().slice(0, 8)}`, tenKhoa: "Chứng chỉ CNTT cơ bản đợt thi tháng 11/2026", chuongTrinhId: ct.id, siSoToiDa: 10, thoiGianKhaiGiang: new Date("2026-11-15") },
  });
  khoaIds.push(khoa.id);
  return { ct, khoa };
}

describe("đọc số tiền bằng chữ (biên lai C45-BB)", () => {
  it.each([
    [0, "Không đồng"],
    [15, "Mười lăm đồng"],
    [21, "Hai mươi mốt đồng"],
    [450_000, "Bốn trăm năm mươi nghìn đồng"],
    [750_000, "Bảy trăm năm mươi nghìn đồng"],
    [1_500_000, "Một triệu năm trăm nghìn đồng"],
    [1_005_000, "Một triệu không trăm linh năm nghìn đồng"],
    [2_000_000_000, "Hai tỷ đồng"],
    [1_000_000_000_000, "Một nghìn tỷ đồng"],
  ])("%d -> %s", (so, chu) => {
    expect(docSoTien(so)).toBe(chu);
  });
});

describe("mẫu đơn đăng ký", () => {
  it("thay biến; biến trống in dấu chấm; cấu hình thiếu khóa ghép mẫu mặc định", () => {
    expect(thayBien("Đợt thi: {{tenKhoa}} ngày {{ngayThi}}", { tenKhoa: "CNTT 11/2026", ngayThi: "" })).toBe("Đợt thi: CNTT 11/2026 ngày ………………");
    const mau = chuanHoaMauDon({ tieuDe: "ĐƠN RIÊNG" }, true);
    expect(mau.tieuDe).toBe("ĐƠN RIÊNG");
    expect(mau.nhanKy).toBe("Người đăng ký dự thi");
    expect(mau.hienBangLePhi).toBe(true);
  });

  it("khóa kế thừa mẫu chương trình, sửa riêng được, bỏ mẫu riêng thì về mẫu chương trình; ghi nhật ký", async () => {
    const { ct, khoa } = await taoKhoa();
    expect((await mauDonHieuLuc(khoa.id)).nguon).toBe("MAC_DINH");

    await luuMauDonChuongTrinh(ct.id, { tieuDe: "ĐƠN ĐĂNG KÝ DỰ THI CNTT", canCu: "Căn cứ Quyết định số 1200/QĐ-ĐHSP;" }, NGUOI);
    let hl = await mauDonHieuLuc(khoa.id);
    expect(hl.nguon).toBe("CHUONG_TRINH");
    expect(hl.mau.tieuDe).toBe("ĐƠN ĐĂNG KÝ DỰ THI CNTT");

    await luuMauDonKhoa(khoa.id, { ...hl.mau, kinhGui: "Trung tâm Tin học" }, NGUOI);
    hl = await mauDonHieuLuc(khoa.id);
    expect(hl.nguon).toBe("KHOA");
    expect(hl.mau.kinhGui).toBe("Trung tâm Tin học");

    await luuMauDonKhoa(khoa.id, null, NGUOI);
    expect((await mauDonHieuLuc(khoa.id)).nguon).toBe("CHUONG_TRINH");
    expect(await prisma.nhatKyThaoTac.count({ where: { hanhDong: "CAP_NHAT_MAU_DON", doiTuongId: { in: [ct.id, khoa.id] } } })).toBe(3);
  });

  it("chặn lưu mẫu có biến không tồn tại hoặc thiếu tiêu đề", async () => {
    const { ct } = await taoKhoa();
    await expect(luuMauDonChuongTrinh(ct.id, { camKet: "Tôi cam kết {{tenKhoaa}}" }, NGUOI)).rejects.toThrow(MauInKhongHopLeError);
    await expect(luuMauDonChuongTrinh(ct.id, { tieuDe: "  " }, NGUOI)).rejects.toThrow(/tiêu đề/);
    expect((await prisma.chuongTrinh.findUniqueOrThrow({ where: { id: ct.id } })).mauDonDangKy).toBeNull();
  });
});

describe("biên lai thu tiền theo mẫu chương trình", () => {
  it("nội dung in chốt khi lập: sửa mẫu sau đó không đổi biên lai đã lập; biên lai mới theo mẫu mới", async () => {
    const { ct, khoa } = await taoKhoa();
    const hv = await prisma.hocVien.create({ data: { maHocVien: `HVMI${crypto.randomUUID().slice(0, 8)}`, hoTen: "Trần Thị Bình", lopSinhHoat: "22CNTT1" } });
    hocVienIds.push(hv.id);
    const hp = await prisma.hocPhi.create({ data: { hocVienId: hv.id, khoaId: khoa.id, soTienPhaiNop: 900_000 } });

    await luuMauBienLai(ct.id, { maQHNS: "1056789", quyenSo: "01/2026", noiDungThu: "{{noiDung}} - {{tenKhoa}}" }, NGUOI);
    const p1 = await prisma.$transaction((tx) => lapPhieuThu({ hocPhiId: hp.id, soTien: 450_000, nguoiLapTen: "TC" }, tx));
    const nd1 = await noiDungInPhieuThu({ ...p1, chiTiets: [] });
    expect(nd1).toMatchObject({
      mauSo: "C45-BB",
      maQHNS: "1056789",
      quyenSo: "01/2026",
      noiDungThu: "Lệ phí thi - Chứng chỉ CNTT cơ bản đợt thi tháng 11/2026",
      nguoiNop: "Trần Thị Bình",
      diaChi: "Lớp 22CNTT1",
    });

    await luuMauBienLai(ct.id, { quyenSo: "02/2026" }, NGUOI);
    const lai = await prisma.phieuThu.findUniqueOrThrow({ where: { id: p1.id }, include: { chiTiets: true } });
    expect((await noiDungInPhieuThu(lai)).quyenSo).toBe("01/2026");
    const p2 = await prisma.$transaction((tx) => lapPhieuThu({ hocPhiId: hp.id, soTien: 450_000, nguoiLapTen: "TC" }, tx));
    expect((await noiDungInPhieuThu({ ...p2, chiTiets: [] })).quyenSo).toBe("02/2026");
  });

  it("chặn lưu mẫu biên lai thiếu nội dung thu hoặc có biến lạ", async () => {
    const { ct } = await taoKhoa();
    await expect(luuMauBienLai(ct.id, { noiDungThu: " " }, NGUOI)).rejects.toThrow(/nội dung thu/);
    await expect(luuMauBienLai(ct.id, { donVi: "{{khongCo}}" }, NGUOI)).rejects.toThrow(MauInKhongHopLeError);
  });
});
