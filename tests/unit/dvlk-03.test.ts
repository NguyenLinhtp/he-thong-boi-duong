import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { taoDonViLienKet, doiTrangThaiHopTac } from "@/server/services/dvlk/dvlk-01-danh-muc";
import {
  taoHopDong,
  capNhatHopDong,
  danhSachHopDong,
  layHopDong,
  tuyChonLapHopDong,
} from "@/server/services/dvlk/dvlk-03-hop-dong";
import {
  DonViTamNgungError,
  KhoaKhongQuaDonViLienKetError,
  KhoaDaDongError,
  DaCoHopDongHieuLucError,
  HopDongDaThanhLyError,
  SoLieuHopDongKhongHopLeError,
  KhongTimThayDonViLienKetError,
} from "@/server/services/dvlk/loi-dvlk";

const uid = () => crypto.randomUUID().slice(0, 8);
const donViIds: string[] = [];
const loaiHinhIds: string[] = [];
const chuongTrinhIds: string[] = [];
const khoaIds: string[] = [];
const hocVienIds: string[] = [];
const NGUOI = { nguoiThucHienTen: "Cán bộ test DVLK-03" };

afterAll(async () => {
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.hopDongLienKet.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.donViLienKet.deleteMany({ where: { id: { in: donViIds } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: hocVienIds } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaIds } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinhIds } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinhIds } } });
});

async function taoDonVi() {
  const dv = await taoDonViLienKet({ ma: `DV03_${uid()}`, ten: "Đơn vị test DVLK-03" });
  donViIds.push(dv.id);
  return dv;
}

async function taoKhoa(
  opts: { phuongThuc?: "QUA_DON_VI_LIEN_KET" | "TRUC_TUYEN_NOP_GIAY"; trangThai?: "DANG_TUYEN_SINH" | "DA_KET_THUC" | "HUY" } = {},
) {
  const lh = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH03_${uid()}`, ten: "LH" } });
  loaiHinhIds.push(lh.id);
  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT03_${uid()}`,
      ten: "CT",
      loaiHinhBoiDuongId: lh.id,
      trangThai: "DA_BAN_HANH",
      phuongThucDangKy: opts.phuongThuc ?? "QUA_DON_VI_LIEN_KET",
    },
  });
  chuongTrinhIds.push(ct.id);
  const khoa = await prisma.khoa.create({
    data: { maKhoa: `K03_${uid()}`, chuongTrinhId: ct.id, siSoToiDa: 30, trangThai: opts.trangThai ?? "DANG_TUYEN_SINH" },
  });
  khoaIds.push(khoa.id);
  return khoa;
}

describe("DVLK-03 quản lý hợp đồng liên kết tuyển sinh theo khóa", () => {
  it("lập hợp đồng Đang triển khai, mã tự sinh theo khóa; nhiều đơn vị cùng 1 khóa", async () => {
    const khoa = await taoKhoa();
    const [dvA, dvB] = [await taoDonVi(), await taoDonVi()];

    const hdA = await taoHopDong({ donViLienKetId: dvA.id, khoaId: khoa.id, soLuongDuKien: 20, donGiaThoaThuan: 1500000 }, NGUOI);
    const hdB = await taoHopDong({ donViLienKetId: dvB.id, khoaId: khoa.id }, NGUOI);

    expect(hdA.trangThai).toBe("DANG_TRIEN_KHAI");
    expect([hdA.maHopDong, hdB.maHopDong]).toEqual([`HDLK-${khoa.maKhoa}-01`, `HDLK-${khoa.maKhoa}-02`]);
    expect([hdA.soLuongDuKien, Number(hdA.donGiaThoaThuan)]).toEqual([20, 1500000]);
    expect(await prisma.nhatKyThaoTac.count({ where: { hanhDong: "TAO_HOP_DONG_LIEN_KET", doiTuongId: hdA.id } })).toBe(1);
  });

  it("chặn: đơn vị tạm ngừng, khóa không Phương thức 4, khóa đã kết thúc/hủy, trùng hợp đồng đang triển khai, số liệu âm", async () => {
    const khoa = await taoKhoa();
    const dv = await taoDonVi();

    const dvTamNgung = await taoDonVi();
    await doiTrangThaiHopTac(dvTamNgung.id, "TAM_NGUNG");
    await expect(taoHopDong({ donViLienKetId: dvTamNgung.id, khoaId: khoa.id })).rejects.toThrow(DonViTamNgungError);

    const khoaPt1 = await taoKhoa({ phuongThuc: "TRUC_TUYEN_NOP_GIAY" });
    await expect(taoHopDong({ donViLienKetId: dv.id, khoaId: khoaPt1.id })).rejects.toThrow(KhoaKhongQuaDonViLienKetError);
    const khoaKetThuc = await taoKhoa({ trangThai: "DA_KET_THUC" });
    await expect(taoHopDong({ donViLienKetId: dv.id, khoaId: khoaKetThuc.id })).rejects.toThrow(KhoaDaDongError);
    const khoaHuy = await taoKhoa({ trangThai: "HUY" });
    await expect(taoHopDong({ donViLienKetId: dv.id, khoaId: khoaHuy.id })).rejects.toThrow(KhoaDaDongError);

    await expect(taoHopDong({ donViLienKetId: dv.id, khoaId: khoa.id, soLuongDuKien: -1 })).rejects.toThrow(
      SoLieuHopDongKhongHopLeError,
    );
    await expect(taoHopDong({ donViLienKetId: dv.id, khoaId: khoa.id, soLuongDuKien: 2.5 })).rejects.toThrow(
      SoLieuHopDongKhongHopLeError,
    );
    await expect(taoHopDong({ donViLienKetId: dv.id, khoaId: khoa.id, donGiaThoaThuan: -5 })).rejects.toThrow(
      SoLieuHopDongKhongHopLeError,
    );
    await expect(taoHopDong({ donViLienKetId: "khong-co", khoaId: khoa.id })).rejects.toThrow(KhongTimThayDonViLienKetError);

    const hd = await taoHopDong({ donViLienKetId: dv.id, khoaId: khoa.id });
    await expect(taoHopDong({ donViLienKetId: dv.id, khoaId: khoa.id })).rejects.toThrow(DaCoHopDongHieuLucError);
    expect(await prisma.hopDongLienKet.count({ where: { khoaId: khoa.id } })).toBe(1);

    // hợp đồng cũ đã thanh lý thì lập được hợp đồng mới cho cùng đơn vị-khóa
    await prisma.hopDongLienKet.update({ where: { id: hd.id }, data: { trangThai: "DA_THANH_LY" } });
    const moi = await taoHopDong({ donViLienKetId: dv.id, khoaId: khoa.id });
    expect(moi.maHopDong).toBe(`HDLK-${khoa.maKhoa}-02`);
  });

  it("sửa số lượng/đơn giá khi đang triển khai; chặn sửa sau khi thanh lý", async () => {
    const hd = await taoHopDong({ donViLienKetId: (await taoDonVi()).id, khoaId: (await taoKhoa()).id, soLuongDuKien: 10 });

    const sau = await capNhatHopDong(hd.id, { soLuongDuKien: 15, donGiaThoaThuan: 2000000, ghiChu: " Bổ sung " }, NGUOI);
    expect([sau.soLuongDuKien, Number(sau.donGiaThoaThuan), sau.ghiChu]).toEqual([15, 2000000, "Bổ sung"]);

    await prisma.hopDongLienKet.update({ where: { id: hd.id }, data: { trangThai: "DA_THANH_LY" } });
    await expect(capNhatHopDong(hd.id, { soLuongDuKien: 1 })).rejects.toThrow(HopDongDaThanhLyError);
  });

  it("số lượng thực tế không tính hồ sơ hủy quá hạn/không hợp lệ; lọc theo đơn vị/trạng thái", async () => {
    const khoa = await taoKhoa();
    const dv = await taoDonVi();
    const hd = await taoHopDong({ donViLienKetId: dv.id, khoaId: khoa.id, soLuongDuKien: 5 });
    for (const trangThai of ["CHO_NOP_GIAY", "CHINH_THUC", "THOI_HOC", "HUY_QUA_HAN_NOP_GIAY", "KHONG_HOP_LE"] as const) {
      const hv = await prisma.hocVien.create({ data: { maHocVien: `HV03_${uid()}`, hoTen: `HV ${trangThai}` } });
      hocVienIds.push(hv.id);
      await prisma.dangKyHoc.create({ data: { hocVienId: hv.id, khoaId: khoa.id, trangThai, hopDongLienKetId: hd.id } });
    }

    const chiTiet = await layHopDong(hd.id);
    expect(chiTiet.thucTe).toBe(3);
    expect(chiTiet.theoTrangThai).toMatchObject({ CHINH_THUC: 1, HUY_QUA_HAN_NOP_GIAY: 1, KHONG_HOP_LE: 1 });
    expect(chiTiet.dangKys).toHaveLength(5);

    const theoDonVi = await danhSachHopDong({ donViLienKetId: dv.id });
    expect(theoDonVi.map((h) => [h.id, h.thucTe])).toEqual([[hd.id, 3]]);
    expect(await danhSachHopDong({ donViLienKetId: dv.id, trangThai: "DA_THANH_LY" })).toHaveLength(0);
    expect((await danhSachHopDong({ tuKhoa: hd.maHopDong.toLowerCase() })).map((h) => h.id)).toEqual([hd.id]);
  });

  it("lựa chọn lập hợp đồng chỉ gồm đơn vị đang hợp tác và khóa Phương thức 4 còn mở", async () => {
    const dvTamNgung = await taoDonVi();
    await doiTrangThaiHopTac(dvTamNgung.id, "TAM_NGUNG");
    const khoaMo = await taoKhoa();
    const khoaPt1 = await taoKhoa({ phuongThuc: "TRUC_TUYEN_NOP_GIAY" });
    const khoaKetThuc = await taoKhoa({ trangThai: "DA_KET_THUC" });

    const { dsDonVi, dsKhoa } = await tuyChonLapHopDong();
    expect(dsDonVi.some((d) => d.id === dvTamNgung.id)).toBe(false);
    const idsKhoa = dsKhoa.map((k) => k.id);
    expect(idsKhoa).toContain(khoaMo.id);
    expect(idsKhoa).not.toContain(khoaPt1.id);
    expect(idsKhoa).not.toContain(khoaKetThuc.id);
  });
});
