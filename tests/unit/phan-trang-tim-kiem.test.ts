import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { khopTuKhoa } from "@/lib/tim-kiem";
import { locVaPhanTrang, thamSoPhang, viTriTrang } from "@/components/chung/phan-trang";
import { trangHoSoHocVien } from "@/server/services/hv/hv-08-ho-so-hoc-vien";

// (bổ sung 06/10/2026) tìm nhanh + phân trang 20 dòng cho các danh sách HP/HV

const hocVienTao: string[] = [];
afterAll(async () => {
  await prisma.hocVien.deleteMany({ where: { id: { in: hocVienTao } } });
});

describe("khopTuKhoa - tìm theo họ tên/mã số", () => {
  const hv = { hoTen: "Phạm Thị Dung", soCCCD: "048205000004", maSinhVien: "3122000004", maHocVien: "HV20260033" };
  it("khớp mã SV, CCCD, mã học viên (bỏ khoảng trắng, không phân biệt hoa thường)", () => {
    expect(khopTuKhoa(hv, "3122000004")).toBe(true);
    expect(khopTuKhoa(hv, "048 205 000 004")).toBe(true);
    expect(khopTuKhoa(hv, "hv20260033")).toBe(true);
  });
  it("khớp họ tên có dấu hoặc không dấu, một phần tên", () => {
    expect(khopTuKhoa(hv, "pham thi dung")).toBe(true);
    expect(khopTuKhoa(hv, "Dung")).toBe(true);
    expect(khopTuKhoa(hv, "ĐUNG")).toBe(true);
    expect(khopTuKhoa(hv, "Dung Pham")).toBe(false);
  });
  it("tìm trong chữ bổ sung (lớp, số phiếu); từ khóa rỗng khớp tất cả; không khớp thì false", () => {
    expect(khopTuKhoa(hv, "23spt", ["23SPT"])).toBe(true);
    expect(khopTuKhoa(hv, "  ")).toBe(true);
    expect(khopTuKhoa(hv, "999999")).toBe(false);
  });
});

describe("locVaPhanTrang - mỗi danh sách có tham số riêng", () => {
  const ds = Array.from({ length: 45 }, (_, i) => ({ hocVien: { hoTen: i < 25 ? `Nguyễn Văn ${i}` : `Trần Thị ${i}` } }));
  it("lọc theo `${ma}_q`, cắt trang theo `${ma}_trang`, bỏ qua tham số của danh sách khác", () => {
    const sp = { cn_q: "tran thi", cn_trang: "2", pt_trang: "3" };
    const t = locVaPhanTrang(ds, sp, "cn", (d) => d.hocVien);
    expect(t).toMatchObject({ tuKhoa: "tran thi", tongGoc: 45, tongDong: 20, trang: 1, tongTrang: 1 });
    const t2 = locVaPhanTrang(ds, sp, "pt", (d) => d.hocVien);
    expect(t2).toMatchObject({ tuKhoa: "", tongDong: 45, trang: 3, tongTrang: 3 });
    expect(t2.dsTrang).toHaveLength(5);
  });
  it("viTriTrang cho phân trang trong CSDL; thamSoPhang bỏ giá trị rỗng", () => {
    expect(viTriTrang(41, "3")).toEqual({ trang: 3, tongTrang: 3, tongDong: 41, tuDong: 40 });
    expect(viTriTrang(0, "5")).toEqual({ trang: 1, tongTrang: 1, tongDong: 0, tuDong: 0 });
    expect(thamSoPhang({ a: "", b: ["x", "y"], c: undefined })).toEqual({ a: undefined, b: "x", c: undefined });
  });
});

describe("HV-08 trang hồ sơ học viên - phân trang trong CSDL", () => {
  it("đếm tổng theo từ khóa, lấy đúng trang; học viên ngoài phạm vi không thấy gì", async () => {
    const ma = `PTTK${Date.now()}`;
    for (let i = 0; i < 23; i++) {
      const hv = await prisma.hocVien.create({ data: { maHocVien: `${ma}${String(i).padStart(2, "0")}`, hoTen: `Học viên phân trang ${i}` } });
      hocVienTao.push(hv.id);
    }
    const tat = { toanBo: true, hocVienId: null } as const;
    const t1 = await trangHoSoHocVien(ma, tat, 0, 20);
    expect(t1.tong).toBe(23);
    expect(t1.ds).toHaveLength(20);
    const t2 = await trangHoSoHocVien(ma, tat, 20, 20);
    expect(t2.ds).toHaveLength(3);
    expect(await trangHoSoHocVien(ma, { toanBo: false, hocVienId: null }, 0, 20)).toEqual({ ds: [], tong: 0 });
  });
});
