import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { tongHopHocPhiTheoKhoa } from "@/server/services/hp/hp-05-bao-cao";
import { xacNhanThanhToan } from "@/server/services/hp/hp-02-thanh-toan";
import { chuyenTrangThaiLePhi } from "@/server/services/hp/hp-02-chuyen-trang-thai-le-phi";

// (bổ sung 06/10/2026) màn hình "Học phí theo khóa" của cán bộ tài chính

const NGUOI = { nguoiThucHienId: null, nguoiThucHienTen: "Test tổng hợp học phí" };
const loaiHinh: string[] = [];
const chuongTrinh: string[] = [];
const khoaIds: string[] = [];
const hocVienIds: string[] = [];

afterAll(async () => {
  await prisma.phieuThu.deleteMany({ where: { hocPhi: { khoaId: { in: khoaIds } } } });
  await prisma.hocPhi.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: hocVienIds } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaIds } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinh } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinh } } });
});

async function taoKhoa() {
  const lh = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH_THK_${crypto.randomUUID()}`, ten: "LH tổng hợp" } });
  loaiHinh.push(lh.id);
  const ct = await prisma.chuongTrinh.create({
    data: { maCT: `CT_THK_${crypto.randomUUID()}`, ten: "CT tổng hợp", loaiHinhBoiDuongId: lh.id, trangThai: "DA_BAN_HANH" },
  });
  chuongTrinh.push(ct.id);
  const khoa = await prisma.khoa.create({ data: { maKhoa: `KH_THK_${crypto.randomUUID()}`, chuongTrinhId: ct.id, siSoToiDa: 30 } });
  khoaIds.push(khoa.id);
  return khoa;
}

async function themHocVien(khoaId: string, trangThaiDk: "CHINH_THUC" | "KHONG_HOP_LE" | "THOI_HOC", hocPhi?: { trangThai?: "CHUA_NOP" | "MIEN_GIAM" | "CHO_THANH_LY_HOP_DONG"; boQua?: boolean }) {
  const hv = await prisma.hocVien.create({ data: { maHocVien: `HV_THK_${crypto.randomUUID()}`, hoTen: "HV tổng hợp" } });
  hocVienIds.push(hv.id);
  await prisma.dangKyHoc.create({ data: { hocVienId: hv.id, khoaId, trangThai: trangThaiDk } });
  if (!hocPhi) return null;
  return prisma.hocPhi.create({
    data: { hocVienId: hv.id, khoaId, soTienPhaiNop: 500_000, trangThai: hocPhi.trangThai ?? "CHUA_NOP", boQuaKiemTra: hocPhi.boQua ?? false },
  });
}

describe("tongHopHocPhiTheoKhoa", () => {
  it("đếm đăng ký còn hiệu lực, đã xác nhận / còn nợ học phí, tổng thu không tính phiếu đã hủy", async () => {
    const khoa = await taoKhoa();
    const daDong = await themHocVien(khoa.id, "CHINH_THUC", {});
    await xacNhanThanhToan(daDong!.id, { soTien: 500_000, hinhThucNop: "Tiền mặt", nguoiXacNhanTen: NGUOI.nguoiThucHienTen });
    const nopThieu = await themHocVien(khoa.id, "CHINH_THUC", {});
    await xacNhanThanhToan(nopThieu!.id, { soTien: 200_000, hinhThucNop: "Tiền mặt", nguoiXacNhanTen: NGUOI.nguoiThucHienTen });
    await themHocVien(khoa.id, "CHINH_THUC", { trangThai: "MIEN_GIAM" });
    await themHocVien(khoa.id, "CHINH_THUC", { boQua: true });
    await themHocVien(khoa.id, "CHINH_THUC", { trangThai: "CHO_THANH_LY_HOP_DONG" });
    // đóng rồi bị hủy ghi nhận -> còn nợ, phiếu hủy không tính vào tổng thu
    const huy = await themHocVien(khoa.id, "CHINH_THUC", {});
    await chuyenTrangThaiLePhi(huy!.id, "DA_DONG", null, NGUOI);
    await chuyenTrangThaiLePhi(huy!.id, "CHUA_DONG", "Ghi nhận nhầm", NGUOI);
    // đăng ký không còn hiệu lực không tính vào tổng đăng ký
    await themHocVien(khoa.id, "KHONG_HOP_LE");
    await themHocVien(khoa.id, "THOI_HOC");

    const kq = (await tongHopHocPhiTheoKhoa([khoa.id])).get(khoa.id);
    expect(kq).toEqual({ soDangKy: 6, soDaXacNhan: 3, soConNo: 2, daThu: 700_000 });
  });

  it("khóa chưa có đăng ký/học phí trả về 0", async () => {
    const khoa = await taoKhoa();
    expect((await tongHopHocPhiTheoKhoa([khoa.id])).get(khoa.id)).toEqual({ soDangKy: 0, soDaXacNhan: 0, soConNo: 0, daThu: 0 });
  });
});

describe("Cán bộ tài chính: phần chương trình chỉ xem", () => {
  it("trong nhóm CT chỉ có quyền tra cứu CT-05, không có quyền tạo/sửa/duyệt/ngừng/phương thức", async () => {
    const quyen = await prisma.vaiTroChucNang.findMany({
      where: { vaiTro: { ma: "CAN_BO_TAI_CHINH" }, chucNangHeThong: { maCN: { startsWith: "CT-" } } },
      include: { chucNangHeThong: true },
    });
    expect(quyen.map((q) => q.chucNangHeThong.maCN)).toEqual(["CT-05"]);
  });
});
