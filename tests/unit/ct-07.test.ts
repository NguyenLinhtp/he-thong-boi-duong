import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  thietLapPhuongThucDangKy,
  PhuongThucDangKyKhongHopLeError,
} from "@/server/services/ct/ct-07-phuong-thuc-dang-ky";
import {
  SaiTrangThaiChuongTrinhError,
  KhongTimThayChuongTrinhError,
} from "@/server/services/ct/loi-chuong-trinh";

const chuongTrinhTaoTrongTest: string[] = [];
const loaiHinhTaoTrongTest: string[] = [];
const khoaTaoTrongTest: string[] = [];

afterAll(async () => {
  await prisma.khoa.deleteMany({ where: { id: { in: khoaTaoTrongTest } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinhTaoTrongTest } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinhTaoTrongTest } } });
});

async function taoChuongTrinh(trangThai: "DU_THAO" | "DA_BAN_HANH" | "NGUNG_HIEU_LUC" = "DU_THAO") {
  const lh = await prisma.loaiHinhBoiDuong.create({
    data: { ma: `LH_CT07_${crypto.randomUUID()}`, ten: "Loại hình test CT-07" },
  });
  loaiHinhTaoTrongTest.push(lh.id);

  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_CT07_${crypto.randomUUID()}`,
      ten: "Chương trình test CT-07",
      loaiHinhBoiDuongId: lh.id,
      trangThai,
      ...(trangThai === "DA_BAN_HANH"
        ? { soQuyetDinh: "QD-CT07", ngayBanHanh: new Date() }
        : {}),
    },
  });
  chuongTrinhTaoTrongTest.push(ct.id);
  return ct;
}

describe("CT-07 thiết lập phương thức tiếp cận đăng ký học viên", () => {
  it("thiết lập thành công 1 trong 4 phương thức", async () => {
    const ct = await taoChuongTrinh();
    const daSua = await thietLapPhuongThucDangKy(ct.id, "TRUC_TUYEN_NOP_GIAY");
    expect(daSua.phuongThucDangKys).toEqual(["TRUC_TUYEN_NOP_GIAY"]);
  });

  it("đổi sang phương thức khác khi chưa có khóa nào", async () => {
    const ct = await taoChuongTrinh();
    await thietLapPhuongThucDangKy(ct.id, "TRUC_TUYEN_NOP_GIAY");
    const daSua = await thietLapPhuongThucDangKy(ct.id, "QUA_DON_VI_LIEN_KET");
    expect(daSua.phuongThucDangKys).toEqual(["QUA_DON_VI_LIEN_KET"]);
  });

  it("không tìm thấy chương trình", async () => {
    await expect(
      thietLapPhuongThucDangKy("khong-ton-tai", "CHI_DU_THI"),
    ).rejects.toThrow(KhongTimThayChuongTrinhError);
  });

  it("chặn thiết lập khi chương trình đã ngừng hiệu lực", async () => {
    const ct = await taoChuongTrinh("NGUNG_HIEU_LUC");
    await expect(thietLapPhuongThucDangKy(ct.id, "CHI_DU_THI")).rejects.toThrow(
      SaiTrangThaiChuongTrinhError,
    );
  });

  async function taoKhoa(chuongTrinhId: string, trangThai: "DANG_TUYEN_SINH" | "DANG_DIEN_RA" | "DA_KET_THUC" = "DANG_TUYEN_SINH") {
    const khoa = await prisma.khoa.create({
      data: { maKhoa: `KH_CT07_${crypto.randomUUID()}`, chuongTrinhId, siSoToiDa: 30, trangThai },
    });
    khoaTaoTrongTest.push(khoa.id);
    return khoa;
  }

  it("(08/10/2026) chọn nhiều phương thức đào tạo cùng lúc, lưu theo thứ tự PT1 → PT4, bỏ trùng", async () => {
    const ct = await taoChuongTrinh();
    const sau = await thietLapPhuongThucDangKy(ct.id, ["QUA_DON_VI_LIEN_KET", "TRUC_TUYEN_NOP_GIAY", "IMPORT_TU_XAC_NHAN", "TRUC_TUYEN_NOP_GIAY"]);
    expect(sau.phuongThucDangKys).toEqual(["TRUC_TUYEN_NOP_GIAY", "IMPORT_TU_XAC_NHAN", "QUA_DON_VI_LIEN_KET"]);
  });

  it("(08/10/2026) chặn danh sách rỗng và PT3 chọn chung với phương thức đào tạo", async () => {
    const ct = await taoChuongTrinh();
    await expect(thietLapPhuongThucDangKy(ct.id, [])).rejects.toThrow(/ít nhất 1/);
    await expect(thietLapPhuongThucDangKy(ct.id, ["CHI_DU_THI", "TRUC_TUYEN_NOP_GIAY"])).rejects.toThrow(PhuongThucDangKyKhongHopLeError);
    expect((await prisma.chuongTrinh.findUniqueOrThrow({ where: { id: ct.id } })).phuongThucDangKys).toEqual([]);
  });

  it("(08/10/2026) có khóa đang hoạt động: sửa được phương thức (khóa dùng theo), bắt buộc lý do, ghi nhật ký", async () => {
    const ct = await taoChuongTrinh("DA_BAN_HANH");
    await thietLapPhuongThucDangKy(ct.id, "IMPORT_TU_XAC_NHAN");
    const khoa = await taoKhoa(ct.id, "DANG_DIEN_RA");

    await expect(thietLapPhuongThucDangKy(ct.id, ["IMPORT_TU_XAC_NHAN", "TRUC_TUYEN_NOP_GIAY"])).rejects.toThrow(/lý do/);
    await expect(thietLapPhuongThucDangKy(ct.id, ["TRUC_TUYEN_NOP_GIAY"], "  ")).rejects.toThrow(/lý do/);
    await thietLapPhuongThucDangKy(ct.id, ["IMPORT_TU_XAC_NHAN", "TRUC_TUYEN_NOP_GIAY"], "Mở thêm đăng ký tự do", {
      nguoiThucHienTen: "Test CT-07",
    });
    const khoaSau = await prisma.khoa.findUniqueOrThrow({ where: { id: khoa.id }, include: { chuongTrinh: true } });
    expect(khoaSau.chuongTrinh.phuongThucDangKys).toEqual(["TRUC_TUYEN_NOP_GIAY", "IMPORT_TU_XAC_NHAN"]);
    const nk = await prisma.nhatKyThaoTac.findFirst({ where: { hanhDong: "THIET_LAP_PHUONG_THUC_DANG_KY", doiTuongId: ct.id }, orderBy: { thoiGian: "desc" } });
    expect(nk?.chiTiet).toContain("PT2 -> PT1, PT2");
    expect(nk?.chiTiet).toContain("Mở thêm đăng ký tự do");

    // bỏ 1 phương thức: ghi rõ hồ sơ đã có giữ nguyên
    await thietLapPhuongThucDangKy(ct.id, ["TRUC_TUYEN_NOP_GIAY"], "Hết danh sách cử đi học");
    const nk2 = await prisma.nhatKyThaoTac.findFirst({ where: { hanhDong: "THIET_LAP_PHUONG_THUC_DANG_KY", doiTuongId: ct.id }, orderBy: { thoiGian: "desc" } });
    expect(nk2?.chiTiet).toContain("bỏ PT2");
  });

  it("(08/10/2026) đã có khóa (kể cả đã kết thúc): không đổi qua lại giữa dự thi (PT3) và đào tạo", async () => {
    const daoTao = await taoChuongTrinh("DA_BAN_HANH");
    await thietLapPhuongThucDangKy(daoTao.id, "TRUC_TUYEN_NOP_GIAY");
    await taoKhoa(daoTao.id, "DA_KET_THUC");
    await expect(thietLapPhuongThucDangKy(daoTao.id, ["CHI_DU_THI"], "x")).rejects.toThrow(/Phương thức 3/);

    const duThi = await taoChuongTrinh("DA_BAN_HANH");
    await thietLapPhuongThucDangKy(duThi.id, "CHI_DU_THI");
    await taoKhoa(duThi.id);
    await expect(thietLapPhuongThucDangKy(duThi.id, ["TRUC_TUYEN_NOP_GIAY"], "x")).rejects.toThrow(/Phương thức 3/);
    expect((await prisma.chuongTrinh.findUniqueOrThrow({ where: { id: duThi.id } })).phuongThucDangKys).toEqual(["CHI_DU_THI"]);
  });

  it("chưa có khóa: đổi giữa dự thi và đào tạo không cần lý do", async () => {
    const ct = await taoChuongTrinh("DA_BAN_HANH");
    await thietLapPhuongThucDangKy(ct.id, "CHI_DU_THI");
    expect((await thietLapPhuongThucDangKy(ct.id, ["TRUC_TUYEN_NOP_GIAY", "QUA_DON_VI_LIEN_KET"])).phuongThucDangKys).toEqual([
      "TRUC_TUYEN_NOP_GIAY",
      "QUA_DON_VI_LIEN_KET",
    ]);
  });

  it("vẫn cho 'đổi' sang đúng phương thức hiện tại (no-op) dù đang có khóa hoạt động", async () => {
    const ct = await taoChuongTrinh("DA_BAN_HANH");
    await thietLapPhuongThucDangKy(ct.id, "IMPORT_TU_XAC_NHAN");

    const khoa = await prisma.khoa.create({
      data: {
        maKhoa: `KH_CT07_${crypto.randomUUID()}`,
        chuongTrinhId: ct.id,
        siSoToiDa: 30,
        trangThai: "DANG_DIEN_RA",
      },
    });
    khoaTaoTrongTest.push(khoa.id);

    const daSua = await thietLapPhuongThucDangKy(ct.id, "IMPORT_TU_XAC_NHAN");
    expect(daSua.phuongThucDangKys).toEqual(["IMPORT_TU_XAC_NHAN"]);
  });
});
