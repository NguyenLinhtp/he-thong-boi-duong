import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import type { PhuongThucDangKy } from "@/generated/prisma/client";
import { nhapDiemHocPhan, bangDiemHocPhan, hocPhanPhuTrach } from "@/server/services/kq/kq-01-nhap-diem";
import { tongHopKetQuaKhoa, tinhDiemTongKet } from "@/server/services/kq/kq-02-tong-hop";
import { xetDieuKienHoanThanh } from "@/server/services/kq/kq-03-xet-hoan-thanh";
import {
  pheDuyetKetQua,
  phucKhaoDiemHocPhan,
  phucKhaoKetQuaThi,
} from "@/server/services/kq/kq-04-phe-duyet";
import { bangDiemCaNhan } from "@/server/services/kq/kq-05-tra-cuu";
import { nhapKetQuaThi } from "@/server/services/kq/kq-06-ket-qua-thi";
import { xoaHocVienKhoiKhoa } from "@/server/services/hv/hv-09-quan-ly-danh-sach-khoa";
import { KhongTheXoaHocVienCoKetQuaError } from "@/server/services/hv/loi-hoc-vien";
import {
  KhongPhuTrachHocPhanError,
  DiemKhongHopLeError,
  HocVienKhongThuocKhoaError,
  KhoaChiDuThiError,
  KhongPhaiKhoaChiDuThiError,
  KetQuaDaPheDuyetError,
  ChuaPheDuyetKhongCanPhucKhaoError,
  ThieuSoQuyetDinhError,
  ChuaTongHopKetQuaError,
  ChuaXetDieuKienError,
  KhongPhaiTaiKhoanHocVienError,
} from "@/server/services/kq/loi-ket-qua";

const loaiHinhIds: string[] = [];
const chuongTrinhIds: string[] = [];
const khoaIds: string[] = [];
const hocVienIds: string[] = [];
const giangVienIds: string[] = [];
const nguoiDungIds: string[] = [];
const donViLienKetIds: string[] = [];

afterAll(async () => {
  await prisma.ketQuaKhoa.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.ketQuaHocTap.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.diemDanh.deleteMany({ where: { buoiHoc: { khoaId: { in: khoaIds } } } });
  await prisma.hocPhi.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.hopDongLienKet.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaIds } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: hocVienIds } } });
  await prisma.giangVien.deleteMany({ where: { id: { in: giangVienIds } } });
  await prisma.nguoiDung.deleteMany({ where: { id: { in: nguoiDungIds } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinhIds } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinhIds } } });
  await prisma.donViLienKet.deleteMany({ where: { id: { in: donViLienKetIds } } });
});

const uid = () => crypto.randomUUID();

async function taoHocVien(hoTen: string, soCCCD?: string) {
  const hv = await prisma.hocVien.create({
    data: { maHocVien: `HV_KQ_${uid()}`, hoTen, soCCCD: soCCCD ?? null },
  });
  hocVienIds.push(hv.id);
  return hv;
}

/**
 * Khóa có 2 học phần (30 tiết + 10 tiết, để kiểm tra trọng số theo số tiết),
 * 1 giảng viên phụ trách học phần 1, 1 giảng viên khác phụ trách học phần 2,
 * 2 học viên chính thức.
 */
async function taoKhoaCoGiangDay(phuongThuc: PhuongThucDangKy = "TRUC_TUYEN_NOP_GIAY") {
  const lh = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH_KQ_${uid()}`, ten: "LH KQ" } });
  loaiHinhIds.push(lh.id);
  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_KQ_${uid()}`,
      ten: "CT KQ",
      loaiHinhBoiDuongId: lh.id,
      trangThai: "DA_BAN_HANH",
      phuongThucDangKy: phuongThuc,
      tongThoiLuong: 40,
    },
  });
  chuongTrinhIds.push(ct.id);
  const hp1 = await prisma.hocPhan.create({
    data: { chuongTrinhId: ct.id, ten: "Học phần 1", soTiet: 30, thuTu: 1 },
  });
  const hp2 = await prisma.hocPhan.create({
    data: { chuongTrinhId: ct.id, ten: "Học phần 2", soTiet: 10, thuTu: 2 },
  });
  const khoa = await prisma.khoa.create({
    data: { maKhoa: `KH_KQ_${uid()}`, chuongTrinhId: ct.id, siSoToiDa: 30, trangThai: "DANG_DIEN_RA" },
  });
  khoaIds.push(khoa.id);

  const gv1 = await prisma.giangVien.create({ data: { hoTen: "GV 1" } });
  const gv2 = await prisma.giangVien.create({ data: { hoTen: "GV 2" } });
  giangVienIds.push(gv1.id, gv2.id);
  await prisma.giangVienHocPhan.createMany({
    data: [
      { khoaId: khoa.id, hocPhanId: hp1.id, giangVienId: gv1.id },
      { khoaId: khoa.id, hocPhanId: hp2.id, giangVienId: gv2.id },
    ],
  });

  const hvA = await taoHocVien("A Học viên", `CCCD_KQ_${uid()}`);
  const hvB = await taoHocVien("B Học viên");
  await prisma.dangKyHoc.createMany({
    data: [
      { hocVienId: hvA.id, khoaId: khoa.id, trangThai: "CHINH_THUC" },
      { hocVienId: hvB.id, khoaId: khoa.id, trangThai: "CHINH_THUC" },
    ],
  });

  return { khoa, hp1, hp2, gv1, gv2, hvA, hvB };
}

async function taoKhoaChiDuThi() {
  const lh = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH_KQ6_${uid()}`, ten: "LH KQ6" } });
  loaiHinhIds.push(lh.id);
  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_KQ6_${uid()}`,
      ten: "CT KQ6",
      loaiHinhBoiDuongId: lh.id,
      trangThai: "DA_BAN_HANH",
      phuongThucDangKy: "CHI_DU_THI",
    },
  });
  chuongTrinhIds.push(ct.id);
  const khoa = await prisma.khoa.create({
    data: { maKhoa: `KH_KQ6_${uid()}`, chuongTrinhId: ct.id, siSoToiDa: 30 },
  });
  khoaIds.push(khoa.id);
  const ts = await taoHocVien("Thí sinh");
  const dangKy = await prisma.dangKyHoc.create({
    data: { hocVienId: ts.id, khoaId: khoa.id, trangThai: "CHINH_THUC" },
  });
  return { khoa, ts, dangKy };
}

/** Nhập đủ điểm 2 học phần cho cả 2 học viên (đều đạt). */
async function nhapDuDiem(f: Awaited<ReturnType<typeof taoKhoaCoGiangDay>>) {
  await nhapDiemHocPhan(f.gv1.id, f.khoa.id, f.hp1.id, [
    { hocVienId: f.hvA.id, diemThanhPhan: 8, diemKetThuc: 8 },
    { hocVienId: f.hvB.id, diemThanhPhan: 7, diemKetThuc: 7 },
  ]);
  await nhapDiemHocPhan(f.gv2.id, f.khoa.id, f.hp2.id, [
    { hocVienId: f.hvA.id, diemThanhPhan: 4, diemKetThuc: 4 },
    { hocVienId: f.hvB.id, diemThanhPhan: 6, diemKetThuc: 6 },
  ]);
}

async function daPheDuyet(f: Awaited<ReturnType<typeof taoKhoaCoGiangDay>>) {
  await nhapDuDiem(f);
  await tongHopKetQuaKhoa(f.khoa.id);
  await xetDieuKienHoanThanh(f.khoa.id);
  await pheDuyetKetQua(f.khoa.id, { soQuyetDinh: "QD-KQ-01", nguoiThucHienTen: "Test" });
}

describe("KQ-01 nhập điểm học phần", () => {
  it("giảng viên phụ trách nhập được, điểm học phần = 30% TP + 70% KT", async () => {
    const f = await taoKhoaCoGiangDay();

    const bang = await nhapDiemHocPhan(f.gv1.id, f.khoa.id, f.hp1.id, [
      { hocVienId: f.hvA.id, diemThanhPhan: 6, diemKetThuc: 8 },
      { hocVienId: f.hvB.id, diemThanhPhan: 2, diemKetThuc: 4 },
    ]);

    const a = bang.dong.find((d) => d.hocVienId === f.hvA.id)!;
    const b = bang.dong.find((d) => d.hocVienId === f.hvB.id)!;
    expect(a.diemHocPhan).toBe(7.4);
    expect(a.dat).toBe(true);
    expect(b.diemHocPhan).toBe(3.4);
    expect(b.dat).toBe(false);
  });

  it("chặn giảng viên nhập điểm học phần không phụ trách", async () => {
    const f = await taoKhoaCoGiangDay();

    await expect(
      nhapDiemHocPhan(f.gv2.id, f.khoa.id, f.hp1.id, [
        { hocVienId: f.hvA.id, diemThanhPhan: 8, diemKetThuc: 8 },
      ]),
    ).rejects.toThrow(KhongPhuTrachHocPhanError);
    await expect(bangDiemHocPhan(f.gv2.id, f.khoa.id, f.hp1.id)).rejects.toThrow(
      KhongPhuTrachHocPhanError,
    );
  });

  it("chặn điểm ngoài khoảng 0–10", async () => {
    const f = await taoKhoaCoGiangDay();

    await expect(
      nhapDiemHocPhan(f.gv1.id, f.khoa.id, f.hp1.id, [
        { hocVienId: f.hvA.id, diemThanhPhan: 10.5, diemKetThuc: 8 },
      ]),
    ).rejects.toThrow(DiemKhongHopLeError);
    await expect(
      nhapDiemHocPhan(f.gv1.id, f.khoa.id, f.hp1.id, [
        { hocVienId: f.hvA.id, diemThanhPhan: 5, diemKetThuc: -1 },
      ]),
    ).rejects.toThrow(DiemKhongHopLeError);
    expect(await prisma.ketQuaHocTap.count({ where: { khoaId: f.khoa.id } })).toBe(0);
  });

  it("chặn nhập điểm cho học viên không chính thức trong khóa", async () => {
    const f = await taoKhoaCoGiangDay();
    const nguoiLa = await taoHocVien("Người ngoài khóa");

    await expect(
      nhapDiemHocPhan(f.gv1.id, f.khoa.id, f.hp1.id, [
        { hocVienId: nguoiLa.id, diemThanhPhan: 8, diemKetThuc: 8 },
      ]),
    ).rejects.toThrow(HocVienKhongThuocKhoaError);
  });

  it("học phần của khóa Phương thức 3 không nhập điểm qua KQ-01", async () => {
    const f = await taoKhoaCoGiangDay("CHI_DU_THI");

    await expect(
      nhapDiemHocPhan(f.gv1.id, f.khoa.id, f.hp1.id, [
        { hocVienId: f.hvA.id, diemThanhPhan: 8, diemKetThuc: 8 },
      ]),
    ).rejects.toThrow(KhoaChiDuThiError);
    expect((await hocPhanPhuTrach(f.gv1.id)).some((pc) => pc.khoaId === f.khoa.id)).toBe(false);
  });

  it("sửa điểm sau khi tổng hợp xóa kết quả toàn khóa cũ, buộc tổng hợp lại", async () => {
    const f = await taoKhoaCoGiangDay();
    await nhapDuDiem(f);
    await tongHopKetQuaKhoa(f.khoa.id);

    await nhapDiemHocPhan(f.gv1.id, f.khoa.id, f.hp1.id, [
      { hocVienId: f.hvA.id, diemThanhPhan: 9, diemKetThuc: 9 },
    ]);

    expect(await prisma.ketQuaKhoa.count({ where: { khoaId: f.khoa.id, hocVienId: f.hvA.id } })).toBe(0);
    await expect(xetDieuKienHoanThanh(f.khoa.id)).rejects.toThrow(ChuaTongHopKetQuaError);
  });
});

describe("KQ-02 tổng hợp kết quả toàn khóa", () => {
  it("điểm tổng kết theo trọng số số tiết học phần", () => {
    const { diemTongKet } = tinhDiemTongKet(
      [
        { id: "a", ten: "A", soTiet: 30 },
        { id: "b", ten: "B", soTiet: 10 },
      ],
      new Map([
        ["a", 8],
        ["b", 4],
      ]),
    );
    expect(diemTongKet).toBe(7);
  });

  it("tổng hợp khóa: đủ điểm + đạt -> đạt học tập; thiếu điểm học phần -> không đạt", async () => {
    const f = await taoKhoaCoGiangDay();
    await nhapDiemHocPhan(f.gv1.id, f.khoa.id, f.hp1.id, [
      { hocVienId: f.hvA.id, diemThanhPhan: 8, diemKetThuc: 8 },
      { hocVienId: f.hvB.id, diemThanhPhan: 8, diemKetThuc: 8 },
    ]);
    await nhapDiemHocPhan(f.gv2.id, f.khoa.id, f.hp2.id, [
      { hocVienId: f.hvA.id, diemThanhPhan: 4, diemKetThuc: 4 },
    ]);

    const bang = await tongHopKetQuaKhoa(f.khoa.id);
    const a = bang.find((kq) => kq.hocVienId === f.hvA.id)!;
    const b = bang.find((kq) => kq.hocVienId === f.hvB.id)!;

    expect(Number(a.diemTongKet)).toBe(7);
    expect(a.datHocTap).toBe(true);
    expect(a.tyLeChuyenCan).toBeNull();
    expect(b.diemTongKet).toBeNull();
    expect(b.datHocTap).toBe(false);
    expect(b.ghiChu).toContain("Học phần 2");
  });

  it("chuyên cần dưới 80% -> không đạt dù đủ điểm", async () => {
    const f = await taoKhoaCoGiangDay();
    await nhapDuDiem(f);
    // 2 buổi đã điểm danh: A có mặt cả 2, B có mặt 1 (50%); 1 buổi hủy không tính
    for (const [coMatB, daHuy] of [
      [true, false],
      [false, false],
    ] as const) {
      const buoi = await prisma.buoiHoc.create({
        data: { khoaId: f.khoa.id, hocPhanId: f.hp1.id, ngayHoc: new Date(), daHuy },
      });
      await prisma.diemDanh.createMany({
        data: [
          { buoiHocId: buoi.id, hocVienId: f.hvA.id, trangThai: "CO_MAT" },
          { buoiHocId: buoi.id, hocVienId: f.hvB.id, trangThai: coMatB ? "CO_MAT" : "VANG_CO_PHEP" },
        ],
      });
    }
    const buoiHuy = await prisma.buoiHoc.create({
      data: { khoaId: f.khoa.id, hocPhanId: f.hp1.id, ngayHoc: new Date(), daHuy: true },
    });
    await prisma.diemDanh.create({
      data: { buoiHocId: buoiHuy.id, hocVienId: f.hvB.id, trangThai: "VANG_KHONG_PHEP" },
    });

    const bang = await tongHopKetQuaKhoa(f.khoa.id);
    const a = bang.find((kq) => kq.hocVienId === f.hvA.id)!;
    const b = bang.find((kq) => kq.hocVienId === f.hvB.id)!;

    expect(Number(a.tyLeChuyenCan)).toBe(100);
    expect(a.datHocTap).toBe(true);
    expect(Number(b.tyLeChuyenCan)).toBe(50);
    expect(b.datHocTap).toBe(false);
    expect(b.ghiChu).toContain("Chuyên cần");
  });

  it("khóa Phương thức 3 không áp dụng tổng hợp chuyên cần", async () => {
    const { khoa } = await taoKhoaChiDuThi();
    await expect(tongHopKetQuaKhoa(khoa.id)).rejects.toThrow(KhoaChiDuThiError);
  });
});

describe("KQ-03 xét điều kiện hoàn thành khóa", () => {
  it("chặn xét khi chưa tổng hợp kết quả", async () => {
    const f = await taoKhoaCoGiangDay();
    await expect(xetDieuKienHoanThanh(f.khoa.id)).rejects.toThrow(ChuaTongHopKetQuaError);
  });

  it("còn nợ học phí không được công nhận hoàn thành dù đủ điểm", async () => {
    const f = await taoKhoaCoGiangDay();
    await nhapDuDiem(f);
    await tongHopKetQuaKhoa(f.khoa.id);
    await prisma.hocPhi.createMany({
      data: [
        { hocVienId: f.hvA.id, khoaId: f.khoa.id, soTienPhaiNop: 1000, trangThai: "CON_NO" },
        { hocVienId: f.hvB.id, khoaId: f.khoa.id, soTienPhaiNop: 1000, soTienDaNop: 1000, trangThai: "DA_NOP_DU" },
      ],
    });

    const kq = await xetDieuKienHoanThanh(f.khoa.id);

    expect(kq.khongDuDieuKien.map((k) => k.hocVienId)).toEqual([f.hvA.id]);
    expect(kq.khongDuDieuKien[0].duDieuKienHocPhi).toBe(false);
    expect(kq.khongDuDieuKien[0].ghiChu).toContain("nghĩa vụ tài chính");
    expect(kq.duDieuKien.map((k) => k.hocVienId)).toEqual([f.hvB.id]);
  });

  it("học viên qua ĐVLK: chỉ hoàn thành khi hợp đồng liên kết đã thanh lý", async () => {
    const f = await taoKhoaCoGiangDay("QUA_DON_VI_LIEN_KET");
    const dvlk = await prisma.donViLienKet.create({ data: { ma: `DVLK_KQ_${uid()}`, ten: "ĐVLK KQ" } });
    donViLienKetIds.push(dvlk.id);
    const hopDong = await prisma.hopDongLienKet.create({
      data: { maHopDong: `HD_KQ_${uid()}`, donViLienKetId: dvlk.id, khoaId: f.khoa.id },
    });
    await prisma.dangKyHoc.updateMany({
      where: { khoaId: f.khoa.id },
      data: { hopDongLienKetId: hopDong.id },
    });
    await prisma.hocPhi.createMany({
      data: [f.hvA.id, f.hvB.id].map((hocVienId) => ({
        hocVienId,
        khoaId: f.khoa.id,
        soTienPhaiNop: 0,
        trangThai: "CHO_THANH_LY_HOP_DONG" as const,
      })),
    });
    await nhapDuDiem(f);
    await tongHopKetQuaKhoa(f.khoa.id);

    const truocThanhLy = await xetDieuKienHoanThanh(f.khoa.id);
    expect(truocThanhLy.duDieuKien).toHaveLength(0);

    await prisma.hopDongLienKet.update({ where: { id: hopDong.id }, data: { trangThai: "DA_THANH_LY" } });
    const sauThanhLy = await xetDieuKienHoanThanh(f.khoa.id);
    expect(sauThanhLy.duDieuKien).toHaveLength(2);
  });
});

describe("KQ-04 phê duyệt kết quả cuối cùng", () => {
  it("chặn phê duyệt khi chưa xét điều kiện hoặc thiếu số quyết định", async () => {
    const f = await taoKhoaCoGiangDay();
    await nhapDuDiem(f);
    await tongHopKetQuaKhoa(f.khoa.id);

    await expect(
      pheDuyetKetQua(f.khoa.id, { soQuyetDinh: "QD", nguoiThucHienTen: "Test" }),
    ).rejects.toThrow(ChuaXetDieuKienError);

    await xetDieuKienHoanThanh(f.khoa.id);
    await expect(
      pheDuyetKetQua(f.khoa.id, { soQuyetDinh: "  ", nguoiThucHienTen: "Test" }),
    ).rejects.toThrow(ThieuSoQuyetDinhError);
  });

  it("phê duyệt: khóa điểm, học viên hoàn thành -> HOAN_THANH, gửi thông báo, ghi nhật ký", async () => {
    const f = await taoKhoaCoGiangDay();
    await daPheDuyet(f);

    const dsKq = await prisma.ketQuaKhoa.findMany({ where: { khoaId: f.khoa.id } });
    expect(dsKq.every((kq) => kq.daPheDuyet && kq.soQuyetDinh === "QD-KQ-01")).toBe(true);
    expect(await prisma.ketQuaHocTap.count({ where: { khoaId: f.khoa.id, daPheDuyet: false } })).toBe(0);

    const dsDangKy = await prisma.dangKyHoc.findMany({ where: { khoaId: f.khoa.id } });
    expect(dsDangKy.every((dk) => dk.trangThai === "HOAN_THANH")).toBe(true);

    expect(
      await prisma.thongBao.count({ where: { hocVienId: f.hvA.id, loaiSuKien: "KET_QUA" } }),
    ).toBe(1);
    expect(
      await prisma.nhatKyThaoTac.count({ where: { hanhDong: "PHE_DUYET_KET_QUA", doiTuongId: f.khoa.id } }),
    ).toBe(1);
  });

  it("không sửa điểm/tổng hợp/xét lại/duyệt lại sau khi đã phê duyệt", async () => {
    const f = await taoKhoaCoGiangDay();
    await daPheDuyet(f);

    await expect(
      nhapDiemHocPhan(f.gv1.id, f.khoa.id, f.hp1.id, [
        { hocVienId: f.hvA.id, diemThanhPhan: 1, diemKetThuc: 1 },
      ]),
    ).rejects.toThrow(KetQuaDaPheDuyetError);
    await expect(tongHopKetQuaKhoa(f.khoa.id)).rejects.toThrow(KetQuaDaPheDuyetError);
    await expect(xetDieuKienHoanThanh(f.khoa.id)).rejects.toThrow(KetQuaDaPheDuyetError);
    await expect(
      pheDuyetKetQua(f.khoa.id, { soQuyetDinh: "QD-2", nguoiThucHienTen: "Test" }),
    ).rejects.toThrow(KetQuaDaPheDuyetError);
  });

  it("phúc khảo: bắt buộc số quyết định, chỉ áp dụng cho điểm đã duyệt", async () => {
    const f = await taoKhoaCoGiangDay();
    await nhapDuDiem(f);
    const chuaDuyet = await prisma.ketQuaHocTap.findFirstOrThrow({
      where: { khoaId: f.khoa.id, hocVienId: f.hvA.id, hocPhanId: f.hp1.id },
    });
    await expect(
      phucKhaoDiemHocPhan(chuaDuyet.id, {
        diemThanhPhan: 9,
        diemKetThuc: 9,
        soQuyetDinhPhucKhao: "PK-1",
        nguoiThucHienTen: "Test",
      }),
    ).rejects.toThrow(ChuaPheDuyetKhongCanPhucKhaoError);

    await tongHopKetQuaKhoa(f.khoa.id);
    await xetDieuKienHoanThanh(f.khoa.id);
    await pheDuyetKetQua(f.khoa.id, { soQuyetDinh: "QD", nguoiThucHienTen: "Test" });

    await expect(
      phucKhaoDiemHocPhan(chuaDuyet.id, {
        diemThanhPhan: 9,
        diemKetThuc: 9,
        soQuyetDinhPhucKhao: "",
        nguoiThucHienTen: "Test",
      }),
    ).rejects.toThrow(ThieuSoQuyetDinhError);
  });

  it("phúc khảo làm học viên rớt xuống không đạt -> trạng thái đăng ký về CHINH_THUC", async () => {
    const f = await taoKhoaCoGiangDay();
    await daPheDuyet(f);
    const ketQua = await prisma.ketQuaHocTap.findFirstOrThrow({
      where: { khoaId: f.khoa.id, hocVienId: f.hvA.id, hocPhanId: f.hp1.id },
    });

    const sau = await phucKhaoDiemHocPhan(ketQua.id, {
      diemThanhPhan: 2,
      diemKetThuc: 2,
      soQuyetDinhPhucKhao: "PK-2",
      nguoiThucHienTen: "Test",
    });

    // (2*30 + 4*10)/40 = 2.5
    expect(Number(sau!.diemTongKet)).toBe(2.5);
    expect(sau!.hoanThanh).toBe(false);
    expect(sau!.daPheDuyet).toBe(true);
    const dk = await prisma.dangKyHoc.findFirstOrThrow({ where: { khoaId: f.khoa.id, hocVienId: f.hvA.id } });
    expect(dk.trangThai).toBe("CHINH_THUC");
    const kqHp = await prisma.ketQuaHocTap.findUniqueOrThrow({ where: { id: ketQua.id } });
    expect(kqHp.soQuyetDinhPhucKhao).toBe("PK-2");
    expect(
      await prisma.nhatKyThaoTac.count({ where: { hanhDong: "PHUC_KHAO_DIEM_HOC_PHAN", doiTuongId: ketQua.id } }),
    ).toBe(1);
  });
});

describe("KQ-05 tra cứu điểm", () => {
  it("học viên chỉ xem được điểm của chính mình (khớp CCCD tài khoản)", async () => {
    const f = await taoKhoaCoGiangDay();
    await nhapDuDiem(f);
    const taiKhoan = await prisma.nguoiDung.create({
      data: { tenDangNhap: `hv_kq_${uid()}`, matKhauHash: "x", hoTen: "A", soCCCD: f.hvA.soCCCD },
    });
    nguoiDungIds.push(taiKhoan.id);

    const bang = await bangDiemCaNhan(taiKhoan.id);

    expect(bang.hocVien.maHocVien).toBe(f.hvA.maHocVien);
    const khoa = bang.khoas.find((k) => k.khoaId === f.khoa.id)!;
    expect(khoa.diemHocPhan).toHaveLength(2);
    expect(khoa.diemHocPhan.every((d) => d.hocVienId === f.hvA.id)).toBe(true);
  });

  it("tài khoản không gắn hồ sơ học viên thì không tra cứu được", async () => {
    const taiKhoan = await prisma.nguoiDung.create({
      data: { tenDangNhap: `cb_kq_${uid()}`, matKhauHash: "x", hoTen: "Cán bộ" },
    });
    nguoiDungIds.push(taiKhoan.id);

    await expect(bangDiemCaNhan(taiKhoan.id)).rejects.toThrow(KhongPhaiTaiKhoanHocVienError);
  });
});

describe("KQ-06 nhập kết quả thi trực tiếp (Phương thức 3)", () => {
  it("nhập điểm thi làm kết quả toàn khóa, không có chuyên cần, xét + duyệt được", async () => {
    const { khoa, ts } = await taoKhoaChiDuThi();

    const bang = await nhapKetQuaThi(khoa.id, [{ hocVienId: ts.id, diemThi: 6.5 }]);
    expect(Number(bang[0].diemTongKet)).toBe(6.5);
    expect(bang[0].tyLeChuyenCan).toBeNull();
    expect(bang[0].datHocTap).toBe(true);

    const xet = await xetDieuKienHoanThanh(khoa.id);
    expect(xet.duDieuKien).toHaveLength(1);
    await pheDuyetKetQua(khoa.id, { soQuyetDinh: "QD-THI", nguoiThucHienTen: "Test" });

    await expect(nhapKetQuaThi(khoa.id, [{ hocVienId: ts.id, diemThi: 9 }])).rejects.toThrow(
      KetQuaDaPheDuyetError,
    );
    const kq = await prisma.ketQuaKhoa.findFirstOrThrow({ where: { khoaId: khoa.id } });
    const sau = await phucKhaoKetQuaThi(kq.id, {
      diemThi: 4,
      soQuyetDinhPhucKhao: "PK-THI",
      nguoiThucHienTen: "Test",
    });
    expect(sau.hoanThanh).toBe(false);
  });

  it("chặn khóa không thuộc Phương thức 3 và điểm ngoài 0–10", async () => {
    const f = await taoKhoaCoGiangDay();
    await expect(nhapKetQuaThi(f.khoa.id, [{ hocVienId: f.hvA.id, diemThi: 7 }])).rejects.toThrow(
      KhongPhaiKhoaChiDuThiError,
    );

    const { khoa, ts } = await taoKhoaChiDuThi();
    await expect(nhapKetQuaThi(khoa.id, [{ hocVienId: ts.id, diemThi: 11 }])).rejects.toThrow(
      DiemKhongHopLeError,
    );
  });

  it("phúc khảo điểm thi không áp dụng cho khóa có giảng dạy", async () => {
    const f = await taoKhoaCoGiangDay();
    await daPheDuyet(f);
    const kq = await prisma.ketQuaKhoa.findFirstOrThrow({ where: { khoaId: f.khoa.id } });
    await expect(
      phucKhaoKetQuaThi(kq.id, { diemThi: 9, soQuyetDinhPhucKhao: "PK", nguoiThucHienTen: "Test" }),
    ).rejects.toThrow(KhongPhaiKhoaChiDuThiError);
  });

  it("HV-09: thí sinh đã có kết quả thi không được xóa khỏi khóa", async () => {
    const { khoa, ts, dangKy } = await taoKhoaChiDuThi();
    await nhapKetQuaThi(khoa.id, [{ hocVienId: ts.id, diemThi: 7 }]);
    await expect(xoaHocVienKhoiKhoa(dangKy.id)).rejects.toThrow(KhongTheXoaHocVienCoKetQuaError);
  });
});
