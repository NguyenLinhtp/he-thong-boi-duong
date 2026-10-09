import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { thietLapPhuongThucDangKy } from "@/server/services/ct/ct-07-phuong-thuc-dang-ky";
import { dangKyTrucTuyen } from "@/server/services/hv/hv-01-dang-ky-truc-tuyen";
import { importDanhSachHocVien } from "@/server/services/hv/hv-03-import-danh-sach";
import { themHocVienVaoKhoa } from "@/server/services/hv/hv-09-quan-ly-danh-sach-khoa";
import { DaDangKyKhoaNayError, SaiPhuongThucDangKyError } from "@/server/services/hv/loi-hoc-vien";
import { canTaiKhoanKhiDangKy } from "@/lib/form-dang-ky";
import { loiTapPhuongThuc, nhanNganPhuongThuc } from "@/lib/phuong-thuc";
import type { PhuongThucDangKy } from "@/generated/prisma/client";
import { bienTheSoCCCD } from "@/server/services/hv/kiem-tra-trung-khoa";
import { DuLieuImportLoiError } from "@/server/services/hv/loi-hoc-vien";

// (bổ sung 08/10/2026 - CT-07) 1 chương trình nhiều phương thức: các khóa dùng theo danh sách của chương trình

const loaiHinh: string[] = [];
const chuongTrinh: string[] = [];
const khoaIds: string[] = [];

afterAll(async () => {
  const dk = await prisma.dangKyHoc.findMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: dk.map((d) => d.hocVienId) } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaIds } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinh } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinh } } });
});

async function taoKhoa(ds: PhuongThucDangKy[]) {
  const lh = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH_NPT_${crypto.randomUUID()}`, ten: "LH" } });
  loaiHinh.push(lh.id);
  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_NPT_${crypto.randomUUID()}`,
      ten: "CT nhiều phương thức",
      loaiHinhBoiDuongId: lh.id,
      trangThai: "DA_BAN_HANH",
      soQuyetDinh: "QD",
      ngayBanHanh: new Date(),
      phuongThucDangKys: ds,
    },
  });
  chuongTrinh.push(ct.id);
  const khoa = await prisma.khoa.create({ data: { maKhoa: `KH_NPT_${crypto.randomUUID()}`, chuongTrinhId: ct.id, siSoToiDa: 20, trangThai: "DANG_TUYEN_SINH" } });
  khoaIds.push(khoa.id);
  return { ct, khoa };
}

describe("CT-07 nhiều phương thức - quy tắc tập phương thức", () => {
  it("kiểm tra tập phương thức và nhãn", () => {
    expect(loiTapPhuongThuc(["TRUC_TUYEN_NOP_GIAY", "IMPORT_TU_XAC_NHAN", "QUA_DON_VI_LIEN_KET"])).toBeNull();
    expect(loiTapPhuongThuc(["CHI_DU_THI"])).toBeNull();
    expect(loiTapPhuongThuc([])).toMatch(/ít nhất/);
    expect(loiTapPhuongThuc(["CHI_DU_THI", "IMPORT_TU_XAC_NHAN"])).toMatch(/đứng riêng/);
    expect(loiTapPhuongThuc(["KHAC"])).toMatch(/không hợp lệ/);
    expect(nhanNganPhuongThuc(["QUA_DON_VI_LIEN_KET", "TRUC_TUYEN_NOP_GIAY"])).toBe("PT1, PT4");
    expect(canTaiKhoanKhiDangKy(["TRUC_TUYEN_NOP_GIAY", "IMPORT_TU_XAC_NHAN"])).toBe(true);
  });
});

describe("CT-07 nhiều phương thức - khóa nhận đăng ký theo mọi phương thức của chương trình", () => {
  it("PT1 + PT2: cùng 1 khóa vừa import danh sách được cử đi học vừa nhận đăng ký trực tuyến", async () => {
    const { khoa } = await taoKhoa(["TRUC_TUYEN_NOP_GIAY", "IMPORT_TU_XAC_NHAN"]);
    const cccdCu = `NPT${crypto.randomUUID().slice(0, 9)}`;
    const ds = await importDanhSachHocVien(khoa.id, ["hoTen,soCCCD,donViCongTac,soDienThoai,email", `Người được cử,${cccdCu},Trường A,,`].join("\n"));
    expect(ds[0].trangThai).toBe("CHO_TU_XAC_NHAN");

    const tuDo = await dangKyTrucTuyen({ khoaId: khoa.id, hoTen: "Tự đăng ký", soCCCD: `NPT${crypto.randomUUID().slice(0, 9)}` });
    expect(tuDo.trangThai).toBe("CHO_NOP_GIAY");

    // người đã có tên trong danh sách cử đi học tự đăng ký lại: hướng dẫn sang xác nhận tham gia
    const loi = await dangKyTrucTuyen({ khoaId: khoa.id, hoTen: "Người được cử", soCCCD: cccdCu }).catch((e) => e);
    expect(loi).toBeInstanceOf(DaDangKyKhoaNayError);
    expect(loi.message).toMatch(/Xác nhận tham gia/);
  });

  it("bỏ phương thức ở chương trình thì khóa ngừng nhận đăng ký mới theo phương thức đó, hồ sơ cũ giữ nguyên", async () => {
    const { ct, khoa } = await taoKhoa(["TRUC_TUYEN_NOP_GIAY", "IMPORT_TU_XAC_NHAN"]);
    const cu = await dangKyTrucTuyen({ khoaId: khoa.id, hoTen: "Đăng ký trước", soCCCD: `NPT${crypto.randomUUID().slice(0, 9)}` });
    await thietLapPhuongThucDangKy(ct.id, ["IMPORT_TU_XAC_NHAN"], "Chỉ nhận theo danh sách cử đi học");
    await expect(
      dangKyTrucTuyen({ khoaId: khoa.id, hoTen: "Đăng ký sau", soCCCD: `NPT${crypto.randomUUID().slice(0, 9)}` }),
    ).rejects.toThrow(SaiPhuongThucDangKyError);
    expect((await prisma.dangKyHoc.findUniqueOrThrow({ where: { id: cu.id } })).trangThai).toBe("CHO_NOP_GIAY");

    // thêm lại PT1 -> khóa nhận đăng ký trực tuyến ngay
    await thietLapPhuongThucDangKy(ct.id, ["IMPORT_TU_XAC_NHAN", "TRUC_TUYEN_NOP_GIAY"], "Mở lại");
    const moi = await dangKyTrucTuyen({ khoaId: khoa.id, hoTen: "Đăng ký lại được", soCCCD: `NPT${crypto.randomUUID().slice(0, 9)}` });
    expect(moi.trangThai).toBe("CHO_NOP_GIAY");
  });

  it("HV-09: khóa chỉ qua đơn vị liên kết chặn cán bộ thêm trực tiếp; có thêm PT1 thì được thêm", async () => {
    const chiPT4 = await taoKhoa(["QUA_DON_VI_LIEN_KET"]);
    await expect(
      themHocVienVaoKhoa({ khoaId: chiPT4.khoa.id, hoTen: "A", soCCCD: `NPT${crypto.randomUUID().slice(0, 9)}` }),
    ).rejects.toThrow(/đơn vị liên kết/);
    const ketHop = await taoKhoa(["TRUC_TUYEN_NOP_GIAY", "QUA_DON_VI_LIEN_KET"]);
    const dk = await themHocVienVaoKhoa({ khoaId: ketHop.khoa.id, hoTen: "B", soCCCD: `NPT${crypto.randomUUID().slice(0, 9)}` });
    expect(dk.khoaId).toBe(ketHop.khoa.id);
  });
});

const cccd12 = () => `0${String(Math.floor(Math.random() * 1e11)).padStart(11, "0")}`;

describe("(08/10/2026) khóa mở cả tự đăng ký và danh sách được cử đi học: số CCCD/tài khoản đã có trong khóa thì báo đã tồn tại", () => {
  it("biến thể số CCCD: khoảng trắng, chữ thường, thiếu số 0 đầu", () => {
    expect(bienTheSoCCCD(" 048 290 000 123 ")).toEqual(expect.arrayContaining(["048290000123", "48290000123"]));
    expect(bienTheSoCCCD("48290000123")).toContain("048290000123");
    expect(bienTheSoCCCD("p 3304738")).toContain("P3304738");
  });

  it("import ghi CCCD thiếu số 0/có khoảng trắng: lưu dạng chuẩn; thí sinh tự đăng ký cùng CCCD bị báo đã tồn tại trong danh sách", async () => {
    const { khoa } = await taoKhoa(["TRUC_TUYEN_NOP_GIAY", "IMPORT_TU_XAC_NHAN"]);
    const so = cccd12();
    const [dk] = await importDanhSachHocVien(khoa.id, ["hoTen,soCCCD", `Người được cử,${so.slice(1, 4)} ${so.slice(4)}`].join("\n"));
    expect((await prisma.hocVien.findUniqueOrThrow({ where: { id: dk.hocVienId } })).soCCCD).toBe(so);
    await expect(dangKyTrucTuyen({ khoaId: khoa.id, hoTen: "Người được cử", soCCCD: so })).rejects.toThrow(
      /đã tồn tại trong danh sách được cử đi học.*Xác nhận tham gia/,
    );
    expect(await prisma.dangKyHoc.count({ where: { khoaId: khoa.id } })).toBe(1);
  });

  it("đã tự đăng ký rồi đăng ký lại: báo đã tồn tại kèm mã hồ sơ, trạng thái", async () => {
    const { khoa } = await taoKhoa(["TRUC_TUYEN_NOP_GIAY", "IMPORT_TU_XAC_NHAN"]);
    const so = cccd12();
    const dk = await dangKyTrucTuyen({ khoaId: khoa.id, hoTen: "Tự đăng ký", soCCCD: so });
    const hv = await prisma.hocVien.findUniqueOrThrow({ where: { id: dk.hocVienId } });
    const loi = await dangKyTrucTuyen({ khoaId: khoa.id, hoTen: "Tự đăng ký", soCCCD: so }).catch((e) => e);
    expect(loi).toBeInstanceOf(DaDangKyKhoaNayError);
    expect(loi.message).toContain(`đã tồn tại trong khóa học này (hồ sơ ${hv.maHocVien}, trạng thái: Chờ nộp bản giấy)`);
  });

  it("đã tự đăng ký thì đơn vị nhập danh sách có CCCD đó (ghi kiểu khác) bị báo dòng đã tồn tại, không nạp dòng nào", async () => {
    const { khoa } = await taoKhoa(["TRUC_TUYEN_NOP_GIAY", "IMPORT_TU_XAC_NHAN"]);
    const so = cccd12();
    await dangKyTrucTuyen({ khoaId: khoa.id, hoTen: "Tự đăng ký trước", soCCCD: so });
    const loi = await importDanhSachHocVien(
      khoa.id,
      ["hoTen,soCCCD", `Người khác,${cccd12()}`, `Tự đăng ký trước,${so.slice(1)}`].join("\n"),
    ).catch((e) => e);
    expect(loi).toBeInstanceOf(DuLieuImportLoiError);
    expect(loi.cacDongLoi).toEqual([expect.objectContaining({ dong: 3, loi: expect.stringContaining("đã tồn tại trong khóa này") })]);
    expect(await prisma.dangKyHoc.count({ where: { khoaId: khoa.id } })).toBe(1);
  });

  it("hồ sơ cũ lưu CCCD thiếu số 0 đầu: đăng ký bằng số đủ 12 chữ số vẫn bị phát hiện trùng", async () => {
    const { khoa } = await taoKhoa(["TRUC_TUYEN_NOP_GIAY", "IMPORT_TU_XAC_NHAN"]);
    const so = cccd12();
    const hvCu = await prisma.hocVien.create({ data: { maHocVien: `HVNPT${crypto.randomUUID().slice(0, 8)}`, hoTen: "Dữ liệu cũ", soCCCD: so.slice(1) } });
    await prisma.dangKyHoc.create({ data: { hocVienId: hvCu.id, khoaId: khoa.id, trangThai: "DA_NOP_GIAY" } });
    await expect(dangKyTrucTuyen({ khoaId: khoa.id, hoTen: "Dữ liệu cũ", soCCCD: so })).rejects.toThrow(/đã tồn tại trong khóa học này/);
    expect(await prisma.dangKyHoc.count({ where: { khoaId: khoa.id } })).toBe(1);
  });
});
