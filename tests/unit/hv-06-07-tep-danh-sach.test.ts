import ExcelJS from "exceljs";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { khoiTaoKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { chuyenTrangThaiKhoa } from "@/server/services/kh/kh-05-trang-thai-si-so";
import { dangKyDuThi } from "@/server/services/hv/hv-05-dang-ky-du-thi";
import { luuCauHinhChuongTrinh } from "@/server/services/hv/form-dang-ky";
import { nhapExcelThamDinh, xuatExcelThamDinh } from "@/server/services/hv/hv-06-tham-dinh-excel";
import { dieuChinhThongTinThiSinh, thongTinDieuChinh } from "@/server/services/hv/hv-06-dieu-chinh-thong-tin";
import { nhapExcelXetDuyet, xuatExcelXetDuyet } from "@/server/services/hv/hv-07-xet-duyet-excel";
import {
  CccdTrungError,
  DieuChinhThongTinKhongHopLeError,
  DuLieuImportLoiError,
  TepDanhSachKhongHopLeError,
  VuotSiSoKhiXetDuyetError,
  ChuaXacNhanLePhiKhiXetDuyetError,
} from "@/server/services/hv/loi-hoc-vien";
import { danhSachHopLeChoXetDuyet, xetDuyetDanhSachChinhThuc } from "@/server/services/hv/hv-07-xet-duyet-chinh-thuc";
import { xacNhanThanhToan } from "@/server/services/hp/hp-02-thanh-toan";

/**
 * (bổ sung 05/10/2026) HV-06: thẩm định từ tệp, điều chỉnh thông tin thí sinh;
 * HV-07: xét duyệt chính thức từ tệp.
 */
const NGUOI = { nguoiThucHienTen: "Test thẩm định từ tệp" };
const loaiHinh: string[] = [];
const chuongTrinh: string[] = [];
const khoaIds: string[] = [];

afterAll(async () => {
  const dk = await prisma.dangKyHoc.findMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.ketQuaKhoa.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.phieuThu.deleteMany({ where: { hocPhi: { khoaId: { in: khoaIds } } } });
  await prisma.hocPhi.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.thongBao.deleteMany({ where: { hocVienId: { in: dk.map((d) => d.hocVienId) } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: dk.map((d) => d.hocVienId) }, dangKys: { none: {} } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaIds } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinh } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinh } } });
});

const so = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");
const cccd = () => `0${1 + Math.floor(Math.random() * 9)}${so(10)}`;

async function taoKhoa(siSoToiDa = 10) {
  const lh = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH_TDT_${crypto.randomUUID()}`, ten: "LH thẩm định tệp" } });
  loaiHinh.push(lh.id);
  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_TDT_${crypto.randomUUID()}`,
      ten: "CT thẩm định tệp",
      loaiHinhBoiDuongId: lh.id,
      trangThai: "DA_BAN_HANH",
      soQuyetDinh: "QD",
      ngayBanHanh: new Date(),
      phuongThucDangKy: "CHI_DU_THI",
    },
  });
  chuongTrinh.push(ct.id);
  await luuCauHinhChuongTrinh(
    ct.id,
    { truong: [{ ma: "truongHoc", nhan: "Trường đang học", kieu: "VAN_BAN" }, { ma: "doiTuong", nhan: "Đối tượng", kieu: "LUA_CHON", luaChon: ["A", "B"] }] },
    NGUOI,
  );
  const khoa = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa });
  khoaIds.push(khoa.id);
  await chuyenTrangThaiKhoa(khoa.id, "DANG_TUYEN_SINH");
  return { ct, khoa };
}

const dangKy = (khoaId: string, hoTen: string, soDienThoai = "0905123456") =>
  dangKyDuThi({ khoaId, hoTen, soCCCD: cccd(), duLieuForm: { giaTri: { soDienThoai, bs_truongHoc: "THPT Phan Châu Trinh", bs_doiTuong: "A" }, tep: {} } });

/** Sửa ô theo mã hồ sơ: { [mã hồ sơ]: { [tiêu đề cột]: giá trị } }; them = thêm dòng cuối. */
async function suaTep(tep: Buffer, sua: Record<string, Record<string, string>>, them: string[][] = []) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(tep as unknown as ArrayBuffer);
  const ws = wb.worksheets[0];
  let cot: Record<string, number> = {};
  ws.eachRow((row) => {
    const o = Array.from(row.values as unknown[], (v) => String(v ?? ""));
    if (o.includes("Mã hồ sơ")) cot = Object.fromEntries(o.map((t, i) => [t, i]));
    else if (cot["Mã hồ sơ"] && sua[o[cot["Mã hồ sơ"]]]) {
      for (const [ten, gt] of Object.entries(sua[o[cot["Mã hồ sơ"]]])) row.getCell(cot[ten]).value = gt;
    }
  });
  for (const d of them) ws.addRow(d);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

async function giaTriO(tep: Buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(tep as unknown as ArrayBuffer);
  return wb.worksheets[0].getSheetValues().flat().map(String).join("|");
}

describe("HV-06 bổ sung 05/10/2026 - thẩm định theo danh sách từ tệp", () => {
  it("tải danh sách có mã khóa, trường tùy chỉnh, minh chứng; tải lên cập nhật Hợp lệ/Không hợp lệ, để trống giữ nguyên, nạp lại không đổi", async () => {
    const { khoa } = await taoKhoa();
    const [a, b, c] = [await dangKy(khoa.id, "Nguyễn A"), await dangKy(khoa.id, "Trần B"), await dangKy(khoa.id, "Lê C")];
    const { noiDung } = await xuatExcelThamDinh(khoa.id);
    const chu = await giaTriO(noiDung);
    expect(chu).toContain(`Mã khóa: ${khoa.maKhoa}`);
    expect(chu).toContain("Trường đang học");
    expect(chu).toContain("THPT Phan Châu Trinh");
    expect(chu).toContain("Kết quả thẩm định");

    const tep = await suaTep(noiDung, {
      [a.hocVien.maHocVien]: { "Kết quả thẩm định": "Hợp lệ" },
      [b.hocVien.maHocVien]: { "Kết quả thẩm định": "Không hợp lệ", "Lý do": "Không thuộc đối tượng" },
    });
    expect(await nhapExcelThamDinh(khoa.id, tep, "td.xlsx", NGUOI)).toEqual({ hopLe: 1, khongHopLe: 1, khongDoi: 0, boTrong: 1 });
    const trangThai = async (id: string) => (await prisma.dangKyHoc.findUniqueOrThrow({ where: { id } })).trangThai;
    expect([await trangThai(a.id), await trangThai(b.id), await trangThai(c.id)]).toEqual(["HOP_LE", "KHONG_HOP_LE", "CHO_DUYET"]);
    expect((await prisma.dangKyHoc.findUniqueOrThrow({ where: { id: b.id } })).ghiChuThamDinh).toBe("Không thuộc đối tượng");
    expect(await prisma.nhatKyThaoTac.count({ where: { hanhDong: "THAM_DINH_HO_SO", doiTuongId: { in: [a.id, b.id] } } })).toBe(2);
    // nạp lại cùng tệp: không cập nhật trùng
    expect(await nhapExcelThamDinh(khoa.id, tep, "td.xlsx", NGUOI)).toEqual({ hopLe: 0, khongHopLe: 0, khongDoi: 2, boTrong: 1 });
  });

  it("chặn cả tệp khi có dòng lỗi: Không hợp lệ thiếu lý do, giá trị lạ, mã lạ/trùng, thiếu minh chứng; tệp của khóa khác", async () => {
    const { ct, khoa } = await taoKhoa();
    const khac = await taoKhoa();
    const [a, b] = [await dangKy(khoa.id, "Nguyễn A"), await dangKy(khoa.id, "Trần B")];
    const { noiDung } = await xuatExcelThamDinh(khoa.id);
    const loi = await nhapExcelThamDinh(
      khoa.id,
      await suaTep(
        noiDung,
        { [a.hocVien.maHocVien]: { "Kết quả thẩm định": "Hợp lệ" }, [b.hocVien.maHocVien]: { "Kết quả thẩm định": "Không hợp lệ" } },
        [["9", "HV_KHONG_CO", "", "X", "", "", "", "", "", "", "", "", "", "", "Hợp lệ"], ["10", a.hocVien.maHocVien, "", "", "", "", "", "", "", "", "", "", "", "", "đạt yêu cầu"]],
      ),
      "td.xlsx",
      NGUOI,
    ).catch((e) => e);
    expect(loi).toBeInstanceOf(DuLieuImportLoiError);
    expect((loi as DuLieuImportLoiError).cacDongLoi.map((d) => d.loi)).toEqual([
      expect.stringMatching(/phải ghi Lý do/),
      expect.stringMatching(/không thuộc danh sách đăng ký/),
      expect.stringMatching(/xuất hiện nhiều lần/),
    ]);
    // không dòng nào được cập nhật
    expect((await prisma.dangKyHoc.findUniqueOrThrow({ where: { id: a.id } })).trangThai).toBe("CHO_DUYET");
    await expect(
      nhapExcelThamDinh(khoa.id, await suaTep(noiDung, { [a.hocVien.maHocVien]: { "Kết quả thẩm định": "đạt yêu cầu" } }), "td.xlsx", NGUOI),
    ).rejects.toThrow(DuLieuImportLoiError);
    await expect(nhapExcelThamDinh(khac.khoa.id, noiDung, "td.xlsx", NGUOI)).rejects.toThrow(TepDanhSachKhongHopLeError);

    // bổ sung minh chứng bắt buộc -> hồ sơ chưa nộp không được Hợp lệ
    await luuCauHinhChuongTrinh(ct.id, { truong: [{ ma: "bangCap", nhan: "Bằng tốt nghiệp", kieu: "TEP", batBuoc: true }] }, NGUOI);
    const thieu = await nhapExcelThamDinh(
      khoa.id,
      await suaTep(noiDung, { [a.hocVien.maHocVien]: { "Kết quả thẩm định": "Hợp lệ" } }),
      "td.xlsx",
      NGUOI,
    ).catch((e) => e);
    expect((thieu as DuLieuImportLoiError).cacDongLoi[0].loi).toMatch(/thiếu minh chứng bắt buộc \(Bằng tốt nghiệp\)/);
  });
});

describe("HV-07 bổ sung 05/10/2026 - xét duyệt chính thức theo danh sách từ tệp", () => {
  async function khoaCoHopLe(siSo: number, soHoSo: number) {
    const { khoa } = await taoKhoa(siSo);
    const ds = [];
    for (let i = 0; i < soHoSo; i++) ds.push(await dangKy(khoa.id, `Thí sinh ${i}`));
    const { noiDung } = await xuatExcelThamDinh(khoa.id);
    await nhapExcelThamDinh(
      khoa.id,
      await suaTep(noiDung, Object.fromEntries(ds.map((d) => [d.hocVien.maHocVien, { "Kết quả thẩm định": "Hợp lệ" }]))),
      "td.xlsx",
      NGUOI,
    );
    return { khoa, ds };
  }

  it("ghi Chính thức -> duyệt; nạp lại bỏ qua hồ sơ đã chính thức; để trống hồ sơ đã chính thức chỉ cảnh báo", async () => {
    const { khoa, ds } = await khoaCoHopLe(10, 2);
    const [a, b] = ds;
    const { noiDung } = await xuatExcelXetDuyet(khoa.id);
    expect(await giaTriO(noiDung)).toContain("Sĩ số tối đa 10, đã chính thức 0, còn 10 chỗ");
    const kq = await nhapExcelXetDuyet(khoa.id, await suaTep(noiDung, { [a.hocVien.maHocVien]: { "Xét duyệt": "Chính thức" } }), "xd.xlsx", NGUOI);
    expect(kq).toMatchObject({ daDuyet: [{ maHoSo: a.hocVien.maHocVien }], daCoTruoc: 0, khongDuyet: 1 });
    expect((await prisma.dangKyHoc.findUniqueOrThrow({ where: { id: a.id } })).trangThai).toBe("CHINH_THUC");
    expect((await prisma.dangKyHoc.findUniqueOrThrow({ where: { id: b.id } })).trangThai).toBe("HOP_LE");

    const lan2 = await xuatExcelXetDuyet(khoa.id);
    const kq2 = await nhapExcelXetDuyet(khoa.id, await suaTep(lan2.noiDung, { [a.hocVien.maHocVien]: { "Xét duyệt": "" } }), "xd.xlsx", NGUOI);
    expect(kq2.daDuyet).toEqual([]);
    expect(kq2.canhBao).toEqual([expect.stringMatching(/không tự hủy/)]);
    expect((await prisma.dangKyHoc.findUniqueOrThrow({ where: { id: a.id } })).trangThai).toBe("CHINH_THUC");
  });

  it("chặn hồ sơ chưa Hợp lệ, giá trị lạ; vượt sĩ số thì không duyệt hồ sơ nào", async () => {
    const { khoa, ds } = await khoaCoHopLe(10, 2);
    const chuaThamDinh = await dangKy(khoa.id, "Chưa thẩm định");
    // giảm sĩ số sau khi đã có đăng ký -> 2 hồ sơ Hợp lệ nhưng chỉ còn 1 chỗ
    await prisma.khoa.update({ where: { id: khoa.id }, data: { siSoToiDa: 1 } });
    const { noiDung } = await xuatExcelXetDuyet(khoa.id);
    const loi = await nhapExcelXetDuyet(
      khoa.id,
      await suaTep(noiDung, { [ds[0].hocVien.maHocVien]: { "Xét duyệt": "duyệt luôn" } }, [["9", chuaThamDinh.hocVien.maHocVien, "", "", "", "", "", "", "", "", "", "Chính thức"]]),
      "xd.xlsx",
      NGUOI,
    ).catch((e) => e);
    expect((loi as DuLieuImportLoiError).cacDongLoi.map((d) => d.loi)).toEqual([
      expect.stringMatching(/không hợp lệ/),
      expect.stringMatching(/chưa được thẩm định Hợp lệ/),
    ]);
    await expect(
      nhapExcelXetDuyet(
        khoa.id,
        await suaTep(noiDung, Object.fromEntries(ds.map((d) => [d.hocVien.maHocVien, { "Xét duyệt": "Chính thức" }]))),
        "xd.xlsx",
        NGUOI,
      ),
    ).rejects.toThrow(VuotSiSoKhiXetDuyetError);
    expect(await prisma.dangKyHoc.count({ where: { khoaId: khoa.id, trangThai: "CHINH_THUC" } })).toBe(0);
  });

  it("(bổ sung 06/10/2026) khóa dự thi có lệ phí: chưa xác nhận lệ phí thì không duyệt chính thức (màn hình và tệp)", async () => {
    const { khoa } = await taoKhoa(10);
    await prisma.khoa.update({ where: { id: khoa.id }, data: { mucHocPhi: 450000 } });
    const daDong = await dangKy(khoa.id, "Đã đóng lệ phí");
    const chuaDong = await dangKy(khoa.id, "Chưa đóng lệ phí");
    await prisma.dangKyHoc.updateMany({ where: { id: { in: [daDong.id, chuaDong.id] } }, data: { trangThai: "HOP_LE" } });
    const hpDaDong = await prisma.hocPhi.findUniqueOrThrow({ where: { hocVienId_khoaId: { hocVienId: daDong.hocVienId, khoaId: khoa.id } } });
    await xacNhanThanhToan(hpDaDong.id, { soTien: 450000, hinhThucNop: "Chuyển khoản", nguoiXacNhanTen: "Tài chính test" });

    // danh sách chọn duyệt đánh dấu người chưa xác nhận lệ phí
    const dsCho = await danhSachHopLeChoXetDuyet(khoa.id);
    expect(Object.fromEntries(dsCho.map((d) => [d.id, d.chuaXacNhanLePhi]))).toEqual({ [daDong.id]: false, [chuaDong.id]: true });

    // duyệt trên màn hình: chặn cả lô, nêu tên người chưa xác nhận
    await expect(xetDuyetDanhSachChinhThuc(khoa.id, [daDong.id, chuaDong.id], NGUOI)).rejects.toThrow(ChuaXacNhanLePhiKhiXetDuyetError);
    expect(await prisma.dangKyHoc.count({ where: { khoaId: khoa.id, trangThai: "CHINH_THUC" } })).toBe(0);

    // duyệt từ tệp: cột Lệ phí cho biết tình trạng, dòng chưa xác nhận là dòng lỗi
    const { noiDung } = await xuatExcelXetDuyet(khoa.id);
    const o = await giaTriO(noiDung);
    expect(o).toContain("Chưa xác nhận");
    expect(o).toContain("Đã xác nhận");
    const tatCa = { [daDong.hocVien.maHocVien]: { "Xét duyệt": "Chính thức" }, [chuaDong.hocVien.maHocVien]: { "Xét duyệt": "Chính thức" } };
    const loi = await nhapExcelXetDuyet(khoa.id, await suaTep(noiDung, tatCa), "xd.xlsx", NGUOI).catch((e) => e);
    expect((loi as DuLieuImportLoiError).cacDongLoi.map((d) => d.loi)).toEqual([expect.stringMatching(/chưa được xác nhận lệ phí/)]);
    expect(await prisma.dangKyHoc.count({ where: { khoaId: khoa.id, trangThai: "CHINH_THUC" } })).toBe(0);

    // người đã đóng thì duyệt được
    await xetDuyetDanhSachChinhThuc(khoa.id, [daDong.id], NGUOI);
    expect((await prisma.dangKyHoc.findUniqueOrThrow({ where: { id: daDong.id } })).trangThai).toBe("CHINH_THUC");
  });
});

describe("HV-06 bổ sung 05/10/2026 - điều chỉnh thông tin thí sinh", () => {
  const nhap = (them: Record<string, unknown> = {}) => ({
    hoTen: "Nguyễn Văn Sửa",
    soCCCD: cccd(),
    ngaySinh: "2004-02-01",
    soDienThoai: "0905111222",
    email: "sua@x.vn",
    donViCongTac: null,
    soDienThoaiXacThuc: "0905999888",
    boSung: { truongHoc: "THPT Hoàng Hoa Thám", doiTuong: "B" },
    lyDo: "Đối chiếu CCCD bản gốc",
    ...them,
  });

  it("sửa hồ sơ học viên, trường tùy chỉnh, SĐT xác thực; ghi nhật ký kèm lý do", async () => {
    const { khoa } = await taoKhoa();
    const dk = await dangKy(khoa.id, "Nguyen Van Sua");
    const vao = nhap();
    await dieuChinhThongTinThiSinh(dk.id, vao, NGUOI);
    const sau = await prisma.dangKyHoc.findUniqueOrThrow({ where: { id: dk.id }, include: { hocVien: true } });
    expect(sau.hocVien).toMatchObject({ hoTen: "Nguyễn Văn Sửa", soCCCD: vao.soCCCD, email: "sua@x.vn" });
    expect(sau.soDienThoaiXacThuc).toBe("0905999888");
    expect((await thongTinDieuChinh(dk.id)).dsTruong.map((t) => t.giaTri)).toEqual(["THPT Hoàng Hoa Thám", "B"]);
    const nk = await prisma.nhatKyThaoTac.findFirst({ where: { hanhDong: "DIEU_CHINH_THONG_TIN_THI_SINH", doiTuongId: dk.id } });
    expect(nk?.chiTiet).toMatch(/Họ tên: "Nguyen Van Sua" -> "Nguyễn Văn Sửa".*lý do: Đối chiếu CCCD bản gốc/);
  });

  it("chặn: thiếu lý do, CCCD sai/trùng, SĐT xác thực sai, giá trị ngoài danh sách chọn, không có gì thay đổi, kết quả khóa đã phê duyệt", async () => {
    const { khoa } = await taoKhoa();
    const dk = await dangKy(khoa.id, "Thí Sinh Gốc");
    const khac = await dangKy(khoa.id, "Người Khác");
    await expect(dieuChinhThongTinThiSinh(dk.id, nhap({ lyDo: " " }), NGUOI)).rejects.toThrow(/lý do/);
    // (sửa 07/10/2026) không bắt định dạng 12 số (nhận số hộ chiếu) - chỉ chặn khi bỏ trống
    await expect(dieuChinhThongTinThiSinh(dk.id, nhap({ soCCCD: " " }), NGUOI)).rejects.toThrow(DieuChinhThongTinKhongHopLeError);
    await expect(dieuChinhThongTinThiSinh(dk.id, nhap({ soCCCD: khac.hocVien.soCCCD }), NGUOI)).rejects.toThrow(CccdTrungError);
    await expect(dieuChinhThongTinThiSinh(dk.id, nhap({ soDienThoaiXacThuc: "12345" }), NGUOI)).rejects.toThrow(/số điện thoại xác thực/);
    await expect(dieuChinhThongTinThiSinh(dk.id, nhap({ boSung: { doiTuong: "Z" } }), NGUOI)).rejects.toThrow(/danh sách chọn/);
    const hv = dk.hocVien;
    await expect(
      dieuChinhThongTinThiSinh(
        dk.id,
        {
          hoTen: hv.hoTen,
          soCCCD: hv.soCCCD!,
          ngaySinh: null,
          soDienThoai: hv.soDienThoai,
          email: null,
          donViCongTac: null,
          soDienThoaiXacThuc: "0905123456",
          boSung: { truongHoc: "THPT Phan Châu Trinh", doiTuong: "A" },
          lyDo: "x",
        },
        NGUOI,
      ),
    ).rejects.toThrow(/không có thông tin nào thay đổi/);
    await prisma.ketQuaKhoa.create({ data: { hocVienId: khac.hocVienId, khoaId: khoa.id, daPheDuyet: true } });
    await expect(dieuChinhThongTinThiSinh(dk.id, nhap(), NGUOI)).rejects.toThrow(/đã được phê duyệt/);
  });
});
