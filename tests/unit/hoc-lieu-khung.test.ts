import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/db/prisma";
import {
  themHocLieu,
  xoaHocLieu,
  doiThuTuHocLieu,
  taoBaiTracNghiem,
  capNhatBaiTracNghiem,
  xoaBaiTracNghiem,
  themCauHoi,
  xoaCauHoi,
  nhapCauHoiTuExcel,
  mauExcelCauHoi,
  taoYeuCauSanPham,
  xoaYeuCauSanPham,
  hocLieuKhungChuongTrinh,
} from "@/server/services/ct/ct-02-hoc-lieu";
import { batDauLamBai, nopBaiTracNghiem, nopSanPham, hocTapCuaHocVien, chamCau } from "@/server/services/gd/gd-04-danh-gia";
import { chamSanPham, baiNopCuaGiangVien, diemDanhGiaTrucTuyen } from "@/server/services/kq/kq-01-danh-gia-truc-tuyen";
import {
  BaiDaCoNguoiLamError,
  ChuongTrinhDaNgungError,
  DaChamKhongNopLaiError,
  DanhGiaKhongHopLeError,
  HetGioLamBaiError,
  HetLuotLamBaiError,
  KhongDuocLamDanhGiaError,
  KhongPhuTrachHocPhanError,
  TaiLieuKhongHopLeError,
  YeuCauDaCoBaiNopError,
} from "@/server/services/gd/loi-giang-day";

/** CT-02 / GD-04 / KQ-01 bổ sung 28/09/2026: học liệu khung, trắc nghiệm, sản phẩm cuối khóa. */

const uid = () => crypto.randomUUID().slice(0, 8);
const CB = { nguoiThucHienTen: "Cán bộ test học liệu" };
const ids = { loaiHinh: [] as string[], chuongTrinh: [] as string[], khoa: [] as string[], hocVien: [] as string[], nguoiDung: [] as string[], giangVien: [] as string[] };
let thuMucTam = "";

beforeAll(async () => {
  thuMucTam = await mkdtemp(path.join(os.tmpdir(), "hoc-lieu-khung-"));
  process.env.HOC_LIEU_DIR = thuMucTam;
});

afterAll(async () => {
  const khoaId = { in: ids.khoa };
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

async function taoNguoiDung(ten: string) {
  const nd = await prisma.nguoiDung.create({ data: { tenDangNhap: `hlk_${uid()}`, matKhauHash: "x", hoTen: ten } });
  ids.nguoiDung.push(nd.id);
  return nd;
}

async function taoChuongTrinh(phuongThuc: "TRUC_TUYEN_NOP_GIAY" | "CHI_DU_THI" = "TRUC_TUYEN_NOP_GIAY") {
  const lh = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH_HLK_${uid()}`, ten: "LH" } });
  ids.loaiHinh.push(lh.id);
  const ct = await prisma.chuongTrinh.create({
    data: { maCT: `CT_HLK_${uid()}`, ten: "CT học liệu", loaiHinhBoiDuongId: lh.id, trangThai: "DA_BAN_HANH", phuongThucDangKy: phuongThuc },
  });
  ids.chuongTrinh.push(ct.id);
  const hp = await prisma.hocPhan.create({ data: { chuongTrinhId: ct.id, ten: "Chuyên đề 1", soTiet: 10, thuTu: 1 } });
  return { ct, hp };
}

async function taoKhoa(ctId: string, trangThai: "DANG_DIEN_RA" | "DANG_TUYEN_SINH" = "DANG_DIEN_RA") {
  const khoa = await prisma.khoa.create({ data: { maKhoa: `K_HLK_${uid()}`, chuongTrinhId: ctId, siSoToiDa: 30, trangThai } });
  ids.khoa.push(khoa.id);
  return khoa;
}

async function taoHocVien(khoaId: string, trangThai: "CHINH_THUC" | "CHO_DUYET" = "CHINH_THUC", lopId: string | null = null) {
  const nd = await taoNguoiDung("Học viên");
  const hv = await prisma.hocVien.create({ data: { maHocVien: `HV_HLK_${uid()}`, hoTen: `Học viên ${uid()}`, nguoiDungId: nd.id } });
  ids.hocVien.push(hv.id);
  await prisma.dangKyHoc.create({ data: { hocVienId: hv.id, khoaId, trangThai, lopId } });
  return { nd, hv };
}

async function taoGiangVien(khoaId: string, hocPhanId: string, lopId: string | null = null) {
  const nd = await taoNguoiDung("Giảng viên");
  const gv = await prisma.giangVien.create({ data: { hoTen: `GV ${uid()}`, nguoiDungId: nd.id } });
  ids.giangVien.push(gv.id);
  await prisma.giangVienHocPhan.create({ data: { khoaId, hocPhanId, giangVienId: gv.id, lopId } });
  return { nd, gv };
}

const tep = (ten: string, noiDung = "noi dung") => ({ ten, loai: "application/octet-stream", noiDung: Buffer.from(noiDung) });
const CH = (dung: number[] = [0]) => ({ noiDung: "Câu hỏi?", phuongAn: ["A", "B", "C"], dapAnDung: dung });

describe("CT-02 học liệu khung theo học phần", () => {
  it("thêm đủ 4 loại học liệu (tệp/link/nội dung), thứ tự tăng dần, đổi thứ tự, xóa kèm tệp; ghi nhật ký", async () => {
    const { ct, hp } = await taoChuongTrinh();
    const taiLieu = await themHocLieu(hp.id, { loai: "TAI_LIEU", tieuDe: " Giáo trình ", tep: tep("Giao trinh.docx") }, CB);
    const slide = await themHocLieu(hp.id, { loai: "SLIDE", tieuDe: "Slide", tep: tep("bai1.pptx") }, CB);
    const info = await themHocLieu(hp.id, { loai: "THONG_TIN", tieuDe: "Lưu ý", noiDung: "Đọc trước chuyên đề" }, CB);
    const video = await themHocLieu(hp.id, { loai: "VIDEO", tieuDe: "Video", duongLink: "https://youtu.be/abc" }, CB);

    expect([taiLieu.tieuDe, taiLieu.thuTu, slide.thuTu, info.thuTu, video.thuTu]).toEqual(["Giáo trình", 1, 2, 3, 4]);
    expect(taiLieu.khoaLuuTru).toMatch(/\.docx$/);
    expect(await prisma.nhatKyThaoTac.count({ where: { hanhDong: "THEM_HOC_LIEU_CHUONG_TRINH", doiTuongId: taiLieu.id } })).toBe(1);

    await doiThuTuHocLieu(video.id, "len");
    const khung = await hocLieuKhungChuongTrinh(ct.id);
    expect(khung[0].hocLieus.map((h) => h.id)).toEqual([taiLieu.id, slide.id, video.id, info.id]);

    await xoaHocLieu(taiLieu.id, CB);
    expect(await prisma.hocLieuHocPhan.findUnique({ where: { id: taiLieu.id } })).toBeNull();
  });

  it("chặn: sai định dạng theo loại, thiếu/thừa nội dung, link sai, chương trình đã ngừng hiệu lực", async () => {
    const { ct, hp } = await taoChuongTrinh();
    await expect(themHocLieu(hp.id, { loai: "SLIDE", tieuDe: "x", tep: tep("a.docx") })).rejects.toThrow(TaiLieuKhongHopLeError);
    await expect(themHocLieu(hp.id, { loai: "VIDEO", tieuDe: "x", tep: tep("a.exe") })).rejects.toThrow(TaiLieuKhongHopLeError);
    await expect(themHocLieu(hp.id, { loai: "TAI_LIEU", tieuDe: "x" })).rejects.toThrow(/cần tệp tải lên hoặc đường link/);
    await expect(themHocLieu(hp.id, { loai: "TAI_LIEU", tieuDe: "x", noiDung: "chỉ văn bản" })).rejects.toThrow(TaiLieuKhongHopLeError);
    await expect(themHocLieu(hp.id, { loai: "VIDEO", tieuDe: "x", tep: tep("a.mp4"), duongLink: "https://x.vn" })).rejects.toThrow(/chọn 1 trong 2/);
    await expect(themHocLieu(hp.id, { loai: "VIDEO", tieuDe: "x", duongLink: "javascript:alert(1)" })).rejects.toThrow(/http/);
    await expect(themHocLieu(hp.id, { loai: "TAI_LIEU", tieuDe: " ", tep: tep("a.pdf") })).rejects.toThrow(/thiếu tiêu đề/);

    await prisma.chuongTrinh.update({ where: { id: ct.id }, data: { trangThai: "NGUNG_HIEU_LUC" } });
    await expect(themHocLieu(hp.id, { loai: "TAI_LIEU", tieuDe: "x", tep: tep("a.pdf") })).rejects.toThrow(ChuongTrinhDaNgungError);
    await expect(taoBaiTracNghiem(hp.id, { tieuDe: "x", tinhDiem: false })).rejects.toThrow(ChuongTrinhDaNgungError);
  });

  it("trắc nghiệm: soạn câu hỏi (1 hoặc nhiều đáp án), nhập Excel theo mẫu; chặn câu hỏi/hệ số sai và dòng Excel lỗi (không nhập dòng nào)", async () => {
    const { hp } = await taoChuongTrinh();
    const bai = await taoBaiTracNghiem(hp.id, { tieuDe: "Kiểm tra nhanh", tinhDiem: true, heSo: 2, soLanToiDa: 2 }, CB);
    expect([Number(bai.heSo), bai.soLanToiDa]).toEqual([2, 2]);

    const c = await themCauHoi(bai.id, { noiDung: "Chọn đúng", phuongAn: ["A", "B", "C", "", ""], dapAnDung: [2, 0, 0] });
    expect([c.phuongAn, c.dapAnDung]).toEqual([["A", "B", "C"], [0, 2]]);
    await expect(themCauHoi(bai.id, { noiDung: "x", phuongAn: ["A"], dapAnDung: [0] })).rejects.toThrow(/ít nhất 2 phương án/);
    await expect(themCauHoi(bai.id, { noiDung: "x", phuongAn: ["A", "B"], dapAnDung: [] })).rejects.toThrow(/chưa chọn đáp án/);
    await expect(themCauHoi(bai.id, { noiDung: "x", phuongAn: ["A", "B"], dapAnDung: [3] })).rejects.toThrow(DanhGiaKhongHopLeError);
    await expect(taoBaiTracNghiem(hp.id, { tieuDe: "x", tinhDiem: true, heSo: 0 })).rejects.toThrow(/hệ số/);
    await expect(taoBaiTracNghiem(hp.id, { tieuDe: "x", tinhDiem: false, soLanToiDa: 0 })).rejects.toThrow(/số nguyên dương/);

    expect(await nhapCauHoiTuExcel(bai.id, await mauExcelCauHoi(), CB)).toBe(2);
    const cauHois = await prisma.cauHoiTracNghiem.findMany({ where: { baiId: bai.id }, orderBy: { thuTu: "asc" } });
    expect(cauHois.map((x) => x.dapAnDung)).toEqual([[0, 2], [0], [0, 1, 3]]);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("x");
    ws.addRow(["Câu hỏi", "A", "B", "C", "D", "E", "F", "Đáp án"]);
    ws.addRow(["Hợp lệ", "1", "2", "", "", "", "", "A"]);
    ws.addRow(["Sai đáp án", "1", "2", "", "", "", "", "D"]);
    await expect(nhapCauHoiTuExcel(bai.id, Buffer.from(await wb.xlsx.writeBuffer()))).rejects.toThrow(/Dòng 3/);
    expect(await prisma.cauHoiTracNghiem.count({ where: { baiId: bai.id } })).toBe(3);
  });

  it("yêu cầu sản phẩm: tạo/xóa khi chưa có bài nộp", async () => {
    const { hp } = await taoChuongTrinh();
    const yc = await taoYeuCauSanPham(hp.id, { tieuDe: "Kế hoạch bài dạy", tinhDiem: true, heSo: 3 }, CB);
    expect(Number(yc.heSo)).toBe(3);
    await xoaYeuCauSanPham(yc.id, CB);
    expect(await prisma.yeuCauSanPham.count({ where: { id: yc.id } })).toBe(0);
  });
});

describe("GD-04 học viên làm trắc nghiệm, nộp sản phẩm", () => {
  it("chấm câu theo tập đáp án", () => {
    expect(chamCau([0, 2], [2, 0])).toBe(true);
    expect(chamCau([0, 2], [0])).toBe(false);
    expect(chamCau([1], [1, 1])).toBe(true);
  });

  it("làm bài: câu hỏi không lộ đáp án, chấm tự động thang 10, điểm = lần cao nhất; hết lượt thì chặn; không sửa câu hỏi/xóa bài đã có người làm", async () => {
    const { ct, hp } = await taoChuongTrinh();
    const khoa = await taoKhoa(ct.id);
    const { nd } = await taoHocVien(khoa.id);
    const bai = await taoBaiTracNghiem(hp.id, { tieuDe: "Bài 1", tinhDiem: true, soLanToiDa: 2 });
    const c1 = await themCauHoi(bai.id, CH([0]));
    const c2 = await themCauHoi(bai.id, CH([1, 2]));

    const lan1 = await batDauLamBai(nd.id, khoa.id, bai.id);
    expect(JSON.stringify(lan1.cauHois)).not.toContain("dapAnDung");
    expect(lan1.cauHois.map((c) => c.nhieuDapAn)).toEqual([false, true]);
    // mở lại khi đang làm dở -> cùng lần làm, không tốn lượt
    expect((await batDauLamBai(nd.id, khoa.id, bai.id)).lanLamId).toBe(lan1.lanLamId);
    expect(await nopBaiTracNghiem(nd.id, lan1.lanLamId, { [c1.id]: [0], [c2.id]: [1] })).toEqual({ soCauDung: 1, tongSoCau: 2, diem: 5 });
    await expect(nopBaiTracNghiem(nd.id, lan1.lanLamId, {})).rejects.toThrow(/đã nộp/);

    const lan2 = await batDauLamBai(nd.id, khoa.id, bai.id);
    await nopBaiTracNghiem(nd.id, lan2.lanLamId, { [c1.id]: [1] });
    await expect(batDauLamBai(nd.id, khoa.id, bai.id)).rejects.toThrow(HetLuotLamBaiError);

    const hocTap = await hocTapCuaHocVien(nd.id);
    const baiHv = hocTap.dsKhoa[0].dsHocPhan[0].baiTracNghiems[0];
    expect([baiHv.soLanDaLam, baiHv.diemCaoNhat]).toEqual([2, 5]);

    await expect(themCauHoi(bai.id, CH())).rejects.toThrow(BaiDaCoNguoiLamError);
    await expect(xoaCauHoi(c1.id)).rejects.toThrow(BaiDaCoNguoiLamError);
    await expect(xoaBaiTracNghiem(bai.id)).rejects.toThrow(BaiDaCoNguoiLamError);
    // cấu hình tính điểm vẫn đổi được
    expect(Number((await capNhatBaiTracNghiem(bai.id, { tieuDe: "Bài 1", tinhDiem: true, heSo: 1.5 })).heSo)).toBe(1.5);
  });

  it("chặn: quá thời gian làm bài, không phải học viên chính thức, khóa chưa vào học, khóa Phương thức 3, kết quả đã phê duyệt, học phần khác chương trình", async () => {
    const { ct, hp } = await taoChuongTrinh();
    const khoa = await taoKhoa(ct.id);
    const { nd, hv } = await taoHocVien(khoa.id);
    const bai = await taoBaiTracNghiem(hp.id, { tieuDe: "Có giờ", tinhDiem: false, thoiGianPhut: 5 });
    await themCauHoi(bai.id, CH());

    const lan = await batDauLamBai(nd.id, khoa.id, bai.id);
    await prisma.lanLamTracNghiem.update({ where: { id: lan.lanLamId }, data: { batDauLuc: new Date(Date.now() - 10 * 60_000) } });
    await expect(nopBaiTracNghiem(nd.id, lan.lanLamId, {})).rejects.toThrow(HetGioLamBaiError);

    const choDuyet = await taoHocVien(khoa.id, "CHO_DUYET");
    await expect(batDauLamBai(choDuyet.nd.id, khoa.id, bai.id)).rejects.toThrow(/chính thức/);

    const khoaChuaHoc = await taoKhoa(ct.id, "DANG_TUYEN_SINH");
    const hvChuaHoc = await taoHocVien(khoaChuaHoc.id);
    await expect(batDauLamBai(hvChuaHoc.nd.id, khoaChuaHoc.id, bai.id)).rejects.toThrow(/chưa vào giai đoạn học/);

    const pt3 = await taoChuongTrinh("CHI_DU_THI");
    const khoaPt3 = await taoKhoa(pt3.ct.id);
    const hvPt3 = await taoHocVien(khoaPt3.id);
    const baiPt3 = await taoBaiTracNghiem(pt3.hp.id, { tieuDe: "x", tinhDiem: false });
    await themCauHoi(baiPt3.id, CH());
    await expect(batDauLamBai(hvPt3.nd.id, khoaPt3.id, baiPt3.id)).rejects.toThrow(/Phương thức 3/);

    const khac = await taoChuongTrinh();
    const baiKhac = await taoBaiTracNghiem(khac.hp.id, { tieuDe: "x", tinhDiem: false });
    await themCauHoi(baiKhac.id, CH());
    await expect(batDauLamBai(nd.id, khoa.id, baiKhac.id)).rejects.toThrow(/không thuộc chương trình/);

    await prisma.ketQuaKhoa.create({ data: { khoaId: khoa.id, hocVienId: hv.id, daPheDuyet: true } });
    await expect(batDauLamBai(nd.id, khoa.id, bai.id)).rejects.toThrow(/đã phê duyệt/);
  });

  it("nộp sản phẩm, nộp lại khi chưa chấm (thay tệp); giảng viên phụ trách chấm; chặn nộp lại sau khi chấm, xóa yêu cầu đã có bài nộp, GV không phụ trách chấm, điểm ngoài 0-10", async () => {
    const { ct, hp } = await taoChuongTrinh();
    const khoa = await taoKhoa(ct.id);
    const { nd, hv } = await taoHocVien(khoa.id);
    const gv = await taoGiangVien(khoa.id, hp.id);
    const nguoiKhac = await taoNguoiDung("GV khác");
    const gvKhac = await prisma.giangVien.create({ data: { hoTen: "GV khác", nguoiDungId: nguoiKhac.id } });
    ids.giangVien.push(gvKhac.id);
    const yc = await taoYeuCauSanPham(hp.id, { tieuDe: "Sản phẩm cuối khóa", tinhDiem: true });

    await expect(nopSanPham(nd.id, { khoaId: khoa.id, yeuCauId: yc.id, tep: tep("virus.exe") })).rejects.toThrow(TaiLieuKhongHopLeError);
    const lan1 = await nopSanPham(nd.id, { khoaId: khoa.id, yeuCauId: yc.id, tep: tep("ke-hoach.docx", "v1") });
    const lan2 = await nopSanPham(nd.id, { khoaId: khoa.id, yeuCauId: yc.id, tep: tep("ke-hoach-v2.docx", "v2") });
    expect(lan2.id).toBe(lan1.id);
    expect(lan2.tenFile).toBe("ke-hoach-v2.docx");
    await expect(xoaYeuCauSanPham(yc.id)).rejects.toThrow(YeuCauDaCoBaiNopError);

    expect((await baiNopCuaGiangVien(gv.nd.id)).map((b) => b.id)).toEqual([lan1.id]);
    await expect(chamSanPham(nguoiKhac.id, lan1.id, { diem: 8 })).rejects.toThrow(KhongPhuTrachHocPhanError);
    await expect(chamSanPham(gv.nd.id, lan1.id, { diem: 11 })).rejects.toThrow(/0-10/);
    const cham = await chamSanPham(gv.nd.id, lan1.id, { diem: 8.5, nhanXet: "Tốt" });
    expect([Number(cham.diem), cham.nguoiCham]).toEqual([8.5, gv.gv.hoTen]);
    expect(await prisma.nhatKyThaoTac.count({ where: { hanhDong: "CHAM_SAN_PHAM", doiTuongId: lan1.id } })).toBe(1);

    await expect(nopSanPham(nd.id, { khoaId: khoa.id, yeuCauId: yc.id, tep: tep("v3.docx") })).rejects.toThrow(DaChamKhongNopLaiError);

    await prisma.ketQuaKhoa.create({ data: { khoaId: khoa.id, hocVienId: hv.id, daPheDuyet: true } });
    await expect(chamSanPham(gv.nd.id, lan1.id, { diem: 9 })).rejects.toThrow(KhongDuocLamDanhGiaError);
  });
});

describe("KQ-01 điểm đánh giá trực tuyến có hệ số", () => {
  it("trung bình có hệ số các mục tính điểm; bài chỉ tự kiểm tra không tính; chưa làm = 0; sản phẩm nộp chưa chấm -> chưa đủ", async () => {
    const { ct, hp } = await taoChuongTrinh();
    const khoa = await taoKhoa(ct.id);
    const a = await taoHocVien(khoa.id);
    const b = await taoHocVien(khoa.id);
    const gv = await taoGiangVien(khoa.id, hp.id);

    const tuKiemTra = await taoBaiTracNghiem(hp.id, { tieuDe: "Tự kiểm tra", tinhDiem: false });
    const baiTinh = await taoBaiTracNghiem(hp.id, { tieuDe: "Bài tính điểm", tinhDiem: true, heSo: 1 });
    const yc = await taoYeuCauSanPham(hp.id, { tieuDe: "Sản phẩm", tinhDiem: true, heSo: 3 });
    for (const bai of [tuKiemTra, baiTinh]) await themCauHoi(bai.id, CH([0]));
    const cauTinh = await prisma.cauHoiTracNghiem.findFirstOrThrow({ where: { baiId: baiTinh.id } });

    // A: bài tính điểm 10, sản phẩm 6 -> (10*1 + 6*3)/4 = 7
    const lanA = await batDauLamBai(a.nd.id, khoa.id, baiTinh.id);
    await nopBaiTracNghiem(a.nd.id, lanA.lanLamId, { [cauTinh.id]: [0] });
    const nopA = await nopSanPham(a.nd.id, { khoaId: khoa.id, yeuCauId: yc.id, tep: tep("a.pdf") });
    // B: chưa làm trắc nghiệm, đã nộp sản phẩm nhưng chưa chấm
    await nopSanPham(b.nd.id, { khoaId: khoa.id, yeuCauId: yc.id, tep: tep("b.pdf") });

    let ds = await diemDanhGiaTrucTuyen(khoa.id, hp.id);
    expect(ds.find((d) => d.hocVienId === a.hv.id)).toMatchObject({ diem: null, chuaDu: true });
    await chamSanPham(gv.nd.id, nopA.id, { diem: 6 });

    ds = await diemDanhGiaTrucTuyen(khoa.id, hp.id);
    const dA = ds.find((d) => d.hocVienId === a.hv.id)!;
    const dB = ds.find((d) => d.hocVienId === b.hv.id)!;
    expect([dA.diem, dA.chuaDu, dA.chiTiet.length]).toEqual([7, false, 2]);
    expect([dB.diem, dB.chuaDu]).toEqual([null, true]);
  });

  it("học phần không có mục nào tính điểm -> không có điểm trực tuyến", async () => {
    const { ct, hp } = await taoChuongTrinh();
    const khoa = await taoKhoa(ct.id);
    const a = await taoHocVien(khoa.id);
    await taoBaiTracNghiem(hp.id, { tieuDe: "Chỉ để biết", tinhDiem: false });
    expect(await diemDanhGiaTrucTuyen(khoa.id, hp.id)).toEqual([{ hocVienId: a.hv.id, diem: null, chuaDu: false, chiTiet: [] }]);
  });
});
