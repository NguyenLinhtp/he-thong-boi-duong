import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { thietLapHocPhi, hocPhiCuaKhoa, taoHocPhiSauKhiChinhThuc } from "@/server/services/hp/hp-01-thiet-lap";
import { xacNhanThanhToan, xacNhanMienGiam } from "@/server/services/hp/hp-02-thanh-toan";
import { danhSachCongNo, datHanNop, guiNhacNoHocPhi } from "@/server/services/hp/hp-03-cong-no";
import { danhSachPhieuThu } from "@/server/services/hp/hp-04-phieu-thu";
import { baoCaoDoanhThu, baoCaoCongNo } from "@/server/services/hp/hp-05-bao-cao";
import { daHoanTatNghiaVuTaiChinh, boQuaDieuKienHocPhi } from "@/server/services/hp/hp-06-dieu-kien";
import {
  ThieuLyDoDieuChinhHocPhiError,
  SoTienKhongHopLeError,
  HocPhiQuaDonViLienKetError,
} from "@/server/services/hp/loi-hoc-phi";

const loaiHinhTaoTrongTest: string[] = [];
const chuongTrinhTaoTrongTest: string[] = [];
const khoaTaoTrongTest: string[] = [];
const hocVienTaoTrongTest: string[] = [];
const donViLienKetTaoTrongTest: string[] = [];

afterAll(async () => {
  await prisma.phieuThu.deleteMany({ where: { hocPhi: { khoaId: { in: khoaTaoTrongTest } } } });
  await prisma.hocPhi.deleteMany({ where: { khoaId: { in: khoaTaoTrongTest } } });
  await prisma.hopDongLienKet.deleteMany({ where: { donViLienKetId: { in: donViLienKetTaoTrongTest } } });
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: khoaTaoTrongTest } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: hocVienTaoTrongTest } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaTaoTrongTest } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinhTaoTrongTest } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinhTaoTrongTest } } });
  await prisma.donViLienKet.deleteMany({ where: { id: { in: donViLienKetTaoTrongTest } } });
});

async function taoKhoaVoiHocVienChinhThuc() {
  const lh = await prisma.loaiHinhBoiDuong.create({
    data: { ma: `LH_HP_${crypto.randomUUID()}`, ten: "Loại hình test HP" },
  });
  loaiHinhTaoTrongTest.push(lh.id);

  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_HP_${crypto.randomUUID()}`,
      ten: "Chương trình test HP",
      loaiHinhBoiDuongId: lh.id,
      trangThai: "DA_BAN_HANH",
      soQuyetDinh: "QD-HP",
      ngayBanHanh: new Date(),
    },
  });
  chuongTrinhTaoTrongTest.push(ct.id);

  const khoa = await prisma.khoa.create({
    data: { maKhoa: `KH_HP_${crypto.randomUUID()}`, chuongTrinhId: ct.id, siSoToiDa: 30 },
  });
  khoaTaoTrongTest.push(khoa.id);

  const hocVien = await prisma.hocVien.create({
    data: { maHocVien: `HV_HP_${crypto.randomUUID()}`, hoTen: "Học viên test HP" },
  });
  hocVienTaoTrongTest.push(hocVien.id);

  await prisma.dangKyHoc.create({
    data: { hocVienId: hocVien.id, khoaId: khoa.id, trangThai: "CHINH_THUC" },
  });

  return { khoa, hocVien };
}

async function taoKhoaVoiHocVienQuaDVLK() {
  const { khoa } = await (async () => {
    const lh = await prisma.loaiHinhBoiDuong.create({
      data: { ma: `LH_HP_DVLK_${crypto.randomUUID()}`, ten: "Loại hình test HP DVLK" },
    });
    loaiHinhTaoTrongTest.push(lh.id);
    const ct = await prisma.chuongTrinh.create({
      data: {
        maCT: `CT_HP_DVLK_${crypto.randomUUID()}`,
        ten: "Chương trình test HP DVLK",
        loaiHinhBoiDuongId: lh.id,
        trangThai: "DA_BAN_HANH",
        soQuyetDinh: "QD-HP-DVLK",
        ngayBanHanh: new Date(),
      },
    });
    chuongTrinhTaoTrongTest.push(ct.id);
    const khoa = await prisma.khoa.create({
      data: { maKhoa: `KH_HP_DVLK_${crypto.randomUUID()}`, chuongTrinhId: ct.id, siSoToiDa: 30 },
    });
    khoaTaoTrongTest.push(khoa.id);
    return { khoa };
  })();

  const donVi = await prisma.donViLienKet.create({
    data: { ma: `DVLK_HP_${crypto.randomUUID()}`, ten: "Đơn vị test HP" },
  });
  donViLienKetTaoTrongTest.push(donVi.id);

  const hopDong = await prisma.hopDongLienKet.create({
    data: { maHopDong: `HD_HP_${crypto.randomUUID()}`, donViLienKetId: donVi.id, khoaId: khoa.id },
  });

  const hocVien = await prisma.hocVien.create({
    data: { maHocVien: `HV_HP_DVLK_${crypto.randomUUID()}`, hoTen: "Học viên test HP qua ĐVLK" },
  });
  hocVienTaoTrongTest.push(hocVien.id);

  await prisma.dangKyHoc.create({
    data: {
      hocVienId: hocVien.id,
      khoaId: khoa.id,
      trangThai: "CHINH_THUC",
      hopDongLienKetId: hopDong.id,
    },
  });

  return { khoa, hocVien, hopDong };
}

describe("HP-01 thiết lập mức học phí theo khóa", () => {
  it("thiết lập lần đầu tạo dòng HocPhi cho học viên chính thức", async () => {
    const { khoa, hocVien } = await taoKhoaVoiHocVienChinhThuc();

    await thietLapHocPhi(khoa.id, { mucHocPhi: 5_000_000 });

    const dsHocPhi = await hocPhiCuaKhoa(khoa.id);
    expect(dsHocPhi).toHaveLength(1);
    expect(dsHocPhi[0].hocVienId).toBe(hocVien.id);
    expect(Number(dsHocPhi[0].soTienPhaiNop)).toBe(5_000_000);
    expect(dsHocPhi[0].trangThai).toBe("CHUA_NOP");
  });

  it("học viên qua đơn vị liên kết vào thẳng CHO_THANH_LY_HOP_DONG, số phải nộp = 0", async () => {
    const { khoa } = await taoKhoaVoiHocVienQuaDVLK();

    await thietLapHocPhi(khoa.id, { mucHocPhi: 3_000_000 });

    const dsHocPhi = await hocPhiCuaKhoa(khoa.id);
    expect(dsHocPhi[0].trangThai).toBe("CHO_THANH_LY_HOP_DONG");
    expect(Number(dsHocPhi[0].soTienPhaiNop)).toBe(0);
  });

  it("bắt buộc lý do khi điều chỉnh mức học phí sau khi đã có đăng ký", async () => {
    const { khoa } = await taoKhoaVoiHocVienChinhThuc();
    await thietLapHocPhi(khoa.id, { mucHocPhi: 5_000_000 });

    await expect(thietLapHocPhi(khoa.id, { mucHocPhi: 6_000_000 })).rejects.toThrow(
      ThieuLyDoDieuChinhHocPhiError,
    );

    const khoaSau = await thietLapHocPhi(khoa.id, {
      mucHocPhi: 6_000_000,
      lyDoDieuChinh: "Điều chỉnh theo quyết định mới",
    });
    expect(Number(khoaSau.mucHocPhi)).toBe(6_000_000);

    const dsHocPhi = await hocPhiCuaKhoa(khoa.id);
    expect(Number(dsHocPhi[0].soTienPhaiNop)).toBe(6_000_000);
  });

  it("taoHocPhiSauKhiChinhThuc tạo bù cho học viên chính thức sau khi HP-01 đã chạy", async () => {
    const { khoa } = await taoKhoaVoiHocVienChinhThuc();
    await thietLapHocPhi(khoa.id, { mucHocPhi: 4_000_000 });

    const hocVien2 = await prisma.hocVien.create({
      data: { maHocVien: `HV_HP_${crypto.randomUUID()}`, hoTen: "Học viên 2 test HP" },
    });
    hocVienTaoTrongTest.push(hocVien2.id);
    const dangKy2 = await prisma.dangKyHoc.create({
      data: { hocVienId: hocVien2.id, khoaId: khoa.id, trangThai: "CHINH_THUC" },
    });

    await taoHocPhiSauKhiChinhThuc(dangKy2.id);

    const dsHocPhi = await hocPhiCuaKhoa(khoa.id);
    expect(dsHocPhi).toHaveLength(2);
    expect(dsHocPhi.find((hp) => hp.hocVienId === hocVien2.id)).toBeTruthy();
  });
});

describe("HP-02 ghi nhận và xác nhận thanh toán", () => {
  it("nộp từng phần chuyển Còn nợ, nộp đủ chuyển Đã nộp đủ, sinh phiếu thu", async () => {
    const { khoa } = await taoKhoaVoiHocVienChinhThuc();
    await thietLapHocPhi(khoa.id, { mucHocPhi: 1_000_000 });
    const [hocPhi] = await hocPhiCuaKhoa(khoa.id);

    const lan1 = await xacNhanThanhToan(hocPhi.id, {
      soTien: 400_000,
      hinhThucNop: "Tiền mặt",
      nguoiXacNhanTen: "Cán bộ test",
    });
    expect(lan1.hocPhi.trangThai).toBe("CON_NO");
    expect(lan1.phieuThu.soPhieu).toMatch(/^PT\d{4}\d{5}$/);

    const lan2 = await xacNhanThanhToan(hocPhi.id, {
      soTien: 600_000,
      hinhThucNop: "Chuyển khoản",
      nguoiXacNhanTen: "Cán bộ test",
    });
    expect(lan2.hocPhi.trangThai).toBe("DA_NOP_DU");
    expect(Number(lan2.hocPhi.soTienDaNop)).toBe(1_000_000);

    const dsPhieu = await danhSachPhieuThu(khoa.id);
    expect(dsPhieu).toHaveLength(2);
    expect(dsPhieu[0].soPhieu).not.toBe(dsPhieu[1].soPhieu);
  });

  it("từ chối số tiền không hợp lệ", async () => {
    const { khoa } = await taoKhoaVoiHocVienChinhThuc();
    await thietLapHocPhi(khoa.id, { mucHocPhi: 1_000_000 });
    const [hocPhi] = await hocPhiCuaKhoa(khoa.id);

    await expect(
      xacNhanThanhToan(hocPhi.id, { soTien: 0, hinhThucNop: "Tiền mặt", nguoiXacNhanTen: "x" }),
    ).rejects.toThrow(SoTienKhongHopLeError);
  });

  it("từ chối xác nhận thanh toán cá nhân cho học viên qua đơn vị liên kết", async () => {
    const { khoa } = await taoKhoaVoiHocVienQuaDVLK();
    await thietLapHocPhi(khoa.id, { mucHocPhi: 1_000_000 });
    const [hocPhi] = await hocPhiCuaKhoa(khoa.id);

    await expect(
      xacNhanThanhToan(hocPhi.id, { soTien: 100, hinhThucNop: "Tiền mặt", nguoiXacNhanTen: "x" }),
    ).rejects.toThrow(HocPhiQuaDonViLienKetError);
  });

  it("xác nhận miễn giảm chuyển trạng thái MIEN_GIAM", async () => {
    const { khoa } = await taoKhoaVoiHocVienChinhThuc();
    await thietLapHocPhi(khoa.id, { mucHocPhi: 1_000_000 });
    const [hocPhi] = await hocPhiCuaKhoa(khoa.id);

    const sau = await xacNhanMienGiam(hocPhi.id, { lyDo: "Diện chính sách", nguoiXacNhanTen: "x" });
    expect(sau.trangThai).toBe("MIEN_GIAM");
  });
});

describe("HP-03 theo dõi công nợ", () => {
  it("liệt kê đúng các khoản còn nợ/chưa nộp, đặt hạn nộp và gửi nhắc nợ", async () => {
    const { khoa, hocVien } = await taoKhoaVoiHocVienChinhThuc();
    await thietLapHocPhi(khoa.id, { mucHocPhi: 1_000_000 });
    const [hocPhi] = await hocPhiCuaKhoa(khoa.id);

    const dsCongNo = await danhSachCongNo(khoa.id);
    expect(dsCongNo.map((hp) => hp.hocVienId)).toContain(hocVien.id);

    const hanNop = new Date();
    hanNop.setDate(hanNop.getDate() + 3);
    await datHanNop(hocPhi.id, hanNop);

    const sauNhac = await guiNhacNoHocPhi(hocPhi.id);
    expect(sauNhac.lanNhacGanNhat).not.toBeNull();
  });
});

describe("HP-06 điều kiện tài chính (dùng cho KQ-03/CC-01)", () => {
  it("chưa có dòng HocPhi (khóa miễn phí) luôn coi là đã hoàn tất", async () => {
    const { khoa, hocVien } = await taoKhoaVoiHocVienChinhThuc();
    expect(await daHoanTatNghiaVuTaiChinh(hocVien.id, khoa.id)).toBe(true);
  });

  it("còn nợ thì chưa hoàn tất; đã nộp đủ thì hoàn tất", async () => {
    const { khoa, hocVien } = await taoKhoaVoiHocVienChinhThuc();
    await thietLapHocPhi(khoa.id, { mucHocPhi: 1_000_000 });
    const [hocPhi] = await hocPhiCuaKhoa(khoa.id);

    expect(await daHoanTatNghiaVuTaiChinh(hocVien.id, khoa.id)).toBe(false);

    await xacNhanThanhToan(hocPhi.id, { soTien: 1_000_000, hinhThucNop: "Tiền mặt", nguoiXacNhanTen: "x" });
    expect(await daHoanTatNghiaVuTaiChinh(hocVien.id, khoa.id)).toBe(true);
  });

  it("học viên qua ĐVLK: hoàn tất theo trạng thái thanh lý hợp đồng, không theo cá nhân", async () => {
    const { khoa, hocVien, hopDong } = await taoKhoaVoiHocVienQuaDVLK();
    await thietLapHocPhi(khoa.id, { mucHocPhi: 2_000_000 });

    expect(await daHoanTatNghiaVuTaiChinh(hocVien.id, khoa.id)).toBe(false);

    await prisma.hopDongLienKet.update({ where: { id: hopDong.id }, data: { trangThai: "DA_THANH_LY" } });
    expect(await daHoanTatNghiaVuTaiChinh(hocVien.id, khoa.id)).toBe(true);
  });

  it("bỏ qua điều kiện thủ công khiến luôn coi là hoàn tất", async () => {
    const { khoa, hocVien } = await taoKhoaVoiHocVienChinhThuc();
    await thietLapHocPhi(khoa.id, { mucHocPhi: 1_000_000 });
    const [hocPhi] = await hocPhiCuaKhoa(khoa.id);

    expect(await daHoanTatNghiaVuTaiChinh(hocVien.id, khoa.id)).toBe(false);

    await boQuaDieuKienHocPhi(hocPhi.id, { lyDo: "Trường hợp đặc biệt", nguoiPheDuyetTen: "Lãnh đạo" });
    expect(await daHoanTatNghiaVuTaiChinh(hocVien.id, khoa.id)).toBe(true);
  });
});

describe("HP-05 báo cáo doanh thu và công nợ", () => {
  it("doanh thu khớp tổng phiếu thu, công nợ khớp số còn thiếu", async () => {
    const { khoa } = await taoKhoaVoiHocVienChinhThuc();
    await thietLapHocPhi(khoa.id, { mucHocPhi: 1_000_000 });
    const [hocPhi] = await hocPhiCuaKhoa(khoa.id);
    await xacNhanThanhToan(hocPhi.id, { soTien: 300_000, hinhThucNop: "Tiền mặt", nguoiXacNhanTen: "x" });

    const doanhThu = await baoCaoDoanhThu({ khoaId: khoa.id });
    expect(doanhThu.tongDoanhThu).toBe(300_000);
    expect(doanhThu.soPhieuThu).toBe(1);

    const congNo = await baoCaoCongNo({ khoaId: khoa.id });
    expect(congNo.tongConNo).toBe(700_000);
  });
});
