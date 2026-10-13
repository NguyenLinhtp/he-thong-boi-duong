import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { khoiTaoKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { chuyenTrangThaiKhoa } from "@/server/services/kh/kh-05-trang-thai-si-so";
import { xacNhanNopGiay } from "@/server/services/hv/hv-02-xac-nhan-nop-giay";
import { thamDinhHoSo } from "@/server/services/hv/hv-06-tham-dinh";
import { danhSachChoDuyet, duyetHoSoChinhThuc } from "@/server/services/hv/hv-07-xet-duyet-chinh-thuc";
import { duyetHoSoLo } from "@/server/services/hv/thao-tac-lo-tuyen-sinh";
import { chuyenTrangThaiLePhi } from "@/server/services/hp/hp-02-chuyen-trang-thai-le-phi";
import { canXacNhanHocPhiTruoc } from "@/server/services/hp/thanh-phan-le-phi-chung";
import { ChuaXacNhanLePhiKhiXetDuyetError, DanhSachXetDuyetKhongHopLeError } from "@/server/services/hv/loi-hoc-vien";
import type { PhuongThucDangKy } from "@/generated/prisma/client";
import ExcelJS from "exceljs";
import { lePhiTheoHocVien, thuocDanhSachThanhPhan, xuatDanhSachTuyenSinh } from "@/server/services/hv/xuat-danh-sach-tuyen-sinh";

// (bổ sung 11/10/2026 - HV-06/HV-07) thẩm định + xét duyệt gộp 1 bước; hồ sơ PT1/PT3 phải được
// xác nhận học phí/lệ phí trước khi duyệt vào danh sách chính thức, PT2/PT4 không chặn

const NGUOI = { nguoiThucHienId: null, nguoiThucHienTen: "Cán bộ test duyệt 1 bước" };
const loaiHinh: string[] = [];
const chuongTrinh: string[] = [];
const khoaIds: string[] = [];
const hocVienIds: string[] = [];

afterAll(async () => {
  const dsHocPhi = await prisma.hocPhi.findMany({ where: { khoaId: { in: khoaIds } }, select: { id: true } });
  await prisma.phieuThu.deleteMany({ where: { hocPhiId: { in: dsHocPhi.map((h) => h.id) } } });
  await prisma.hocPhi.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.thanhPhanLePhi.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.thongBao.deleteMany({ where: { hocVienId: { in: hocVienIds } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: hocVienIds } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaIds } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinh } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinh } } });
});

async function taoKhoa(phuongThucDangKys: PhuongThucDangKy[], mucHocPhi: number | null, siSoToiDa = 10) {
  const lh = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH_D1B_${crypto.randomUUID()}`, ten: "LH duyệt 1 bước" } });
  loaiHinh.push(lh.id);
  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_D1B_${crypto.randomUUID()}`,
      ten: "CT duyệt 1 bước",
      loaiHinhBoiDuongId: lh.id,
      trangThai: "DA_BAN_HANH",
      soQuyetDinh: "QD-D1B",
      ngayBanHanh: new Date(),
      phuongThucDangKys,
    },
  });
  chuongTrinh.push(ct.id);
  const khoa = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa });
  khoaIds.push(khoa.id);
  await chuyenTrangThaiKhoa(khoa.id, "DANG_TUYEN_SINH");
  if (mucHocPhi !== null) await prisma.khoa.update({ where: { id: khoa.id }, data: { mucHocPhi } });
  return khoa;
}

async function taoHoSo(khoaId: string, data: { trangThai: "CHO_NOP_GIAY" | "DA_XAC_NHAN_THAM_GIA" | "CHO_DUYET"; phuongThuc: PhuongThucDangKy | null }) {
  const hv = await prisma.hocVien.create({ data: { maHocVien: `HV_D1B_${crypto.randomUUID().slice(0, 12)}`, hoTen: "Học viên duyệt 1 bước" } });
  hocVienIds.push(hv.id);
  return prisma.dangKyHoc.create({
    data: {
      hocVienId: hv.id,
      khoaId,
      ...data,
      hanNopGiay: data.trangThai === "CHO_NOP_GIAY" ? new Date(Date.now() + 7 * 864e5) : null,
    },
  });
}

const hocPhiCua = (dk: { hocVienId: string; khoaId: string }) =>
  prisma.hocPhi.findUnique({ where: { hocVienId_khoaId: { hocVienId: dk.hocVienId, khoaId: dk.khoaId } } });

describe("Hồ sơ nào phải xác nhận học phí/lệ phí trước khi duyệt", () => {
  it("PT1, PT3 phải xác nhận; PT2, PT4 (qua đơn vị liên kết) không; hồ sơ cán bộ thêm theo phương thức của khóa", () => {
    const khoa: PhuongThucDangKy[] = ["TRUC_TUYEN_NOP_GIAY", "IMPORT_TU_XAC_NHAN", "QUA_DON_VI_LIEN_KET"];
    expect(canXacNhanHocPhiTruoc({ hopDongLienKetId: null, phuongThuc: "TRUC_TUYEN_NOP_GIAY" }, khoa)).toBe(true);
    expect(canXacNhanHocPhiTruoc({ hopDongLienKetId: null, phuongThuc: "CHI_DU_THI" }, ["CHI_DU_THI"])).toBe(true);
    expect(canXacNhanHocPhiTruoc({ hopDongLienKetId: null, phuongThuc: "IMPORT_TU_XAC_NHAN" }, khoa)).toBe(false);
    expect(canXacNhanHocPhiTruoc({ hopDongLienKetId: "hd", phuongThuc: "QUA_DON_VI_LIEN_KET" }, khoa)).toBe(false);
    expect(canXacNhanHocPhiTruoc({ hopDongLienKetId: null, phuongThuc: null }, khoa)).toBe(true);
    expect(canXacNhanHocPhiTruoc({ hopDongLienKetId: null, phuongThuc: null }, ["IMPORT_TU_XAC_NHAN"])).toBe(false);
  });
});

describe("PT1: nhận hồ sơ giấy -> xác nhận học phí -> duyệt thẳng vào danh sách chính thức", () => {
  it("lập khoản học phí khi nhận hồ sơ giấy; chặn duyệt khi chưa xác nhận; xác nhận xong duyệt thẳng từ Đã nộp giấy", async () => {
    const khoa = await taoKhoa(["TRUC_TUYEN_NOP_GIAY"], 1_500_000);
    const dk = await taoHoSo(khoa.id, { trangThai: "CHO_NOP_GIAY", phuongThuc: "TRUC_TUYEN_NOP_GIAY" });

    await xacNhanNopGiay(dk.id);
    const hp = await hocPhiCua(dk);
    expect(hp?.trangThai).toBe("CHUA_NOP");
    expect(Number(hp?.soTienPhaiNop)).toBe(1_500_000);
    expect(await prisma.thongBao.count({ where: { hocVienId: dk.hocVienId, loaiSuKien: "NHAC_HOC_PHI" } })).toBe(1);

    const [dong] = await danhSachChoDuyet(khoa.id);
    expect(dong).toMatchObject({ id: dk.id, duocDuyet: false, hocPhi: { nhan: "Chưa nộp", daXacNhan: false } });
    await expect(duyetHoSoChinhThuc(khoa.id, [dk.id], NGUOI)).rejects.toThrow(ChuaXacNhanLePhiKhiXetDuyetError);

    await chuyenTrangThaiLePhi(hp!.id, "DA_DONG", null, NGUOI);
    expect((await danhSachChoDuyet(khoa.id))[0]).toMatchObject({ duocDuyet: true, hocPhi: { daXacNhan: true } });
    await duyetHoSoChinhThuc(khoa.id, [dk.id], NGUOI);
    expect((await prisma.dangKyHoc.findUniqueOrThrow({ where: { id: dk.id } })).trangThai).toBe("CHINH_THUC");
  });

  it("thao tác hàng loạt chặn cả lô khi có hồ sơ chưa xác nhận học phí; hồ sơ chưa nộp giấy không duyệt được", async () => {
    const khoa = await taoKhoa(["TRUC_TUYEN_NOP_GIAY"], 500_000);
    const daDong = await taoHoSo(khoa.id, { trangThai: "CHO_NOP_GIAY", phuongThuc: "TRUC_TUYEN_NOP_GIAY" });
    const chuaDong = await taoHoSo(khoa.id, { trangThai: "CHO_NOP_GIAY", phuongThuc: "TRUC_TUYEN_NOP_GIAY" });
    const chuaNopGiay = await taoHoSo(khoa.id, { trangThai: "CHO_NOP_GIAY", phuongThuc: "TRUC_TUYEN_NOP_GIAY" });
    await xacNhanNopGiay(daDong.id);
    await xacNhanNopGiay(chuaDong.id);
    await chuyenTrangThaiLePhi((await hocPhiCua(daDong))!.id, "DA_DONG", null, NGUOI);

    const kq = await duyetHoSoLo(khoa.id, [daDong.id, chuaDong.id], NGUOI);
    expect(kq.thanhCong).toBe(0);
    expect(kq.loi[0].loi).toMatch(/chưa xác nhận/);
    await expect(duyetHoSoChinhThuc(khoa.id, [chuaNopGiay.id], NGUOI)).rejects.toThrow(DanhSachXetDuyetKhongHopLeError);

    expect((await duyetHoSoLo(khoa.id, [daDong.id], NGUOI)).thanhCong).toBe(1);
  });

  it("Không hợp lệ: bỏ khoản học phí chưa thu (không nhắc nợ)", async () => {
    const khoa = await taoKhoa(["TRUC_TUYEN_NOP_GIAY"], 800_000);
    const dk = await taoHoSo(khoa.id, { trangThai: "CHO_NOP_GIAY", phuongThuc: "TRUC_TUYEN_NOP_GIAY" });
    await xacNhanNopGiay(dk.id);
    expect(await hocPhiCua(dk)).not.toBeNull();
    await thamDinhHoSo(dk.id, "KHONG_HOP_LE", "Không đủ điều kiện đầu vào", NGUOI);
    expect(await hocPhiCua(dk)).toBeNull();
  });

  it("hồ sơ cán bộ thêm (chưa có phương thức) ở khóa có PT1 cũng phải xác nhận học phí", async () => {
    const khoa = await taoKhoa(["TRUC_TUYEN_NOP_GIAY", "IMPORT_TU_XAC_NHAN"], 300_000);
    const dk = await taoHoSo(khoa.id, { trangThai: "CHO_DUYET", phuongThuc: null });
    await expect(duyetHoSoChinhThuc(khoa.id, [dk.id], NGUOI)).rejects.toThrow(ChuaXacNhanLePhiKhiXetDuyetError);
    // danh sách chờ duyệt lập bù khoản còn thiếu để tài chính xác nhận
    await danhSachChoDuyet(khoa.id);
    expect((await hocPhiCua(dk))?.trangThai).toBe("CHUA_NOP");
  });
});

describe("PT2: không chặn học phí, học phí lập sau khi chính thức như trước", () => {
  it("hồ sơ đã xác nhận tham gia duyệt thẳng vào danh sách chính thức", async () => {
    const khoa = await taoKhoa(["TRUC_TUYEN_NOP_GIAY", "IMPORT_TU_XAC_NHAN"], 1_000_000);
    const dk = await taoHoSo(khoa.id, { trangThai: "DA_XAC_NHAN_THAM_GIA", phuongThuc: "IMPORT_TU_XAC_NHAN" });
    expect((await danhSachChoDuyet(khoa.id)).find((d) => d.id === dk.id)).toMatchObject({ hocPhi: null, duocDuyet: true });
    expect(await hocPhiCua(dk)).toBeNull();

    await duyetHoSoChinhThuc(khoa.id, [dk.id], NGUOI);
    expect((await prisma.dangKyHoc.findUniqueOrThrow({ where: { id: dk.id } })).trangThai).toBe("CHINH_THUC");
    expect((await hocPhiCua(dk))?.trangThai).toBe("CHUA_NOP");
  });
});

describe("(bổ sung 12/10/2026) khóa dự thi chia thành phần: lệ phí từng thành phần, danh sách chính thức theo thành phần, xuất Excel", () => {
  it("danh sách ôn thi chỉ gồm thí sinh đã chọn và đã được xác nhận ôn thi; Excel có 1 cột lệ phí mỗi thành phần", async () => {
    const khoa = await taoKhoa(["CHI_DU_THI"], 300_000);
    const thi = await prisma.thanhPhanLePhi.create({ data: { khoaId: khoa.id, ten: "Đăng ký thi", batBuoc: true, mucSinhVien: 300_000, thuTu: 1 } });
    const on = await prisma.thanhPhanLePhi.create({ data: { khoaId: khoa.id, ten: "Đăng ký ôn thi", batBuoc: false, mucSinhVien: 500_000, thuTu: 2 } });
    const chon = async (onThi: "khong" | "chua-dong" | "da-dong") => {
      const dk = await taoHoSo(khoa.id, { trangThai: "CHO_DUYET", phuongThuc: "CHI_DU_THI" });
      await prisma.dangKyHoc.update({ where: { id: dk.id }, data: { trangThai: "CHINH_THUC" } });
      await prisma.hocPhi.create({
        data: {
          hocVienId: dk.hocVienId,
          khoaId: khoa.id,
          soTienPhaiNop: onThi === "khong" ? 300_000 : 800_000,
          trangThai: onThi === "chua-dong" ? "CON_NO" : "DA_NOP_DU",
          thanhPhans: {
            create: [
              { thanhPhanId: thi.id, soTienPhaiNop: 300_000, soTienDaNop: 300_000, trangThai: "DA_NOP_DU" as const },
              ...(onThi === "khong"
                ? []
                : [{ thanhPhanId: on.id, soTienPhaiNop: 500_000, trangThai: onThi === "da-dong" ? ("DA_NOP_DU" as const) : ("CHUA_NOP" as const) }]),
            ],
          },
        },
      });
      return dk;
    };
    const [a, b, c] = [await chon("da-dong"), await chon("chua-dong"), await chon("khong")];

    const lePhi = await lePhiTheoHocVien(khoa.id, [a, b, c].map((d) => d.hocVienId));
    const dsThi = [a, b, c].filter((d) => thuocDanhSachThanhPhan(lePhi.get(d.hocVienId), thi.id));
    const dsOn = [a, b, c].filter((d) => thuocDanhSachThanhPhan(lePhi.get(d.hocVienId), on.id));
    expect(dsThi.map((d) => d.id)).toEqual([a.id, b.id, c.id]);
    expect(dsOn.map((d) => d.id)).toEqual([a.id]);
    expect(lePhi.get(c.hocVienId)?.thanhPhan.has(on.id)).toBe(false);

    const doc = async (tp?: string) => {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load((await xuatDanhSachTuyenSinh(khoa.id, "chinh-thuc", tp)).noiDung as unknown as ArrayBuffer);
      const rows: string[][] = [];
      wb.worksheets[0].eachRow((r) => rows.push((r.values as unknown[]).slice(1).map((v) => String(v ?? ""))));
      const viTri = rows.findIndex((r) => r[0] === "STT");
      return { tieuDe: rows[viTri], dong: rows.slice(viTri + 1) };
    };
    const tatCa = await doc();
    expect(tatCa.tieuDe).toEqual(expect.arrayContaining(["Lệ phí đăng ký thi", "Lệ phí đăng ký ôn thi"]));
    expect(tatCa.dong).toHaveLength(3);
    const onThi = await doc(on.id);
    expect(onThi.dong).toHaveLength(1);
    expect(onThi.dong[0]).toEqual(expect.arrayContaining(["Đã đóng"]));
    await expect(xuatDanhSachTuyenSinh(khoa.id, "chinh-thuc", "khong-co")).rejects.toThrow();
  });
});
