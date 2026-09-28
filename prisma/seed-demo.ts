/**
 * Dữ liệu mẫu cho môi trường dev / chạy thử (UAT) - KHÔNG dùng cho CSDL thật.
 *
 *   npx tsx prisma/seed-demo.ts         tạo dữ liệu mẫu (bỏ qua nếu đã có)
 *   npx tsx prisma/seed-demo.ts --xoa   xóa dữ liệu mẫu
 *
 * Đi qua đúng các service nghiệp vụ (CT → KH → HV → HP → KQ → CC → DVLK) để
 * dữ liệu hợp lệ như khi người dùng thao tác thật. Mọi dữ liệu mẫu gắn với loại
 * hình mã "DEMO_*" và tài khoản "demo_*" để xóa sạch được.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import type { PhuongThucDangKy, VaiTro } from "../src/generated/prisma/client";
import { prisma } from "../src/lib/db/prisma";
import { taoChuongTrinh } from "../src/server/services/ct/ct-01-tao-chuong-trinh";
import { themHocPhan } from "../src/server/services/ct/ct-02-hoc-phan";
import { trinhThamDinh, pheDuyet } from "../src/server/services/ct/ct-03-phe-duyet";
import { thietLapPhuongThucDangKy } from "../src/server/services/ct/ct-07-phuong-thuc-dang-ky";
import { khoiTaoKhoa } from "../src/server/services/kh/kh-01-khoi-tao-khoa";
import { phanCongGiangVien } from "../src/server/services/kh/kh-02-phan-cong-giang-vien";
import { thietLapBuoiHoc } from "../src/server/services/kh/kh-03-thoi-khoa-bieu";
import { chuyenTrangThaiKhoa } from "../src/server/services/kh/kh-05-trang-thai-si-so";
import { dangKyTrucTuyen } from "../src/server/services/hv/hv-01-dang-ky-truc-tuyen";
import { xacNhanNopGiay } from "../src/server/services/hv/hv-02-xac-nhan-nop-giay";
import { importDanhSachHocVien } from "../src/server/services/hv/hv-03-import-danh-sach";
import { xacNhanThamGia } from "../src/server/services/hv/hv-04-tu-xac-nhan";
import { dangKyDuThi } from "../src/server/services/hv/hv-05-dang-ky-du-thi";
import { thamDinhHoSo } from "../src/server/services/hv/hv-06-tham-dinh";
import { xetDuyetDanhSachChinhThuc } from "../src/server/services/hv/hv-07-xet-duyet-chinh-thuc";
import { dangKyThayMatDonViLienKet } from "../src/server/services/hv/hv-11-dang-ky-thay-mat-dvlk";
import { thietLapHocPhi, hocPhiCuaKhoa } from "../src/server/services/hp/hp-01-thiet-lap";
import { xacNhanThanhToan, xacNhanMienGiam } from "../src/server/services/hp/hp-02-thanh-toan";
import { nhapDiemHocPhan } from "../src/server/services/kq/kq-01-nhap-diem";
import { tongHopKetQuaKhoa } from "../src/server/services/kq/kq-02-tong-hop";
import { xetDieuKienHoanThanh } from "../src/server/services/kq/kq-03-xet-hoan-thanh";
import { pheDuyetKetQua } from "../src/server/services/kq/kq-04-phe-duyet";
import { lapDanhSachDeNghi } from "../src/server/services/cc/cc-01-de-nghi";
import { sinhSoHieu } from "../src/server/services/cc/cc-02-so-hieu";
import { kyDuyetChungChi } from "../src/server/services/cc/cc-03-ky-duyet";
import { traTrucTiep } from "../src/server/services/cc/cc-04-so-cap";
import { taoDonViLienKet } from "../src/server/services/dvlk/dvlk-01-danh-muc";
import { capTaiKhoanDonViLienKet } from "../src/server/services/dvlk/dvlk-02-tai-khoan";
import { taoHopDong } from "../src/server/services/dvlk/dvlk-03-hop-dong";
import { xacNhanThuHoSo } from "../src/server/services/dvlk/dvlk-05-xac-nhan-thu-ho-so";

const MAT_KHAU_DEMO = process.env.DEMO_MAT_KHAU ?? "DemoBoiDuong2026";
const CB = { nguoiThucHienTen: "Cán bộ đào tạo (dữ liệu mẫu)" };
const TC = { nguoiXacNhanTen: "Cán bộ tài chính (dữ liệu mẫu)" };

const HO_TEN = [
  "Nguyễn Thị Hoa", "Trần Văn Nam", "Lê Thị Thu Hà", "Phạm Minh Tuấn", "Hoàng Thị Lan", "Võ Văn Hùng",
  "Đặng Thị Mai", "Bùi Quốc Bảo", "Đỗ Thị Hằng", "Huỳnh Văn Phúc", "Ngô Thị Thanh", "Dương Văn Long",
  "Lý Thị Ngọc", "Phan Văn Khoa", "Trương Thị Yến", "Mai Văn Tâm", "Đinh Thị Hương", "Tô Văn Sơn",
  "Hồ Thị Kim Anh", "Châu Văn Lộc", "Lương Thị Diệu", "Tạ Văn Thành", "Kiều Thị Nhung", "Văn Công Minh",
];
const TRUONG = [
  "Trường THCS Nguyễn Huệ", "Trường THCS Lê Lợi", "Trường THCS Trần Phú", "Trường THCS Kim Đồng",
  "Trường Tiểu học Hòa Khánh", "Trường Tiểu học Phù Đổng",
];

let stt = 0;
const hocVienMau = () => {
  const i = stt++;
  return {
    hoTen: HO_TEN[i % HO_TEN.length],
    soCCCD: `0482${String(90000000 + i).padStart(8, "0")}`,
    ngaySinh: new Date(1980 + (i % 15), i % 12, 1 + (i % 27)),
    soDienThoai: `0905${String(100000 + i * 137).slice(-6)}`,
    email: `hocvien${i + 1}@demo.ued.vn`,
    donViCongTac: TRUONG[i % TRUONG.length],
  };
};
const ngay = (s: string) => new Date(`${s}T00:00:00.000Z`);

async function moChuongTrinh(o: {
  ten: string;
  loaiHinhId: string;
  phuongThuc: PhuongThucDangKy;
  hocPhan: [string, number][];
  mucTieu: string;
  doiTuong: string;
  loaiVanBang?: "CHUNG_CHI" | "CHUNG_NHAN";
}) {
  const tong = o.hocPhan.reduce((s, [, t]) => s + t, 0);
  const ct = await taoChuongTrinh({
    ten: o.ten,
    mucTieu: o.mucTieu,
    doiTuongApDung: o.doiTuong,
    tongThoiLuong: tong,
    loaiHinhBoiDuongId: o.loaiHinhId,
    loaiVanBang: o.loaiVanBang,
  });
  const dsHocPhan = [];
  for (const [ten, soTiet] of o.hocPhan) dsHocPhan.push(await themHocPhan(ct.id, { ten, soTiet }));
  await thietLapPhuongThucDangKy(ct.id, o.phuongThuc);
  await trinhThamDinh(ct.id);
  await pheDuyet(ct.id, { soQuyetDinh: `${1200 + stt}/QĐ-ĐHSP` });
  return { ct, dsHocPhan };
}

async function moKhoa(chuongTrinhId: string, o: { khaiGiang: string; beGiang: string; siSo: number; hocPhi: number; dotId: string }) {
  const khoa = await khoiTaoKhoa({
    chuongTrinhId,
    thoiGianKhaiGiang: ngay(o.khaiGiang),
    thoiGianBeGiang: ngay(o.beGiang),
    siSoToiDa: o.siSo,
    mucHocPhi: o.hocPhi,
    dotTuyenSinhId: o.dotId,
  });
  await thietLapHocPhi(khoa.id, { mucHocPhi: o.hocPhi });
  await chuyenTrangThaiKhoa(khoa.id, "DANG_TUYEN_SINH");
  return khoa;
}

async function taoTaiKhoan(tenDangNhap: string, hoTen: string, vaiTro: VaiTro) {
  const vt = await prisma.vaiTroModel.findUniqueOrThrow({ where: { ma: vaiTro } });
  return prisma.nguoiDung.create({
    data: {
      tenDangNhap,
      hoTen,
      matKhauHash: await bcrypt.hash(MAT_KHAU_DEMO, 10),
      vaiTros: { create: [{ vaiTroId: vt.id }] },
    },
  });
}

async function taoDuLieu() {
  if (await prisma.loaiHinhBoiDuong.findUnique({ where: { ma: "DEMO_CDNN" } })) {
    console.log("Đã có dữ liệu mẫu - chạy với --xoa trước nếu muốn tạo lại.");
    return;
  }

  // ---- Danh mục (DM) ----
  const lhTx = await prisma.loaiHinhBoiDuong.create({ data: { ma: "DEMO_BDTX", ten: "Bồi dưỡng thường xuyên" } });
  const lhCdnn = await prisma.loaiHinhBoiDuong.create({
    data: { ma: "DEMO_CDNN", ten: "Bồi dưỡng theo tiêu chuẩn chức danh nghề nghiệp" },
  });
  const lhCd = await prisma.loaiHinhBoiDuong.create({ data: { ma: "DEMO_CD", ten: "Bồi dưỡng chuyên đề" } });
  const khoaToan = await prisma.donVi.create({ data: { ma: "DEMO_KTOAN", ten: "Khoa Toán" } });
  const khoaTlgd = await prisma.donVi.create({ data: { ma: "DEMO_KTLGD", ten: "Khoa Tâm lý - Giáo dục" } });
  await prisma.donVi.create({ data: { ma: "DEMO_KTIN", ten: "Khoa Tin học" } });
  const phong = await prisma.phongHoc.create({ data: { ma: "DEMO_A101", ten: "Phòng A1.01", coSo: "Cơ sở chính", sucChua: 60 } });
  await prisma.phongHoc.create({ data: { ma: "DEMO_B203", ten: "Phòng B2.03", coSo: "Cơ sở chính", sucChua: 45 } });
  const dot = await prisma.dotTuyenSinh.create({
    data: { ma: "DEMO_2026_D2", ten: "Đợt 2 năm 2026", ngayBatDau: ngay("2026-05-01"), ngayKetThuc: ngay("2026-12-31") },
  });

  // ---- Tài khoản theo vai trò ----
  await taoTaiKhoan("demo_daotao", "Lê Thị Minh Thư", "CAN_BO_QUAN_LY_DAO_TAO");
  await taoTaiKhoan("demo_taichinh", "Nguyễn Văn Phát", "CAN_BO_TAI_CHINH");
  await taoTaiKhoan("demo_admin", "Trần Quốc Việt", "ADMIN");
  const tkGv = await taoTaiKhoan("demo_giangvien", "TS. Phạm Thị Thanh", "GIANG_VIEN");
  const gv1 = await prisma.giangVien.create({
    data: { hoTen: "TS. Phạm Thị Thanh", nguoiDungId: tkGv.id, donViId: khoaTlgd.id, chuyenMon: "Quản lý giáo dục" },
  });
  const gv2 = await prisma.giangVien.create({ data: { hoTen: "PGS.TS. Nguyễn Văn Hải", donViId: khoaToan.id, chuyenMon: "Lý luận dạy học" } });

  // ---- P1: Phương thức 1, khóa đang diễn ra + khóa đang tuyển sinh ----
  const p1 = await moChuongTrinh({
    ten: "Bồi dưỡng theo tiêu chuẩn CDNN giáo viên THCS hạng II",
    loaiHinhId: lhCdnn.id,
    phuongThuc: "TRUC_TUYEN_NOP_GIAY",
    hocPhan: [["Quản lý nhà nước và pháp luật về giáo dục", 20], ["Phát triển năng lực nghề nghiệp giáo viên", 20]],
    mucTieu: "Trang bị kiến thức, kỹ năng theo tiêu chuẩn chức danh nghề nghiệp giáo viên THCS hạng II.",
    doiTuong: "Giáo viên THCS đang giữ hạng III hoặc tương đương",
  });
  const k1 = await moKhoa(p1.ct.id, { khaiGiang: "2026-09-07", beGiang: "2026-10-31", siSo: 30, hocPhi: 1_500_000, dotId: dot.id });
  const dsK1 = [];
  for (let i = 0; i < 8; i++) {
    const dk = await dangKyTrucTuyen({ khoaId: k1.id, ...hocVienMau() });
    await xacNhanNopGiay(dk.id);
    await thamDinhHoSo(dk.id, "HOP_LE");
    dsK1.push(dk);
  }
  await xetDuyetDanhSachChinhThuc(k1.id, dsK1.map((d) => d.id));
  const hpK1 = await hocPhiCuaKhoa(k1.id);
  for (const [i, hp] of hpK1.entries()) {
    if (i < 5) await xacNhanThanhToan(hp.id, { ...TC, soTien: 1_500_000, hinhThucNop: i % 2 ? "Tiền mặt" : "Chuyển khoản" });
    else if (i === 5) await xacNhanThanhToan(hp.id, { ...TC, soTien: 700_000, hinhThucNop: "Chuyển khoản" });
  }
  for (const [i, hp] of p1.dsHocPhan.entries()) {
    await phanCongGiangVien({ khoaId: k1.id, hocPhanId: hp.id, giangVienId: i === 0 ? gv1.id : gv2.id });
  }
  const lich: [string, number][] = [["2026-09-12", 0], ["2026-09-19", 0], ["2026-09-26", 1], ["2026-10-03", 1], ["2026-10-10", 0], ["2026-10-17", 1]];
  for (const [d, i] of lich) {
    await thietLapBuoiHoc({ khoaId: k1.id, hocPhanId: p1.dsHocPhan[i].id, ngayHoc: d, gioBatDau: "07:30", gioKetThuc: "11:00", phongHocId: phong.id });
  }
  await chuyenTrangThaiKhoa(k1.id, "DANG_DIEN_RA");

  const k2 = await moKhoa(p1.ct.id, { khaiGiang: "2026-11-02", beGiang: "2026-12-20", siSo: 40, hocPhi: 1_500_000, dotId: dot.id });
  for (let i = 0; i < 4; i++) {
    const dk = await dangKyTrucTuyen({ khoaId: k2.id, ...hocVienMau() });
    if (i < 2) await xacNhanNopGiay(dk.id);
  }

  // ---- P2: Phương thức 2, khóa đã kết thúc, đã cấp văn bằng ----
  const p2 = await moChuongTrinh({
    ten: "Bồi dưỡng thường xuyên cán bộ quản lý cơ sở giáo dục phổ thông năm 2026",
    loaiHinhId: lhTx.id,
    phuongThuc: "IMPORT_TU_XAC_NHAN",
    hocPhan: [["Quản trị nhà trường trong bối cảnh chuyển đổi số", 15], ["Xây dựng văn hóa nhà trường", 15]],
    mucTieu: "Cập nhật kiến thức quản trị nhà trường theo Chương trình GDPT 2018.",
    doiTuong: "Hiệu trưởng, phó hiệu trưởng cơ sở GDPT",
  });
  const k3 = await moKhoa(p2.ct.id, { khaiGiang: "2026-06-01", beGiang: "2026-07-31", siSo: 25, hocPhi: 900_000, dotId: dot.id });
  const dsNguoiK3 = Array.from({ length: 6 }, hocVienMau);
  await importDanhSachHocVien(
    k3.id,
    ["hoTen,soCCCD,donViCongTac", ...dsNguoiK3.map((h) => `${h.hoTen},${h.soCCCD},${h.donViCongTac}`)].join("\n"),
  );
  const dsK3 = [];
  for (const h of dsNguoiK3) {
    const dk = await xacNhanThamGia({ khoaId: k3.id, soCCCD: h.soCCCD });
    await thamDinhHoSo(dk.id, "HOP_LE");
    dsK3.push(dk);
  }
  await xetDuyetDanhSachChinhThuc(k3.id, dsK3.map((d) => d.id));
  for (const [i, hp] of (await hocPhiCuaKhoa(k3.id)).entries()) {
    if (i === 0) await xacNhanMienGiam(hp.id, { ...TC, lyDo: "Diện chính sách" });
    else if (i < 5) await xacNhanThanhToan(hp.id, { ...TC, soTien: 900_000, hinhThucNop: "Chuyển khoản" });
  }
  for (const hp of p2.dsHocPhan) await phanCongGiangVien({ khoaId: k3.id, hocPhanId: hp.id, giangVienId: gv1.id });
  await chuyenTrangThaiKhoa(k3.id, "DANG_DIEN_RA");
  for (const [j, hp] of p2.dsHocPhan.entries()) {
    await nhapDiemHocPhan(
      gv1.id,
      k3.id,
      hp.id,
      dsK3.map((dk, i) => ({ hocVienId: dk.hocVienId, diemThanhPhan: 6 + ((i + j) % 4), diemKetThuc: i === 3 ? 4 : 7 + ((i + j) % 3) })),
    );
  }
  await chuyenTrangThaiKhoa(k3.id, "DA_KET_THUC");
  await tongHopKetQuaKhoa(k3.id);
  await xetDieuKienHoanThanh(k3.id);
  await pheDuyetKetQua(k3.id, { ...CB, soQuyetDinh: "1450/QĐ-ĐHSP" });
  await lapDanhSachDeNghi(k3.id, CB);
  await sinhSoHieu(k3.id, CB);
  const { dsChungChi } = await kyDuyetChungChi(k3.id, {
    ...CB,
    soQuyetDinh: "1502/QĐ-ĐHSP",
    ngayKy: ngay("2026-08-15"),
    nguoiKy: "Hiệu trưởng",
  });
  for (const cc of dsChungChi.slice(0, 2)) {
    const hv = await prisma.hocVien.findUniqueOrThrow({ where: { id: cc.hocVienId } });
    await traTrucTiep(cc.id, { ...CB, nguoiNhan: hv.hoTen });
  }

  // tài khoản học viên gắn với 1 học viên đã hoàn thành khóa k3 (xem KQ-05, văn bằng)
  const tkHv = await taoTaiKhoan("demo_hocvien", dsNguoiK3[1].hoTen, "HOC_VIEN");
  await prisma.hocVien.update({ where: { id: dsK3[1].hocVienId }, data: { nguoiDungId: tkHv.id } });

  // ---- P3: Phương thức 3, chỉ dự thi ----
  const p3 = await moChuongTrinh({
    ten: "Ứng dụng công nghệ thông tin cơ bản",
    loaiHinhId: lhCd.id,
    phuongThuc: "CHI_DU_THI",
    hocPhan: [["Hiểu biết về CNTT cơ bản", 10], ["Xử lý văn bản và bảng tính cơ bản", 10]],
    mucTieu: "Đánh giá, công nhận chuẩn kỹ năng sử dụng CNTT cơ bản.",
    doiTuong: "Giáo viên, cán bộ có nhu cầu",
    loaiVanBang: "CHUNG_NHAN",
  });
  const k4 = await moKhoa(p3.ct.id, { khaiGiang: "2026-10-25", beGiang: "2026-10-25", siSo: 50, hocPhi: 500_000, dotId: dot.id });
  for (let i = 0; i < 5; i++) {
    const dk = await dangKyDuThi({ khoaId: k4.id, ...hocVienMau() });
    if (i < 3) await thamDinhHoSo(dk.id, "HOP_LE");
  }

  // ---- P4: Phương thức 4, qua đơn vị liên kết ----
  const p4 = await moChuongTrinh({
    ten: "Bồi dưỡng theo tiêu chuẩn CDNN giáo viên tiểu học hạng III",
    loaiHinhId: lhCdnn.id,
    phuongThuc: "QUA_DON_VI_LIEN_KET",
    hocPhan: [["Đường lối, chính sách phát triển giáo dục", 20], ["Năng lực dạy học và giáo dục học sinh tiểu học", 20]],
    mucTieu: "Đáp ứng tiêu chuẩn chức danh nghề nghiệp giáo viên tiểu học hạng III.",
    doiTuong: "Giáo viên tiểu học",
  });
  const k5 = await moKhoa(p4.ct.id, { khaiGiang: "2026-09-14", beGiang: "2026-11-15", siSo: 40, hocPhi: 1_200_000, dotId: dot.id });
  const dv = await taoDonViLienKet({
    ma: "DEMO_DVLK_HV",
    ten: "Trung tâm GDNN-GDTX huyện Hòa Vang",
    diaChi: "Hòa Vang, Đà Nẵng",
    nguoiDaiDien: "Ông Trần Văn Bình",
  });
  const tkDvlk = await capTaiKhoanDonViLienKet(dv.id, { tenDangNhap: "demo_dvlk", matKhau: MAT_KHAU_DEMO, hoTen: "Võ Thị Thu (ĐVLK)" });
  await taoHopDong({ donViLienKetId: dv.id, khoaId: k5.id, soLuongDuKien: 20, donGiaThoaThuan: 1_000_000 });
  const dsK5 = [];
  for (let i = 0; i < 5; i++) dsK5.push(await dangKyThayMatDonViLienKet(tkDvlk.id, { khoaId: k5.id, ...hocVienMau() }));
  await xacNhanThuHoSo({ loai: "DVLK", nguoiDungId: tkDvlk.id }, { ...CB, dangKyIds: dsK5.slice(0, 4).map((d) => d.id) });
  for (const dk of dsK5.slice(0, 4)) await thamDinhHoSo(dk.id, "HOP_LE");
  await xetDuyetDanhSachChinhThuc(k5.id, dsK5.slice(0, 4).map((d) => d.id));

  // ---- P5: chương trình dự thảo ----
  const p5 = await taoChuongTrinh({
    ten: "Bồi dưỡng kỹ năng chuyển đổi số cho giáo viên mầm non",
    tongThoiLuong: 30,
    loaiHinhBoiDuongId: lhCd.id,
    mucTieu: "Nâng cao năng lực số cho giáo viên mầm non.",
  });
  await themHocPhan(p5.id, { ten: "Học liệu số trong giáo dục mầm non", soTiet: 30 });

  console.log(`Đã tạo dữ liệu mẫu. Tài khoản demo_daotao / demo_taichinh / demo_giangvien / demo_hocvien / demo_dvlk / demo_admin, mật khẩu: ${MAT_KHAU_DEMO}`);
}

async function xoaDuLieu() {
  const lh = await prisma.loaiHinhBoiDuong.findMany({ where: { ma: { startsWith: "DEMO_" } }, select: { id: true } });
  const chuongTrinhId = { in: (await prisma.chuongTrinh.findMany({ where: { loaiHinhBoiDuongId: { in: lh.map((x) => x.id) } }, select: { id: true } })).map((x) => x.id) };
  const khoaId = { in: (await prisma.khoa.findMany({ where: { chuongTrinhId }, select: { id: true } })).map((x) => x.id) };
  const hocVienId = { in: (await prisma.dangKyHoc.findMany({ where: { khoaId }, select: { hocVienId: true } })).map((d) => d.hocVienId) };
  const dsTaiKhoan = await prisma.nguoiDung.findMany({ where: { tenDangNhap: { startsWith: "demo_" } }, select: { id: true } });
  const nguoiDungId = { in: dsTaiKhoan.map((x) => x.id) };

  await prisma.thongBao.deleteMany({ where: { hocVienId } });
  await prisma.banGiaoChungChi.deleteMany({ where: { hopDongLienKet: { khoaId } } });
  await prisma.chungChi.deleteMany({ where: { khoaId } });
  await prisma.quyetDinhCapVanBang.deleteMany({ where: { khoaId } });
  await prisma.ketQuaHocTap.deleteMany({ where: { khoaId } });
  await prisma.ketQuaKhoa.deleteMany({ where: { khoaId } });
  await prisma.phieuThu.deleteMany({ where: { hocPhi: { khoaId } } });
  await prisma.hocPhi.deleteMany({ where: { khoaId } });
  await prisma.diemDanh.deleteMany({ where: { buoiHoc: { khoaId } } });
  await prisma.lichSuChuyenLop.deleteMany({ where: { dangKy: { khoaId } } });
  await prisma.dangKyHoc.deleteMany({ where: { khoaId } });
  await prisma.loNopHoSo.deleteMany({ where: { hopDongLienKet: { khoaId } } });
  await prisma.hopDongLienKet.deleteMany({ where: { khoaId } });
  await prisma.donViLienKet.deleteMany({ where: { ma: { startsWith: "DEMO_" } } });
  await prisma.hocVien.deleteMany({ where: { id: hocVienId } });
  await prisma.taiLieuHocTap.deleteMany({ where: { khoaId } });
  await prisma.buoiHoc.deleteMany({ where: { khoaId } });
  await prisma.giangVienHocPhan.deleteMany({ where: { khoaId } });
  await prisma.lopHoc.deleteMany({ where: { khoaId } });
  await prisma.khoa.deleteMany({ where: { id: khoaId } });
  await prisma.giangVien.deleteMany({ where: { OR: [{ nguoiDungId }, { donVi: { ma: { startsWith: "DEMO_" } } }] } });
  await prisma.chuongTrinhPhienBan.deleteMany({ where: { chuongTrinhId } });
  await prisma.hocPhan.deleteMany({ where: { chuongTrinhId } });
  await prisma.chuongTrinh.deleteMany({ where: { id: chuongTrinhId } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { ma: { startsWith: "DEMO_" } } });
  await prisma.donVi.deleteMany({ where: { ma: { startsWith: "DEMO_" } } });
  await prisma.phongHoc.deleteMany({ where: { ma: { startsWith: "DEMO_" } } });
  await prisma.dotTuyenSinh.deleteMany({ where: { ma: { startsWith: "DEMO_" } } });
  await prisma.nguoiDungVaiTro.deleteMany({ where: { nguoiDungId } });
  await prisma.nguoiDung.deleteMany({ where: { id: nguoiDungId } });
  console.log("Đã xóa dữ liệu mẫu.");
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Không chạy dữ liệu mẫu trên môi trường production.");
  if (process.argv.includes("--xoa")) await xoaDuLieu();
  else await taoDuLieu();
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
