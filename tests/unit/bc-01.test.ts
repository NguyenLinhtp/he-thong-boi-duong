import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { tongQuanDashboard } from "@/server/services/bc/bc-01-dashboard";

const uid = () => crypto.randomUUID().slice(0, 8);
const ids = { loaiHinh: [] as string[], chuongTrinh: [] as string[], khoa: [] as string[], hocVien: [] as string[] };

afterAll(async () => {
  await prisma.phieuThu.deleteMany({ where: { hocPhi: { khoaId: { in: ids.khoa } } } });
  await prisma.hocPhi.deleteMany({ where: { khoaId: { in: ids.khoa } } });
  await prisma.chungChi.deleteMany({ where: { khoaId: { in: ids.khoa } } });
  await prisma.buoiHoc.deleteMany({ where: { khoaId: { in: ids.khoa } } });
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: ids.khoa } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: ids.hocVien } } });
  await prisma.khoa.deleteMany({ where: { id: { in: ids.khoa } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: ids.chuongTrinh } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: ids.loaiHinh } } });
});

const NGAY = 864e5;

async function taoKhoa(trangThai: "DANG_TUYEN_SINH" | "DANG_DIEN_RA" | "DA_KET_THUC") {
  const lh = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH_BC01_${uid()}`, ten: "LH" } });
  ids.loaiHinh.push(lh.id);
  const ct = await prisma.chuongTrinh.create({
    data: { maCT: `CT_BC01_${uid()}`, ten: "CT BC-01", loaiHinhBoiDuongId: lh.id, trangThai: "DA_BAN_HANH" },
  });
  ids.chuongTrinh.push(ct.id);
  const khoa = await prisma.khoa.create({ data: { maKhoa: `K_BC01_${uid()}`, chuongTrinhId: ct.id, siSoToiDa: 20, trangThai } });
  ids.khoa.push(khoa.id);
  return khoa;
}

async function taoHocVien(khoaId: string, trangThai: "CHINH_THUC" | "CHO_DUYET") {
  const hv = await prisma.hocVien.create({ data: { maHocVien: `HV_BC01_${uid()}`, hoTen: "HV" } });
  ids.hocVien.push(hv.id);
  await prisma.dangKyHoc.create({ data: { hocVienId: hv.id, khoaId, trangThai } });
  return hv;
}

describe("BC-01 dashboard tổng quan", () => {
  it("phản ánh ngay dữ liệu mới: khóa, học viên, tiến độ giảng dạy, học phí, văn bằng", async () => {
    const bayGio = new Date();
    const truoc = await tongQuanDashboard(bayGio);

    const dangHoc = await taoKhoa("DANG_DIEN_RA");
    await taoKhoa("DANG_TUYEN_SINH");
    await taoKhoa("DA_KET_THUC");
    const hv1 = await taoHocVien(dangHoc.id, "CHINH_THUC");
    await taoHocVien(dangHoc.id, "CHINH_THUC");
    const khoaTuyenSinh = ids.khoa[1];
    await taoHocVien(khoaTuyenSinh, "CHO_DUYET");
    // 4 buổi: 3 đã qua (1 bị hủy - không tính), 1 sắp tới
    for (const [lech, daHuy] of [[-10, false], [-5, false], [-3, true], [5, false]] as const) {
      await prisma.buoiHoc.create({ data: { khoaId: dangHoc.id, ngayHoc: new Date(bayGio.getTime() + lech * NGAY), daHuy } });
    }
    const hp = await prisma.hocPhi.create({
      data: { hocVienId: hv1.id, khoaId: dangHoc.id, soTienPhaiNop: 1_000_000, soTienDaNop: 400_000, trangThai: "CON_NO" },
    });
    await prisma.phieuThu.create({ data: { soPhieu: `PT_BC01_${uid()}`, hocPhiId: hp.id, soTien: 400_000, ngayLap: bayGio } });
    await prisma.chungChi.create({ data: { hocVienId: hv1.id, khoaId: dangHoc.id, trangThai: "CHO_KY_DUYET" } });

    const sau = await tongQuanDashboard(bayGio);

    expect(sau.capNhatLuc).toBe(bayGio);
    expect(sau.khoa.dangMo - truoc.khoa.dangMo).toBe(2);
    expect(sau.khoa.dangHoc - truoc.khoa.dangHoc).toBe(1);
    expect(sau.khoa.daKetThuc - truoc.khoa.daKetThuc).toBe(1);
    expect(sau.hocVien.dangHoc - truoc.hocVien.dangHoc).toBe(2);
    expect(sau.hocVien.hoSoMoi30Ngay - truoc.hocVien.hoSoMoi30Ngay).toBe(3);
    expect(sau.hocVien.hoSoChoXuLy - truoc.hocVien.hoSoChoXuLy).toBe(1);

    expect(sau.giangDay.theoKhoa.find((k) => k.khoaId === dangHoc.id)).toMatchObject({ soHocVien: 2, tongBuoi: 3, daHoc: 2, phanTram: 67 });
    expect(sau.giangDay.tongBuoi - truoc.giangDay.tongBuoi).toBe(3);

    expect(sau.hocPhi.thuThangNay - truoc.hocPhi.thuThangNay).toBe(400_000);
    expect(sau.hocPhi.thuTheoThang).toHaveLength(6);
    expect(sau.hocPhi.thuTheoThang[5].thang).toBe(`${bayGio.getMonth() + 1}/${bayGio.getFullYear()}`);
    expect(sau.hocPhi.congNo - truoc.hocPhi.congNo).toBe(600_000);
    expect(sau.vanBang.choKy - truoc.vanBang.choKy).toBe(1);
  });

  it("không có buổi học / học phí thì phần trăm là null, không chia cho 0", async () => {
    const khoa = await taoKhoa("DANG_DIEN_RA");
    const kq = await tongQuanDashboard();
    expect(kq.giangDay.theoKhoa.find((k) => k.khoaId === khoa.id)).toMatchObject({ tongBuoi: 0, phanTram: null });
  });
});
