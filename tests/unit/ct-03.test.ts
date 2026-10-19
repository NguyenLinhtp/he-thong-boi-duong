import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { themHocPhan, canhBaoThoiLuong } from "@/server/services/ct/ct-02-hoc-phan";
import {
  trinhThamDinh,
  pheDuyet,
  traVeDuThao,
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
  // (sửa 19/10/2026) thời lượng tính theo tiết/tín chỉ/buổi - lệch chỉ cảnh báo, không chặn
  it("tổng thời lượng học phần lệch tổng thời lượng: vẫn trình thẩm định, phê duyệt được và nhật ký ghi cảnh báo", async () => {
    const ct = await taoChuongTrinhTest(10);
    await prisma.chuongTrinh.update({ where: { id: ct.id }, data: { donViThoiLuong: "TIN_CHI" } });
    await themHocPhan(ct.id, { ten: "A", soTiet: 5 });

    expect(await canhBaoThoiLuong(ct.id)).toBe(
      "Tổng thời lượng học phần (5 tín chỉ) chưa khớp tổng thời lượng chương trình (10 tín chỉ)",
    );
    expect((await trinhThamDinh(ct.id)).trangThai).toBe("CHO_THAM_DINH");
    const nk = await prisma.nhatKyThaoTac.findFirst({ where: { hanhDong: "TRINH_THAM_DINH_CHUONG_TRINH", doiTuongId: ct.id } });
    expect(nk?.chiTiet).toContain("cảnh báo: Tổng thời lượng học phần (5 tín chỉ)");
    expect((await pheDuyet(ct.id, { soQuyetDinh: "QD-LECH/2026" })).trangThai).toBe("DA_BAN_HANH");
  });

  it("thời lượng khớp thì không cảnh báo, nhật ký không ghi cảnh báo", async () => {
    const ct = await taoChuongTrinhTest(10);
    await themHocPhan(ct.id, { ten: "A", soTiet: 10 });

    expect(await canhBaoThoiLuong(ct.id)).toBeNull();
    await trinhThamDinh(ct.id);
    const nk = await prisma.nhatKyThaoTac.findFirst({ where: { hanhDong: "TRINH_THAM_DINH_CHUONG_TRINH", doiTuongId: ct.id } });
    expect(nk?.chiTiet).not.toContain("cảnh báo");
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

  // (bổ sung 14/10/2026) chương trình chỉ dự thi (PT3) không có học phần/tổng thời lượng
  it("chương trình chỉ dự thi (PT3) không có học phần, không có thời lượng vẫn trình thẩm định và ban hành được", async () => {
    const ct = await taoChuongTrinhTest(null);
    await prisma.chuongTrinh.update({ where: { id: ct.id }, data: { phuongThucDangKys: ["CHI_DU_THI"] } });

    const daTrinh = await trinhThamDinh(ct.id);
    expect(daTrinh.trangThai).toBe("CHO_THAM_DINH");
    expect((await pheDuyet(ct.id, { soQuyetDinh: "QD-PT3/2026" })).trangThai).toBe("DA_BAN_HANH");
  });

  it("chương trình chỉ dự thi (PT3) có thời lượng lệch số tiết học phần vẫn trình được", async () => {
    const ct = await taoChuongTrinhTest(30);
    await prisma.chuongTrinh.update({ where: { id: ct.id }, data: { phuongThucDangKys: ["CHI_DU_THI"] } });
    await themHocPhan(ct.id, { ten: "Ôn thi", soTiet: 5 });

    expect((await trinhThamDinh(ct.id)).trangThai).toBe("CHO_THAM_DINH");
  });

  it("chương trình đào tạo (PT1) chưa nhập tổng thời lượng: cảnh báo nhưng vẫn trình thẩm định được", async () => {
    const ct = await taoChuongTrinhTest(null);

    expect(await canhBaoThoiLuong(ct.id)).toBe("Chương trình chưa nhập tổng thời lượng (học phần: 0 tiết)");
    expect((await trinhThamDinh(ct.id)).trangThai).toBe("CHO_THAM_DINH");
  });

  it("chương trình chỉ dự thi (PT3) không cảnh báo thời lượng", async () => {
    const ct = await taoChuongTrinhTest(null);
    await prisma.chuongTrinh.update({ where: { id: ct.id }, data: { phuongThucDangKys: ["CHI_DU_THI"] } });

    expect(await canhBaoThoiLuong(ct.id)).toBeNull();
  });
});
