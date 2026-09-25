import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { ghiNhatKy, danhSachNhatKy } from "@/server/services/qt/qt-03-nhat-ky";
import { layThamSo, layThamSoSo, capNhatThamSo, xoaThamSo } from "@/server/services/qt/qt-05-tham-so";

const nhatKyTaoTrongTest: string[] = [];
const thamSoTaoTrongTest: string[] = [];

afterAll(async () => {
  await prisma.nhatKyThaoTac.deleteMany({ where: { id: { in: nhatKyTaoTrongTest } } });
  await prisma.thamSoHeThong.deleteMany({ where: { ma: { in: thamSoTaoTrongTest } } });
});

describe("QT-03 nhật ký thao tác", () => {
  it("ghi và đọc lại đúng nhật ký theo đối tượng", async () => {
    const doiTuongId = crypto.randomUUID();
    const dong = await ghiNhatKy({
      nguoiThucHienId: "user-test",
      nguoiThucHienTen: "Cán bộ test",
      hanhDong: "XAC_NHAN_THANH_TOAN",
      doiTuong: "HocPhi",
      doiTuongId,
      chiTiet: "Nộp 5.000.000đ",
    });
    nhatKyTaoTrongTest.push(dong.id);

    const ds = await danhSachNhatKy({ doiTuong: "HocPhi", doiTuongId });
    expect(ds).toHaveLength(1);
    expect(ds[0].hanhDong).toBe("XAC_NHAN_THANH_TOAN");
    expect(ds[0].nguoiThucHienTen).toBe("Cán bộ test");
  });

  it("không lộ hàm sửa/xóa nhật ký ở tầng service", async () => {
    const dsHam = await import("@/server/services/qt/qt-03-nhat-ky");
    expect((dsHam as Record<string, unknown>).suaNhatKy).toBeUndefined();
    expect((dsHam as Record<string, unknown>).xoaNhatKy).toBeUndefined();
  });
});

describe("QT-05 cấu hình tham số hệ thống", () => {
  it("trả về mặc định khi tham số chưa được cấu hình", async () => {
    const gia = await layThamSoSo(`KHONG_TON_TAI_${crypto.randomUUID()}`, 7);
    expect(gia).toBe(7);
  });

  it("cập nhật tham số và ghi vào nhật ký thao tác", async () => {
    const ma = `TEST_THAM_SO_${crypto.randomUUID()}`;
    thamSoTaoTrongTest.push(ma);

    const thamSo = await capNhatThamSo({
      ma,
      giaTri: "10",
      moTa: "Tham số test",
      nguoiThucHienId: "user-test",
      nguoiThucHienTen: "Admin test",
    });
    expect(thamSo.giaTri).toBe("10");

    expect(await layThamSo(ma)).toBe("10");
    expect(await layThamSoSo(ma, 999)).toBe(10);

    const nhatKy = await danhSachNhatKy({ doiTuong: "ThamSoHeThong", doiTuongId: thamSo.id });
    for (const n of nhatKy) nhatKyTaoTrongTest.push(n.id);
    expect(nhatKy.some((n) => n.hanhDong === "TAO_THAM_SO")).toBe(true);
  });

  it("cập nhật lần 2 ghi CAP_NHAT_THAM_SO (không phải TAO_THAM_SO)", async () => {
    const ma = `TEST_THAM_SO_${crypto.randomUUID()}`;
    thamSoTaoTrongTest.push(ma);

    await capNhatThamSo({
      ma,
      giaTri: "1",
      nguoiThucHienId: null,
      nguoiThucHienTen: "Admin test",
    });
    const thamSo = await capNhatThamSo({
      ma,
      giaTri: "2",
      nguoiThucHienId: null,
      nguoiThucHienTen: "Admin test",
    });

    const nhatKy = await danhSachNhatKy({ doiTuong: "ThamSoHeThong", doiTuongId: thamSo.id });
    for (const n of nhatKy) nhatKyTaoTrongTest.push(n.id);
    expect(nhatKy.find((n) => n.chiTiet?.includes('"1" -> "2"'))?.hanhDong).toBe(
      "CAP_NHAT_THAM_SO",
    );
  });

  it("xóa tham số và ghi nhật ký", async () => {
    const ma = `TEST_THAM_SO_${crypto.randomUUID()}`;
    await capNhatThamSo({ ma, giaTri: "x", nguoiThucHienId: null, nguoiThucHienTen: "Admin test" });

    const daXoa = await xoaThamSo(ma, { id: null, ten: "Admin test" });
    expect(daXoa.ma).toBe(ma);
    expect(await layThamSo(ma)).toBeNull();

    const nhatKy = await danhSachNhatKy({ doiTuong: "ThamSoHeThong", doiTuongId: daXoa.id });
    for (const n of nhatKy) nhatKyTaoTrongTest.push(n.id);
    expect(nhatKy.some((n) => n.hanhDong === "XOA_THAM_SO")).toBe(true);
  });
});
