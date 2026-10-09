import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { themHocPhan } from "@/server/services/ct/ct-02-hoc-phan";
import {
  trinhThamDinh,
  pheDuyet,
  traVeDuThao,
  ChuaSanSangTrinhDuyetError,
  ChuaChonPhuongThucDangKyError,
} from "@/server/services/ct/ct-03-phe-duyet";
import { SaiTrangThaiChuongTrinhError } from "@/server/services/ct/loi-chuong-trinh";

const chuongTrinhTaoTrongTest: string[] = [];
const loaiHinhTaoTrongTest: string[] = [];

afterAll(async () => {
  await prisma.hocPhan.deleteMany({ where: { chuongTrinhId: { in: chuongTrinhTaoTrongTest } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinhTaoTrongTest } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinhTaoTrongTest } } });
});

async function taoChuongTrinhTest(tongThoiLuong: number | null = 10) {
  const lh = await prisma.loaiHinhBoiDuong.create({
    data: { ma: `LH_CT03_${crypto.randomUUID()}`, ten: "Loại hình test CT-03" },
  });
  loaiHinhTaoTrongTest.push(lh.id);

  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_CT03_${crypto.randomUUID()}`,
      ten: "Chương trình test CT-03",
      loaiHinhBoiDuongId: lh.id,
      tongThoiLuong,
      phuongThucDangKys: ["TRUC_TUYEN_NOP_GIAY"],
    },
  });
  chuongTrinhTaoTrongTest.push(ct.id);
  return ct;
}

describe("CT-03 trình duyệt và phê duyệt chương trình", () => {
  it("chặn trình thẩm định khi tổng số tiết học phần chưa khớp tổng thời lượng", async () => {
    const ct = await taoChuongTrinhTest(10);
    await themHocPhan(ct.id, { ten: "A", soTiet: 5 });

    await expect(trinhThamDinh(ct.id)).rejects.toThrow(ChuaSanSangTrinhDuyetError);
  });

  it("chặn trình thẩm định khi chưa chọn phương thức đăng ký (CT-07) - khóa mở ra sẽ không đăng ký được", async () => {
    const ct = await taoChuongTrinhTest(10);
    await prisma.chuongTrinh.update({ where: { id: ct.id }, data: { phuongThucDangKys: [] } });
    await themHocPhan(ct.id, { ten: "A", soTiet: 10 });

    await expect(trinhThamDinh(ct.id)).rejects.toThrow(ChuaChonPhuongThucDangKyError);
    expect((await prisma.chuongTrinh.findUniqueOrThrow({ where: { id: ct.id } })).trangThai).toBe("DU_THAO");
  });

  it("luồng đầy đủ: Dự thảo -> Chờ thẩm định -> Đã ban hành kèm số quyết định", async () => {
    const ct = await taoChuongTrinhTest(10);
    await themHocPhan(ct.id, { ten: "A", soTiet: 10 });

    const daTrinh = await trinhThamDinh(ct.id, "Nội dung phù hợp");
    expect(daTrinh.trangThai).toBe("CHO_THAM_DINH");

    const daBanHanh = await pheDuyet(ct.id, { soQuyetDinh: "QD-123/2026" });
    expect(daBanHanh.trangThai).toBe("DA_BAN_HANH");
    expect(daBanHanh.soQuyetDinh).toBe("QD-123/2026");
    expect(daBanHanh.ngayBanHanh).not.toBeNull();
  });

  it("chỉ chương trình Đã ban hành mới hợp lệ - chặn phê duyệt khi chưa trình thẩm định", async () => {
    const ct = await taoChuongTrinhTest(10);
    await themHocPhan(ct.id, { ten: "A", soTiet: 10 });

    await expect(pheDuyet(ct.id, { soQuyetDinh: "QD-999" })).rejects.toThrow(
      SaiTrangThaiChuongTrinhError,
    );
  });

  it("bắt buộc số quyết định khi phê duyệt", async () => {
    const ct = await taoChuongTrinhTest(10);
    await themHocPhan(ct.id, { ten: "A", soTiet: 10 });
    await trinhThamDinh(ct.id);

    await expect(pheDuyet(ct.id, { soQuyetDinh: "" })).rejects.toThrow(
      "Số quyết định ban hành là bắt buộc",
    );
  });

  it("trả về Dự thảo khi thẩm định không đạt, sau đó trình lại được", async () => {
    const ct = await taoChuongTrinhTest(10);
    await themHocPhan(ct.id, { ten: "A", soTiet: 10 });
    await trinhThamDinh(ct.id);

    const daTraVe = await traVeDuThao(ct.id, "Chưa đạt, cần bổ sung");
    expect(daTraVe.trangThai).toBe("DU_THAO");

    const daTrinhLai = await trinhThamDinh(ct.id);
    expect(daTrinhLai.trangThai).toBe("CHO_THAM_DINH");
  });
});
