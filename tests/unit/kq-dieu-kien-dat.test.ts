import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { dieuKienDatCuaKhoa } from "@/server/services/kq/dung-chung";
import { datDiemDatChuongTrinh, datDiemDatKhoa, DieuKienDatError } from "@/server/services/kq/dieu-kien-dat";
import { nhapKetQuaThi } from "@/server/services/kq/kq-06-ket-qua-thi";
import { pheDuyetKetQua } from "@/server/services/kq/kq-04-phe-duyet";
import { KetQuaDaPheDuyetError } from "@/server/services/kq/loi-ket-qua";

// (bổ sung 13/10/2026) điều kiện đạt cài ở chương trình, khóa sửa riêng; đổi thì tính lại Đạt/Không đạt

const NGUOI = { nguoiThucHienTen: "Cán bộ test điều kiện đạt" };
const ids = { loaiHinh: [] as string[], chuongTrinh: [] as string[], khoa: [] as string[], hocVien: [] as string[] };

afterAll(async () => {
  await prisma.ketQuaKhoa.deleteMany({ where: { khoaId: { in: ids.khoa } } });
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: ids.khoa } } });
  await prisma.thongBao.deleteMany({ where: { hocVienId: { in: ids.hocVien } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: ids.hocVien } } });
  await prisma.khoa.deleteMany({ where: { id: { in: ids.khoa } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: ids.chuongTrinh } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: ids.loaiHinh } } });
});

async function khoaDuThi() {
  const lh = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH_DK_${crypto.randomUUID()}`, ten: "LH điều kiện đạt" } });
  ids.loaiHinh.push(lh.id);
  const ct = await prisma.chuongTrinh.create({
    data: { maCT: `CT_DK_${crypto.randomUUID()}`, ten: "Thi tiếng Anh CĐR", loaiHinhBoiDuongId: lh.id, trangThai: "DA_BAN_HANH", phuongThucDangKys: ["CHI_DU_THI"] },
  });
  ids.chuongTrinh.push(ct.id);
  const khoa = await prisma.khoa.create({ data: { maKhoa: `KHDK${crypto.randomUUID().slice(0, 8)}`, chuongTrinhId: ct.id, siSoToiDa: 10 } });
  ids.khoa.push(khoa.id);
  const hv = await prisma.hocVien.create({ data: { maHocVien: `HVDK${crypto.randomUUID().slice(0, 10)}`, hoTen: "Thí sinh điều kiện" } });
  ids.hocVien.push(hv.id);
  await prisma.dangKyHoc.create({ data: { hocVienId: hv.id, khoaId: khoa.id, trangThai: "CHINH_THUC", phuongThuc: "CHI_DU_THI" } });
  return { ct, khoa, hv };
}

const ketQua = (khoaId: string) => prisma.ketQuaKhoa.findFirstOrThrow({ where: { khoaId } });

describe("điều kiện đạt theo chương trình / khóa", () => {
  it("khóa theo chương trình, sửa riêng ở khóa, để trống quay về chương trình; đổi là tính lại Đạt/Không đạt", async () => {
    const { ct, khoa, hv } = await khoaDuThi();
    expect((await dieuKienDatCuaKhoa(khoa.id)).nguon).toBe("HE_THONG");

    await datDiemDatChuongTrinh(ct.id, 7, NGUOI);
    expect(await dieuKienDatCuaKhoa(khoa.id)).toEqual({ diemDat: 7, nguon: "CHUONG_TRINH" });
    await nhapKetQuaThi(khoa.id, [{ hocVienId: hv.id, diemThi: 6.5 }], NGUOI);
    expect(await ketQua(khoa.id)).toMatchObject({ datHocTap: false, hoanThanh: false });

    // khóa đặt riêng 6 -> tính lại thành Đạt
    expect((await datDiemDatKhoa(khoa.id, 6, NGUOI)).soTinhLai).toBe(1);
    expect(await dieuKienDatCuaKhoa(khoa.id)).toEqual({ diemDat: 6, nguon: "KHOA" });
    expect(await ketQua(khoa.id)).toMatchObject({ datHocTap: true, hoanThanh: true });

    // chương trình đổi không ảnh hưởng khóa đã đặt riêng
    await datDiemDatChuongTrinh(ct.id, 8, NGUOI);
    expect(await ketQua(khoa.id)).toMatchObject({ datHocTap: true });

    // khóa để trống -> theo chương trình (8) -> Không đạt
    await datDiemDatKhoa(khoa.id, null, NGUOI);
    expect(await ketQua(khoa.id)).toMatchObject({ datHocTap: false });

    // chương trình hạ xuống 6,5 -> khóa theo chương trình được tính lại
    expect((await datDiemDatChuongTrinh(ct.id, 6.5, NGUOI)).soKhoaTinhLai).toBe(1);
    expect(await ketQua(khoa.id)).toMatchObject({ datHocTap: true });

    await expect(datDiemDatKhoa(khoa.id, 11, NGUOI)).rejects.toThrow(DieuKienDatError);
    await expect(datDiemDatChuongTrinh(ct.id, -1, NGUOI)).rejects.toThrow(/0 đến 10/);
    expect(await prisma.nhatKyThaoTac.count({ where: { hanhDong: "DAT_DIEU_KIEN_DAT", doiTuongId: { in: [ct.id, khoa.id] } } })).toBe(5);
  });

  it("đã phê duyệt kết quả: không sửa điều kiện của khóa, đổi ở chương trình không đổi kết quả đã duyệt", async () => {
    const { ct, khoa, hv } = await khoaDuThi();
    await nhapKetQuaThi(khoa.id, [{ hocVienId: hv.id, diemThi: 6 }], NGUOI);
    await pheDuyetKetQua(khoa.id, { soQuyetDinh: "QD-DK-1", nguoiThucHienTen: "Lãnh đạo" });
    await expect(datDiemDatKhoa(khoa.id, 7, NGUOI)).rejects.toThrow(KetQuaDaPheDuyetError);
    const truoc = await ketQua(khoa.id);
    expect((await datDiemDatChuongTrinh(ct.id, 9, NGUOI)).soKhoaTinhLai).toBe(0);
    expect((await ketQua(khoa.id)).datHocTap).toBe(truoc.datHocTap);
  });
});
