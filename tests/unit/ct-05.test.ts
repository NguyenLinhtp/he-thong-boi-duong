import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { timKiemChuongTrinh } from "@/server/services/ct/ct-05-tra-cuu";

const chuongTrinhTaoTrongTest: string[] = [];
const loaiHinhTaoTrongTest: string[] = [];
const hau = crypto.randomUUID();

let lh1Id: string;
let lh2Id: string;

beforeAll(async () => {
  const lh1 = await prisma.loaiHinhBoiDuong.create({
    data: { ma: `LH_CT05_A_${hau}`, ten: "Bồi dưỡng chuyên môn" },
  });
  const lh2 = await prisma.loaiHinhBoiDuong.create({
    data: { ma: `LH_CT05_B_${hau}`, ten: "Bồi dưỡng kỹ năng" },
  });
  loaiHinhTaoTrongTest.push(lh1.id, lh2.id);
  lh1Id = lh1.id;
  lh2Id = lh2.id;

  const dsChuongTrinh = await Promise.all([
    prisma.chuongTrinh.create({
      data: {
        maCT: `CT05A_${hau}`,
        ten: `Quản lý nhà nước nâng cao ${hau}`,
        loaiHinhBoiDuongId: lh1Id,
        trangThai: "DU_THAO",
      },
    }),
    prisma.chuongTrinh.create({
      data: {
        maCT: `CT05B_${hau}`,
        ten: `Kỹ năng sư phạm ${hau}`,
        loaiHinhBoiDuongId: lh2Id,
        trangThai: "CHO_THAM_DINH",
      },
    }),
    prisma.chuongTrinh.create({
      data: {
        maCT: `CT05C_${hau}`,
        ten: `Quản lý giáo dục cơ bản ${hau}`,
        loaiHinhBoiDuongId: lh1Id,
        trangThai: "DA_BAN_HANH",
        soQuyetDinh: "QD-CT05",
        ngayBanHanh: new Date(),
      },
    }),
  ]);
  chuongTrinhTaoTrongTest.push(...dsChuongTrinh.map((ct) => ct.id));
});

afterAll(async () => {
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinhTaoTrongTest } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinhTaoTrongTest } } });
});

describe("CT-05 tra cứu, tìm kiếm chương trình", () => {
  it("không lọc gì thì trả về tất cả (không giới hạn theo trạng thái)", async () => {
    const ket = await timKiemChuongTrinh();
    const maTrongKetQua = ket.map((ct) => ct.maCT);
    expect(maTrongKetQua).toContain(`CT05A_${hau}`);
    expect(maTrongKetQua).toContain(`CT05B_${hau}`);
    expect(maTrongKetQua).toContain(`CT05C_${hau}`);
  });

  it("lọc theo từ khóa tên - không phân biệt hoa/thường (ASCII), khớp một phần", async () => {
    // Chỉ kiểm tra case-folding trên phần ASCII của mã hậu tố - việc ILIKE có
    // gập hoa/thường đúng với ký tự có dấu tiếng Việt hay không phụ thuộc
    // locale của Postgres, không phải điều tầng service kiểm soát được.
    const ket = await timKiemChuongTrinh({ ten: hau.toUpperCase() });
    const maTrongKetQua = ket.map((ct) => ct.maCT).sort();
    expect(maTrongKetQua).toEqual([`CT05A_${hau}`, `CT05B_${hau}`, `CT05C_${hau}`].sort());
  });

  it("lọc theo mã CT một phần", async () => {
    const ket = await timKiemChuongTrinh({ maCT: `CT05B_${hau}` });
    expect(ket).toHaveLength(1);
    expect(ket[0].ten).toBe(`Kỹ năng sư phạm ${hau}`);
  });

  it("lọc theo loại hình bồi dưỡng", async () => {
    const ket = await timKiemChuongTrinh({ loaiHinhBoiDuongId: lh1Id });
    const maTrongKetQua = ket.map((ct) => ct.maCT).sort();
    expect(maTrongKetQua).toEqual([`CT05A_${hau}`, `CT05C_${hau}`].sort());
  });

  it("lọc theo trạng thái", async () => {
    const ket = await timKiemChuongTrinh({ trangThai: "DA_BAN_HANH" });
    expect(ket.map((ct) => ct.maCT)).toContain(`CT05C_${hau}`);
    expect(ket.map((ct) => ct.maCT)).not.toContain(`CT05A_${hau}`);
  });

  it("kết hợp nhiều bộ lọc cùng lúc", async () => {
    const ket = await timKiemChuongTrinh({ loaiHinhBoiDuongId: lh1Id, trangThai: "DU_THAO" });
    expect(ket).toHaveLength(1);
    expect(ket[0].maCT).toBe(`CT05A_${hau}`);
  });

  it("không khớp từ khóa nào thì trả về danh sách rỗng", async () => {
    const ket = await timKiemChuongTrinh({ ten: `khong-ton-tai-${hau}` });
    expect(ket).toHaveLength(0);
  });
});
