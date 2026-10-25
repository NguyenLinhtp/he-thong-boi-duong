import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { taoBaiTracNghiem, taoYeuCauSanPham, capNhatYeuCauSanPham } from "@/server/services/ct/ct-02-hoc-lieu";
import { danhGiaTheoHocLieu, mucDanhGiaCuaChuongTrinh, type MucDanhGia } from "@/server/services/kq/kq-02-theo-hoc-lieu";
import { tongHopKetQuaKhoa } from "@/server/services/kq/kq-02-tong-hop";
import { datDiemDatChuongTrinh, datDiemDatKhoa } from "@/server/services/kq/dieu-kien-dat";
import { chuyenCanCuaKhoa } from "@/server/services/kq/dung-chung";

// (bổ sung 13/10/2026 - KQ-02) khóa có đào tạo xét hoàn thành theo bài đánh giá cấu hình trong học liệu + chuyên cần

const NGUOI = { nguoiThucHienTen: "Cán bộ test học liệu" };
const ids = { loaiHinh: [] as string[], chuongTrinh: [] as string[], khoa: [] as string[], hocVien: [] as string[] };

afterAll(async () => {
  await prisma.ketQuaKhoa.deleteMany({ where: { khoaId: { in: ids.khoa } } });
  await prisma.lanLamTracNghiem.deleteMany({ where: { khoaId: { in: ids.khoa } } });
  await prisma.baiNopSanPham.deleteMany({ where: { khoaId: { in: ids.khoa } } });
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: ids.khoa } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: ids.hocVien } } });
  await prisma.khoa.deleteMany({ where: { id: { in: ids.khoa } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: ids.chuongTrinh } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: ids.loaiHinh } } });
});

const muc = (khoa: string, tinhDiem: boolean, diemDat: number | null, loai: "TN" | "SP" = "TN", thangDiem = 10): MucDanhGia => ({
  khoa,
  loai,
  id: khoa,
  ten: khoa,
  hocPhan: "HP",
  tinhDiem,
  heSo: 1,
  diemDat,
  thangDiem,
});
const co = (diem: number) => ({ diem, trangThai: "CO_DIEM" as const });
const THAM_SO = { diemDat: 5, chuyenCanToiThieu: 80 };

describe("cách tính", () => {
  it("2 bài trắc nghiệm + 1 bài thu hoạch đều tính điểm hệ số 1: điểm cuối khóa = trung bình; kèm chuyên cần", () => {
    const ds = [muc("TN1", true, null), muc("TN2", true, null), muc("SP", true, null, "SP")];
    expect(danhGiaTheoHocLieu(ds, { TN1: co(8), TN2: co(6), SP: co(7) }, THAM_SO, 90)).toMatchObject({ diemTongKet: 7, datHocTap: true, ghiChu: null });
    // (bổ sung 25/10/2026) bài thang 100: điểm cuối khóa quy về thang 10, điểm đạt so theo thang của bài
    const ds100 = [muc("TN1", true, 50, "TN", 100), muc("TN2", true, null), muc("SP", true, null, "SP")];
    expect(danhGiaTheoHocLieu(ds100, { TN1: co(80), TN2: co(6), SP: co(7) }, THAM_SO, null)).toMatchObject({ diemTongKet: 7, datHocTap: true });
    expect(danhGiaTheoHocLieu(ds100, { TN1: co(40), TN2: co(6), SP: co(7) }, THAM_SO, null)).toMatchObject({ datHocTap: false, ghiChu: "TN1 40/100 < 50" });
    expect(danhGiaTheoHocLieu(ds, { TN1: co(8), TN2: co(6), SP: co(7) }, THAM_SO, 70)).toMatchObject({ datHocTap: false, ghiChu: "Chuyên cần 70% < 80%" });
    // chưa làm 1 bài = 0 điểm; bài thu hoạch đã nộp chưa chấm -> chưa có điểm cuối khóa
    expect(danhGiaTheoHocLieu(ds, { TN1: co(8), TN2: { diem: null, trangThai: "CHUA_LAM" }, SP: co(7) }, THAM_SO, null)).toMatchObject({ diemTongKet: 5, datHocTap: true });
    expect(danhGiaTheoHocLieu(ds, { TN1: co(8), TN2: co(6), SP: { diem: null, trangThai: "CHUA_CHAM" } }, THAM_SO, null)).toMatchObject({
      diemTongKet: null,
      datHocTap: false,
      ghiChu: "Chưa chấm: SP",
    });
    expect(danhGiaTheoHocLieu(ds, { TN1: co(3), TN2: co(4), SP: co(5) }, THAM_SO, 100)).toMatchObject({ diemTongKet: 4, datHocTap: false });
  });

  it("bài bắt buộc đạt không vào điểm cuối khóa nhưng phải đạt; bài tính điểm có điểm đạt riêng", () => {
    const ds = [muc("TN1", true, 6), muc("TN2", false, 5)];
    expect(danhGiaTheoHocLieu(ds, { TN1: co(9), TN2: co(5) }, THAM_SO, null)).toMatchObject({ diemTongKet: 9, datHocTap: true });
    expect(danhGiaTheoHocLieu(ds, { TN1: co(9), TN2: co(4) }, THAM_SO, null)).toMatchObject({ datHocTap: false, ghiChu: "TN2 4/10 < 5" });
    expect(danhGiaTheoHocLieu(ds, { TN1: co(5.5), TN2: co(8) }, THAM_SO, null)).toMatchObject({ datHocTap: false, ghiChu: "TN1 5.5/10 < 6" });
    expect(danhGiaTheoHocLieu(ds, { TN1: co(9) }, THAM_SO, null)).toMatchObject({ datHocTap: false, ghiChu: "Chưa làm: TN2" });
  });
});

describe("cấu hình khi tạo học liệu và tổng hợp KQ-02", () => {
  it("chương trình bồi dưỡng CDNN: 2 bài trắc nghiệm + 1 bài thu hoạch hệ số 1; tổng hợp theo bài và chuyên cần của chương trình/khóa", async () => {
    const lh = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH_HL_${crypto.randomUUID()}`, ten: "LH học liệu" } });
    ids.loaiHinh.push(lh.id);
    const ct = await prisma.chuongTrinh.create({
      data: {
        maCT: `CT_HL_${crypto.randomUUID()}`,
        ten: "Bồi dưỡng chức danh nghề nghiệp",
        loaiHinhBoiDuongId: lh.id,
        trangThai: "DA_BAN_HANH",
        phuongThucDangKys: ["TRUC_TUYEN_NOP_GIAY"],
        hocPhans: { create: [{ ten: "Chuyên đề 1", soTiet: 10, thuTu: 1 }] },
      },
      include: { hocPhans: true },
    });
    ids.chuongTrinh.push(ct.id);
    const hp = ct.hocPhans[0];
    await expect(taoBaiTracNghiem(hp.id, { tieuDe: "Sai", tinhDiem: false, diemDat: 11 }, NGUOI)).rejects.toThrow(/0-10/);
    const tn1 = await taoBaiTracNghiem(hp.id, { tieuDe: "Trắc nghiệm 1", tinhDiem: true, heSo: 1 }, NGUOI);
    const tn2 = await taoBaiTracNghiem(hp.id, { tieuDe: "Trắc nghiệm 2", tinhDiem: true, heSo: 1 }, NGUOI);
    const sp = await taoYeuCauSanPham(hp.id, { tieuDe: "Bài thu hoạch", tinhDiem: true, heSo: 1 }, NGUOI);
    await taoBaiTracNghiem(hp.id, { tieuDe: "Tự kiểm tra", tinhDiem: false }, NGUOI);
    expect((await mucDanhGiaCuaChuongTrinh(ct.id)).map((m) => m.ten)).toEqual(["Trắc nghiệm 1", "Trắc nghiệm 2", "Bài thu hoạch"]);

    const khoa = await prisma.khoa.create({ data: { maKhoa: `KHHL${crypto.randomUUID().slice(0, 8)}`, chuongTrinhId: ct.id, siSoToiDa: 10 } });
    ids.khoa.push(khoa.id);
    const hv = await prisma.hocVien.create({ data: { maHocVien: `HVHL${crypto.randomUUID().slice(0, 10)}`, hoTen: "Giáo viên A" } });
    ids.hocVien.push(hv.id);
    await prisma.dangKyHoc.create({ data: { hocVienId: hv.id, khoaId: khoa.id, trangThai: "CHINH_THUC", phuongThuc: "TRUC_TUYEN_NOP_GIAY" } });
    const lam = (baiId: string, diem: number) => prisma.lanLamTracNghiem.create({ data: { baiId, khoaId: khoa.id, hocVienId: hv.id, nopLuc: new Date(), diem } });
    await lam(tn1.id, 4);
    await lam(tn1.id, 8); // lấy lần cao nhất
    await lam(tn2.id, 6);
    await prisma.baiNopSanPham.create({
      data: { yeuCauId: sp.id, khoaId: khoa.id, hocVienId: hv.id, tenFile: "a.pdf", loaiFile: "application/pdf", kichThuoc: 1, khoaLuuTru: `test/${crypto.randomUUID()}`, diem: 7 },
    });

    await tongHopKetQuaKhoa(khoa.id);
    const kq = await prisma.ketQuaKhoa.findFirstOrThrow({ where: { khoaId: khoa.id } });
    expect([Number(kq.diemTongKet), kq.datHocTap]).toEqual([7, true]);
    expect(kq.diemThanhPhan).toEqual({ [`TN_${tn1.id}`]: 8, [`TN_${tn2.id}`]: 6, [`SP_${sp.id}`]: 7 });

    // bài thu hoạch đổi thành bắt buộc đạt ≥ 8 (không tính điểm) -> trung bình 2 bài trắc nghiệm = 7, nhưng không đạt bài thu hoạch
    await capNhatYeuCauSanPham(sp.id, { tieuDe: "Bài thu hoạch", tinhDiem: false, diemDat: 8 }, NGUOI);
    await tongHopKetQuaKhoa(khoa.id);
    expect(await prisma.ketQuaKhoa.findFirstOrThrow({ where: { khoaId: khoa.id } })).toMatchObject({ datHocTap: false, ghiChu: "Bài thu hoạch 7/10 < 8" });

    // chuyên cần tối thiểu: chương trình 90%, khóa sửa riêng 50%
    await datDiemDatChuongTrinh(ct.id, null, NGUOI, 90);
    expect(await chuyenCanCuaKhoa(khoa.id)).toEqual({ chuyenCanToiThieu: 90, nguon: "CHUONG_TRINH" });
    await datDiemDatKhoa(khoa.id, null, NGUOI, 50);
    expect(await chuyenCanCuaKhoa(khoa.id)).toEqual({ chuyenCanToiThieu: 50, nguon: "KHOA" });
    await expect(datDiemDatKhoa(khoa.id, null, NGUOI, 120)).rejects.toThrow(/0 đến 100/);
  });
});
