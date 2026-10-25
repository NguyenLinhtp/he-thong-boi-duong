import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { prisma } from "@/lib/db/prisma";
import { taoBaiTracNghiem, themCauHoi, taoYeuCauSanPham } from "@/server/services/ct/ct-02-hoc-lieu";
import { batDauLamBai, nopBaiTracNghiem, nopSanPham } from "@/server/services/gd/gd-04-danh-gia";
import { noiDungMuc } from "@/server/services/gd/gd-04-hoc-tap";
import {
  bangDanhGiaKhoa,
  giaHanDanhGiaLo,
  thongKeChamTheoGiangVien,
  thongKeTheoBai,
  thuHoiGiaHanLo,
} from "@/server/services/gd/gd-04-quan-ly-danh-gia";

/** (bổ sung 25/10/2026 - GD-04) quản lý bài làm trực tuyến: thống kê làm/nộp/chấm/đạt và gia hạn riêng từng học viên. */

const uid = () => crypto.randomUUID().slice(0, 8);
const ids = { loaiHinh: [] as string[], chuongTrinh: [] as string[], khoa: [] as string[], hocVien: [] as string[], nguoiDung: [] as string[], giangVien: [] as string[] };
const NGUOI = { nguoiThucHienTen: "test quản lý đánh giá" };
let thuMucTam = "";

beforeAll(async () => {
  thuMucTam = await mkdtemp(path.join(os.tmpdir(), "quan-ly-danh-gia-"));
  process.env.HOC_LIEU_DIR = thuMucTam;
});

afterAll(async () => {
  const khoaId = { in: ids.khoa };
  await prisma.giaHanDanhGia.deleteMany({ where: { khoaId } });
  await prisma.lanLamTracNghiem.deleteMany({ where: { khoaId } });
  await prisma.baiNopSanPham.deleteMany({ where: { khoaId } });
  await prisma.ketQuaKhoa.deleteMany({ where: { khoaId } });
  await prisma.dangKyHoc.deleteMany({ where: { khoaId } });
  await prisma.giangVienHocPhan.deleteMany({ where: { khoaId } });
  await prisma.lopHoc.deleteMany({ where: { khoaId } });
  await prisma.khoa.deleteMany({ where: { id: khoaId } });
  await prisma.hocPhan.deleteMany({ where: { chuongTrinhId: { in: ids.chuongTrinh } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: ids.chuongTrinh } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: ids.loaiHinh } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: ids.hocVien } } });
  await prisma.giangVien.deleteMany({ where: { id: { in: ids.giangVien } } });
  await prisma.nguoiDung.deleteMany({ where: { id: { in: ids.nguoiDung } } });
  delete process.env.HOC_LIEU_DIR;
  await rm(thuMucTam, { recursive: true, force: true });
});

/** Khóa đang học có 2 lớp: bài trắc nghiệm 1 lượt (điểm đạt 5) + sản phẩm (điểm đạt 5), mỗi lớp 1 giảng viên chấm. */
async function taoKhoa() {
  const lh = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH_QL_${uid()}`, ten: "LH" } });
  ids.loaiHinh.push(lh.id);
  const ct = await prisma.chuongTrinh.create({
    data: { maCT: `CT_QL_${uid()}`, ten: "CT quản lý đánh giá", loaiHinhBoiDuongId: lh.id, trangThai: "DA_BAN_HANH", phuongThucDangKys: ["TRUC_TUYEN_NOP_GIAY"] },
  });
  ids.chuongTrinh.push(ct.id);
  const hp = await prisma.hocPhan.create({ data: { chuongTrinhId: ct.id, ten: "Chuyên đề 1", soTiet: 10, thuTu: 1 } });
  const bai = await taoBaiTracNghiem(hp.id, { tieuDe: "Kiểm tra 1", tinhDiem: true, soLanToiDa: 1, diemDat: 5 });
  const cau = await themCauHoi(bai.id, { noiDung: "?", phuongAn: ["A", "B"], dapAnDung: [0] });
  const yc = await taoYeuCauSanPham(hp.id, { tieuDe: "Thu hoạch", tinhDiem: true, diemDat: 5 });
  const khoa = await prisma.khoa.create({ data: { maKhoa: `K_QL_${uid()}`, chuongTrinhId: ct.id, siSoToiDa: 30, trangThai: "DANG_DIEN_RA" } });
  ids.khoa.push(khoa.id);
  const lopA = await prisma.lopHoc.create({ data: { khoaId: khoa.id, maLop: `LA_${uid()}`, ten: "Lớp A" } });
  const lopB = await prisma.lopHoc.create({ data: { khoaId: khoa.id, maLop: `LB_${uid()}`, ten: "Lớp B" } });
  const gvA = await prisma.giangVien.create({ data: { hoTen: `GV A ${uid()}` } });
  const gvB = await prisma.giangVien.create({ data: { hoTen: `GV B ${uid()}` } });
  ids.giangVien.push(gvA.id, gvB.id);
  await prisma.giangVienHocPhan.createMany({
    data: [
      { khoaId: khoa.id, hocPhanId: hp.id, lopId: lopA.id, giangVienId: gvA.id },
      { khoaId: khoa.id, hocPhanId: hp.id, lopId: lopB.id, giangVienId: gvB.id },
    ],
  });
  return { hp, bai, cau, yc, khoa, lopA, lopB, gvA, gvB };
}

async function taoHocVien(khoaId: string, lopId: string | null, trangThai: "CHINH_THUC" | "CHO_DUYET" = "CHINH_THUC") {
  const nd = await prisma.nguoiDung.create({ data: { tenDangNhap: `ql_${uid()}`, matKhauHash: "x", hoTen: "HV" } });
  ids.nguoiDung.push(nd.id);
  const hv = await prisma.hocVien.create({ data: { maHocVien: `HV_QL_${uid()}`, hoTen: `Học viên ${uid()}`, nguoiDungId: nd.id } });
  ids.hocVien.push(hv.id);
  await prisma.dangKyHoc.create({ data: { hocVienId: hv.id, khoaId, trangThai, lopId } });
  return { nd, hv };
}

const tep = { ten: "sp.pdf", loai: "application/pdf", noiDung: Buffer.from("x") };

describe("GD-04 quản lý bài làm trực tuyến: thống kê", () => {
  it("làm/chưa làm, nộp/chưa nộp, chấm theo giảng viên của lớp, đạt/chưa đạt và nội dung chưa đạt", async () => {
    const f = await taoKhoa();
    const a1 = await taoHocVien(f.khoa.id, f.lopA.id);
    const a2 = await taoHocVien(f.khoa.id, f.lopA.id);
    const b1 = await taoHocVien(f.khoa.id, f.lopB.id);

    // a1: làm đúng (10 điểm), nộp sản phẩm được chấm 8; a2: làm sai (0), nộp chưa chấm; b1: chưa làm gì
    let lan = await batDauLamBai(a1.nd.id, f.khoa.id, f.bai.id);
    await nopBaiTracNghiem(a1.nd.id, lan.lanLamId, { [f.cau.id]: [0] });
    lan = await batDauLamBai(a2.nd.id, f.khoa.id, f.bai.id);
    await nopBaiTracNghiem(a2.nd.id, lan.lanLamId, { [f.cau.id]: [1] });
    const bn1 = await nopSanPham(a1.nd.id, { khoaId: f.khoa.id, yeuCauId: f.yc.id, tep });
    await prisma.baiNopSanPham.update({ where: { id: bn1.id }, data: { diem: 8, nguoiCham: f.gvA.hoTen, chamLuc: new Date() } });
    await nopSanPham(a2.nd.id, { khoaId: f.khoa.id, yeuCauId: f.yc.id, tep });

    const bang = await bangDanhGiaKhoa(f.khoa.id);
    expect(bang.dsLop.map((l) => l.ten)).toEqual(["Lớp A", "Lớp B"]);
    const [tkTn, tkSp] = thongKeTheoBai(bang.dsMuc, bang.dsDong);
    expect([tkTn.daLam, tkTn.chuaLam, tkTn.dat, tkTn.chuaDat, tkTn.diemTB]).toEqual([2, 1, 1, 2, 5]);
    expect([tkSp.daLam, tkSp.chuaLam, tkSp.daCham, tkSp.chuaCham, tkSp.dat, tkSp.chuaDat]).toEqual([2, 1, 1, 1, 1, 2]);

    // theo lớp B: chưa ai làm/nộp
    const lopB = thongKeTheoBai(bang.dsMuc, bang.dsDong.filter((d) => d.lopId === f.lopB.id));
    expect(lopB.map((t) => [t.daLam, t.chuaLam])).toEqual([[0, 1], [0, 1]]);

    // chấm theo giảng viên phụ trách lớp: GV A có 2 bài nộp (1 đã chấm), GV B chưa có bài
    expect(thongKeChamTheoGiangVien(bang.dsMuc, bang.dsDong)).toEqual([{ giangVien: f.gvA.hoTen, daNop: 2, daCham: 1, chuaCham: 1 }]);

    const dong = (hvId: string) => bang.dsDong.find((d) => d.hocVienId === hvId)!;
    expect(dong(a1.hv.id).chuaDat).toEqual([]);
    expect(dong(a2.hv.id).chuaDat).toEqual(["Kiểm tra 1 0 < 5", "Chưa chấm: Thu hoạch"]);
    expect(dong(b1.hv.id).chuaDat).toEqual(["Chưa làm: Kiểm tra 1", "Chưa nộp: Thu hoạch"]);
    expect(dong(a1.hv.id).o[`TN-${f.bai.id}`]).toMatchObject({ trangThai: "DAT", diem: 10, soLan: 1, soLanToiDa: 1 });
  });
});

describe("GD-04 gia hạn riêng từng học viên", () => {
  it("thêm lượt làm trắc nghiệm: chỉ học viên được mở làm thêm được, lượt cộng dồn", async () => {
    const f = await taoKhoa();
    const a = await taoHocVien(f.khoa.id, f.lopA.id);
    const b = await taoHocVien(f.khoa.id, f.lopA.id);
    for (const hv of [a, b]) {
      const lan = await batDauLamBai(hv.nd.id, f.khoa.id, f.bai.id);
      await nopBaiTracNghiem(hv.nd.id, lan.lanLamId, { [f.cau.id]: [1] });
      await expect(batDauLamBai(hv.nd.id, f.khoa.id, f.bai.id)).rejects.toThrow();
    }

    const kq = await giaHanDanhGiaLo(f.khoa.id, [a.hv.id], { mucKey: `TN-${f.bai.id}`, soLanThem: 1, lyDo: "Mất mạng khi làm" }, NGUOI);
    expect(kq.thanhCong).toBe(1);
    const nd = await noiDungMuc(a.nd.id, f.khoa.id, `TN-${f.bai.id}`);
    expect(nd.loai === "TN" && [nd.soLanToiDa, nd.duocLam]).toEqual([2, true]);
    const lan2 = await batDauLamBai(a.nd.id, f.khoa.id, f.bai.id);
    await nopBaiTracNghiem(a.nd.id, lan2.lanLamId, { [f.cau.id]: [0] });
    await expect(batDauLamBai(a.nd.id, f.khoa.id, f.bai.id)).rejects.toThrow();
    await expect(batDauLamBai(b.nd.id, f.khoa.id, f.bai.id)).rejects.toThrow();

    // cấp lần 2 cộng dồn; nhật ký ghi lý do
    await giaHanDanhGiaLo(f.khoa.id, [a.hv.id], { mucKey: `TN-${f.bai.id}`, soLanThem: 2, lyDo: "Bổ sung" }, NGUOI);
    expect((await prisma.giaHanDanhGia.findFirstOrThrow({ where: { khoaId: f.khoa.id, hocVienId: a.hv.id } })).soLanThem).toBe(3);
    const nk = await prisma.nhatKyThaoTac.findFirst({ where: { hanhDong: "GIA_HAN_DANH_GIA", doiTuongId: a.hv.id }, orderBy: { thoiGian: "desc" } });
    expect(nk?.chiTiet).toContain("thêm 2 lượt. Lý do: Bổ sung");

    // thu hồi: trở lại số lần chung
    expect((await thuHoiGiaHanLo(f.khoa.id, [a.hv.id], `TN-${f.bai.id}`, NGUOI)).thanhCong).toBe(1);
    await expect(batDauLamBai(a.nd.id, f.khoa.id, f.bai.id)).rejects.toThrow();
  });

  it("đã qua ngày bế giảng: phải có hạn gia hạn; học viên được gia hạn làm/nộp được đến hết hạn, người khác bị chặn", async () => {
    const f = await taoKhoa();
    const a = await taoHocVien(f.khoa.id, null);
    const b = await taoHocVien(f.khoa.id, null);
    await prisma.khoa.update({ where: { id: f.khoa.id }, data: { thoiGianBeGiang: new Date(Date.now() - 3 * 86_400_000) } });

    await expect(giaHanDanhGiaLo(f.khoa.id, [a.hv.id], { mucKey: `SP-${f.yc.id}`, moNopLai: true, lyDo: "x" }, NGUOI)).rejects.toThrow(/qua ngày bế giảng/);
    const homNay = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
    await giaHanDanhGiaLo(f.khoa.id, [a.hv.id], { mucKey: `SP-${f.yc.id}`, hanDen: homNay, lyDo: "Ốm" }, NGUOI);

    await expect(nopSanPham(a.nd.id, { khoaId: f.khoa.id, yeuCauId: f.yc.id, tep })).resolves.toBeTruthy();
    await expect(nopSanPham(b.nd.id, { khoaId: f.khoa.id, yeuCauId: f.yc.id, tep })).rejects.toThrow(/quá ngày bế giảng/);
    // gia hạn chỉ cho bài sản phẩm, bài trắc nghiệm vẫn khóa
    await expect(batDauLamBai(a.nd.id, f.khoa.id, f.bai.id)).rejects.toThrow(/quá ngày bế giảng/);
  });

  it("mở nộp lại sản phẩm đã chấm: nộp lại 1 lần, xóa điểm cũ chờ chấm lại; dùng hết lượt mở thì không nộp lại được", async () => {
    const f = await taoKhoa();
    const a = await taoHocVien(f.khoa.id, f.lopA.id);
    const bn = await nopSanPham(a.nd.id, { khoaId: f.khoa.id, yeuCauId: f.yc.id, tep });
    await prisma.baiNopSanPham.update({ where: { id: bn.id }, data: { diem: 3, nguoiCham: "GV", chamLuc: new Date() } });
    await expect(nopSanPham(a.nd.id, { khoaId: f.khoa.id, yeuCauId: f.yc.id, tep })).rejects.toThrow();

    await giaHanDanhGiaLo(f.khoa.id, [a.hv.id], { mucKey: `SP-${f.yc.id}`, moNopLai: true, lyDo: "Cho làm lại" }, NGUOI);
    const lai = await nopSanPham(a.nd.id, { khoaId: f.khoa.id, yeuCauId: f.yc.id, tep });
    expect([lai.diem, lai.nguoiCham]).toEqual([null, null]);
    expect((await prisma.giaHanDanhGia.findFirstOrThrow({ where: { khoaId: f.khoa.id, hocVienId: a.hv.id } })).moNopLai).toBe(false);

    // chưa chấm lại thì vẫn thay tệp được như thường; chấm xong thì khóa lại
    await prisma.baiNopSanPham.update({ where: { id: bn.id }, data: { diem: 7 } });
    await expect(nopSanPham(a.nd.id, { khoaId: f.khoa.id, yeuCauId: f.yc.id, tep })).rejects.toThrow();
  });

  it("chặn: thiếu lý do, không chọn nội dung gia hạn, bài khác chương trình, kết quả đã phê duyệt; học viên chưa chính thức bị báo lại", async () => {
    const f = await taoKhoa();
    const khac = await taoKhoa();
    const a = await taoHocVien(f.khoa.id, null);
    const cho = await taoHocVien(f.khoa.id, null, "CHO_DUYET");

    await expect(giaHanDanhGiaLo(f.khoa.id, [a.hv.id], { mucKey: `TN-${f.bai.id}`, soLanThem: 1, lyDo: " " })).rejects.toThrow(/lý do/);
    await expect(giaHanDanhGiaLo(f.khoa.id, [a.hv.id], { mucKey: `TN-${f.bai.id}`, lyDo: "x" })).rejects.toThrow(/số lượt/);
    await expect(giaHanDanhGiaLo(f.khoa.id, [a.hv.id], { mucKey: `TN-${khac.bai.id}`, soLanThem: 1, lyDo: "x" })).rejects.toThrow(/không thuộc chương trình/);
    await expect(giaHanDanhGiaLo(f.khoa.id, [a.hv.id], { mucKey: `TN-${f.bai.id}`, soLanThem: 1, hanDen: "2020-01-01", lyDo: "x" })).rejects.toThrow(/trước hôm nay/);

    const kq = await giaHanDanhGiaLo(f.khoa.id, [a.hv.id, cho.hv.id], { mucKey: `TN-${f.bai.id}`, soLanThem: 1, lyDo: "x" });
    expect(kq.thanhCong).toBe(1);
    expect(kq.loi).toEqual([{ ten: cho.hv.hoTen, loi: "chỉ gia hạn cho học viên chính thức" }]);

    await prisma.ketQuaKhoa.create({ data: { khoaId: f.khoa.id, hocVienId: a.hv.id, daPheDuyet: true } });
    await expect(giaHanDanhGiaLo(f.khoa.id, [a.hv.id], { mucKey: `TN-${f.bai.id}`, soLanThem: 1, lyDo: "x" })).rejects.toThrow(/đã phê duyệt/);
  });
});
