import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import type { PhuongThucDangKy } from "@/generated/prisma/client";
import {
  taoLop,
  capNhatLop,
  xoaLop,
  xepLop,
  chiaLopTuDong,
  danhSachLop,
  lopTaiNgay,
} from "@/server/services/kh/kh-07-lop-hoc";
import { phanCongGiangVien } from "@/server/services/kh/kh-02-phan-cong-giang-vien";
import {
  thietLapBuoiHoc,
  timGiangVienChoHocPhan,
  lichDayGiangVien,
} from "@/server/services/kh/kh-03-thoi-khoa-bieu";
import { dsHocVienDeDiemDanh } from "@/server/services/gd/gd-01-diem-danh";
import { bangDiemHocPhan, nhapDiemHocPhan } from "@/server/services/kq/kq-01-nhap-diem";
import { tongHopKetQuaKhoa } from "@/server/services/kq/kq-02-tong-hop";
import {
  KhoaChiDuThiKhongChiaLopError,
  KhoaDaDongKhongChiaLopError,
  TongSiSoLopVuotKhoaError,
  SiSoLopNhoHonHienTaiError,
  LopDaDuSiSoError,
  LopDangSuDungError,
  LopKhongThuocKhoaError,
  HocVienChuaChinhThucError,
  DaOLopNayError,
  TrungLichGiangVienTheoBuoiError,
} from "@/server/services/kh/loi-khoa";
import { KhongPhuTrachHocPhanError } from "@/server/services/kq/loi-ket-qua";

const loaiHinhIds: string[] = [];
const chuongTrinhIds: string[] = [];
const khoaIds: string[] = [];
const hocVienIds: string[] = [];
const giangVienIds: string[] = [];

afterAll(async () => {
  await prisma.ketQuaKhoa.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.ketQuaHocTap.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.diemDanh.deleteMany({ where: { buoiHoc: { khoaId: { in: khoaIds } } } });
  await prisma.hocPhi.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.buoiHoc.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.giangVienHocPhan.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaIds } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: hocVienIds } } });
  await prisma.giangVien.deleteMany({ where: { id: { in: giangVienIds } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinhIds } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinhIds } } });
});

const uid = () => crypto.randomUUID();
const NGUOI = { nguoiThucHienTen: "Cán bộ test" };

async function taoKhoa(opts: { phuongThuc?: PhuongThucDangKy; siSoToiDa?: number; soHocVien?: number } = {}) {
  const lh = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH_KH7_${uid()}`, ten: "LH" } });
  loaiHinhIds.push(lh.id);
  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_KH7_${uid()}`,
      ten: "CT KH-07",
      loaiHinhBoiDuongId: lh.id,
      trangThai: "DA_BAN_HANH",
      phuongThucDangKy: opts.phuongThuc ?? "TRUC_TUYEN_NOP_GIAY",
    },
  });
  chuongTrinhIds.push(ct.id);
  const hocPhan = await prisma.hocPhan.create({
    data: { chuongTrinhId: ct.id, ten: "Học phần 1", soTiet: 30, thuTu: 1 },
  });
  const khoa = await prisma.khoa.create({
    data: {
      maKhoa: `KH7_${uid().slice(0, 8)}`,
      chuongTrinhId: ct.id,
      siSoToiDa: opts.siSoToiDa ?? 30,
      trangThai: "DANG_DIEN_RA",
    },
  });
  khoaIds.push(khoa.id);

  const dsDangKy = [];
  for (let i = 0; i < (opts.soHocVien ?? 2); i++) {
    const hv = await prisma.hocVien.create({
      data: { maHocVien: `HV_KH7_${uid()}`, hoTen: `Học viên ${String.fromCharCode(65 + i)}` },
    });
    hocVienIds.push(hv.id);
    dsDangKy.push(
      await prisma.dangKyHoc.create({ data: { hocVienId: hv.id, khoaId: khoa.id, trangThai: "CHINH_THUC" } }),
    );
  }
  return { khoa, hocPhan, dsDangKy };
}

async function taoGiangVien(hoTen: string) {
  const gv = await prisma.giangVien.create({ data: { hoTen } });
  giangVienIds.push(gv.id);
  return gv;
}

describe("KH-07 tạo/sửa/xóa lớp", () => {
  it("mã lớp tự sinh theo khóa, tăng dần", async () => {
    const { khoa } = await taoKhoa();
    const l1 = await taoLop(khoa.id, { ten: "Lớp A", siSoToiDa: 10 });
    const l2 = await taoLop(khoa.id, { ten: "Lớp B", siSoToiDa: 10 });
    expect(l1.maLop).toBe(`${khoa.maKhoa}-L01`);
    expect(l2.maLop).toBe(`${khoa.maKhoa}-L02`);
  });

  it("chặn tổng sĩ số các lớp vượt sĩ số khóa", async () => {
    const { khoa } = await taoKhoa({ siSoToiDa: 20 });
    const l1 = await taoLop(khoa.id, { ten: "A", siSoToiDa: 15 });
    await expect(taoLop(khoa.id, { ten: "B", siSoToiDa: 6 })).rejects.toThrow(TongSiSoLopVuotKhoaError);
    await expect(capNhatLop(l1.id, { ten: "A", siSoToiDa: 21 })).rejects.toThrow(TongSiSoLopVuotKhoaError);
  });

  it("khóa Phương thức 3 không chia lớp", async () => {
    const { khoa } = await taoKhoa({ phuongThuc: "CHI_DU_THI" });
    await expect(taoLop(khoa.id, { ten: "A" })).rejects.toThrow(KhoaChiDuThiKhongChiaLopError);
  });

  it("không giảm sĩ số lớp dưới số học viên hiện có; không xóa lớp đang dùng", async () => {
    const { khoa, dsDangKy } = await taoKhoa();
    const lop = await taoLop(khoa.id, { ten: "A", siSoToiDa: 5 });
    await xepLop(dsDangKy[0].id, { ...NGUOI, lopId: lop.id });
    await xepLop(dsDangKy[1].id, { ...NGUOI, lopId: lop.id });

    await expect(capNhatLop(lop.id, { ten: "A", siSoToiDa: 1 })).rejects.toThrow(SiSoLopNhoHonHienTaiError);
    await expect(xoaLop(lop.id)).rejects.toThrow(LopDangSuDungError);

    const lopTrong = await taoLop(khoa.id, { ten: "Trống" });
    await xoaLop(lopTrong.id);
    expect(await prisma.lopHoc.findUnique({ where: { id: lopTrong.id } })).toBeNull();
  });
});

describe("KH-07 xếp/chuyển lớp", () => {
  it("chuyển lớp giữ nguyên điểm, điểm danh, học phí; ghi lịch sử + nhật ký + thông báo", async () => {
    const { khoa, hocPhan, dsDangKy } = await taoKhoa();
    const [dk] = dsDangKy;
    const lopA = await taoLop(khoa.id, { ten: "A" });
    const lopB = await taoLop(khoa.id, { ten: "B" });
    await xepLop(dk.id, { ...NGUOI, lopId: lopA.id, ngayHieuLuc: "2026-10-01" });

    const buoi = await prisma.buoiHoc.create({
      data: { khoaId: khoa.id, lopId: lopA.id, hocPhanId: hocPhan.id, ngayHoc: new Date("2026-10-05") },
    });
    await prisma.diemDanh.create({ data: { buoiHocId: buoi.id, hocVienId: dk.hocVienId, trangThai: "CO_MAT" } });
    await prisma.ketQuaHocTap.create({
      data: { hocVienId: dk.hocVienId, khoaId: khoa.id, hocPhanId: hocPhan.id, diemThanhPhan: 7, diemKetThuc: 8, diemHocPhan: 7.7 },
    });
    await prisma.hocPhi.create({
      data: { hocVienId: dk.hocVienId, khoaId: khoa.id, soTienPhaiNop: 1000, soTienDaNop: 400, trangThai: "CON_NO" },
    });

    const sau = await xepLop(dk.id, { ...NGUOI, lopId: lopB.id, ngayHieuLuc: "2026-10-10", lyDo: "Đổi ca" });

    expect(sau.lopId).toBe(lopB.id);
    const diem = await prisma.ketQuaHocTap.findFirstOrThrow({ where: { hocVienId: dk.hocVienId, khoaId: khoa.id } });
    expect(Number(diem.diemHocPhan)).toBe(7.7);
    expect(await prisma.diemDanh.count({ where: { hocVienId: dk.hocVienId, buoiHocId: buoi.id } })).toBe(1);
    const hocPhi = await prisma.hocPhi.findFirstOrThrow({ where: { hocVienId: dk.hocVienId, khoaId: khoa.id } });
    expect(Number(hocPhi.soTienDaNop)).toBe(400);

    const lichSu = await prisma.lichSuChuyenLop.findMany({ where: { dangKyId: dk.id }, orderBy: { createdAt: "asc" } });
    expect(lichSu.map((ls) => [ls.tuLopId, ls.denLopId])).toEqual([
      [null, lopA.id],
      [lopA.id, lopB.id],
    ]);
    expect(await prisma.nhatKyThaoTac.count({ where: { doiTuongId: dk.id, hanhDong: "CHUYEN_LOP" } })).toBe(1);
    expect(
      await prisma.thongBao.count({ where: { hocVienId: dk.hocVienId, tieuDe: { contains: "Chuyển lớp" } } }),
    ).toBe(1);
  });

  it("chặn: chưa chính thức, lớp khóa khác, đã ở lớp đó, lớp đủ sĩ số", async () => {
    const { khoa, dsDangKy } = await taoKhoa({ soHocVien: 3 });
    const khac = await taoKhoa();
    const lop = await taoLop(khoa.id, { ten: "A", siSoToiDa: 1 });
    const lop2 = await taoLop(khoa.id, { ten: "B" });
    const lopKhoaKhac = await taoLop(khac.khoa.id, { ten: "X" });

    await expect(xepLop(dsDangKy[0].id, { ...NGUOI, lopId: lopKhoaKhac.id })).rejects.toThrow(
      LopKhongThuocKhoaError,
    );

    await xepLop(dsDangKy[0].id, { ...NGUOI, lopId: lop.id });
    await expect(xepLop(dsDangKy[0].id, { ...NGUOI, lopId: lop.id })).rejects.toThrow(DaOLopNayError);
    await expect(xepLop(dsDangKy[1].id, { ...NGUOI, lopId: lop.id })).rejects.toThrow(LopDaDuSiSoError);

    await prisma.dangKyHoc.update({ where: { id: dsDangKy[2].id }, data: { trangThai: "HOP_LE" } });
    await expect(xepLop(dsDangKy[2].id, { ...NGUOI, lopId: lop2.id })).rejects.toThrow(
      HocVienChuaChinhThucError,
    );
  });

  it("không chuyển lớp sau khi kết quả khóa đã phê duyệt", async () => {
    const { khoa, dsDangKy } = await taoKhoa();
    const lopA = await taoLop(khoa.id, { ten: "A" });
    const lopB = await taoLop(khoa.id, { ten: "B" });
    await xepLop(dsDangKy[0].id, { ...NGUOI, lopId: lopA.id });
    await prisma.ketQuaKhoa.create({
      data: { hocVienId: dsDangKy[0].hocVienId, khoaId: khoa.id, daPheDuyet: true },
    });

    await expect(xepLop(dsDangKy[0].id, { ...NGUOI, lopId: lopB.id })).rejects.toThrow(
      KhoaDaDongKhongChiaLopError,
    );
  });

  it("chia lớp tự động chia đều, dừng khi hết chỗ", async () => {
    const { khoa } = await taoKhoa({ soHocVien: 5 });
    const lopA = await taoLop(khoa.id, { ten: "A", siSoToiDa: 2 });
    const lopB = await taoLop(khoa.id, { ten: "B", siSoToiDa: 2 });

    const kq = await chiaLopTuDong(khoa.id, NGUOI);

    expect(kq).toEqual({ soDaXep: 4, soChuaXep: 1 });
    const ds = await danhSachLop(khoa.id);
    expect(ds.find((l) => l.id === lopA.id)!.siSoHienTai).toBe(2);
    expect(ds.find((l) => l.id === lopB.id)!.siSoHienTai).toBe(2);
  });

  it("lopTaiNgay: buổi đúng ngày chuyển thuộc lớp mới, trước lần xếp đầu là null", () => {
    const lichSu = [
      { denLopId: "A", ngayHieuLuc: new Date("2026-10-01"), createdAt: new Date(1) },
      { denLopId: "B", ngayHieuLuc: new Date("2026-10-10"), createdAt: new Date(2) },
    ];
    expect(lopTaiNgay(lichSu, "2026-09-30")).toBeNull();
    expect(lopTaiNgay(lichSu, "2026-10-09")).toBe("A");
    expect(lopTaiNgay(lichSu, "2026-10-10")).toBe("B");
  });
});

describe("KH-07 tích hợp KH-02/03, GD-01, KQ-01/02 theo lớp", () => {
  async function khoaHaiLop() {
    const f = await taoKhoa({ soHocVien: 2 });
    const lopA = await taoLop(f.khoa.id, { ten: "A" });
    const lopB = await taoLop(f.khoa.id, { ten: "B" });
    const [dkA, dkB] = f.dsDangKy;
    await xepLop(dkA.id, { ...NGUOI, lopId: lopA.id, ngayHieuLuc: "2026-10-01" });
    await xepLop(dkB.id, { ...NGUOI, lopId: lopB.id, ngayHieuLuc: "2026-10-01" });
    const gvKhoa = await taoGiangVien("GV cấp khóa");
    const gvB = await taoGiangVien("GV lớp B");
    await phanCongGiangVien({ khoaId: f.khoa.id, hocPhanId: f.hocPhan.id, giangVienId: gvKhoa.id });
    await phanCongGiangVien({ khoaId: f.khoa.id, hocPhanId: f.hocPhan.id, giangVienId: gvB.id, lopId: lopB.id });
    return { ...f, lopA, lopB, dkA, dkB, gvKhoa, gvB };
  }

  it("giảng viên hiệu lực: lớp có phân công riêng dùng GV riêng, lớp khác dùng GV cấp khóa", async () => {
    const f = await khoaHaiLop();
    expect(await timGiangVienChoHocPhan(f.khoa.id, f.hocPhan.id, f.lopA.id)).toBe(f.gvKhoa.id);
    expect(await timGiangVienChoHocPhan(f.khoa.id, f.hocPhan.id, f.lopB.id)).toBe(f.gvB.id);
    expect(await timGiangVienChoHocPhan(f.khoa.id, f.hocPhan.id, null)).toBe(f.gvKhoa.id);

    // phân công lại cấp khóa cập nhật dòng cũ, không tạo trùng
    await phanCongGiangVien({ khoaId: f.khoa.id, hocPhanId: f.hocPhan.id, giangVienId: f.gvB.id });
    expect(
      await prisma.giangVienHocPhan.count({ where: { khoaId: f.khoa.id, hocPhanId: f.hocPhan.id, lopId: null } }),
    ).toBe(1);
  });

  it("2 lớp học cùng giờ với 2 giảng viên khác nhau không bị coi là trùng lịch; cùng GV thì bị chặn", async () => {
    const f = await khoaHaiLop();
    const lich = { khoaId: f.khoa.id, hocPhanId: f.hocPhan.id, ngayHoc: "2026-10-05", gioBatDau: "08:00", gioKetThuc: "10:00" };
    await thietLapBuoiHoc({ ...lich, lopId: f.lopA.id });
    await thietLapBuoiHoc({ ...lich, lopId: f.lopB.id });

    expect((await lichDayGiangVien(f.gvB.id)).map((bh) => bh.lopId)).toEqual([f.lopB.id]);

    // buổi chung (cấp khóa) cùng giờ -> GV cấp khóa đã dạy lớp A giờ đó
    await expect(thietLapBuoiHoc({ ...lich, lopId: null })).rejects.toThrow(TrungLichGiangVienTheoBuoiError);
  });

  it("điểm danh buổi của lớp chỉ liệt kê học viên thuộc lớp tại ngày học", async () => {
    const f = await khoaHaiLop();
    const buoiTruoc = await thietLapBuoiHoc({ khoaId: f.khoa.id, lopId: f.lopA.id, hocPhanId: f.hocPhan.id, ngayHoc: "2026-10-05" });
    const buoiSauA = await thietLapBuoiHoc({ khoaId: f.khoa.id, lopId: f.lopA.id, hocPhanId: f.hocPhan.id, ngayHoc: "2026-10-20" });
    await xepLop(f.dkA.id, { ...NGUOI, lopId: f.lopB.id, ngayHieuLuc: "2026-10-15" });

    const dsTruoc = await dsHocVienDeDiemDanh(f.gvKhoa.id, buoiTruoc.id);
    expect(dsTruoc.map((d) => d.hocVienId)).toEqual([f.dkA.hocVienId]);
    const dsSau = await dsHocVienDeDiemDanh(f.gvKhoa.id, buoiSauA.id);
    expect(dsSau).toHaveLength(0);
  });

  it("KQ-01: GV chỉ nhập điểm học viên lớp mình; chuyển lớp giữ điểm, GV lớp mới thấy điểm cũ", async () => {
    const f = await khoaHaiLop();
    await nhapDiemHocPhan(f.gvKhoa.id, f.khoa.id, f.hocPhan.id, [
      { hocVienId: f.dkA.hocVienId, diemThanhPhan: 6, diemKetThuc: 6 },
    ]);
    await expect(
      nhapDiemHocPhan(f.gvKhoa.id, f.khoa.id, f.hocPhan.id, [
        { hocVienId: f.dkB.hocVienId, diemThanhPhan: 6, diemKetThuc: 6 },
      ]),
    ).rejects.toThrow(KhongPhuTrachHocPhanError);
    expect((await bangDiemHocPhan(f.gvB.id, f.khoa.id, f.hocPhan.id)).dong.map((d) => d.hocVienId)).toEqual([
      f.dkB.hocVienId,
    ]);

    await xepLop(f.dkA.id, { ...NGUOI, lopId: f.lopB.id });

    const bangGvB = await bangDiemHocPhan(f.gvB.id, f.khoa.id, f.hocPhan.id);
    const dongA = bangGvB.dong.find((d) => d.hocVienId === f.dkA.hocVienId)!;
    expect(dongA.diemHocPhan).toBe(6);
    expect(dongA.maLop).toBe(f.lopB.maLop);
  });

  it("KQ-02: chuyên cần chỉ tính buổi của lớp học viên thuộc về tại ngày học", async () => {
    const f = await khoaHaiLop();
    const taoBuoi = async (lopId: string, ngayHoc: string, coMat: string[]) => {
      const buoi = await prisma.buoiHoc.create({
        data: { khoaId: f.khoa.id, lopId, hocPhanId: f.hocPhan.id, ngayHoc: new Date(ngayHoc) },
      });
      await prisma.diemDanh.createMany({
        data: coMat.map((hocVienId) => ({ buoiHocId: buoi.id, hocVienId, trangThai: "CO_MAT" as const })),
      });
    };
    // A ở lớp A tới 15/10 rồi chuyển lớp B; B luôn ở lớp B
    await taoBuoi(f.lopA.id, "2026-10-05", [f.dkA.hocVienId]);
    await taoBuoi(f.lopB.id, "2026-10-05", [f.dkB.hocVienId]);
    await xepLop(f.dkA.id, { ...NGUOI, lopId: f.lopB.id, ngayHieuLuc: "2026-10-15" });
    await taoBuoi(f.lopB.id, "2026-10-20", [f.dkA.hocVienId]);

    const bang = await tongHopKetQuaKhoa(f.khoa.id);
    const a = bang.find((kq) => kq.hocVienId === f.dkA.hocVienId)!;
    const b = bang.find((kq) => kq.hocVienId === f.dkB.hocVienId)!;

    // A: buổi lớp A 05/10 (có mặt) + buổi lớp B 20/10 (có mặt); không tính buổi lớp B 05/10
    expect(Number(a.tyLeChuyenCan)).toBe(100);
    // B: buổi lớp B 05/10 (có mặt) + 20/10 (vắng)
    expect(Number(b.tyLeChuyenCan)).toBe(50);
  });
});
