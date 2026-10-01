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
import { luuCauHinhChuongTrinh } from "../src/server/services/hv/form-dang-ky";
import { nopMinhChungLePhi } from "../src/server/services/hv/hv-05-dang-ky-du-thi";
import { themHocLieu, taoBaiTracNghiem, themCauHoi, taoYeuCauSanPham } from "../src/server/services/ct/ct-02-hoc-lieu";

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

/**
 * Tài khoản trình diễn giữ nhiều vai trò cán bộ (QT-02 cho phép) để xem đủ các
 * module quản lý trong 1 lần đăng nhập. Cổng giảng viên/học viên/đơn vị liên
 * kết gắn với hồ sơ cá nhân nên vẫn xem bằng tài khoản riêng của vai trò đó.
 */
async function taoTaiKhoanTongHop() {
  if (await prisma.nguoiDung.findUnique({ where: { tenDangNhap: "demo_tonghop" } })) return;
  const dsVaiTro = await prisma.vaiTroModel.findMany({
    where: { ma: { in: ["ADMIN", "CAN_BO_QUAN_LY_DAO_TAO", "CAN_BO_TAI_CHINH"] } },
  });
  await prisma.nguoiDung.create({
    data: {
      tenDangNhap: "demo_tonghop",
      hoTen: "Tài khoản trình diễn",
      matKhauHash: await bcrypt.hash(MAT_KHAU_DEMO, 10),
      vaiTros: { create: dsVaiTro.map((vt) => ({ vaiTroId: vt.id })) },
    },
  });
}

/**
 * Tài khoản học viên đang học chính thức ở khóa Phương thức 1 đang diễn ra -
 * để thử làm trắc nghiệm, nộp sản phẩm (demo_hocvien thuộc khóa đã kết thúc).
 * Gắn hồ sơ qua số CCCD nên đăng nhập bằng CCCD cũng được.
 */
async function taoTaiKhoanHocVienDangHoc() {
  if (await prisma.nguoiDung.findUnique({ where: { tenDangNhap: "demo_hocvien_danghoc" } })) return;
  const dk = await prisma.dangKyHoc.findFirst({
    where: {
      trangThai: "CHINH_THUC",
      hocVien: { nguoiDungId: null, soCCCD: { not: null } },
      khoa: { trangThai: "DANG_DIEN_RA", chuongTrinh: { phuongThucDangKy: "TRUC_TUYEN_NOP_GIAY", loaiHinhBoiDuong: { ma: { startsWith: "DEMO_" } } } },
    },
    include: { hocVien: true },
    orderBy: { hocVien: { maHocVien: "asc" } },
  });
  if (!dk) return;
  const vt = await prisma.vaiTroModel.findUniqueOrThrow({ where: { ma: "HOC_VIEN" } });
  const nd = await prisma.nguoiDung.create({
    data: {
      tenDangNhap: "demo_hocvien_danghoc",
      hoTen: dk.hocVien.hoTen,
      soCCCD: dk.hocVien.soCCCD,
      matKhauHash: await bcrypt.hash(MAT_KHAU_DEMO, 10),
      vaiTros: { create: [{ vaiTroId: vt.id }] },
    },
  });
  await prisma.hocVien.update({ where: { id: dk.hocVienId }, data: { nguoiDungId: nd.id } });
}

/** Tệp PDF tiếng Việt cho học liệu mẫu - in HTML bằng Chromium của Playwright (chỉ dùng cho dữ liệu mẫu). */
async function taoPdf(tieuDe: string, doan: string[]): Promise<Buffer | null> {
  try {
    const { chromium } = await import("@playwright/test");
    const trinhDuyet = await chromium.launch();
    const trang = await trinhDuyet.newPage();
    await trang.setContent(
      `<html><body style="font-family:Arial,sans-serif;padding:48px;line-height:1.6">
        <p style="color:#034a82;font-weight:bold">TRƯỜNG ĐẠI HỌC SƯ PHẠM - ĐẠI HỌC ĐÀ NẴNG</p>
        <h1 style="color:#054fa8">${tieuDe}</h1>${doan.map((d) => `<p>${d}</p>`).join("")}
        <p style="color:#888;margin-top:48px">(Học liệu mẫu phục vụ chạy thử hệ thống)</p></body></html>`,
    );
    const pdf = await trang.pdf({ format: "A4" });
    await trinhDuyet.close();
    return Buffer.from(pdf);
  } catch {
    console.log("Không tạo được PDF mẫu (chưa cài Chromium của Playwright) - bỏ qua tệp PDF.");
    return null;
  }
}

/**
 * Học liệu khung mẫu (CT-02/GD-04 bổ sung 28-29/09/2026) cho chương trình CDNN
 * giáo viên THCS hạng II - khóa KH đang diễn ra của demo_hocvien_danghoc.
 */
async function taoHocLieuMau() {
  const ct = await prisma.chuongTrinh.findFirst({
    where: { ten: "Bồi dưỡng theo tiêu chuẩn CDNN giáo viên THCS hạng II", loaiHinhBoiDuong: { ma: { startsWith: "DEMO_" } } },
    include: { hocPhans: { orderBy: { thuTu: "asc" } } },
  });
  if (!ct || ct.hocPhans.length < 2) return;
  if ((await prisma.hocLieuHocPhan.count({ where: { hocPhan: { chuongTrinhId: ct.id } } })) > 0) return;
  const nguoi = { nguoiThucHienTen: "Cán bộ đào tạo (dữ liệu mẫu)" };
  const [hp1, hp2] = ct.hocPhans;
  const pdf = async (loai: "TAI_LIEU" | "SLIDE", hocPhanId: string, tieuDe: string, doan: string[]) => {
    const noiDung = await taoPdf(tieuDe, doan);
    if (noiDung) await themHocLieu(hocPhanId, { loai, tieuDe, tep: { ten: `${tieuDe}.pdf`, loai: "application/pdf", noiDung } }, nguoi);
  };

  await themHocLieu(hp1.id, {
    loai: "THONG_TIN",
    tieuDe: "Nhiệm vụ học tập của học viên",
    noiDung:
      "Đây là khóa học được thiết kế theo hình thức kết hợp trực tiếp và trực tuyến. Nhiệm vụ của học viên:\n\n" +
      "• Nghiên cứu tài liệu và slide bài giảng của từng chuyên đề.\n" +
      "• Làm bài kiểm tra nhanh sau mỗi chuyên đề để tự đánh giá.\n" +
      "• Tham gia thảo luận với giảng viên và học viên khác ở khung Thảo luận.\n" +
      "• Hoàn thành và nộp sản phẩm cuối khóa đúng hạn.",
  }, nguoi);
  await pdf("TAI_LIEU", hp1.id, "Tài liệu chuyên đề 1 - Hệ thống văn bản quản lý nhà nước về giáo dục", [
    "Luật Giáo dục số 43/2019/QH14 được Quốc hội thông qua ngày 14/6/2019, có hiệu lực từ ngày 01/7/2020.",
    "Chương trình giáo dục phổ thông 2018 ban hành kèm theo Thông tư số 32/2018/TT-BGDĐT.",
    "Học viên đọc tài liệu, ghi chép các nội dung chính ở khung Ghi chép bên phải màn hình học.",
  ]);
  await pdf("SLIDE", hp1.id, "Slide bài giảng chuyên đề 1", [
    "Phần 1. Tổng quan quản lý nhà nước về giáo dục.",
    "Phần 2. Quyền và nghĩa vụ của nhà giáo theo Luật Giáo dục 2019.",
    "Phần 3. Liên hệ thực tiễn tại cơ sở giáo dục.",
  ]);
  const bai1 = await taoBaiTracNghiem(hp1.id, { tieuDe: "Kiểm tra nhanh chuyên đề 1", tinhDiem: false }, nguoi);
  await themCauHoi(bai1.id, { noiDung: "Luật Giáo dục hiện hành được Quốc hội thông qua năm nào?", phuongAn: ["2005", "2019", "2023"], dapAnDung: [1] });
  await themCauHoi(bai1.id, { noiDung: "Chương trình giáo dục phổ thông 2018 ban hành kèm theo văn bản nào?", phuongAn: ["Thông tư 32/2018/TT-BGDĐT", "Nghị định 71/2020/NĐ-CP", "Luật Giáo dục 2019"], dapAnDung: [0] });

  await themHocLieu(hp2.id, {
    loai: "THONG_TIN",
    tieuDe: "Hướng dẫn học tập chuyên đề 2",
    noiDung: "Chuyên đề tập trung vào phát triển phẩm chất, năng lực học sinh. Học viên đọc tài liệu, làm bài kiểm tra (tính điểm) và nộp kế hoạch bài dạy minh họa làm sản phẩm cuối khóa.",
  }, nguoi);
  await pdf("TAI_LIEU", hp2.id, "Tài liệu chuyên đề 2 - Phát triển phẩm chất, năng lực học sinh", [
    "Chương trình GDPT 2018 hình thành 5 phẩm chất chủ yếu: yêu nước, nhân ái, chăm chỉ, trung thực, trách nhiệm.",
    "Ba năng lực chung: tự chủ và tự học; giao tiếp và hợp tác; giải quyết vấn đề và sáng tạo.",
  ]);
  const bai2 = await taoBaiTracNghiem(hp2.id, { tieuDe: "Bài kiểm tra chuyên đề 2", tinhDiem: true, heSo: 1, thoiGianPhut: 10, soLanToiDa: 2 }, nguoi);
  await themCauHoi(bai2.id, {
    noiDung: "Những năng lực chung trong Chương trình GDPT 2018 gồm (chọn tất cả đáp án đúng):",
    phuongAn: ["Tự chủ và tự học", "Giao tiếp và hợp tác", "Tin học", "Giải quyết vấn đề và sáng tạo"],
    dapAnDung: [0, 1, 3],
  });
  await themCauHoi(bai2.id, { noiDung: "Chương trình GDPT 2018 hình thành bao nhiêu phẩm chất chủ yếu?", phuongAn: ["3", "5", "7"], dapAnDung: [1] });
  await themCauHoi(bai2.id, { noiDung: "“Trung thực” là một phẩm chất chủ yếu trong Chương trình GDPT 2018.", phuongAn: ["Đúng", "Sai"], dapAnDung: [0] });
  await taoYeuCauSanPham(hp2.id, {
    tieuDe: "Kế hoạch bài dạy minh họa",
    moTa: "Xây dựng 1 kế hoạch bài dạy theo định hướng phát triển phẩm chất, năng lực học sinh (tệp Word hoặc PDF).",
    tinhDiem: true,
    heSo: 2,
  }, nguoi);
}

// bài thu hoạch chuyên đề 1 - học phần do demo_giangvien phụ trách, để thử màn hình chấm sản phẩm (KQ-01)
async function taoSanPhamChuyenDe1() {
  const hp1 = await prisma.hocPhan.findFirst({
    where: { chuongTrinh: { ten: "Bồi dưỡng theo tiêu chuẩn CDNN giáo viên THCS hạng II", loaiHinhBoiDuong: { ma: { startsWith: "DEMO_" } } } },
    orderBy: { thuTu: "asc" },
  });
  if (!hp1 || (await prisma.yeuCauSanPham.count({ where: { hocPhanId: hp1.id } })) > 0) return;
  await taoYeuCauSanPham(hp1.id, {
    tieuDe: "Bài thu hoạch chuyên đề 1",
    moTa: "Viết bài thu hoạch (2-3 trang) về vận dụng văn bản quản lý nhà nước về giáo dục tại đơn vị công tác (tệp Word hoặc PDF).",
    tinhDiem: true,
    heSo: 1,
  }, { nguoiThucHienTen: "Cán bộ đào tạo (dữ liệu mẫu)" });
}

// (bổ sung 01/10/2026) danh sách sinh viên mẫu (HV-03) - mã SV 3122000001..30 để xóa được
const MA_SV_MAU = Array.from({ length: 30 }, (_, i) => `3122${String(i + 1).padStart(6, "0")}`);
const HO_TEN_SV = [
  "Nguyễn Văn An", "Trần Thị Bích", "Lê Hoàng Cường", "Phạm Thị Dung", "Hoàng Minh Đức", "Võ Thị Giang",
  "Đặng Quốc Huy", "Bùi Thị Khánh Linh", "Đỗ Văn Mạnh", "Huỳnh Thị Ngân", "Ngô Thanh Phong", "Dương Thị Quỳnh",
  "Lý Văn Sang", "Phan Thị Thảo", "Trương Công Uy", "Mai Thị Vân", "Đinh Văn Xuân", "Tô Thị Yến",
  "Hồ Văn Bảo", "Châu Thị Diễm", "Lương Văn Hải", "Tạ Thị Hồng", "Kiều Văn Kiên", "Văn Thị Lệ",
  "Nguyễn Hữu Lộc", "Trần Thị Minh Thư", "Lê Văn Tài", "Phạm Thị Uyên", "Hoàng Văn Vũ", "Võ Thị Xuân Mai",
];
const LOP_SV = ["22SGT", "22CNTT1", "23SNA", "23SPT"];
// ảnh PNG 1x1 làm minh chứng chuyển khoản mẫu
const PNG_MAU = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");

/**
 * (bổ sung 01/10/2026) 2 chương trình chỉ đăng ký dự thi (PT3) cho sinh viên:
 * định danh bằng mã sinh viên, thu lệ phí khi đăng ký; mỗi chương trình 1 khóa
 * thi mẫu kèm vài thí sinh đã đăng ký. Bỏ qua nếu đã có.
 */
async function taoChuongTrinhThiSinhVien() {
  for (const [i, ma] of MA_SV_MAU.entries()) {
    const sv = { maSinhVien: ma, soCCCD: `0482050${String(i + 1).padStart(5, "0")}`, hoTen: HO_TEN_SV[i], lopSinhHoat: LOP_SV[i % LOP_SV.length] };
    await prisma.sinhVien.upsert({ where: { maSinhVien: ma }, create: sv, update: {} });
  }
  // tài khoản nhận lệ phí MẪU - thay bằng tài khoản thật ở Quản trị > Tham số (QT-05)
  const nganHang: [string, string, string][] = [
    ["NH_TEN_NGAN_HANG", "VietinBank (TÀI KHOẢN MẪU - thay bằng tài khoản thật)", "Tên ngân hàng nhận lệ phí thi"],
    ["NH_MA_BIN", "970415", "Mã BIN ngân hàng theo NAPAS (VietinBank 970415, Vietcombank 970436, BIDV 970418, Agribank 970405)"],
    ["NH_SO_TAI_KHOAN", "0000000000", "Số tài khoản nhận lệ phí thi (sinh mã VietQR trên đơn đăng ký dự thi)"],
    ["NH_CHU_TAI_KHOAN", "TRUONG DAI HOC SU PHAM - TK MAU", "Tên chủ tài khoản nhận lệ phí"],
  ];
  for (const [ma, giaTri, moTa] of nganHang) {
    if (!(await prisma.thamSoHeThong.findUnique({ where: { ma } }))) await prisma.thamSoHeThong.create({ data: { ma, giaTri, moTa } });
  }

  if (await prisma.chuongTrinh.findFirst({ where: { ten: "Thi chuẩn đầu ra tiếng Anh", loaiHinhBoiDuong: { ma: { startsWith: "DEMO_" } } } })) return;
  const lh =
    (await prisma.loaiHinhBoiDuong.findUnique({ where: { ma: "DEMO_THI" } })) ??
    (await prisma.loaiHinhBoiDuong.create({ data: { ma: "DEMO_THI", ten: "Thi đánh giá năng lực, chuẩn đầu ra" } }));
  const dot = await prisma.dotTuyenSinh.findFirst({ where: { ma: { startsWith: "DEMO_" } }, orderBy: { ngayBatDau: "desc" } });

  const dsChuongTrinh = [
    {
      ten: "Đăng ký thi tin học ứng dụng CNTT cơ bản",
      mucTieu: "Đánh giá, cấp chứng chỉ ứng dụng công nghệ thông tin cơ bản theo Thông tư 03/2014/TT-BTTTT cho sinh viên.",
      hocPhan: [["Phần thi lý thuyết (trắc nghiệm trên máy)", 1], ["Phần thi thực hành (văn bản, bảng tính, trình chiếu)", 1]] as [string, number][],
      loaiVanBang: "CHUNG_CHI" as const,
      truong: [
        { ma: "ngaySinh", hien: true, batBuoc: true },
        { ma: "soDienThoai", hien: true, batBuoc: true },
        { ma: "email", hien: true },
        { ma: "donViCongTac", hien: false },
        { ma: "noiSinh", nhan: "Nơi sinh (tỉnh/thành phố)", kieu: "VAN_BAN", batBuoc: true, goiY: "Ghi theo giấy khai sinh - in trên chứng chỉ" },
      ],
      khoa: { ngayThi: "2026-11-15", han: "2026-10-31", siSo: 200, lePhi: 450_000 },
    },
    {
      ten: "Thi chuẩn đầu ra tiếng Anh",
      mucTieu: "Đánh giá năng lực tiếng Anh đạt chuẩn đầu ra (bậc 3/6 khung năng lực ngoại ngữ Việt Nam) cho sinh viên.",
      hocPhan: [["Kỹ năng Nghe - Đọc", 1], ["Kỹ năng Viết", 1], ["Kỹ năng Nói", 1]] as [string, number][],
      loaiVanBang: "CHUNG_NHAN" as const,
      truong: [
        { ma: "ngaySinh", hien: true, batBuoc: true },
        { ma: "soDienThoai", hien: true, batBuoc: true },
        { ma: "email", hien: true, batBuoc: true },
        { ma: "donViCongTac", hien: false },
        { ma: "lanThi", nhan: "Lần dự thi", kieu: "LUA_CHON", luaChon: ["Lần đầu", "Thi lại"], macDinh: "Lần đầu", batBuoc: true },
      ],
      khoa: { ngayThi: "2026-11-22", han: "2026-10-31", siSo: 300, lePhi: 600_000 },
    },
  ];
  for (const [n, mau] of dsChuongTrinh.entries()) {
    const { ct } = await moChuongTrinh({
      ten: mau.ten,
      loaiHinhId: lh.id,
      phuongThuc: "CHI_DU_THI",
      hocPhan: mau.hocPhan,
      mucTieu: mau.mucTieu,
      doiTuong: "Sinh viên của trường",
      loaiVanBang: mau.loaiVanBang,
    });
    await luuCauHinhChuongTrinh(ct.id, { dinhDanh: "MA_SINH_VIEN", truong: mau.truong }, CB);
    const khoa = await khoiTaoKhoa({
      chuongTrinhId: ct.id,
      thoiGianKhaiGiang: ngay(mau.khoa.ngayThi),
      thoiGianBeGiang: ngay(mau.khoa.ngayThi),
      siSoToiDa: mau.khoa.siSo,
      mucHocPhi: mau.khoa.lePhi,
      dotTuyenSinhId: dot?.id ?? null,
      hanDangKy: mau.khoa.han,
    });
    await thietLapHocPhi(khoa.id, { mucHocPhi: mau.khoa.lePhi });
    await chuyenTrangThaiKhoa(khoa.id, "DANG_TUYEN_SINH");
    // 4 thí sinh đã đăng ký: 2 đã nộp minh chứng chuyển khoản, 1 trong đó đã được tài chính xác nhận
    for (let i = 0; i < 4; i++) {
      const sv = await prisma.sinhVien.findUniqueOrThrow({ where: { maSinhVien: MA_SV_MAU[n * 10 + i] } });
      const dk = await dangKyDuThi({
        khoaId: khoa.id,
        hoTen: sv.hoTen,
        maSinhVien: sv.maSinhVien,
        cuoiCCCD: sv.soCCCD.slice(-4),
        duLieuForm: {
          giaTri: {
            ngaySinh: `200${3 + (i % 2)}-0${1 + i}-1${i}`,
            soDienThoai: `0935${String(200000 + n * 100 + i)}`,
            email: `${sv.maSinhVien}@sv.ued.udn.vn`,
            bs_noiSinh: "Đà Nẵng",
            bs_lanThi: "Lần đầu",
          },
          tep: {},
        },
      });
      if (i < 2) await nopMinhChungLePhi(dk.id, { ten: `chuyen-khoan-${sv.maSinhVien}.png`, loai: "image/png", noiDung: PNG_MAU });
      if (i === 0) {
        const hp = (await hocPhiCuaKhoa(khoa.id)).find((h) => h.hocVienId === dk.hocVienId)!;
        await xacNhanThanhToan(hp.id, { soTien: mau.khoa.lePhi, hinhThucNop: "Chuyển khoản", ...TC });
      }
    }
  }
}

async function taoDuLieu() {
  await taoTaiKhoanTongHop();
  if (await prisma.loaiHinhBoiDuong.findUnique({ where: { ma: "DEMO_CDNN" } })) {
    await taoTaiKhoanHocVienDangHoc();
    await taoHocLieuMau();
    await taoSanPhamChuyenDe1();
    await taoChuongTrinhThiSinhVien();
    console.log("Đã có dữ liệu mẫu (đã bổ sung tài khoản còn thiếu) - chạy với --xoa trước nếu muốn tạo lại.");
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

  await taoTaiKhoanHocVienDangHoc();
  await taoHocLieuMau();
  await taoSanPhamChuyenDe1();
  await taoChuongTrinhThiSinhVien();
  console.log(`Đã tạo dữ liệu mẫu. Tài khoản demo_tonghop / demo_daotao / demo_taichinh / demo_giangvien / demo_hocvien / demo_hocvien_danghoc / demo_dvlk / demo_admin, mật khẩu: ${MAT_KHAU_DEMO}`);
}

async function xoaDuLieu() {
  const lh = await prisma.loaiHinhBoiDuong.findMany({ where: { ma: { startsWith: "DEMO_" } }, select: { id: true } });
  const chuongTrinhId = { in: (await prisma.chuongTrinh.findMany({ where: { loaiHinhBoiDuongId: { in: lh.map((x) => x.id) } }, select: { id: true } })).map((x) => x.id) };
  const khoaId = { in: (await prisma.khoa.findMany({ where: { chuongTrinhId }, select: { id: true } })).map((x) => x.id) };
  const hocVienId = { in: (await prisma.dangKyHoc.findMany({ where: { khoaId }, select: { hocVienId: true } })).map((d) => d.hocVienId) };
  const dsTaiKhoan = await prisma.nguoiDung.findMany({ where: { tenDangNhap: { startsWith: "demo_" } }, select: { id: true } });
  const nguoiDungId = { in: dsTaiKhoan.map((x) => x.id) };

  await prisma.thongBao.deleteMany({ where: { hocVienId } });
  await prisma.lanLamTracNghiem.deleteMany({ where: { khoaId } });
  await prisma.baiNopSanPham.deleteMany({ where: { khoaId } });
  await prisma.tienDoHocTap.deleteMany({ where: { khoaId } });
  await prisma.thaoLuanHocTap.deleteMany({ where: { khoaId } });
  await prisma.ghiChepHocTap.deleteMany({ where: { khoaId } });
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
  await prisma.sinhVien.deleteMany({ where: { maSinhVien: { in: MA_SV_MAU } } });
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
