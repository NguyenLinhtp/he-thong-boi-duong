import { afterAll, describe, expect, it } from "vitest";
import type { PhuongThucDangKy } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { taoChuongTrinh } from "@/server/services/ct/ct-01-tao-chuong-trinh";
import { themHocPhan } from "@/server/services/ct/ct-02-hoc-phan";
import { trinhThamDinh, pheDuyet } from "@/server/services/ct/ct-03-phe-duyet";
import { thietLapPhuongThucDangKy } from "@/server/services/ct/ct-07-phuong-thuc-dang-ky";
import { khoiTaoKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { phanCongGiangVien } from "@/server/services/kh/kh-02-phan-cong-giang-vien";
import { chuyenTrangThaiKhoa } from "@/server/services/kh/kh-05-trang-thai-si-so";
import { dangKyTrucTuyen } from "@/server/services/hv/hv-01-dang-ky-truc-tuyen";
import { xacNhanNopGiay } from "@/server/services/hv/hv-02-xac-nhan-nop-giay";
import { importDanhSachHocVien } from "@/server/services/hv/hv-03-import-danh-sach";
import { xacNhanThamGia } from "@/server/services/hv/hv-04-tu-xac-nhan";
import { dangKyDuThi } from "@/server/services/hv/hv-05-dang-ky-du-thi";
import { thamDinhHoSo } from "@/server/services/hv/hv-06-tham-dinh";
import { xetDuyetDanhSachChinhThuc } from "@/server/services/hv/hv-07-xet-duyet-chinh-thuc";
import { dangKyThayMatDonViLienKet } from "@/server/services/hv/hv-11-dang-ky-thay-mat-dvlk";
import { thietLapHocPhi, hocPhiCuaKhoa } from "@/server/services/hp/hp-01-thiet-lap";
import { xacNhanThanhToan, xacNhanMienGiam } from "@/server/services/hp/hp-02-thanh-toan";
import { nhapDiemHocPhan } from "@/server/services/kq/kq-01-nhap-diem";
import { tongHopKetQuaKhoa } from "@/server/services/kq/kq-02-tong-hop";
import { xetDieuKienHoanThanh } from "@/server/services/kq/kq-03-xet-hoan-thanh";
import { pheDuyetKetQua } from "@/server/services/kq/kq-04-phe-duyet";
import { nhapKetQuaThi } from "@/server/services/kq/kq-06-ket-qua-thi";
import { lapDanhSachDeNghi, xetDeNghiCapChungChi } from "@/server/services/cc/cc-01-de-nghi";
import { sinhSoHieu } from "@/server/services/cc/cc-02-so-hieu";
import { kyDuyetChungChi } from "@/server/services/cc/cc-03-ky-duyet";
import { traTrucTiep, banGiaoTheoLo } from "@/server/services/cc/cc-04-so-cap";
import { xacThucTheoMa } from "@/server/services/cc/cc-05-xac-thuc";
import { taoDonViLienKet } from "@/server/services/dvlk/dvlk-01-danh-muc";
import { capTaiKhoanDonViLienKet } from "@/server/services/dvlk/dvlk-02-tai-khoan";
import { taoHopDong } from "@/server/services/dvlk/dvlk-03-hop-dong";
import { xacNhanThuHoSo } from "@/server/services/dvlk/dvlk-05-xac-nhan-thu-ho-so";
import { thanhLyHopDong } from "@/server/services/dvlk/dvlk-06-thanh-ly";
import { KhoaChiDuThiError } from "@/server/services/kq/loi-ket-qua";

/**
 * Giai đoạn 3 (kế hoạch): integration test luồng xuyên suốt
 * đăng ký → xét duyệt → học → thi/điểm → học phí → chứng chỉ, chạy với cả 4
 * phương thức đăng ký. Chỉ gọi service nghiệp vụ (không ghi thẳng CSDL, trừ
 * danh mục nền: loại hình, giảng viên), kèm các điểm chặn chéo module.
 */

const uid = () => crypto.randomUUID().slice(0, 8);
const CB = { nguoiThucHienTen: "Cán bộ integration" };
const TC = { nguoiXacNhanTen: "Cán bộ tài chính integration" };
const ids = {
  loaiHinh: [] as string[],
  chuongTrinh: [] as string[],
  khoa: [] as string[],
  giangVien: [] as string[],
  donVi: [] as string[],
  nguoiDung: [] as string[],
};

afterAll(async () => {
  const khoaId = { in: ids.khoa };
  const hocVienIds = (await prisma.dangKyHoc.findMany({ where: { khoaId }, select: { hocVienId: true } })).map((d) => d.hocVienId);
  await prisma.thongBao.deleteMany({ where: { hocVienId: { in: hocVienIds } } });
  await prisma.banGiaoChungChi.deleteMany({ where: { hopDongLienKet: { khoaId } } });
  await prisma.chungChi.deleteMany({ where: { khoaId } });
  await prisma.quyetDinhCapVanBang.deleteMany({ where: { khoaId } });
  await prisma.ketQuaHocTap.deleteMany({ where: { khoaId } });
  await prisma.ketQuaKhoa.deleteMany({ where: { khoaId } });
  await prisma.phieuThu.deleteMany({ where: { hocPhi: { khoaId } } });
  await prisma.hocPhi.deleteMany({ where: { khoaId } });
  await prisma.dangKyHoc.deleteMany({ where: { khoaId } });
  await prisma.loNopHoSo.deleteMany({ where: { hopDongLienKet: { khoaId } } });
  await prisma.hopDongLienKet.deleteMany({ where: { khoaId } });
  await prisma.donViLienKet.deleteMany({ where: { id: { in: ids.donVi } } });
  await prisma.nguoiDungVaiTro.deleteMany({ where: { nguoiDungId: { in: ids.nguoiDung } } });
  await prisma.nguoiDung.deleteMany({ where: { id: { in: ids.nguoiDung } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: hocVienIds } } });
  await prisma.giangVienHocPhan.deleteMany({ where: { khoaId } });
  await prisma.buoiHoc.deleteMany({ where: { khoaId } });
  await prisma.khoa.deleteMany({ where: { id: { in: ids.khoa } } });
  await prisma.giangVien.deleteMany({ where: { id: { in: ids.giangVien } } });
  await prisma.chuongTrinhPhienBan.deleteMany({ where: { chuongTrinhId: { in: ids.chuongTrinh } } });
  await prisma.hocPhan.deleteMany({ where: { chuongTrinhId: { in: ids.chuongTrinh } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: ids.chuongTrinh } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: ids.loaiHinh } } });
});

/** CT-01 → CT-02 → CT-07 → CT-03 → KH-01 → HP-01 → KH-05 (Đang tuyển sinh). */
async function moKhoa(phuongThuc: PhuongThucDangKy, mucHocPhi: number) {
  const lh = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH_INT_${uid()}`, ten: "Loại hình integration" } });
  ids.loaiHinh.push(lh.id);
  const ct = await taoChuongTrinh({ ten: `CT integration ${phuongThuc}`, tongThoiLuong: 30, loaiHinhBoiDuongId: lh.id });
  ids.chuongTrinh.push(ct.id);
  const hp1 = await themHocPhan(ct.id, { ten: "Học phần 1", soTiet: 15 });
  const hp2 = await themHocPhan(ct.id, { ten: "Học phần 2", soTiet: 15 });
  await thietLapPhuongThucDangKy(ct.id, phuongThuc);
  await trinhThamDinh(ct.id);
  await pheDuyet(ct.id, { soQuyetDinh: `QD-CT-${uid()}` });

  const khoa = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa: 10, mucHocPhi });
  ids.khoa.push(khoa.id);
  await thietLapHocPhi(khoa.id, { mucHocPhi });
  await chuyenTrangThaiKhoa(khoa.id, "DANG_TUYEN_SINH");
  return { ct, khoa, dsHocPhan: [hp1, hp2] };
}

/** KH-02 phân công + KQ-01 nhập điểm mọi học phần cho học viên chính thức. */
async function hocVaNhapDiem(khoaId: string, dsHocPhan: { id: string }[], diem: Record<string, number>) {
  const gv = await prisma.giangVien.create({ data: { hoTen: `GV integration ${uid()}` } });
  ids.giangVien.push(gv.id);
  for (const hp of dsHocPhan) {
    await phanCongGiangVien({ khoaId, hocPhanId: hp.id, giangVienId: gv.id });
    await nhapDiemHocPhan(
      gv.id,
      khoaId,
      hp.id,
      Object.entries(diem).map(([hocVienId, d]) => ({ hocVienId, diemThanhPhan: d, diemKetThuc: d })),
    );
  }
}

/** KQ-02 → KQ-03 → KQ-04. */
async function chotKetQua(khoaId: string) {
  await tongHopKetQuaKhoa(khoaId);
  const xet = await xetDieuKienHoanThanh(khoaId);
  await pheDuyetKetQua(khoaId, { ...CB, soQuyetDinh: `QD-KQ-${uid()}` });
  return xet;
}

/** CC-01 → CC-02 → CC-03, trả về văn bằng đã ký duyệt. */
async function capVanBang(khoaId: string) {
  const deNghi = await lapDanhSachDeNghi(khoaId, CB);
  await sinhSoHieu(khoaId, CB);
  const { dsChungChi } = await kyDuyetChungChi(khoaId, {
    ...CB,
    soQuyetDinh: `QD-CC-${uid()}`,
    ngayKy: new Date(),
    nguoiKy: "Hiệu trưởng",
  });
  return { deNghi, dsChungChi };
}

describe("Luồng xuyên suốt: đăng ký → xét duyệt → học → điểm → học phí → chứng chỉ", () => {
  it("Phương thức 1: đăng ký trực tuyến + nộp giấy; còn nợ học phí thì không được cấp dù đạt điểm", async () => {
    const { khoa, dsHocPhan } = await moKhoa("TRUC_TUYEN_NOP_GIAY", 1_000_000);

    const dkAn = await dangKyTrucTuyen({ khoaId: khoa.id, hoTen: "Nguyễn Văn An", soCCCD: `0${uid()}` });
    const dkBinh = await dangKyTrucTuyen({ khoaId: khoa.id, hoTen: "Trần Thị Bình", soCCCD: `0${uid()}` });
    for (const dk of [dkAn, dkBinh]) {
      await xacNhanNopGiay(dk.id);
      await thamDinhHoSo(dk.id, "HOP_LE");
    }
    await xetDuyetDanhSachChinhThuc(khoa.id, [dkAn.id, dkBinh.id]);

    const dsHocPhi = await hocPhiCuaKhoa(khoa.id);
    const hpAn = dsHocPhi.find((hp) => hp.hocVienId === dkAn.hocVienId)!;
    const hpBinh = dsHocPhi.find((hp) => hp.hocVienId === dkBinh.hocVienId)!;
    await xacNhanThanhToan(hpAn.id, { ...TC, soTien: 1_000_000, hinhThucNop: "Chuyển khoản" });
    await xacNhanThanhToan(hpBinh.id, { ...TC, soTien: 400_000, hinhThucNop: "Tiền mặt" });

    await chuyenTrangThaiKhoa(khoa.id, "DANG_DIEN_RA");
    await hocVaNhapDiem(khoa.id, dsHocPhan, { [dkAn.hocVienId]: 8, [dkBinh.hocVienId]: 9 });
    await chuyenTrangThaiKhoa(khoa.id, "DA_KET_THUC");
    const xet = await chotKetQua(khoa.id);

    // KQ-03/HP-06: Bình đạt điểm nhưng còn nợ -> không hoàn thành
    expect(xet.duDieuKien.map((kq) => kq.hocVienId)).toEqual([dkAn.hocVienId]);
    expect(xet.khongDuDieuKien.map((kq) => kq.hocVienId)).toEqual([dkBinh.hocVienId]);

    const { deNghi, dsChungChi } = await capVanBang(khoa.id);
    expect(deNghi.map((cc) => cc.hocVienId)).toEqual([dkAn.hocVienId]);
    expect(dsChungChi).toHaveLength(1);

    const vanBang = dsChungChi[0];
    await traTrucTiep(vanBang.id, { ...CB, nguoiNhan: "Nguyễn Văn An" });
    const sau = await prisma.chungChi.findUniqueOrThrow({ where: { id: vanBang.id } });
    expect(sau.trangThai).toBe("DA_CAP");
    const xacThuc = await xacThucTheoMa(sau.maXacThuc!);
    expect(xacThuc).toMatchObject({ soHieu: sau.soHieu });
  }, 120_000);

  it("Phương thức 2: import danh sách + học viên tự xác nhận bằng CCCD; miễn giảm được coi như hoàn tất học phí", async () => {
    const { khoa, dsHocPhan } = await moKhoa("IMPORT_TU_XAC_NHAN", 800_000);
    const [cccdChi, cccdDung] = [`1${uid()}`, `1${uid()}`];
    await importDanhSachHocVien(
      khoa.id,
      `hoTen,soCCCD,donViCongTac\nLê Thị Chi,${cccdChi},Trường A\nPhạm Văn Dũng,${cccdDung},Trường B`,
    );

    // chặn: CCCD không có trong danh sách import
    await expect(xacNhanThamGia({ khoaId: khoa.id, soCCCD: `9${uid()}` })).rejects.toThrow();

    const dkChi = await xacNhanThamGia({ khoaId: khoa.id, soCCCD: cccdChi });
    const dkDung = await xacNhanThamGia({ khoaId: khoa.id, soCCCD: cccdDung });
    for (const dk of [dkChi, dkDung]) await thamDinhHoSo(dk.id, "HOP_LE");
    await xetDuyetDanhSachChinhThuc(khoa.id, [dkChi.id, dkDung.id]);

    const dsHocPhi = await hocPhiCuaKhoa(khoa.id);
    await xacNhanThanhToan(dsHocPhi.find((hp) => hp.hocVienId === dkChi.hocVienId)!.id, {
      ...TC,
      soTien: 800_000,
      hinhThucNop: "Chuyển khoản",
    });
    await xacNhanMienGiam(dsHocPhi.find((hp) => hp.hocVienId === dkDung.hocVienId)!.id, { ...TC, lyDo: "Diện chính sách" });

    await chuyenTrangThaiKhoa(khoa.id, "DANG_DIEN_RA");
    await hocVaNhapDiem(khoa.id, dsHocPhan, { [dkChi.hocVienId]: 7, [dkDung.hocVienId]: 6 });
    await chuyenTrangThaiKhoa(khoa.id, "DA_KET_THUC");
    await chotKetQua(khoa.id);

    const { deNghi, dsChungChi } = await capVanBang(khoa.id);
    expect(deNghi.map((cc) => cc.hocVienId).sort()).toEqual([dkChi.hocVienId, dkDung.hocVienId].sort());
    expect(dsChungChi.every((cc) => cc.soHieu)).toBe(true);
  }, 120_000);

  it("Phương thức 3: chỉ dự thi - không nhập điểm học phần, cấp văn bằng theo kết quả thi", async () => {
    const { khoa, dsHocPhan } = await moKhoa("CHI_DU_THI", 500_000);

    const dkEm = await dangKyDuThi({ khoaId: khoa.id, hoTen: "Hoàng Văn Em", soCCCD: `2${uid()}` });
    const dkGiang = await dangKyDuThi({ khoaId: khoa.id, hoTen: "Vũ Thị Giang", soCCCD: `2${uid()}` });
    for (const dk of [dkEm, dkGiang]) await thamDinhHoSo(dk.id, "HOP_LE");
    await xetDuyetDanhSachChinhThuc(khoa.id, [dkEm.id, dkGiang.id]);
    for (const hp of await hocPhiCuaKhoa(khoa.id)) {
      await xacNhanThanhToan(hp.id, { ...TC, soTien: 500_000, hinhThucNop: "Tiền mặt" });
    }
    await chuyenTrangThaiKhoa(khoa.id, "DANG_DIEN_RA");

    // chặn: khóa chỉ dự thi không có giảng dạy/điểm học phần (HV-05)
    await expect(hocVaNhapDiem(khoa.id, dsHocPhan, { [dkEm.hocVienId]: 8 })).rejects.toThrow(KhoaChiDuThiError);

    await nhapKetQuaThi(khoa.id, [
      { hocVienId: dkEm.hocVienId, diemThi: 8.5 },
      { hocVienId: dkGiang.hocVienId, diemThi: 3 },
    ]);
    await chuyenTrangThaiKhoa(khoa.id, "DA_KET_THUC");
    await xetDieuKienHoanThanh(khoa.id);
    await pheDuyetKetQua(khoa.id, { ...CB, soQuyetDinh: `QD-KQ-${uid()}` });

    const { deNghi } = await capVanBang(khoa.id);
    expect(deNghi.map((cc) => cc.hocVienId)).toEqual([dkEm.hocVienId]);
  }, 120_000);

  it("Phương thức 4: đơn vị liên kết đăng ký hộ; chỉ vào đề nghị cấp sau khi hợp đồng thanh lý, bàn giao theo lô", async () => {
    const { khoa, dsHocPhan } = await moKhoa("QUA_DON_VI_LIEN_KET", 1_200_000);
    const dv = await taoDonViLienKet({ ma: `DV_INT_${uid()}`, ten: "Trung tâm liên kết integration" });
    ids.donVi.push(dv.id);
    const tk = await capTaiKhoanDonViLienKet(dv.id, { tenDangNhap: `dvlk_int_${uid()}`, matKhau: "MatKhau@123", hoTen: "Cán bộ ĐVLK" });
    ids.nguoiDung.push(tk.id);
    const hopDong = await taoHopDong({ donViLienKetId: dv.id, khoaId: khoa.id, soLuongDuKien: 2, donGiaThoaThuan: 1_000_000 });

    const dkHa = await dangKyThayMatDonViLienKet(tk.id, { khoaId: khoa.id, hoTen: "Đỗ Thị Hà", soCCCD: `3${uid()}` });
    const dkKhanh = await dangKyThayMatDonViLienKet(tk.id, { khoaId: khoa.id, hoTen: "Bùi Văn Khánh", soCCCD: `3${uid()}` });
    await xacNhanThuHoSo({ loai: "DVLK", nguoiDungId: tk.id }, { ...CB, dangKyIds: [dkHa.id, dkKhanh.id] });
    for (const dk of [dkHa, dkKhanh]) await thamDinhHoSo(dk.id, "HOP_LE");
    await xetDuyetDanhSachChinhThuc(khoa.id, [dkHa.id, dkKhanh.id]);

    // học viên ĐVLK không nộp học phí cá nhân
    const dsHocPhi = await hocPhiCuaKhoa(khoa.id);
    expect(dsHocPhi.every((hp) => hp.trangThai === "CHO_THANH_LY_HOP_DONG")).toBe(true);
    await expect(xacNhanThanhToan(dsHocPhi[0].id, { ...TC, soTien: 100, hinhThucNop: "Tiền mặt" })).rejects.toThrow();

    await chuyenTrangThaiKhoa(khoa.id, "DANG_DIEN_RA");
    await hocVaNhapDiem(khoa.id, dsHocPhan, { [dkHa.hocVienId]: 8, [dkKhanh.hocVienId]: 7 });
    await chuyenTrangThaiKhoa(khoa.id, "DA_KET_THUC");
    await chotKetQua(khoa.id);

    // chặn: đạt kết quả nhưng hợp đồng chưa thanh lý -> chưa vào danh sách đề nghị
    const truocThanhLy = await xetDeNghiCapChungChi(khoa.id);
    expect(truocThanhLy.duDieuKien).toHaveLength(0);
    expect(await lapDanhSachDeNghi(khoa.id, CB)).toHaveLength(0);

    await thanhLyHopDong(hopDong.id, { nguoiThucHienTen: "Cán bộ tài chính integration", soTienQuyetToan: 2_000_000 });

    const { deNghi, dsChungChi } = await capVanBang(khoa.id);
    expect(deNghi.map((cc) => cc.hocVienId).sort()).toEqual([dkHa.hocVienId, dkKhanh.hocVienId].sort());
    expect(dsChungChi).toHaveLength(2);

    await banGiaoTheoLo(hopDong.id, CB);
    const daCap = await prisma.chungChi.findMany({ where: { khoaId: khoa.id } });
    expect(daCap.every((cc) => cc.trangThai === "DA_CAP" && cc.kenhNhan === "BAN_GIAO_DVLK")).toBe(true);
  }, 120_000);
});
