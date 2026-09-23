import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  MaTrungError,
  DangDuocThamChieuError,
  ChongLapThoiGianError,
} from "@/server/services/shared/loi-danh-muc";
import {
  taoDotTuyenSinh,
  xoaDotTuyenSinh,
} from "@/server/services/dm/dm-05-dot-tuyen-sinh";
import { taoKhoaToiThieu } from "./helpers/tao-khoa-toi-thieu";

const dotTaoTrongTest: string[] = [];
const donDepKhoa: Array<() => Promise<void>> = [];

afterAll(async () => {
  for (const donDep of donDepKhoa) await donDep();
  await prisma.dotTuyenSinh.deleteMany({ where: { id: { in: dotTaoTrongTest } } });
});

async function taoDotTest(ngayBatDau: string, ngayKetThuc: string) {
  const ma = `DOT_TEST_${crypto.randomUUID()}`;
  const dot = await taoDotTuyenSinh({
    ma,
    ten: "Đợt test",
    ngayBatDau: new Date(ngayBatDau),
    ngayKetThuc: new Date(ngayKetThuc),
  });
  dotTaoTrongTest.push(dot.id);
  return dot;
}

describe("DM-05 quản lý danh mục đợt/kỳ tuyển sinh", () => {
  it("chặn tạo trùng mã", async () => {
    const dot = await taoDotTest("2026-01-01", "2026-02-01");
    await expect(
      taoDotTuyenSinh({
        ma: dot.ma,
        ten: "Trùng mã",
        ngayBatDau: new Date("2026-03-01"),
        ngayKetThuc: new Date("2026-04-01"),
      }),
    ).rejects.toThrow(MaTrungError);
  });

  it("chặn thời gian bắt đầu sau thời gian kết thúc", async () => {
    await expect(
      taoDotTuyenSinh({
        ma: `DOT_TEST_${crypto.randomUUID()}`,
        ten: "Sai thứ tự",
        ngayBatDau: new Date("2026-05-01"),
        ngayKetThuc: new Date("2026-04-01"),
      }),
    ).rejects.toThrow(ChongLapThoiGianError);
  });

  it("chặn tạo đợt chồng lấn thời gian với đợt đã có", async () => {
    await taoDotTest("2026-06-01", "2026-06-30");
    await expect(
      taoDotTuyenSinh({
        ma: `DOT_TEST_${crypto.randomUUID()}`,
        ten: "Chồng lấn",
        ngayBatDau: new Date("2026-06-15"),
        ngayKetThuc: new Date("2026-07-15"),
      }),
    ).rejects.toThrow(ChongLapThoiGianError);
  });

  it("cho tạo đợt liền kề không chồng lấn", async () => {
    await taoDotTest("2026-08-01", "2026-08-31");
    await expect(
      taoDotTest("2026-09-01", "2026-09-30"),
    ).resolves.not.toThrow();
  });

  it("chặn xóa đợt đang có khóa mở theo đợt này", async () => {
    const dot = await taoDotTest("2026-11-01", "2026-11-30");
    const khoaToiThieu = await taoKhoaToiThieu();
    donDepKhoa.push(khoaToiThieu.donDep);

    await prisma.khoa.update({
      where: { id: khoaToiThieu.khoaId },
      data: { dotTuyenSinhId: dot.id },
    });

    await expect(xoaDotTuyenSinh(dot.id)).rejects.toThrow(DangDuocThamChieuError);
  });
});
