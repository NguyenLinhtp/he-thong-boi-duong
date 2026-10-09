import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { taoDonViLienKet } from "@/server/services/dvlk/dvlk-01-danh-muc";
import { capTaiKhoanDonViLienKet } from "@/server/services/dvlk/dvlk-02-tai-khoan";
import { layHopDong } from "@/server/services/dvlk/dvlk-03-hop-dong";
import { hoSoCuaDonVi } from "@/server/services/dvlk/dvlk-04-tiep-nhan";
import { xacNhanThuHoSo, danhSachLoNopHoSo } from "@/server/services/dvlk/dvlk-05-xac-nhan-thu-ho-so";
import { xacNhanNopGiay, danhSachChoNopGiay } from "@/server/services/hv/hv-02-xac-nhan-nop-giay";
import { HoSoQuaDonViLienKetError } from "@/server/services/hv/loi-hoc-vien";
import {
  HoSoKhongChoThuError,
  NgoaiPhamViDonViLienKetError,
  HopDongDaThanhLyError,
  ThieuThongTinDvlkError,
  KhongPhaiTaiKhoanDvlkError,
} from "@/server/services/dvlk/loi-dvlk";

const uid = () => crypto.randomUUID().slice(0, 8);
const donViIds: string[] = [];
const nguoiDungIds: string[] = [];
const loaiHinhIds: string[] = [];
const chuongTrinhIds: string[] = [];
const khoaIds: string[] = [];
const hocVienIds: string[] = [];
const NGUOI = { nguoiThucHienTen: "Cán bộ test DVLK-05" };

afterAll(async () => {
  await prisma.thongBao.deleteMany({ where: { hocVienId: { in: hocVienIds } } });
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.loNopHoSo.deleteMany({ where: { hopDongLienKet: { khoaId: { in: khoaIds } } } });
  await prisma.hopDongLienKet.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.donViLienKet.deleteMany({ where: { id: { in: donViIds } } });
  await prisma.nguoiDung.deleteMany({ where: { id: { in: nguoiDungIds } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: hocVienIds } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaIds } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinhIds } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinhIds } } });
});

const NGAY = 24 * 3600 * 1000;

/** Đơn vị có tài khoản + hợp đồng với 1 khóa Phương thức 4, kèm các hồ sơ chờ thu giấy. */
async function taoHopDongCoHoSo(hanNop: Date[]) {
  const lh = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH05_${uid()}`, ten: "LH" } });
  loaiHinhIds.push(lh.id);
  const ct = await prisma.chuongTrinh.create({
    data: { maCT: `CT05_${uid()}`, ten: "CT", loaiHinhBoiDuongId: lh.id, trangThai: "DA_BAN_HANH", phuongThucDangKys: ["QUA_DON_VI_LIEN_KET"] },
  });
  chuongTrinhIds.push(ct.id);
  const khoa = await prisma.khoa.create({
    data: { maKhoa: `K05_${uid()}`, chuongTrinhId: ct.id, siSoToiDa: 30, trangThai: "DANG_TUYEN_SINH" },
  });
  khoaIds.push(khoa.id);
  const dv = await taoDonViLienKet({ ma: `DV05_${uid()}`, ten: "Đơn vị DVLK-05" });
  donViIds.push(dv.id);
  const tk = await capTaiKhoanDonViLienKet(dv.id, { tenDangNhap: `dv05_${uid()}`, matKhau: "MatKhau123", hoTen: "CB" });
  nguoiDungIds.push(tk.id);
  const hopDong = await prisma.hopDongLienKet.create({
    data: { maHopDong: `HD05_${uid()}`, donViLienKetId: dv.id, khoaId: khoa.id },
  });
  const dsHoSo = [];
  for (const [i, han] of hanNop.entries()) {
    const hv = await prisma.hocVien.create({ data: { maHocVien: `HV05_${uid()}`, hoTen: `Học viên ${i + 1}` } });
    hocVienIds.push(hv.id);
    dsHoSo.push(
      await prisma.dangKyHoc.create({
        data: { hocVienId: hv.id, khoaId: khoa.id, trangThai: "CHO_NOP_GIAY", hanNopGiay: han, hopDongLienKetId: hopDong.id },
      }),
    );
  }
  return { khoa, dv, tk, hopDong, dsHoSo };
}

const conHan = () => new Date(Date.now() + 7 * NGAY);
const quaHan = () => new Date(Date.now() - NGAY);

describe("DVLK-05 đơn vị liên kết xác nhận đã thu hồ sơ, tổng hợp gửi trường theo lô", () => {
  it("xác nhận hồ sơ được chọn -> Đã nộp hồ sơ giấy - chờ duyệt, gom 1 lô; thông tin lô để trống được", async () => {
    const f = await taoHopDongCoHoSo([conHan(), conHan(), conHan()]);

    const [lo] = await xacNhanThuHoSo(
      { loai: "DVLK", nguoiDungId: f.tk.id },
      { ...NGUOI, dangKyIds: [f.dsHoSo[0].id, f.dsHoSo[1].id], hinhThuc: " ", ghiChu: "" },
    );

    expect(lo.maLo).toBe(`NHS-${f.hopDong.maHopDong}-01`);
    expect([lo.hinhThuc, lo.ghiChu, lo.nguoiXacNhan]).toEqual([null, null, NGUOI.nguoiThucHienTen]);
    expect(lo.ngayGui.toDateString()).toBe(new Date().toDateString());
    const sau = await prisma.dangKyHoc.findMany({ where: { hopDongLienKetId: f.hopDong.id }, orderBy: { id: "asc" } });
    const theoId = new Map(sau.map((dk) => [dk.id, dk]));
    expect([0, 1].map((i) => [theoId.get(f.dsHoSo[i].id)!.trangThai, theoId.get(f.dsHoSo[i].id)!.loNopHoSoId])).toEqual([
      ["DA_NOP_GIAY", lo.id],
      ["DA_NOP_GIAY", lo.id],
    ]);
    expect(theoId.get(f.dsHoSo[2].id)!.trangThai).toBe("CHO_NOP_GIAY");
    expect(await prisma.thongBao.count({ where: { hocVienId: f.dsHoSo[0].hocVienId, tieuDe: { contains: "tiếp nhận" } } })).toBe(1);

    // lô thứ 2 của cùng hợp đồng, phía trường xác nhận thay
    const [lo2] = await xacNhanThuHoSo(
      { loai: "TRUONG" },
      { ...NGUOI, dangKyIds: [f.dsHoSo[2].id], ngayGui: "2026-10-01", hinhThuc: "Bản scan" },
    );
    expect([lo2.maLo, lo2.hinhThuc]).toEqual([`NHS-${f.hopDong.maHopDong}-02`, "Bản scan"]);
    expect((await danhSachLoNopHoSo(f.hopDong.id)).map((l) => [l.maLo, l._count.dangKys])).toEqual([
      [lo.maLo, 2],
      [lo2.maLo, 1],
    ]);
  });

  it("hồ sơ quá hạn nộp giấy chưa được xác nhận tự động bị hủy; chọn cả hồ sơ quá hạn thì không xác nhận gì", async () => {
    const f = await taoHopDongCoHoSo([conHan(), quaHan()]);

    await expect(
      xacNhanThuHoSo({ loai: "DVLK", nguoiDungId: f.tk.id }, { ...NGUOI, dangKyIds: f.dsHoSo.map((dk) => dk.id) }),
    ).rejects.toThrow(/Học viên 2 \(đã hủy do quá hạn\)/);

    const [conHanSau, quaHanSau] = await Promise.all(
      f.dsHoSo.map((dk) => prisma.dangKyHoc.findUniqueOrThrow({ where: { id: dk.id } })),
    );
    expect([conHanSau.trangThai, quaHanSau.trangThai]).toEqual(["CHO_NOP_GIAY", "HUY_QUA_HAN_NOP_GIAY"]);
    expect(await prisma.loNopHoSo.count({ where: { hopDongLienKetId: f.hopDong.id } })).toBe(0);
  });

  it("danh sách hồ sơ (DVLK-04) và trang hợp đồng (DVLK-03) tự hủy hồ sơ quá hạn khi mở", async () => {
    const f = await taoHopDongCoHoSo([quaHan()]);
    const { dsHoSo } = await hoSoCuaDonVi(f.tk.id);
    expect(dsHoSo.find((hs) => hs.id === f.dsHoSo[0].id)?.trangThai).toBe("HUY_QUA_HAN_NOP_GIAY");

    const g = await taoHopDongCoHoSo([quaHan()]);
    const hd = await layHopDong(g.hopDong.id);
    expect(hd.dangKys[0].trangThai).toBe("HUY_QUA_HAN_NOP_GIAY");
    expect(hd.thucTe).toBe(0);
  });

  it("hồ sơ qua đơn vị liên kết không xác nhận được qua HV-02 (Phương thức 1), không có trong danh sách HV-02", async () => {
    const f = await taoHopDongCoHoSo([conHan()]);
    await expect(xacNhanNopGiay(f.dsHoSo[0].id)).rejects.toThrow(HoSoQuaDonViLienKetError);
    expect((await danhSachChoNopGiay(f.khoa.id)).map((dk) => dk.id)).not.toContain(f.dsHoSo[0].id);
    expect((await prisma.dangKyHoc.findUniqueOrThrow({ where: { id: f.dsHoSo[0].id } })).trangThai).toBe("CHO_NOP_GIAY");
  });

  it("chặn: hồ sơ đơn vị khác, hồ sơ đã xác nhận, hợp đồng đã thanh lý, danh sách trống, tài khoản không gắn đơn vị", async () => {
    const f = await taoHopDongCoHoSo([conHan(), conHan()]);
    const g = await taoHopDongCoHoSo([conHan()]);

    await expect(
      xacNhanThuHoSo({ loai: "DVLK", nguoiDungId: f.tk.id }, { ...NGUOI, dangKyIds: [f.dsHoSo[0].id, g.dsHoSo[0].id] }),
    ).rejects.toThrow(NgoaiPhamViDonViLienKetError);
    await expect(
      xacNhanThuHoSo({ loai: "DVLK", nguoiDungId: f.tk.id }, { ...NGUOI, dangKyIds: ["khong-co"] }),
    ).rejects.toThrow(NgoaiPhamViDonViLienKetError);
    await expect(xacNhanThuHoSo({ loai: "DVLK", nguoiDungId: f.tk.id }, { ...NGUOI, dangKyIds: [] })).rejects.toThrow(
      ThieuThongTinDvlkError,
    );

    await xacNhanThuHoSo({ loai: "DVLK", nguoiDungId: f.tk.id }, { ...NGUOI, dangKyIds: [f.dsHoSo[0].id] });
    await expect(
      xacNhanThuHoSo({ loai: "DVLK", nguoiDungId: f.tk.id }, { ...NGUOI, dangKyIds: [f.dsHoSo[0].id, f.dsHoSo[1].id] }),
    ).rejects.toThrow(HoSoKhongChoThuError);
    expect((await prisma.dangKyHoc.findUniqueOrThrow({ where: { id: f.dsHoSo[1].id } })).trangThai).toBe("CHO_NOP_GIAY");

    await prisma.hopDongLienKet.update({ where: { id: f.hopDong.id }, data: { trangThai: "DA_THANH_LY" } });
    await expect(
      xacNhanThuHoSo({ loai: "TRUONG" }, { ...NGUOI, dangKyIds: [f.dsHoSo[1].id] }),
    ).rejects.toThrow(HopDongDaThanhLyError);

    const nd = await prisma.nguoiDung.create({ data: { tenDangNhap: `x05_${uid()}`, matKhauHash: "x", hoTen: "X" } });
    nguoiDungIds.push(nd.id);
    await expect(
      xacNhanThuHoSo({ loai: "DVLK", nguoiDungId: nd.id }, { ...NGUOI, dangKyIds: [g.dsHoSo[0].id] }),
    ).rejects.toThrow(KhongPhaiTaiKhoanDvlkError);
  });
});
