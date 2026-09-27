import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { khoiTaoKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import {
  danhSachHocVienTheoKhoa,
  themHocVienVaoKhoa,
  xoaHocVienKhoiKhoa,
  chuyenHocVienSangKhoa,
  ghiNhanThoiHoc,
  lichSuThayDoiDanhSach,
  HANH_DONG_HV09,
} from "@/server/services/hv/hv-09-quan-ly-danh-sach-khoa";
import {
  KhongTimThayKhoaError,
  KhongTimThayDangKyError,
  DaDangKyKhoaNayError,
  KhongTheXoaHocVienCoKetQuaError,
  DaNopHocPhiKhoaNayError,
  KhoaDichKhongNhanHocVienError,
  HoSoQuaDonViLienKetError,
} from "@/server/services/hv/loi-hoc-vien";

const loaiHinhTaoTrongTest: string[] = [];
const chuongTrinhTaoTrongTest: string[] = [];
const khoaTaoTrongTest: string[] = [];
const hocVienTaoTrongTest: string[] = [];
const donViTaoTrongTest: string[] = [];

afterAll(async () => {
  await prisma.phieuThu.deleteMany({ where: { hocPhi: { khoaId: { in: khoaTaoTrongTest } } } });
  await prisma.hocPhi.deleteMany({ where: { khoaId: { in: khoaTaoTrongTest } } });
  await prisma.ketQuaHocTap.deleteMany({ where: { hocVienId: { in: hocVienTaoTrongTest } } });
  await prisma.ketQuaKhoa.deleteMany({ where: { hocVienId: { in: hocVienTaoTrongTest } } });
  await prisma.chungChi.deleteMany({ where: { hocVienId: { in: hocVienTaoTrongTest } } });
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: khoaTaoTrongTest } } });
  await prisma.hopDongLienKet.deleteMany({ where: { khoaId: { in: khoaTaoTrongTest } } });
  await prisma.donViLienKet.deleteMany({ where: { id: { in: donViTaoTrongTest } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: hocVienTaoTrongTest } } });
  await prisma.hocPhan.deleteMany({ where: { chuongTrinhId: { in: chuongTrinhTaoTrongTest } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaTaoTrongTest } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinhTaoTrongTest } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinhTaoTrongTest } } });
});

async function taoKhoa(opts: { siSoToiDa?: number; phuongThuc?: "QUA_DON_VI_LIEN_KET" } = {}) {
  const lh = await prisma.loaiHinhBoiDuong.create({
    data: { ma: `LH_HV09_${crypto.randomUUID()}`, ten: "Loại hình test HV-09" },
  });
  loaiHinhTaoTrongTest.push(lh.id);

  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_HV09_${crypto.randomUUID()}`,
      ten: "Chương trình test HV-09",
      loaiHinhBoiDuongId: lh.id,
      trangThai: "DA_BAN_HANH",
      soQuyetDinh: "QD-HV09",
      ngayBanHanh: new Date(),
      phuongThucDangKy: opts.phuongThuc ?? null,
    },
  });
  chuongTrinhTaoTrongTest.push(ct.id);

  const khoa = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa: opts.siSoToiDa ?? 10 });
  khoaTaoTrongTest.push(khoa.id);
  return { khoa, chuongTrinh: ct };
}

describe("HV-09 quản lý danh sách học viên theo khóa", () => {
  it("thêm học viên vào khóa thành công, xuất hiện trong danh sách", async () => {
    const { khoa } = await taoKhoa();
    const dangKy = await themHocVienVaoKhoa({
      khoaId: khoa.id,
      hoTen: "Học viên mới",
      soCCCD: `CCCD_${crypto.randomUUID()}`,
      lyDo: "Bổ sung theo yêu cầu",
    });
    hocVienTaoTrongTest.push(dangKy.hocVienId);

    const ds = await danhSachHocVienTheoKhoa(khoa.id);
    expect(ds.map((dk) => dk.id)).toContain(dangKy.id);
  });

  it("chặn thêm trùng khi CCCD đã đăng ký khóa này rồi", async () => {
    const { khoa } = await taoKhoa();
    const cccd = `CCCD_${crypto.randomUUID()}`;
    const dk1 = await themHocVienVaoKhoa({ khoaId: khoa.id, hoTen: "A", soCCCD: cccd });
    hocVienTaoTrongTest.push(dk1.hocVienId);

    await expect(themHocVienVaoKhoa({ khoaId: khoa.id, hoTen: "A", soCCCD: cccd })).rejects.toThrow(
      DaDangKyKhoaNayError,
    );
  });

  it("thêm học viên báo lỗi khi không tìm thấy khóa", async () => {
    await expect(
      themHocVienVaoKhoa({ khoaId: "khong-ton-tai", hoTen: "B", soCCCD: `CCCD_${crypto.randomUUID()}` }),
    ).rejects.toThrow(KhongTimThayKhoaError);
  });

  it("xóa học viên khỏi khóa thành công khi chưa có điểm/chứng chỉ", async () => {
    const { khoa } = await taoKhoa();
    const dangKy = await themHocVienVaoKhoa({
      khoaId: khoa.id,
      hoTen: "C",
      soCCCD: `CCCD_${crypto.randomUUID()}`,
    });
    hocVienTaoTrongTest.push(dangKy.hocVienId);

    await xoaHocVienKhoiKhoa(dangKy.id);

    const ds = await danhSachHocVienTheoKhoa(khoa.id);
    expect(ds.map((dk) => dk.id)).not.toContain(dangKy.id);
  });

  it("chặn xóa học viên đã có điểm (KetQuaHocTap) ở khóa", async () => {
    const { khoa, chuongTrinh } = await taoKhoa();
    const hocPhan = await prisma.hocPhan.create({
      data: { chuongTrinhId: chuongTrinh.id, ten: "Học phần 1", soTiet: 30, thuTu: 1 },
    });
    const dangKy = await themHocVienVaoKhoa({
      khoaId: khoa.id,
      hoTen: "D",
      soCCCD: `CCCD_${crypto.randomUUID()}`,
    });
    hocVienTaoTrongTest.push(dangKy.hocVienId);
    await prisma.ketQuaHocTap.create({
      data: { hocVienId: dangKy.hocVienId, khoaId: khoa.id, hocPhanId: hocPhan.id, diemKetThuc: 8 },
    });

    await expect(xoaHocVienKhoiKhoa(dangKy.id)).rejects.toThrow(KhongTheXoaHocVienCoKetQuaError);
  });

  it("chặn xóa học viên đã có chứng chỉ ở khóa", async () => {
    const { khoa } = await taoKhoa();
    const dangKy = await themHocVienVaoKhoa({
      khoaId: khoa.id,
      hoTen: "E",
      soCCCD: `CCCD_${crypto.randomUUID()}`,
    });
    hocVienTaoTrongTest.push(dangKy.hocVienId);
    await prisma.chungChi.create({ data: { hocVienId: dangKy.hocVienId, khoaId: khoa.id } });

    await expect(xoaHocVienKhoiKhoa(dangKy.id)).rejects.toThrow(KhongTheXoaHocVienCoKetQuaError);
  });

  it("xóa báo lỗi khi không tìm thấy hồ sơ đăng ký", async () => {
    await expect(xoaHocVienKhoiKhoa("khong-ton-tai")).rejects.toThrow(KhongTimThayDangKyError);
  });

  it("ghi nhận thôi học chuyển đúng trạng thái, không xóa hồ sơ", async () => {
    const { khoa } = await taoKhoa();
    const dangKy = await themHocVienVaoKhoa({
      khoaId: khoa.id,
      hoTen: "F",
      soCCCD: `CCCD_${crypto.randomUUID()}`,
    });
    hocVienTaoTrongTest.push(dangKy.hocVienId);

    const ketQua = await ghiNhanThoiHoc(dangKy.id, "Lý do cá nhân");
    expect(ketQua.trangThai).toBe("THOI_HOC");

    const ds = await danhSachHocVienTheoKhoa(khoa.id);
    expect(ds.map((dk) => dk.id)).toContain(dangKy.id);
  });

  it("chuyển học viên sang khóa khác thành công (xóa ở khóa cũ, tạo mới ở khóa đích)", async () => {
    const { khoa: khoa1 } = await taoKhoa();
    const { khoa: khoa2 } = await taoKhoa();
    const dangKy = await themHocVienVaoKhoa({
      khoaId: khoa1.id,
      hoTen: "G",
      soCCCD: `CCCD_${crypto.randomUUID()}`,
    });
    hocVienTaoTrongTest.push(dangKy.hocVienId);

    const dangKyMoi = await chuyenHocVienSangKhoa(dangKy.id, khoa2.id, "Chuyển theo nguyện vọng");
    expect(dangKyMoi.khoaId).toBe(khoa2.id);
    expect(dangKyMoi.hocVienId).toBe(dangKy.hocVienId);

    const dsKhoa1 = await danhSachHocVienTheoKhoa(khoa1.id);
    expect(dsKhoa1.map((dk) => dk.hocVienId)).not.toContain(dangKy.hocVienId);
    const dsKhoa2 = await danhSachHocVienTheoKhoa(khoa2.id);
    expect(dsKhoa2.map((dk) => dk.id)).toContain(dangKyMoi.id);
  });

  it("chặn chuyển khi học viên đã có điểm ở khóa hiện tại", async () => {
    const { khoa: khoa1, chuongTrinh } = await taoKhoa();
    const { khoa: khoa2 } = await taoKhoa();
    const hocPhan = await prisma.hocPhan.create({
      data: { chuongTrinhId: chuongTrinh.id, ten: "Học phần 1", soTiet: 30, thuTu: 1 },
    });
    const dangKy = await themHocVienVaoKhoa({
      khoaId: khoa1.id,
      hoTen: "H",
      soCCCD: `CCCD_${crypto.randomUUID()}`,
    });
    hocVienTaoTrongTest.push(dangKy.hocVienId);
    await prisma.ketQuaHocTap.create({
      data: { hocVienId: dangKy.hocVienId, khoaId: khoa1.id, hocPhanId: hocPhan.id, diemKetThuc: 9 },
    });

    await expect(chuyenHocVienSangKhoa(dangKy.id, khoa2.id)).rejects.toThrow(
      KhongTheXoaHocVienCoKetQuaError,
    );
  });

  it("chặn chuyển khi học viên đã đăng ký sẵn ở khóa đích", async () => {
    const { khoa: khoa1 } = await taoKhoa();
    const { khoa: khoa2 } = await taoKhoa();
    const cccd = `CCCD_${crypto.randomUUID()}`;
    const dangKy1 = await themHocVienVaoKhoa({ khoaId: khoa1.id, hoTen: "I", soCCCD: cccd });
    hocVienTaoTrongTest.push(dangKy1.hocVienId);
    await themHocVienVaoKhoa({ khoaId: khoa2.id, hoTen: "I", soCCCD: cccd });

    await expect(chuyenHocVienSangKhoa(dangKy1.id, khoa2.id)).rejects.toThrow(DaDangKyKhoaNayError);
  });

  it("chuyển báo lỗi khi không tìm thấy khóa đích", async () => {
    const { khoa } = await taoKhoa();
    const dangKy = await themHocVienVaoKhoa({
      khoaId: khoa.id,
      hoTen: "K",
      soCCCD: `CCCD_${crypto.randomUUID()}`,
    });
    hocVienTaoTrongTest.push(dangKy.hocVienId);

    await expect(chuyenHocVienSangKhoa(dangKy.id, "khong-ton-tai")).rejects.toThrow(
      KhongTimThayKhoaError,
    );
  });

  async function themHv(khoaId: string, hoTen = "HV") {
    const dk = await themHocVienVaoKhoa({ khoaId, hoTen, soCCCD: `CCCD_${crypto.randomUUID()}` });
    hocVienTaoTrongTest.push(dk.hocVienId);
    return dk;
  }

  it("chặn xóa/chuyển khi học viên đã nộp học phí ở khóa (tiền đã thu gắn theo khóa)", async () => {
    const { khoa: khoa1 } = await taoKhoa();
    const { khoa: khoa2 } = await taoKhoa();
    const dk = await themHv(khoa1.id);
    const hp = await prisma.hocPhi.create({
      data: { hocVienId: dk.hocVienId, khoaId: khoa1.id, soTienPhaiNop: 1_000_000, soTienDaNop: 300_000, trangThai: "CON_NO" },
    });
    await prisma.phieuThu.create({ data: { soPhieu: `PT_HV09_${crypto.randomUUID()}`, hocPhiId: hp.id, soTien: 300_000 } });

    await expect(xoaHocVienKhoiKhoa(dk.id)).rejects.toThrow(DaNopHocPhiKhoaNayError);
    await expect(chuyenHocVienSangKhoa(dk.id, khoa2.id)).rejects.toThrow(DaNopHocPhiKhoaNayError);
    expect(await prisma.dangKyHoc.count({ where: { id: dk.id } })).toBe(1);
    expect(await prisma.hocPhi.count({ where: { id: hp.id } })).toBe(1);
  });

  it("học phí chưa thu đồng nào được xóa kèm đăng ký (không để dòng học phí mồ côi)", async () => {
    const { khoa: khoa1 } = await taoKhoa();
    const { khoa: khoa2 } = await taoKhoa();
    const dk1 = await themHv(khoa1.id);
    const dk2 = await themHv(khoa1.id);
    for (const dk of [dk1, dk2]) {
      await prisma.hocPhi.create({ data: { hocVienId: dk.hocVienId, khoaId: khoa1.id, soTienPhaiNop: 500_000 } });
    }
    await xoaHocVienKhoiKhoa(dk1.id);
    await chuyenHocVienSangKhoa(dk2.id, khoa2.id);
    expect(await prisma.hocPhi.count({ where: { khoaId: khoa1.id } })).toBe(0);
  });

  it("chặn xóa/chuyển hồ sơ qua đơn vị liên kết (gắn đúng 1 hợp đồng - xử lý ở DVLK)", async () => {
    const { khoa: khoa1 } = await taoKhoa({ phuongThuc: "QUA_DON_VI_LIEN_KET" });
    const { khoa: khoa2 } = await taoKhoa();
    const dv = await prisma.donViLienKet.create({ data: { ma: `DV_HV09_${crypto.randomUUID()}`, ten: "ĐVLK" } });
    donViTaoTrongTest.push(dv.id);
    const hd = await prisma.hopDongLienKet.create({
      data: { maHopDong: `HD_HV09_${crypto.randomUUID()}`, donViLienKetId: dv.id, khoaId: khoa1.id },
    });
    const hv = await prisma.hocVien.create({ data: { maHocVien: `HV_HV09_${crypto.randomUUID()}`, hoTen: "Qua ĐVLK" } });
    hocVienTaoTrongTest.push(hv.id);
    const dk = await prisma.dangKyHoc.create({ data: { hocVienId: hv.id, khoaId: khoa1.id, hopDongLienKetId: hd.id } });

    await expect(xoaHocVienKhoiKhoa(dk.id)).rejects.toThrow(HoSoQuaDonViLienKetError);
    await expect(chuyenHocVienSangKhoa(dk.id, khoa2.id)).rejects.toThrow(HoSoQuaDonViLienKetError);
  });

  it("khóa đích không nhận: đủ sĩ số, đã kết thúc, Phương thức 4, kết quả đã phê duyệt", async () => {
    const { khoa: nguon } = await taoKhoa();
    const dk = await themHv(nguon.id);

    const { khoa: day } = await taoKhoa({ siSoToiDa: 1 });
    await themHv(day.id);
    await expect(chuyenHocVienSangKhoa(dk.id, day.id)).rejects.toThrow(KhoaDichKhongNhanHocVienError);
    await expect(
      themHocVienVaoKhoa({ khoaId: day.id, hoTen: "Z", soCCCD: `CCCD_${crypto.randomUUID()}` }),
    ).rejects.toThrow(KhoaDichKhongNhanHocVienError);

    const { khoa: ketThuc } = await taoKhoa();
    await prisma.khoa.update({ where: { id: ketThuc.id }, data: { trangThai: "DA_KET_THUC" } });
    await expect(chuyenHocVienSangKhoa(dk.id, ketThuc.id)).rejects.toThrow(/đã kết thúc/);

    const { khoa: pt4 } = await taoKhoa({ phuongThuc: "QUA_DON_VI_LIEN_KET" });
    await expect(chuyenHocVienSangKhoa(dk.id, pt4.id)).rejects.toThrow(/đơn vị liên kết/);

    const { khoa: daDuyet } = await taoKhoa();
    const hvDaDuyet = await themHv(daDuyet.id);
    await prisma.ketQuaKhoa.create({ data: { hocVienId: hvDaDuyet.hocVienId, khoaId: daDuyet.id, daPheDuyet: true } });
    await expect(chuyenHocVienSangKhoa(dk.id, daDuyet.id)).rejects.toThrow(/phê duyệt/);

    // đăng ký ở khóa nguồn không bị động tới
    expect(await prisma.dangKyHoc.count({ where: { id: dk.id } })).toBe(1);
  });

  it("lưu lịch sử thay đổi: thêm, chuyển (ghi ở cả 2 khóa), thôi học, xóa - kèm người thực hiện, lý do", async () => {
    const { khoa: khoa1 } = await taoKhoa();
    const { khoa: khoa2 } = await taoKhoa();
    const nguoi = { nguoiThucHienTen: "Cán bộ HV-09" };
    const cccd = () => `CCCD_${crypto.randomUUID()}`;
    const a = await themHocVienVaoKhoa({ khoaId: khoa1.id, hoTen: "Lịch sử A", soCCCD: cccd(), lyDo: "Bổ sung" }, nguoi);
    const b = await themHocVienVaoKhoa({ khoaId: khoa1.id, hoTen: "Lịch sử B", soCCCD: cccd() }, nguoi);
    const c = await themHocVienVaoKhoa({ khoaId: khoa1.id, hoTen: "Lịch sử C", soCCCD: cccd() }, nguoi);
    hocVienTaoTrongTest.push(a.hocVienId, b.hocVienId, c.hocVienId);

    await chuyenHocVienSangKhoa(a.id, khoa2.id, "Theo nguyện vọng", nguoi);
    await ghiNhanThoiHoc(b.id, "Chuyển công tác", nguoi);
    await xoaHocVienKhoiKhoa(c.id, "Nhập nhầm", nguoi);

    const ls1 = await lichSuThayDoiDanhSach(khoa1.id);
    expect(ls1.map((x) => x.hanhDong).sort()).toEqual(
      [
        HANH_DONG_HV09.THEM,
        HANH_DONG_HV09.THEM,
        HANH_DONG_HV09.THEM,
        HANH_DONG_HV09.CHUYEN_DI,
        HANH_DONG_HV09.THOI_HOC,
        HANH_DONG_HV09.XOA,
      ].sort(),
    );
    expect(ls1.every((x) => x.nguoiThucHienTen === "Cán bộ HV-09")).toBe(true);
    expect(ls1.find((x) => x.hanhDong === HANH_DONG_HV09.XOA)?.chiTiet).toMatch(/Lịch sử C .* lý do: Nhập nhầm/);
    const ls2 = await lichSuThayDoiDanhSach(khoa2.id);
    expect(ls2.map((x) => x.hanhDong)).toEqual([HANH_DONG_HV09.CHUYEN_DEN]);
    expect(ls2[0].chiTiet).toContain(khoa1.maKhoa);
  });
});
