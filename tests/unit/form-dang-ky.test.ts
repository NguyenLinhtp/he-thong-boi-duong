import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { khoiTaoKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { chuyenTrangThaiKhoa } from "@/server/services/kh/kh-05-trang-thai-si-so";
import { dangKyTrucTuyen } from "@/server/services/hv/hv-01-dang-ky-truc-tuyen";
import { dangKyDuThi } from "@/server/services/hv/hv-05-dang-ky-du-thi";
import { thamDinhHoSo, tuChoiHoSoThieuMinhChung } from "@/server/services/hv/hv-06-tham-dinh";
import {
  cauHinhHieuLuc,
  hoSoBoSung,
  luuCauHinhChuongTrinh,
  luuCauHinhKhoa,
} from "@/server/services/hv/form-dang-ky";
import { xoaTep } from "@/server/services/gd/luu-tru-hoc-lieu";
import { CAU_HINH_MAC_DINH, chuanHoaCauHinh, kiemTraDuLieu, type CauHinhForm } from "@/lib/form-dang-ky";
import {
  CauHinhFormKhongHopLeError,
  ThieuMinhChungBatBuocError,
  ThongTinDangKyKhongHopLeError,
} from "@/server/services/hv/loi-hoc-vien";

const NGUOI = { nguoiThucHienTen: "Test form đăng ký" };
const loaiHinh: string[] = [];
const chuongTrinh: string[] = [];
const khoaIds: string[] = [];

afterAll(async () => {
  const tep = await prisma.tepHoSoDangKy.findMany({ where: { dangKy: { khoaId: { in: khoaIds } } } });
  for (const t of tep) await xoaTep(t.khoaLuuTru);
  const dk = await prisma.dangKyHoc.findMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.thongBao.deleteMany({ where: { hocVienId: { in: dk.map((d) => d.hocVienId) } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: dk.map((d) => d.hocVienId) }, dangKys: { none: {} } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaIds } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinh } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinh } } });
});

async function taoKhoa(phuongThuc: "TRUC_TUYEN_NOP_GIAY" | "CHI_DU_THI" = "TRUC_TUYEN_NOP_GIAY") {
  const lh = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH_FDK_${crypto.randomUUID()}`, ten: "LH form đăng ký" } });
  loaiHinh.push(lh.id);
  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_FDK_${crypto.randomUUID()}`,
      ten: "CT form đăng ký",
      loaiHinhBoiDuongId: lh.id,
      trangThai: "DA_BAN_HANH",
      soQuyetDinh: "QD",
      ngayBanHanh: new Date(),
      phuongThucDangKy: phuongThuc,
    },
  });
  chuongTrinh.push(ct.id);
  const khoa = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa: 10 });
  khoaIds.push(khoa.id);
  await chuyenTrangThaiKhoa(khoa.id, "DANG_TUYEN_SINH");
  return { ct, khoa };
}

// cấu hình mẫu: SĐT bắt buộc, đơn vị công tác chọn từ danh sách, tỉnh cố định, môn dạy bắt buộc, minh chứng bắt buộc
const CAU_HINH_MAU = {
  truong: [
    { ma: "soDienThoai", hien: true, batBuoc: true },
    { ma: "donViCongTac", hien: true, batBuoc: true, luaChon: ["THCS Lê Lợi", "THCS Kim Đồng"] },
    { ma: "email", hien: false },
    { ma: "tinh", nhan: "Tỉnh/thành", kieu: "VAN_BAN", macDinh: "Đà Nẵng", coDinh: true },
    { ma: "monDay", nhan: "Môn giảng dạy", kieu: "LUA_CHON", luaChon: ["Toán", "Ngữ văn"], batBuoc: true },
    { ma: "soNam", nhan: "Số năm công tác", kieu: "SO" },
    { ma: "bangCap", nhan: "Bản sao bằng tốt nghiệp", kieu: "TEP", batBuoc: true },
  ],
};

const pdf = (ten = "bang.pdf") => ({ ten, loai: "application/pdf", noiDung: Buffer.from("%PDF-1.4 test") });

describe("Form đăng ký cấu hình - chuẩn hóa cấu hình (bổ sung 30/09/2026)", () => {
  it("bổ sung đủ 5 trường có sẵn, trường ẩn không bắt buộc, giữ thứ tự trường tùy chỉnh", () => {
    const kq = chuanHoaCauHinh({ truong: [{ ma: "email", hien: false, batBuoc: true }, { ma: "x1", nhan: "Ghi chú", kieu: "VAN_BAN" }] });
    expect("cauHinh" in kq).toBe(true);
    const c = (kq as { cauHinh: CauHinhForm }).cauHinh;
    expect(c.truong.map((t) => t.ma)).toEqual(["email", "x1", "ngaySinh", "soDienThoai", "donViCongTac", "chucDanhHocViId"]);
    expect(c.truong[0]).toMatchObject({ hien: false, batBuoc: false });
  });

  it("chặn: danh sách chọn rỗng, cố định không có giá trị, mặc định ngoài danh sách, trùng mã, thiếu tên", () => {
    const loi = (truong: unknown[]) => {
      const kq = chuanHoaCauHinh({ truong });
      return "loi" in kq ? kq.loi : null;
    };
    expect(loi([{ ma: "a", nhan: "Môn", kieu: "LUA_CHON", luaChon: [] }])).toMatch(/ít nhất 1 lựa chọn/);
    expect(loi([{ ma: "a", nhan: "Tỉnh", kieu: "VAN_BAN", coDinh: true }])).toMatch(/cố định phải có giá trị/);
    expect(loi([{ ma: "a", nhan: "Môn", kieu: "LUA_CHON", luaChon: ["Toán"], macDinh: "Lý" }])).toMatch(/thuộc danh sách chọn/);
    expect(loi([{ ma: "a", nhan: "A", kieu: "SO" }, { ma: "a", nhan: "B", kieu: "SO" }])).toMatch(/trùng mã/);
    expect(loi([{ ma: "a", nhan: " ", kieu: "SO" }])).toMatch(/chưa nhập tên/);
    expect(loi([{ ma: "a b", nhan: "X", kieu: "SO" }])).toMatch(/mã trường/);
  });

  it("kiểm tra dữ liệu: bắt buộc, danh sách chọn, số, cố định ghi đè, tệp sai định dạng/quá lớn, hồ sơ có sẵn thỏa bắt buộc", () => {
    const c = (chuanHoaCauHinh(CAU_HINH_MAU) as { cauHinh: CauHinhForm }).cauHinh;
    const du = { soDienThoai: "0905", donViCongTac: "THCS Lê Lợi", bs_monDay: "Toán", bs_tinh: "Huế" };
    const loi = (giaTri: Record<string, string>, tep = { bs_bangCap: pdf() }, hienCo = {}) => {
      const kq = kiemTraDuLieu(c, { giaTri, tep }, { hienCo, toiDaMb: 0.001 });
      return "loi" in kq ? kq.loi : kq.ketQua;
    };
    expect(loi({ ...du, soDienThoai: "" })).toBe('Chưa nhập "Số điện thoại"');
    expect(loi({ ...du, soDienThoai: "" }, undefined, { soDienThoai: "0911" })).not.toBeTypeOf("string");
    expect(loi({ ...du, donViCongTac: "Trường khác" })).toMatch(/không thuộc danh sách chọn/);
    expect(loi({ ...du, bs_soNam: "mười" })).toBe('"Số năm công tác" phải là số');
    expect(loi(du, {} as never)).toBe('Chưa nộp "Bản sao bằng tốt nghiệp"');
    expect(loi(du, { bs_bangCap: pdf("bang.exe") })).toMatch(/chỉ nhận tệp/);
    expect(loi(du, { bs_bangCap: { ...pdf(), noiDung: Buffer.alloc(5000) } })).toMatch(/vượt/);
    const ok = loi(du) as { boSung: { ma: string; giaTri: string }[]; coSan: Record<string, string> };
    // tỉnh cố định: học viên gửi "Huế" nhưng lưu "Đà Nẵng"
    expect(ok.boSung.find((b) => b.ma === "tinh")?.giaTri).toBe("Đà Nẵng");
    expect(ok.coSan).toEqual({ soDienThoai: "0905", donViCongTac: "THCS Lê Lợi" });
  });

  it("chưa cấu hình: form mặc định như trước (không trường bắt buộc, chưa có chức danh)", () => {
    const kq = kiemTraDuLieu(CAU_HINH_MAC_DINH, { giaTri: {}, tep: {} });
    expect("ketQua" in kq).toBe(true);
    expect(CAU_HINH_MAC_DINH.truong.find((t) => t.ma === "chucDanhHocViId")?.hien).toBe(false);
  });
});

describe("Form đăng ký cấu hình - theo chương trình/khóa và các kênh đăng ký", () => {
  it("chương trình cấu hình -> khóa kế thừa; khóa sửa riêng -> dùng form khóa; bỏ form riêng -> về chương trình", async () => {
    const { ct, khoa } = await taoKhoa();
    expect((await cauHinhHieuLuc(khoa.id)).nguon).toBe("MAC_DINH");
    await luuCauHinhChuongTrinh(ct.id, CAU_HINH_MAU, NGUOI);
    expect((await cauHinhHieuLuc(khoa.id)).nguon).toBe("CHUONG_TRINH");
    await luuCauHinhKhoa(khoa.id, { truong: [{ ma: "ghiChu", nhan: "Ghi chú", kieu: "VAN_BAN" }] }, NGUOI);
    const rieng = await cauHinhHieuLuc(khoa.id);
    expect(rieng.nguon).toBe("KHOA");
    expect(rieng.cauHinh.truong.some((t) => t.ma === "bangCap")).toBe(false);
    await luuCauHinhKhoa(khoa.id, null, NGUOI);
    expect((await cauHinhHieuLuc(khoa.id)).nguon).toBe("CHUONG_TRINH");
  });

  it("chặn lưu cấu hình không hợp lệ và chương trình đã ngừng hiệu lực", async () => {
    const { ct } = await taoKhoa();
    await expect(luuCauHinhChuongTrinh(ct.id, { truong: [{ ma: "a", nhan: "A", kieu: "LUA_CHON" }] }, NGUOI)).rejects.toThrow(
      CauHinhFormKhongHopLeError,
    );
    await prisma.chuongTrinh.update({ where: { id: ct.id }, data: { trangThai: "NGUNG_HIEU_LUC" } });
    await expect(luuCauHinhChuongTrinh(ct.id, CAU_HINH_MAU, NGUOI)).rejects.toThrow(/ngừng hiệu lực/);
  });

  it("HV-01: chặn đăng ký thiếu trường bắt buộc/minh chứng (không tạo hồ sơ); đủ thì lưu thông tin bổ sung + tệp", async () => {
    const { ct, khoa } = await taoKhoa();
    await luuCauHinhChuongTrinh(ct.id, CAU_HINH_MAU, NGUOI);
    const cccd = `CCCD_FDK_${crypto.randomUUID()}`;
    const giaTri = { soDienThoai: "0905111222", donViCongTac: "THCS Kim Đồng", bs_monDay: "Ngữ văn", bs_soNam: "12" };

    await expect(
      dangKyTrucTuyen({ khoaId: khoa.id, hoTen: "Lê Thị Form", soCCCD: cccd, duLieuForm: { giaTri, tep: {} } }),
    ).rejects.toThrow(ThongTinDangKyKhongHopLeError);
    // đăng ký qua đường cũ (không có dữ liệu form) cũng bị chặn theo cấu hình
    await expect(dangKyTrucTuyen({ khoaId: khoa.id, hoTen: "Lê Thị Form", soCCCD: cccd })).rejects.toThrow(/Chưa nhập/);
    expect(await prisma.dangKyHoc.count({ where: { khoaId: khoa.id } })).toBe(0);

    const dk = await dangKyTrucTuyen({
      khoaId: khoa.id,
      hoTen: "Lê Thị Form",
      soCCCD: cccd,
      duLieuForm: { giaTri, tep: { bs_bangCap: pdf() } },
    });
    expect(dk.hocVien).toMatchObject({ soDienThoai: "0905111222", donViCongTac: "THCS Kim Đồng", email: null });
    const hs = await hoSoBoSung(dk.id);
    expect(hs.thongTin.map((m) => [m.nhan, m.giaTri])).toEqual([
      ["Tỉnh/thành", "Đà Nẵng"],
      ["Môn giảng dạy", "Ngữ văn"],
      ["Số năm công tác", "12"],
    ]);
    expect(hs.tep).toEqual([expect.objectContaining({ nhan: "Bản sao bằng tốt nghiệp", tenFile: "bang.pdf" })]);
  });

  it("HV-05 (PT3) cũng áp form cấu hình; hồ sơ cũ chỉ được điền chỗ trống, không ghi đè", async () => {
    const { ct, khoa } = await taoKhoa("CHI_DU_THI");
    await luuCauHinhChuongTrinh(ct.id, { truong: [{ ma: "soDienThoai", batBuoc: true }] }, NGUOI);
    const cccd = `CCCD_FDK_${crypto.randomUUID()}`;
    const cu = await prisma.hocVien.create({ data: { maHocVien: `HVFDK${Date.now()}`, hoTen: "Hồ Sơ Cũ", soCCCD: cccd, email: "cu@x.vn" } });
    await expect(dangKyDuThi({ khoaId: khoa.id, hoTen: "Hồ Sơ Cũ", soCCCD: cccd })).rejects.toThrow(/Số điện thoại/);
    const dk = await dangKyDuThi({ khoaId: khoa.id, hoTen: "Hồ Sơ Cũ", soCCCD: cccd, soDienThoai: "0912000000", email: "moi@x.vn" });
    expect(dk.hocVienId).toBe(cu.id);
    const sau = await prisma.hocVien.findUniqueOrThrow({ where: { id: cu.id } });
    expect(sau).toMatchObject({ soDienThoai: "0912000000", email: "cu@x.vn" });
  });

  it("HV-06: hồ sơ thiếu minh chứng bắt buộc không được đánh giá Hợp lệ, bị từ chối tự động; đủ minh chứng thì bình thường", async () => {
    const { ct, khoa } = await taoKhoa("CHI_DU_THI");
    // đăng ký khi chưa yêu cầu minh chứng, sau đó chương trình bổ sung yêu cầu
    const thieu = await dangKyDuThi({ khoaId: khoa.id, soDienThoai: "0905000001", hoTen: "Thiếu MC", soCCCD: `CCCD_FDK_${crypto.randomUUID()}` });
    await luuCauHinhChuongTrinh(ct.id, { truong: [{ ma: "bangCap", nhan: "Bằng tốt nghiệp", kieu: "TEP", batBuoc: true }] }, NGUOI);
    const du = await dangKyDuThi({
      khoaId: khoa.id,
      hoTen: "Đủ MC",
      soCCCD: `CCCD_FDK_${crypto.randomUUID()}`,
      duLieuForm: { giaTri: { soDienThoai: "0905000002" }, tep: { bs_bangCap: pdf() } },
    });

    await expect(thamDinhHoSo(thieu.id, "HOP_LE")).rejects.toThrow(ThieuMinhChungBatBuocError);
    expect(await tuChoiHoSoThieuMinhChung(khoa.id, NGUOI)).toEqual(["Thiếu MC"]);
    expect(await prisma.dangKyHoc.findUniqueOrThrow({ where: { id: thieu.id } })).toMatchObject({ trangThai: "KHONG_HOP_LE" });
    expect((await thamDinhHoSo(du.id, "HOP_LE")).trangThai).toBe("HOP_LE");
  });
});
