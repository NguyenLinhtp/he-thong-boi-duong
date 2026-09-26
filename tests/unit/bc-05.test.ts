import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { traCuuHoSo, lichSuTraCuu } from "@/server/services/bc/bc-05-tra-cuu-ho-so";
import { khoangNgay } from "@/server/services/bc/khoang-ngay";
import { KhoangNgayKhongHopLeError } from "@/server/services/bc/loi-bao-cao";

const uid = () => crypto.randomUUID().slice(0, 8);
const ids = { loaiHinh: [] as string[], chuongTrinh: [] as string[], khoa: [] as string[], hocVien: [] as string[] };
const NGUOI = { nguoiThucHienTen: "Cán bộ test BC-05" };

afterAll(async () => {
  await prisma.chungChi.deleteMany({ where: { khoaId: { in: ids.khoa } } });
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: ids.khoa } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: ids.hocVien } } });
  await prisma.khoa.deleteMany({ where: { id: { in: ids.khoa } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: ids.chuongTrinh } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: ids.loaiHinh } } });
});

/** Bộ hồ sơ mang 1 "dấu" riêng trong tên/mã để tìm cô lập khỏi dữ liệu khác trong DB. */
async function taoHoSo(dau: string) {
  const lh = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH_BC05_${uid()}`, ten: "LH" } });
  ids.loaiHinh.push(lh.id);
  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_${dau}`,
      ten: `Chương trình ${dau}`,
      loaiHinhBoiDuongId: lh.id,
      trangThai: "DA_BAN_HANH",
      soQuyetDinh: `QD-${dau}`,
      ngayBanHanh: new Date("2024-03-10T09:00:00"),
    },
  });
  ids.chuongTrinh.push(ct.id);
  const khoa = await prisma.khoa.create({
    data: { maKhoa: `K_${dau}`, chuongTrinhId: ct.id, siSoToiDa: 20, thoiGianKhaiGiang: new Date("2024-05-01T08:00:00") },
  });
  ids.khoa.push(khoa.id);
  const hv = await prisma.hocVien.create({ data: { maHocVien: `HV_${dau}`, hoTen: `Nguyễn Văn ${dau}` } });
  ids.hocVien.push(hv.id);
  await prisma.dangKyHoc.create({
    data: { hocVienId: hv.id, khoaId: khoa.id, trangThai: "HOAN_THANH", ngayDangKy: new Date("2024-04-20T10:00:00") },
  });
  const cc = await prisma.chungChi.create({
    data: {
      hocVienId: hv.id,
      khoaId: khoa.id,
      trangThai: "DA_CAP",
      soHieu: `CC_${dau}`,
      soQuyetDinh: `QDCC-${dau}`,
      ngayCap: new Date("2024-07-15T09:00:00"),
    },
  });
  return { ct, khoa, hv, cc };
}

describe("BC-05 tra cứu hồ sơ lưu trữ điện tử", () => {
  it("tìm theo từ khóa trên cả 4 loại hồ sơ, mỗi kết quả có liên kết xem chi tiết", async () => {
    const dau = `BC05${uid()}`;
    const f = await taoHoSo(dau);

    const { ketQua, tong, soKetQua } = await traCuuHoSo({ tuKhoa: dau.toLowerCase() }, NGUOI);

    expect(tong).toEqual({ CHUONG_TRINH: 1, KHOA: 1, HOC_VIEN: 1, CHUNG_CHI: 1 });
    expect(soKetQua).toBe(4);
    const theoLoai = Object.fromEntries(ketQua.map((k) => [k.loai, k]));
    expect(theoLoai.CHUONG_TRINH).toMatchObject({ id: f.ct.id, lienKet: `/chuong-trinh/${f.ct.id}` });
    expect(theoLoai.KHOA).toMatchObject({ id: f.khoa.id, lienKet: `/khoa-hoc/${f.khoa.id}` });
    expect(theoLoai.HOC_VIEN).toMatchObject({ id: f.hv.id, lienKet: `/hoc-vien/${f.hv.id}` });
    expect(theoLoai.CHUNG_CHI).toMatchObject({ id: f.cc.id, ma: `CC_${dau}`, lienKet: `/khoa-hoc/${f.khoa.id}/chung-chi` });
    // tìm được văn bằng theo số quyết định
    expect((await traCuuHoSo({ tuKhoa: `QDCC-${dau}`, loai: "CHUNG_CHI" }, NGUOI)).ketQua.map((k) => k.id)).toEqual([f.cc.id]);
  });

  it("lọc theo loại hồ sơ và khoảng thời gian theo mốc riêng của từng loại", async () => {
    const dau = `BC05${uid()}`;
    const f = await taoHoSo(dau);

    expect((await traCuuHoSo({ tuKhoa: dau, loai: "KHOA" }, NGUOI)).tong).toEqual({ KHOA: 1 });
    // tháng 3/2024: chỉ chương trình (ban hành 10/3)
    const thang3 = await traCuuHoSo({ tuKhoa: dau, ...khoangNgay("2024-03-01", "2024-03-31") }, NGUOI);
    expect(thang3.ketQua.map((k) => k.loai)).toEqual(["CHUONG_TRINH"]);
    // tháng 4-5/2024: học viên (đăng ký 20/4) và khóa (khai giảng 1/5)
    const thang45 = await traCuuHoSo({ tuKhoa: dau, ...khoangNgay("2024-04-01", "2024-05-31") }, NGUOI);
    expect(thang45.ketQua.map((k) => k.loai).sort()).toEqual(["HOC_VIEN", "KHOA"]);
    // chỉ theo kỳ (không từ khóa) vẫn tra được; ngày cuối kỳ tính trọn ngày
    const ngayCap = await traCuuHoSo({ ...khoangNgay("2024-07-15", "2024-07-15"), loai: "CHUNG_CHI" }, NGUOI);
    expect(ngayCap.ketQua.map((k) => k.id)).toContain(f.cc.id);
  });

  it("chặn tra cứu không có từ khóa lẫn khoảng thời gian (không đổ toàn bộ kho hồ sơ)", async () => {
    await expect(traCuuHoSo({ tuKhoa: "  " }, NGUOI)).rejects.toThrow(KhoangNgayKhongHopLeError);
  });

  it("mọi lượt tra cứu đều được ghi nhật ký kèm điều kiện và số kết quả", async () => {
    const dau = `BC05${uid()}`;
    await taoHoSo(dau);
    const nguoi = { nguoiThucHienTen: `Thanh tra ${uid()}` };

    await traCuuHoSo({ tuKhoa: dau, loai: "HOC_VIEN" }, nguoi);
    await traCuuHoSo({ tuKhoa: `khong-co-${dau}` }, nguoi);

    const nhatKy = await prisma.nhatKyThaoTac.findMany({
      where: { hanhDong: "TRA_CUU_HO_SO_LUU_TRU", nguoiThucHienTen: nguoi.nguoiThucHienTen },
      orderBy: { thoiGian: "asc" },
    });
    expect(nhatKy.map((n) => [n.doiTuongId, n.chiTiet])).toEqual([
      ["HOC_VIEN", `Từ khóa: "${dau}"; loại: Học viên; kỳ: (không); 1 kết quả`],
      ["TAT_CA", `Từ khóa: "khong-co-${dau}"; loại: tất cả; kỳ: (không); 0 kết quả`],
    ]);
    expect((await lichSuTraCuu(5)).some((n) => n.nguoiThucHienTen === nguoi.nguoiThucHienTen)).toBe(true);
  });
});
