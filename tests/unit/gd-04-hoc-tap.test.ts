import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { prisma } from "@/lib/db/prisma";
import { themHocLieu, taoBaiTracNghiem, themCauHoi, taoYeuCauSanPham } from "@/server/services/ct/ct-02-hoc-lieu";
import { batDauLamBai, nopBaiTracNghiem, nopSanPham } from "@/server/services/gd/gd-04-danh-gia";
import {
  cauTrucKhoaHoc,
  danhDauHoanThanh,
  noiDungMuc,
  dsThaoLuan,
  themThaoLuan,
  xoaThaoLuan,
  layGhiChep,
  luuGhiChep,
  khoaHocCuaToi,
  tachMucKey,
} from "@/server/services/gd/gd-04-hoc-tap";
import { DanhGiaKhongHopLeError, KhongDuocXemTaiLieuError } from "@/server/services/gd/loi-giang-day";

/** GD-04 bổ sung 29/09/2026: màn hình học - tiến độ, thảo luận, ghi chép. */

const uid = () => crypto.randomUUID().slice(0, 8);
const ids = { loaiHinh: [] as string[], chuongTrinh: [] as string[], khoa: [] as string[], hocVien: [] as string[], nguoiDung: [] as string[], giangVien: [] as string[] };
let thuMucTam = "";

beforeAll(async () => {
  thuMucTam = await mkdtemp(path.join(os.tmpdir(), "hoc-tap-"));
  process.env.HOC_LIEU_DIR = thuMucTam;
});

afterAll(async () => {
  const khoaId = { in: ids.khoa };
  await prisma.tienDoHocTap.deleteMany({ where: { khoaId } });
  await prisma.thaoLuanHocTap.deleteMany({ where: { khoaId } });
  await prisma.ghiChepHocTap.deleteMany({ where: { khoaId } });
  await prisma.lanLamTracNghiem.deleteMany({ where: { khoaId } });
  await prisma.baiNopSanPham.deleteMany({ where: { khoaId } });
  await prisma.ketQuaKhoa.deleteMany({ where: { khoaId } });
  await prisma.taiLieuHocTap.deleteMany({ where: { khoaId } });
  await prisma.dangKyHoc.deleteMany({ where: { khoaId } });
  await prisma.giangVienHocPhan.deleteMany({ where: { khoaId } });
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

async function taoNguoiDung(ten: string) {
  const nd = await prisma.nguoiDung.create({ data: { tenDangNhap: `ht_${uid()}`, matKhauHash: "x", hoTen: ten } });
  ids.nguoiDung.push(nd.id);
  return nd;
}

/** Chương trình 2 chuyên đề: CĐ1 có thông tin + video link + trắc nghiệm; CĐ2 có sản phẩm. 1 khóa đang học. */
async function taoKhoaHoc() {
  const lh = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH_HT_${uid()}`, ten: "LH" } });
  ids.loaiHinh.push(lh.id);
  const ct = await prisma.chuongTrinh.create({
    data: { maCT: `CT_HT_${uid()}`, ten: "CT học tập", loaiHinhBoiDuongId: lh.id, trangThai: "DA_BAN_HANH", phuongThucDangKy: "TRUC_TUYEN_NOP_GIAY" },
  });
  ids.chuongTrinh.push(ct.id);
  const cd1 = await prisma.hocPhan.create({ data: { chuongTrinhId: ct.id, ten: "Chuyên đề 1", soTiet: 10, thuTu: 1 } });
  const cd2 = await prisma.hocPhan.create({ data: { chuongTrinhId: ct.id, ten: "Chuyên đề 2", soTiet: 10, thuTu: 2 } });
  const info = await themHocLieu(cd1.id, { loai: "THONG_TIN", tieuDe: "Nhiệm vụ", noiDung: "Đọc tài liệu" });
  const video = await themHocLieu(cd1.id, { loai: "VIDEO", tieuDe: "Video", duongLink: "https://youtu.be/abcdefgh" });
  const bai = await taoBaiTracNghiem(cd1.id, { tieuDe: "Kiểm tra", tinhDiem: false });
  const cau = await themCauHoi(bai.id, { noiDung: "?", phuongAn: ["A", "B"], dapAnDung: [0] });
  const yc = await taoYeuCauSanPham(cd2.id, { tieuDe: "Sản phẩm", tinhDiem: false });
  const khoa = await prisma.khoa.create({ data: { maKhoa: `K_HT_${uid()}`, chuongTrinhId: ct.id, siSoToiDa: 30, trangThai: "DANG_DIEN_RA" } });
  ids.khoa.push(khoa.id);
  return { ct, cd1, cd2, info, video, bai, cau, yc, khoa };
}

async function taoHocVien(khoaId: string, trangThai: "CHINH_THUC" | "CHO_DUYET" = "CHINH_THUC") {
  const nd = await taoNguoiDung("Học viên");
  const hv = await prisma.hocVien.create({ data: { maHocVien: `HV_HT_${uid()}`, hoTen: `Học viên ${uid()}`, nguoiDungId: nd.id } });
  ids.hocVien.push(hv.id);
  await prisma.dangKyHoc.create({ data: { hocVienId: hv.id, khoaId, trangThai } });
  return { nd, hv };
}

describe("GD-04 màn hình học: cấu trúc khóa và tiến độ", () => {
  it("tách mucKey; cấu trúc theo chuyên đề; tiến độ tăng khi xem học liệu, nộp trắc nghiệm, nộp sản phẩm", async () => {
    expect(tachMucKey("HL-abc")).toEqual({ loai: "HL", id: "abc" });
    expect(tachMucKey("XX-abc")).toBeNull();

    const f = await taoKhoaHoc();
    const { nd } = await taoHocVien(f.khoa.id);

    let ct = await cauTrucKhoaHoc(nd.id, f.khoa.id);
    expect(ct.chuyenDe.map((c) => c.dsMuc.map((m) => m.nhanLoai))).toEqual([["THÔNG TIN", "VIDEO", "TRẮC NGHIỆM"], ["SẢN PHẨM"]]);
    expect([ct.tongMuc, ct.phanTramKhoa, ct.capNhatTienDo]).toEqual([4, 0, true]);

    expect(await danhDauHoanThanh(nd.id, f.khoa.id, `HL-${f.info.id}`)).toBe(true);
    await danhDauHoanThanh(nd.id, f.khoa.id, `HL-${f.info.id}`); // lặp lại không nhân đôi
    const lan = await batDauLamBai(nd.id, f.khoa.id, f.bai.id);
    await nopBaiTracNghiem(nd.id, lan.lanLamId, { [f.cau.id]: [1] });
    await nopSanPham(nd.id, { khoaId: f.khoa.id, yeuCauId: f.yc.id, tep: { ten: "sp.pdf", loai: "application/pdf", noiDung: Buffer.from("x") } });

    ct = await cauTrucKhoaHoc(nd.id, f.khoa.id);
    expect(ct.chuyenDe.map((c) => c.phanTram)).toEqual([67, 100]);
    expect([ct.soMucXong, ct.phanTramKhoa]).toEqual([3, 75]);
    expect((await khoaHocCuaToi(nd.id)).dsKhoa.find((k) => k.khoa.id === f.khoa.id)?.phanTram).toBe(75);
  });

  it("chặn: không phải học viên chính thức/GV của khóa; mục của chương trình khác; đánh dấu mục không phải học liệu; sau phê duyệt kết quả không cập nhật tiến độ", async () => {
    const f = await taoKhoaHoc();
    const khac = await taoKhoaHoc();
    const { nd, hv } = await taoHocVien(f.khoa.id);
    const choDuyet = await taoHocVien(f.khoa.id, "CHO_DUYET");
    const nguoiLa = await taoNguoiDung("Người lạ");

    await expect(cauTrucKhoaHoc(choDuyet.nd.id, f.khoa.id)).rejects.toThrow(KhongDuocXemTaiLieuError);
    await expect(cauTrucKhoaHoc(nguoiLa.id, f.khoa.id)).rejects.toThrow(KhongDuocXemTaiLieuError);
    await expect(noiDungMuc(nd.id, f.khoa.id, `HL-${khac.info.id}`)).rejects.toThrow(KhongDuocXemTaiLieuError);
    await expect(danhDauHoanThanh(nd.id, f.khoa.id, `TN-${f.bai.id}`)).rejects.toThrow(DanhGiaKhongHopLeError);

    await prisma.ketQuaKhoa.create({ data: { khoaId: f.khoa.id, hocVienId: hv.id, daPheDuyet: true } });
    expect(await danhDauHoanThanh(nd.id, f.khoa.id, `HL-${f.video.id}`)).toBe(false);
    const ct = await cauTrucKhoaHoc(nd.id, f.khoa.id);
    expect([ct.capNhatTienDo, ct.soMucXong]).toEqual([false, 0]);
  });

  it("giảng viên được phân công ở khóa xem được màn hình học nhưng không có tiến độ", async () => {
    const f = await taoKhoaHoc();
    const nd = await taoNguoiDung("GV");
    const gv = await prisma.giangVien.create({ data: { hoTen: "GV", nguoiDungId: nd.id } });
    ids.giangVien.push(gv.id);
    await prisma.giangVienHocPhan.create({ data: { khoaId: f.khoa.id, hocPhanId: f.cd1.id, giangVienId: gv.id } });
    const ct = await cauTrucKhoaHoc(nd.id, f.khoa.id);
    expect([ct.laHocVien, ct.vaiTro, ct.capNhatTienDo]).toEqual([false, "Giảng viên", false]);
    expect(await danhDauHoanThanh(nd.id, f.khoa.id, `HL-${f.info.id}`)).toBe(false);
  });
});

describe("GD-04 thảo luận và ghi chép", () => {
  it("thảo luận theo mục trong khóa; xem được thảo luận các khóa khác cùng bài giảng; chỉ người viết xóa được", async () => {
    const f = await taoKhoaHoc();
    const khoa2 = await prisma.khoa.create({ data: { maKhoa: `K_HT2_${uid()}`, chuongTrinhId: f.ct.id, siSoToiDa: 30, trangThai: "DANG_DIEN_RA" } });
    ids.khoa.push(khoa2.id);
    const a = await taoHocVien(f.khoa.id);
    const b = await taoHocVien(f.khoa.id);
    const c = await taoHocVien(khoa2.id);
    const muc = `HL-${f.info.id}`;

    const tlA = await themThaoLuan(a.nd.id, f.khoa.id, muc, "  Câu hỏi của A  ");
    await themThaoLuan(c.nd.id, khoa2.id, muc, "Ý kiến ở khóa 2");
    await expect(themThaoLuan(b.nd.id, f.khoa.id, muc, "   ")).rejects.toThrow(/trống/);

    const trongKhoa = await dsThaoLuan(b.nd.id, f.khoa.id, muc);
    expect(trongKhoa.map((t) => [t.noiDung, t.vaiTro, t.cuaToi])).toEqual([["Câu hỏi của A", "Học viên", false]]);
    const moiKhoa = await dsThaoLuan(b.nd.id, f.khoa.id, muc, true);
    expect(moiKhoa.map((t) => t.khoaKhac)).toEqual([null, khoa2.maKhoa]);

    await expect(xoaThaoLuan(b.nd.id, tlA.id)).rejects.toThrow(KhongDuocXemTaiLieuError);
    await xoaThaoLuan(a.nd.id, tlA.id);
    expect(await dsThaoLuan(a.nd.id, f.khoa.id, muc)).toEqual([]);
  });

  it("ghi chép riêng từng người theo mục; lưu rỗng thì xóa; người ngoài khóa bị chặn", async () => {
    const f = await taoKhoaHoc();
    const a = await taoHocVien(f.khoa.id);
    const b = await taoHocVien(f.khoa.id);
    const nguoiLa = await taoNguoiDung("Người lạ");
    const muc = `TN-${f.bai.id}`;

    await luuGhiChep(a.nd.id, f.khoa.id, muc, "Ghi chú của A");
    expect(await layGhiChep(a.nd.id, f.khoa.id, muc)).toBe("Ghi chú của A");
    expect(await layGhiChep(b.nd.id, f.khoa.id, muc)).toBe("");
    await luuGhiChep(a.nd.id, f.khoa.id, muc, "   ");
    expect(await layGhiChep(a.nd.id, f.khoa.id, muc)).toBe("");
    await expect(luuGhiChep(nguoiLa.id, f.khoa.id, muc, "x")).rejects.toThrow(KhongDuocXemTaiLieuError);
  });
});
