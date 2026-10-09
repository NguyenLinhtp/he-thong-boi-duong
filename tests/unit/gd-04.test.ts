import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtemp, rm, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { prisma } from "@/lib/db/prisma";
import {
  dangTaiLieu,
  xoaTaiLieu,
  hocLieuCuaGiangVien,
  hocLieuCuaHocVien,
  kiemTraQuyenXemTaiLieu,
  noiDungTaiLieu,
} from "@/server/services/gd/gd-04-hoc-lieu";
import {
  KhongDuocXemTaiLieuError,
  KhongPhuTrachHocPhanError,
  TaiLieuKhongHopLeError,
  KhoaKhongGiangDayError,
  KhongPhaiTaiKhoanGiangVienError,
} from "@/server/services/gd/loi-giang-day";

const uid = () => crypto.randomUUID().slice(0, 8);
const ids = { loaiHinh: [] as string[], chuongTrinh: [] as string[], khoa: [] as string[], hocVien: [] as string[], nguoiDung: [] as string[], giangVien: [] as string[] };
let thuMucTam = "";

beforeAll(async () => {
  thuMucTam = await mkdtemp(path.join(os.tmpdir(), "hoc-lieu-test-"));
  process.env.HOC_LIEU_DIR = thuMucTam;
});

afterAll(async () => {
  await prisma.taiLieuHocTap.deleteMany({ where: { khoaId: { in: ids.khoa } } });
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: ids.khoa } } });
  await prisma.giangVienHocPhan.deleteMany({ where: { khoaId: { in: ids.khoa } } });
  await prisma.lopHoc.deleteMany({ where: { khoaId: { in: ids.khoa } } });
  await prisma.khoa.deleteMany({ where: { id: { in: ids.khoa } } });
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
  const nd = await prisma.nguoiDung.create({ data: { tenDangNhap: `gd04_${ten}_${uid()}`, matKhauHash: "x", hoTen: ten } });
  ids.nguoiDung.push(nd.id);
  return nd;
}

async function taoGiangVien(ten: string) {
  const nd = await taoNguoiDung(ten);
  const gv = await prisma.giangVien.create({ data: { hoTen: ten, nguoiDungId: nd.id } });
  ids.giangVien.push(gv.id);
  return { nd, gv };
}

async function taoHocVien(khoaId: string, trangThai: "CHINH_THUC" | "HOAN_THANH" | "THOI_HOC" | "CHO_DUYET", lopId: string | null = null) {
  const nd = await taoNguoiDung("hv");
  const hv = await prisma.hocVien.create({ data: { maHocVien: `HV_GD04_${uid()}`, hoTen: "Học viên", nguoiDungId: nd.id } });
  ids.hocVien.push(hv.id);
  await prisma.dangKyHoc.create({ data: { hocVienId: hv.id, khoaId, trangThai, lopId } });
  return nd;
}

/** Khóa 2 lớp, học phần HP1: GV "A" phụ trách cấp khóa, GV "B" phụ trách riêng lớp L2. */
async function taoKhoa(phuongThuc: "TRUC_TUYEN_NOP_GIAY" | "CHI_DU_THI" = "TRUC_TUYEN_NOP_GIAY") {
  const lh = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH_GD04_${uid()}`, ten: "LH" } });
  ids.loaiHinh.push(lh.id);
  const ct = await prisma.chuongTrinh.create({
    data: { maCT: `CT_GD04_${uid()}`, ten: "CT", loaiHinhBoiDuongId: lh.id, trangThai: "DA_BAN_HANH", phuongThucDangKys: phuongThuc ? [phuongThuc] : [] },
  });
  ids.chuongTrinh.push(ct.id);
  const hp = await prisma.hocPhan.create({ data: { chuongTrinhId: ct.id, ten: "Học phần 1", soTiet: 10, thuTu: 1 } });
  const khoa = await prisma.khoa.create({ data: { maKhoa: `K_GD04_${uid()}`, chuongTrinhId: ct.id, siSoToiDa: 30, trangThai: "DANG_DIEN_RA" } });
  ids.khoa.push(khoa.id);
  const [l1, l2] = await Promise.all(
    ["L1", "L2"].map((ma) => prisma.lopHoc.create({ data: { khoaId: khoa.id, maLop: `${ma}_${uid()}`, ten: ma } })),
  );
  const a = await taoGiangVien("GV A");
  const b = await taoGiangVien("GV B");
  await prisma.giangVienHocPhan.create({ data: { khoaId: khoa.id, hocPhanId: hp.id, giangVienId: a.gv.id } });
  await prisma.giangVienHocPhan.create({ data: { khoaId: khoa.id, hocPhanId: hp.id, lopId: l2.id, giangVienId: b.gv.id } });
  return { khoa, hp, l1, l2, a, b };
}

const tepPdf = (noiDung = "%PDF-1.4 bai giang") => ({ ten: "Bai giang 1.pdf", loai: "application/pdf", noiDung: Buffer.from(noiDung) });

describe("GD-04 quản lý tài liệu học tập / học liệu số", () => {
  it("giảng viên phụ trách đăng tệp cho cả khóa: lưu ngoài public với tên ngẫu nhiên, ghi nhật ký; đăng link", async () => {
    const f = await taoKhoa();

    const tl = await dangTaiLieu(f.a.nd.id, { khoaId: f.khoa.id, hocPhanId: f.hp.id, tieuDe: " Bài giảng 1 ", tep: tepPdf() });

    expect([tl.tieuDe, tl.tenFile, tl.loaiFile, tl.kichThuoc, tl.lopId]).toEqual(["Bài giảng 1", "Bai giang 1.pdf", "application/pdf", 18, null]);
    expect(tl.khoaLuuTru).toMatch(/^\d{4}\/[0-9a-f-]{36}\.pdf$/);
    expect((await noiDungTaiLieu(tl)).toString()).toBe("%PDF-1.4 bai giang");
    expect(await prisma.nhatKyThaoTac.count({ where: { hanhDong: "DANG_TAI_LIEU_HOC_TAP", doiTuongId: tl.id } })).toBe(1);

    const link = await dangTaiLieu(f.a.nd.id, { khoaId: f.khoa.id, hocPhanId: f.hp.id, tieuDe: "Video", duongLink: "https://youtu.be/abc" });
    expect([link.duongLink, link.khoaLuuTru]).toEqual(["https://youtu.be/abc", null]);
    expect((await hocLieuCuaGiangVien(f.a.nd.id)).dsTaiLieu.map((t) => t.id).sort()).toEqual([tl.id, link.id].sort());
  });

  it("chặn: không phụ trách học phần/lớp, không phải giảng viên, khóa Phương thức 3, định dạng/kích thước/link sai, thiếu hoặc thừa nội dung", async () => {
    const f = await taoKhoa();
    // GV B chỉ phụ trách lớp L2, không được đăng cho cả khóa hay lớp L1
    await expect(dangTaiLieu(f.b.nd.id, { khoaId: f.khoa.id, hocPhanId: f.hp.id, tieuDe: "X", tep: tepPdf() })).rejects.toThrow(KhongPhuTrachHocPhanError);
    await expect(
      dangTaiLieu(f.b.nd.id, { khoaId: f.khoa.id, hocPhanId: f.hp.id, lopId: f.l1.id, tieuDe: "X", tep: tepPdf() }),
    ).rejects.toThrow(KhongPhuTrachHocPhanError);
    // GV A không đăng được cho lớp L2 (lớp L2 có phân công riêng cho B)
    await expect(
      dangTaiLieu(f.a.nd.id, { khoaId: f.khoa.id, hocPhanId: f.hp.id, lopId: f.l2.id, tieuDe: "X", tep: tepPdf() }),
    ).rejects.toThrow(KhongPhuTrachHocPhanError);
    const khongPhaiGv = await taoNguoiDung("x");
    await expect(dangTaiLieu(khongPhaiGv.id, { khoaId: f.khoa.id, hocPhanId: f.hp.id, tieuDe: "X", tep: tepPdf() })).rejects.toThrow(
      KhongPhaiTaiKhoanGiangVienError,
    );

    const base = { khoaId: f.khoa.id, hocPhanId: f.hp.id, tieuDe: "X" };
    await expect(dangTaiLieu(f.a.nd.id, { ...base, tep: { ten: "virus.exe", loai: "", noiDung: Buffer.from("MZ") } })).rejects.toThrow(
      TaiLieuKhongHopLeError,
    );
    await prisma.thamSoHeThong.upsert({ where: { ma: "GD_HOC_LIEU_TOI_DA_MB" }, update: { giaTri: "0.00001" }, create: { ma: "GD_HOC_LIEU_TOI_DA_MB", giaTri: "0.00001" } });
    try {
      await expect(dangTaiLieu(f.a.nd.id, { ...base, tep: tepPdf("x".repeat(100)) })).rejects.toThrow(/vượt/);
    } finally {
      await prisma.thamSoHeThong.delete({ where: { ma: "GD_HOC_LIEU_TOI_DA_MB" } });
    }
    await expect(dangTaiLieu(f.a.nd.id, { ...base, duongLink: "javascript:alert(1)" })).rejects.toThrow(TaiLieuKhongHopLeError);
    await expect(dangTaiLieu(f.a.nd.id, { ...base })).rejects.toThrow(TaiLieuKhongHopLeError);
    await expect(dangTaiLieu(f.a.nd.id, { ...base, tep: tepPdf(), duongLink: "https://a.b" })).rejects.toThrow(TaiLieuKhongHopLeError);
    await expect(dangTaiLieu(f.a.nd.id, { ...base, tieuDe: " ", tep: tepPdf() })).rejects.toThrow(TaiLieuKhongHopLeError);

    const pt3 = await taoKhoa("CHI_DU_THI");
    await expect(dangTaiLieu(pt3.a.nd.id, { khoaId: pt3.khoa.id, hocPhanId: pt3.hp.id, tieuDe: "X", tep: tepPdf() })).rejects.toThrow(
      KhoaKhongGiangDayError,
    );
    expect(await prisma.taiLieuHocTap.count({ where: { khoaId: { in: [f.khoa.id, pt3.khoa.id] } } })).toBe(0);
  });

  it("chỉ học viên trong khóa (đúng lớp nếu tài liệu riêng lớp) mới xem/tải được", async () => {
    const f = await taoKhoa();
    const chung = await dangTaiLieu(f.a.nd.id, { khoaId: f.khoa.id, hocPhanId: f.hp.id, tieuDe: "Chung", tep: tepPdf() });
    const riengL2 = await dangTaiLieu(f.b.nd.id, { khoaId: f.khoa.id, hocPhanId: f.hp.id, lopId: f.l2.id, tieuDe: "Riêng L2", tep: tepPdf() });

    const hvL1 = await taoHocVien(f.khoa.id, "CHINH_THUC", f.l1.id);
    const hvL2 = await taoHocVien(f.khoa.id, "HOAN_THANH", f.l2.id);
    const hvThoiHoc = await taoHocVien(f.khoa.id, "THOI_HOC", f.l2.id);
    const hvChoDuyet = await taoHocVien(f.khoa.id, "CHO_DUYET");
    const f2 = await taoKhoa();
    const hvKhoaKhac = await taoHocVien(f2.khoa.id, "CHINH_THUC");

    expect((await kiemTraQuyenXemTaiLieu(hvL1.id, chung.id)).id).toBe(chung.id);
    await expect(kiemTraQuyenXemTaiLieu(hvL1.id, riengL2.id)).rejects.toThrow(KhongDuocXemTaiLieuError);
    expect((await kiemTraQuyenXemTaiLieu(hvL2.id, riengL2.id)).id).toBe(riengL2.id);
    for (const khongDuoc of [hvThoiHoc, hvChoDuyet, hvKhoaKhac]) {
      await expect(kiemTraQuyenXemTaiLieu(khongDuoc.id, chung.id)).rejects.toThrow(KhongDuocXemTaiLieuError);
    }
    // giảng viên phụ trách học phần xem được; giảng viên khóa khác thì không
    expect((await kiemTraQuyenXemTaiLieu(f.a.nd.id, chung.id)).id).toBe(chung.id);
    expect((await kiemTraQuyenXemTaiLieu(f.b.nd.id, riengL2.id)).id).toBe(riengL2.id);
    await expect(kiemTraQuyenXemTaiLieu(f.a.nd.id, riengL2.id)).rejects.toThrow(KhongDuocXemTaiLieuError);
    await expect(kiemTraQuyenXemTaiLieu(f2.a.nd.id, chung.id)).rejects.toThrow(KhongDuocXemTaiLieuError);

    const { dsKhoa } = await hocLieuCuaHocVien(hvL1.id);
    expect(dsKhoa.flatMap((k) => k.dsTaiLieu.map((t) => t.id))).toEqual([chung.id]);
    expect((await hocLieuCuaHocVien(hvL2.id)).dsKhoa[0].dsTaiLieu.map((t) => t.id).sort()).toEqual([chung.id, riengL2.id].sort());
    expect((await hocLieuCuaHocVien(hvThoiHoc.id)).dsKhoa).toEqual([]);
  });

  it("chỉ người đăng xóa được; xóa luôn tệp lưu trữ; không xóa được lớp còn tài liệu", async () => {
    const f = await taoKhoa();
    const tl = await dangTaiLieu(f.b.nd.id, { khoaId: f.khoa.id, hocPhanId: f.hp.id, lopId: f.l2.id, tieuDe: "X", tep: tepPdf() });
    const { xoaLop } = await import("@/server/services/kh/kh-07-lop-hoc");
    await expect(xoaLop(f.l2.id)).rejects.toThrow();

    await expect(xoaTaiLieu(f.a.nd.id, tl.id)).rejects.toThrow(KhongDuocXemTaiLieuError);
    const thuMucNam = path.join(thuMucTam, tl.khoaLuuTru!.split("/")[0]);
    expect(await readdir(thuMucNam)).toContain(path.basename(tl.khoaLuuTru!));

    await xoaTaiLieu(f.b.nd.id, tl.id);
    expect(await prisma.taiLieuHocTap.findUnique({ where: { id: tl.id } })).toBeNull();
    expect(await readdir(thuMucNam)).not.toContain(path.basename(tl.khoaLuuTru!));
  });
});
