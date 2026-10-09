import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { bocLoiLo, chuanHoaDanhSachId, LoKhongHopLeError, TOI_DA_LO } from "@/server/services/chung/xu-ly-lo";
import { thamDinhLo, thoiHocLo, xacNhanNopGiayLo, xetDuyetLo } from "@/server/services/hv/thao-tac-lo-tuyen-sinh";
import { boQuaDieuKienLo, chuyenLePhiLo, datHanNopLo, mienGiamLo } from "@/server/services/hp/hp-thao-tac-lo";
import type { TrangThaiDangKy, TrangThaiHocPhi } from "@/generated/prisma/client";

// (bổ sung 07/10/2026) chọn nhiều thí sinh/học viên trên danh sách và thao tác hàng loạt

const NGUOI = { nguoiThucHienId: null, nguoiThucHienTen: "Cán bộ test thao tác lô" };
const loaiHinh: string[] = [];
const chuongTrinh: string[] = [];
const khoaIds: string[] = [];
const hocVienIds: string[] = [];

afterAll(async () => {
  await prisma.phieuThu.deleteMany({ where: { hocPhi: { khoaId: { in: khoaIds } } } });
  await prisma.hocPhi.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.thongBao.deleteMany({ where: { hocVienId: { in: hocVienIds } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: hocVienIds } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaIds } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinh } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinh } } });
});

async function taoKhoa(siSoToiDa = 30, phuongThuc: "CHI_DU_THI" | "TRUC_TUYEN_NOP_GIAY" = "TRUC_TUYEN_NOP_GIAY") {
  const lh = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH_LO_${crypto.randomUUID()}`, ten: "LH lô" } });
  loaiHinh.push(lh.id);
  const ct = await prisma.chuongTrinh.create({
    data: { maCT: `CT_LO_${crypto.randomUUID()}`, ten: "CT lô", loaiHinhBoiDuongId: lh.id, trangThai: "DA_BAN_HANH", phuongThucDangKys: phuongThuc ? [phuongThuc] : [] },
  });
  chuongTrinh.push(ct.id);
  const khoa = await prisma.khoa.create({ data: { maKhoa: `KH_LO_${crypto.randomUUID()}`, chuongTrinhId: ct.id, siSoToiDa, trangThai: "DANG_TUYEN_SINH" } });
  khoaIds.push(khoa.id);
  return khoa;
}

async function taoHoSo(khoaId: string, trangThai: TrangThaiDangKy, hocPhi?: { trangThai: TrangThaiHocPhi; phaiNop?: number }) {
  const hv = await prisma.hocVien.create({ data: { maHocVien: `HV_LO_${crypto.randomUUID()}`, hoTen: `Thí sinh ${hocVienIds.length + 1}` } });
  hocVienIds.push(hv.id);
  const dk = await prisma.dangKyHoc.create({ data: { hocVienId: hv.id, khoaId, trangThai } });
  const hp = hocPhi
    ? await prisma.hocPhi.create({ data: { hocVienId: hv.id, khoaId, soTienPhaiNop: hocPhi.phaiNop ?? 450_000, trangThai: hocPhi.trangThai } })
    : null;
  return { dk, hp };
}

describe("Kiểm tra danh sách chọn", () => {
  it("chặn danh sách rỗng và vượt giới hạn; bỏ id trùng; server action trả lỗi đầu vào thành kết quả", async () => {
    expect(() => chuanHoaDanhSachId([])).toThrow(LoKhongHopLeError);
    expect(() => chuanHoaDanhSachId(Array.from({ length: TOI_DA_LO + 1 }, (_, i) => `id${i}`))).toThrow(/tối đa/);
    expect(chuanHoaDanhSachId(["a", " a ", "b", ""])).toEqual(["a", "b"]);
    await expect(bocLoiLo(async () => chuanHoaDanhSachId([]) as never)).resolves.toMatchObject({ thanhCong: 0, loi: [{ loi: "Chưa chọn dòng nào" }] });
  });
});

describe("Tuyển sinh: thao tác hàng loạt (HV-02, HV-06, HV-07, HV-09)", () => {
  it("HV-02 xác nhận nộp giấy nhiều hồ sơ; hồ sơ sai trạng thái và hồ sơ của khóa khác được báo lại, không làm hỏng hồ sơ khác", async () => {
    const khoa = await taoKhoa();
    const khac = await taoKhoa();
    const a = await taoHoSo(khoa.id, "CHO_NOP_GIAY");
    const b = await taoHoSo(khoa.id, "CHO_NOP_GIAY");
    const daNop = await taoHoSo(khoa.id, "DA_NOP_GIAY");
    const ngoai = await taoHoSo(khac.id, "CHO_NOP_GIAY");

    const kq = await xacNhanNopGiayLo(khoa.id, [a.dk.id, b.dk.id, daNop.dk.id, ngoai.dk.id]);
    expect(kq.thanhCong).toBe(2);
    expect(kq.loi).toHaveLength(2);
    expect(kq.loi[0].loi).toMatch(/không thuộc danh sách/);
    const ds = await prisma.dangKyHoc.findMany({ where: { id: { in: [a.dk.id, b.dk.id, ngoai.dk.id] } } });
    expect(ds.find((d) => d.id === a.dk.id)?.trangThai).toBe("DA_NOP_GIAY");
    expect(ds.find((d) => d.id === ngoai.dk.id)?.trangThai).toBe("CHO_NOP_GIAY");
  });

  it("HV-06 thẩm định hàng loạt: Không hợp lệ bắt buộc lý do (không đổi hồ sơ nào); Hợp lệ áp cho các hồ sơ đã chọn", async () => {
    const khoa = await taoKhoa();
    const a = await taoHoSo(khoa.id, "DA_NOP_GIAY");
    const b = await taoHoSo(khoa.id, "DA_NOP_GIAY");
    await expect(thamDinhLo(khoa.id, [a.dk.id, b.dk.id], "KHONG_HOP_LE", "  ", NGUOI)).rejects.toThrow(/lý do/);
    expect(await prisma.dangKyHoc.count({ where: { id: { in: [a.dk.id, b.dk.id] }, trangThai: "DA_NOP_GIAY" } })).toBe(2);

    const kq = await thamDinhLo(khoa.id, [a.dk.id], "KHONG_HOP_LE", "Thiếu bằng cấp", NGUOI);
    expect(kq.thanhCong).toBe(1);
    expect(await prisma.dangKyHoc.findUniqueOrThrow({ where: { id: a.dk.id } })).toMatchObject({ trangThai: "KHONG_HOP_LE", ghiChuThamDinh: "Thiếu bằng cấp" });
    expect((await thamDinhLo(khoa.id, [b.dk.id], "HOP_LE", null, NGUOI)).thanhCong).toBe(1);
  });

  it("HV-07 xét duyệt chặn cả lô khi vượt sĩ số - không hồ sơ nào thành Chính thức", async () => {
    const khoa = await taoKhoa(1);
    const a = await taoHoSo(khoa.id, "HOP_LE");
    const b = await taoHoSo(khoa.id, "HOP_LE");
    const kq = await xetDuyetLo(khoa.id, [a.dk.id, b.dk.id], NGUOI);
    expect(kq.thanhCong).toBe(0);
    expect(kq.loi[0].ten).toMatch(/chặn cả lô/);
    expect(await prisma.dangKyHoc.count({ where: { khoaId: khoa.id, trangThai: "CHINH_THUC" } })).toBe(0);
    expect((await xetDuyetLo(khoa.id, [a.dk.id], NGUOI)).thanhCong).toBe(1);
  });

  it("HV-09 thôi học hàng loạt: người đã thôi học được báo lại", async () => {
    const khoa = await taoKhoa();
    const a = await taoHoSo(khoa.id, "CHINH_THUC");
    const daThoi = await taoHoSo(khoa.id, "THOI_HOC");
    const kq = await thoiHocLo(khoa.id, [a.dk.id, daThoi.dk.id], "Chuyển công tác", NGUOI);
    expect(kq.thanhCong).toBe(1);
    expect(kq.loi[0].loi).toMatch(/đã ghi nhận thôi học/);
  });
});

describe("Học phí: thao tác hàng loạt (HP-02, HP-03, HP-06)", () => {
  it("Đã đóng nhiều thí sinh: lập phiếu thu từng người; khoản miễn giảm được báo lại; khoản của khóa khác không xử lý", async () => {
    const khoa = await taoKhoa(30, "CHI_DU_THI");
    const khac = await taoKhoa(30, "CHI_DU_THI");
    const a = await taoHoSo(khoa.id, "CHO_DUYET", { trangThai: "CHUA_NOP" });
    const b = await taoHoSo(khoa.id, "CHO_DUYET", { trangThai: "CHUA_NOP" });
    const mg = await taoHoSo(khoa.id, "CHO_DUYET", { trangThai: "MIEN_GIAM" });
    const ngoai = await taoHoSo(khac.id, "CHO_DUYET", { trangThai: "CHUA_NOP" });

    const kq = await chuyenLePhiLo(khoa.id, [a.hp!.id, b.hp!.id, mg.hp!.id, ngoai.hp!.id], "DA_DONG", null, null, NGUOI);
    expect(kq.thanhCong).toBe(2);
    expect(kq.loi).toHaveLength(2);
    expect(kq.ghiChu.every((g) => /phiếu thu PT/.test(g))).toBe(true);
    expect(await prisma.phieuThu.count({ where: { hocPhiId: ngoai.hp!.id } })).toBe(0);
    expect(await prisma.hocPhi.count({ where: { id: { in: [a.hp!.id, b.hp!.id] }, trangThai: "DA_NOP_DU" } })).toBe(2);
  });

  it("chặn: chuyển Chưa đóng thiếu lý do, bỏ chặn thiếu lý do, hạn nộp sai; miễn giảm chỉ áp khoản còn nợ", async () => {
    const khoa = await taoKhoa(30, "CHI_DU_THI");
    const a = await taoHoSo(khoa.id, "CHO_DUYET", { trangThai: "CHUA_NOP" });
    const xong = await taoHoSo(khoa.id, "CHO_DUYET", { trangThai: "DA_NOP_DU" });
    await expect(chuyenLePhiLo(khoa.id, [a.hp!.id], "CHUA_DONG", null, "", NGUOI)).rejects.toThrow(/lý do/);
    await expect(boQuaDieuKienLo(khoa.id, [a.hp!.id], " ", NGUOI)).rejects.toThrow(/lý do/);
    await expect(datHanNopLo(khoa.id, [a.hp!.id], "")).rejects.toThrow(/hạn nộp/);

    const kq = await mienGiamLo(khoa.id, [a.hp!.id, xong.hp!.id], null, NGUOI);
    expect(kq.thanhCong).toBe(1);
    expect(kq.loi[0].loi).toMatch(/không còn nợ/);
    expect((await prisma.hocPhi.findUniqueOrThrow({ where: { id: a.hp!.id } })).trangThai).toBe("MIEN_GIAM");
  });

  it("đặt hạn nộp và bỏ chặn hàng loạt cho các khoản còn nợ", async () => {
    const khoa = await taoKhoa(30, "CHI_DU_THI");
    const a = await taoHoSo(khoa.id, "CHO_DUYET", { trangThai: "CHUA_NOP" });
    const b = await taoHoSo(khoa.id, "CHO_DUYET", { trangThai: "CON_NO" });
    expect((await datHanNopLo(khoa.id, [a.hp!.id, b.hp!.id], "2026-11-30")).thanhCong).toBe(2);
    expect((await boQuaDieuKienLo(khoa.id, [a.hp!.id, b.hp!.id], "Lãnh đạo phê duyệt", NGUOI)).thanhCong).toBe(2);
    const lai = await boQuaDieuKienLo(khoa.id, [a.hp!.id], "Lần 2", NGUOI);
    expect(lai.loi[0].loi).toMatch(/đã được bỏ chặn/);
  });
});
