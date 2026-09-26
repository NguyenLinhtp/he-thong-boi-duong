import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  taoDonViLienKet,
  capNhatDonViLienKet,
  doiTrangThaiHopTac,
  xoaDonViLienKet,
  danhSachDonViLienKet,
} from "@/server/services/dvlk/dvlk-01-danh-muc";
import {
  MaDonViLienKetTrungError,
  ThieuThongTinDvlkError,
  DonViConHopDongError,
  KhongTimThayDonViLienKetError,
} from "@/server/services/dvlk/loi-dvlk";

const uid = () => crypto.randomUUID().slice(0, 8);
const donViIds: string[] = [];
const loaiHinhIds: string[] = [];
const chuongTrinhIds: string[] = [];
const khoaIds: string[] = [];
const NGUOI = { nguoiThucHienTen: "Cán bộ test DVLK-01" };

afterAll(async () => {
  await prisma.hopDongLienKet.deleteMany({ where: { donViLienKetId: { in: donViIds } } });
  await prisma.donViLienKet.deleteMany({ where: { id: { in: donViIds } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaIds } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinhIds } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinhIds } } });
});

async function tao(ma = `DV01_${uid()}`, ten = "Trung tâm GDTX A") {
  const dv = await taoDonViLienKet({ ma, ten, soDienThoai: " 0905 ", email: "" }, NGUOI);
  donViIds.push(dv.id);
  return dv;
}

async function taoHopDong(donViLienKetId: string, trangThai: "DANG_TRIEN_KHAI" | "DA_THANH_LY") {
  const lh = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH01_${uid()}`, ten: "LH" } });
  loaiHinhIds.push(lh.id);
  const ct = await prisma.chuongTrinh.create({
    data: { maCT: `CT01_${uid()}`, ten: "CT", loaiHinhBoiDuongId: lh.id, trangThai: "DA_BAN_HANH" },
  });
  chuongTrinhIds.push(ct.id);
  const khoa = await prisma.khoa.create({ data: { maKhoa: `K01_${uid()}`, chuongTrinhId: ct.id, siSoToiDa: 30 } });
  khoaIds.push(khoa.id);
  return prisma.hopDongLienKet.create({
    data: { maHopDong: `HD01_${uid()}`, donViLienKetId, khoaId: khoa.id, trangThai },
  });
}

describe("DVLK-01 quản lý danh mục đơn vị liên kết", () => {
  it("thêm đơn vị: chuẩn hóa khoảng trắng, mặc định Đang hợp tác, ghi nhật ký", async () => {
    const dv = await tao();
    expect([dv.soDienThoai, dv.email, dv.trangThaiHopTac]).toEqual(["0905", null, "DANG_HOP_TAC"]);
    expect(await prisma.nhatKyThaoTac.count({ where: { hanhDong: "TAO_DON_VI_LIEN_KET", doiTuongId: dv.id } })).toBe(1);
  });

  it("chặn mã trùng (không phân biệt hoa/thường) khi thêm và khi sửa; chặn thiếu mã/tên", async () => {
    const ma = `DV01_${uid()}`;
    const dv = await tao(ma);
    const khac = await tao();

    await expect(taoDonViLienKet({ ma: ma.toLowerCase(), ten: "B" })).rejects.toThrow(MaDonViLienKetTrungError);
    await expect(capNhatDonViLienKet(khac.id, { ma, ten: "B" })).rejects.toThrow(MaDonViLienKetTrungError);
    await expect(taoDonViLienKet({ ma: " ", ten: "B" })).rejects.toThrow(ThieuThongTinDvlkError);
    await expect(capNhatDonViLienKet(dv.id, { ma, ten: "" })).rejects.toThrow(ThieuThongTinDvlkError);

    // sửa chính nó giữ nguyên mã thì không bị coi là trùng
    const sau = await capNhatDonViLienKet(dv.id, { ma, ten: "Tên mới", nguoiDaiDien: "Ông B" }, NGUOI);
    expect([sau.ten, sau.nguoiDaiDien]).toEqual(["Tên mới", "Ông B"]);
  });

  it("đổi trạng thái hợp tác và tra cứu theo từ khóa/trạng thái", async () => {
    const ten = `Đơn vị tra cứu ${uid()}`;
    const dv = await tao(undefined, ten);
    await doiTrangThaiHopTac(dv.id, "TAM_NGUNG", NGUOI);

    expect((await danhSachDonViLienKet({ tuKhoa: ten.toUpperCase() })).map((d) => d.id)).toEqual([dv.id]);
    expect((await danhSachDonViLienKet({ tuKhoa: ten, trangThaiHopTac: "DANG_HOP_TAC" })).length).toBe(0);
    expect((await danhSachDonViLienKet({ tuKhoa: "0905", trangThaiHopTac: "TAM_NGUNG" })).map((d) => d.id)).toContain(dv.id);
  });

  it("không xóa được đơn vị đang có hợp đồng chưa thanh lý (hoặc đã có hợp đồng); xóa được đơn vị chưa có hợp đồng", async () => {
    const dvCoHd = await tao();
    await taoHopDong(dvCoHd.id, "DANG_TRIEN_KHAI");
    await expect(xoaDonViLienKet(dvCoHd.id)).rejects.toThrow(/1 hợp đồng liên kết chưa thanh lý/);

    const dvDaThanhLy = await tao();
    await taoHopDong(dvDaThanhLy.id, "DA_THANH_LY");
    await expect(xoaDonViLienKet(dvDaThanhLy.id)).rejects.toThrow(DonViConHopDongError);

    const dvTrong = await tao();
    await xoaDonViLienKet(dvTrong.id, NGUOI);
    expect(await prisma.donViLienKet.findUnique({ where: { id: dvTrong.id } })).toBeNull();
    await expect(xoaDonViLienKet(dvTrong.id)).rejects.toThrow(KhongTimThayDonViLienKetError);
  });
});
