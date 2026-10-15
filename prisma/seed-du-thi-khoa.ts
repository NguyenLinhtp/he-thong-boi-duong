/**
 * Dữ liệu test cho 1 khóa chỉ đăng ký dự thi (PT3) - chạy thử/UAT, KHÔNG dùng cho CSDL thật.
 *
 *   npx tsx prisma/seed-du-thi-khoa.ts KH2026002                 tạo 150 thí sinh, 100 đăng ký ôn
 *   npx tsx prisma/seed-du-thi-khoa.ts KH2026002 --so=150 --on=100
 *   npx tsx prisma/seed-du-thi-khoa.ts KH2026002 --xoa           xóa thí sinh test của khóa
 *
 * Đi qua đúng service nghiệp vụ: HV-05 đăng ký dự thi -> HP-02 xác nhận lệ phí theo thành
 * phần (lập biên lai) -> HV-07 duyệt chính thức. Thí sinh gồm sinh viên trong danh sách
 * đã import (HV-03) và thí sinh tự do. Dấu nhận biết dữ liệu test: số điện thoại xác thực
 * bắt đầu 0399, email @thi-demo.vn, CCCD thí sinh tự do bắt đầu 0999.
 */
import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";
import { dangKyDuThi } from "../src/server/services/hv/hv-05-dang-ky-du-thi";
import { cauHinhHieuLuc } from "../src/server/services/hv/form-dang-ky";
import { dsThanhPhanLePhi } from "../src/server/services/hp/hp-01-thanh-phan-le-phi";
import { xacNhanCacThanhPhan } from "../src/server/services/hp/hp-02-chuyen-trang-thai-le-phi";
import { duyetHoSoChinhThuc } from "../src/server/services/hv/hv-07-xet-duyet-chinh-thuc";
import { coTheNhanDangKy } from "../src/server/services/kh/kh-05-trang-thai-si-so";
import { layCauHinhSmtpNoiBo } from "../src/server/services/hv/cau-hinh-smtp";
import { tenInput, type TruongForm } from "../src/lib/form-dang-ky";

const DAU_SDT = "0399";
const DAU_CCCD_TU_DO = "0999";
const MIEN_EMAIL = "thi-demo.vn";
const CB = { nguoiThucHienTen: "Cán bộ đào tạo (dữ liệu test)" };
const TC = { nguoiThucHienTen: "Cán bộ tài chính (dữ liệu test)" };
const TY_LE_DA_DONG = 0.76; // 70-80% đã đóng lệ phí
const TY_LE_DA_DUYET = 0.72; // 70-80% hoàn thiện hồ sơ và được duyệt (trong số đã đóng)
const SV_TOI_DA = 110; // phần còn lại là thí sinh tự do

// ngẫu nhiên có hạt giống - chạy lại cho cùng bộ dữ liệu
let hat = 20261014;
const ngauNhien = () => ((hat = (hat * 1103515245 + 12345) % 2147483648) / 2147483648);
const chon = <T,>(ds: readonly T[]) => ds[Math.floor(ngauNhien() * ds.length)];
const tronDs = <T,>(ds: T[]) => {
  const kq = [...ds];
  for (let i = kq.length - 1; i > 0; i--) {
    const j = Math.floor(ngauNhien() * (i + 1));
    [kq[i], kq[j]] = [kq[j], kq[i]];
  }
  return kq;
};

const HO = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý"];
const DEM = ["Văn", "Thị", "Hữu", "Minh", "Thanh", "Ngọc", "Quốc", "Thu", "Đức", "Gia", "Bảo", "Hoài", "Phương", "Khánh"];
const TEN = ["An", "Bình", "Châu", "Dũng", "Duyên", "Giang", "Hà", "Hải", "Hạnh", "Hiếu", "Hoa", "Huy", "Hương", "Khoa", "Lan", "Linh", "Long", "Mai", "Nam", "Ngân", "Nhi", "Phúc", "Quân", "Quỳnh", "Sơn", "Tâm", "Thảo", "Trang", "Trí", "Tú", "Uyên", "Vy", "Yến"];
const TINH = ["Đà Nẵng", "Quảng Nam", "Quảng Ngãi", "Thừa Thiên Huế", "Quảng Trị", "Quảng Bình", "Bình Định", "Gia Lai", "Kon Tum", "Đắk Lắk"];
const NOI_LAM = ["Tự do", "Công ty TNHH Phần mềm FPT", "Trường THPT Phan Châu Trinh", "UBND phường Hải Châu", "Ngân hàng Vietcombank Đà Nẵng", "Bệnh viện Đà Nẵng"];

const tenNgauNhien = () => `${chon(HO)} ${chon(DEM)} ${chon(TEN)}`;
const ngaySinhNgauNhien = () => {
  const d = new Date(Date.UTC(2001 + Math.floor(ngauNhien() * 6), Math.floor(ngauNhien() * 12), 1 + Math.floor(ngauNhien() * 28)));
  return d.toISOString().slice(0, 10);
};

type ThiSinh = { loai: "SV" | "TU_DO"; hoTen: string; maSinhVien?: string; soCCCD: string; lopSinhHoat?: string | null; sdt: string; email: string };

/** Giá trị form theo cấu hình hiệu lực của khóa (trường đang hiện; trường cố định do máy chủ ghi). */
async function giaTriForm(dsTruong: TruongForm[], ts: ThiSinh): Promise<Record<string, string>> {
  const giaTri: Record<string, string> = { soDienThoai: ts.sdt };
  for (const t of dsTruong) {
    if (!t.hien || t.coDinh || t.kieu === "TEP") continue;
    const ten = tenInput(t);
    const nhan = t.nhan.toLowerCase();
    if (t.ma === "soDienThoai") continue;
    if (t.ma === "email" || (t.kieu === "VAN_BAN" && nhan.includes("email"))) giaTri[ten] = ts.email;
    else if (t.ma === "chucDanhHocViId") {
      const cd = await prisma.chucDanhHocVi.findFirst({ orderBy: { ten: "asc" } });
      if (cd) giaTri[ten] = cd.id;
    } else if (t.kieu === "LUA_CHON" || t.luaChon.length > 0) {
      giaTri[ten] = t.macDinh && t.luaChon.includes(t.macDinh) && ngauNhien() < 0.8 ? t.macDinh : chon(t.luaChon);
    } else if (t.kieu === "NGAY") giaTri[ten] = ngaySinhNgauNhien();
    else if (t.kieu === "SO") giaTri[ten] = String(1 + Math.floor(ngauNhien() * 3));
    else if (t.ma === "donViCongTac") giaTri[ten] = ts.loai === "SV" ? "Trường Đại học Sư phạm - ĐHĐN" : chon(NOI_LAM);
    else if (nhan.includes("nơi sinh") || nhan.includes("quê") || nhan.includes("tỉnh")) giaTri[ten] = chon(TINH);
    else if (nhan.includes("địa chỉ") || nhan.includes("hộ khẩu")) giaTri[ten] = `${1 + Math.floor(ngauNhien() * 200)} Lê Duẩn, ${chon(TINH)}`;
    else if (nhan.includes("giới tính")) giaTri[ten] = chon(["Nam", "Nữ"]);
    else if (t.macDinh) giaTri[ten] = t.macDinh;
    else if (t.batBuoc) giaTri[ten] = "Thông tin mẫu";
  }
  return giaTri;
}

async function khoaTheoMa(maKhoa: string) {
  const khoa = await prisma.khoa.findUnique({ where: { maKhoa }, include: { chuongTrinh: true } });
  if (!khoa) throw new Error(`Không tìm thấy khóa ${maKhoa}`);
  if (!khoa.chuongTrinh.phuongThucDangKys.includes("CHI_DU_THI")) throw new Error(`${maKhoa} không phải khóa chỉ đăng ký dự thi (PT3)`);
  return khoa;
}

async function taoDuLieu(maKhoa: string, so: number, soOn: number, choGuiEmail: boolean) {
  const khoa = await khoaTheoMa(maKhoa);

  // ---- kiểm tra trước khi ghi bất cứ gì ----
  if (!(await coTheNhanDangKy(khoa.id))) throw new Error(`${maKhoa} không nhận đăng ký (phải Đang tuyển sinh, chưa quá hạn đăng ký, còn chỗ)`);
  if (await prisma.dangKyHoc.count({ where: { khoaId: khoa.id, soDienThoaiXacThuc: { startsWith: DAU_SDT } } })) {
    throw new Error(`${maKhoa} đã có dữ liệu test - chạy với --xoa trước nếu muốn tạo lại`);
  }
  if (!choGuiEmail && (await layCauHinhSmtpNoiBo())) {
    throw new Error("Hệ thống đã cấu hình SMTP - mỗi thí sinh test sẽ nhận email thật. Thêm --cho-gui-email nếu vẫn muốn chạy.");
  }
  const dsThanhPhan = await dsThanhPhanLePhi(khoa.id);
  const tuyChon = dsThanhPhan.filter((tp) => !tp.batBuoc);
  const phanOn = tuyChon.find((tp) => tp.ten.toLowerCase().includes("ôn")) ?? tuyChon[0];
  if (soOn > 0 && !phanOn) {
    throw new Error(`${maKhoa} chưa chia thành phần lệ phí có phần tùy chọn (vd. "Đăng ký ôn thi") - thiết lập ở tab Học phí (HP-01) trước`);
  }
  if (dsThanhPhan.length === 0 && !(Number(khoa.mucHocPhi ?? 0) > 0)) throw new Error(`${maKhoa} chưa đặt mức lệ phí (tab Học phí)`);
  const { cauHinh } = await cauHinhHieuLuc(khoa.id);
  const tepBatBuoc = cauHinh.truong.filter((t) => t.hien && t.batBuoc && t.kieu === "TEP");
  if (tepBatBuoc.length) throw new Error(`Form đăng ký có tệp minh chứng bắt buộc (${tepBatBuoc.map((t) => t.nhan).join(", ")}) - script không tạo tệp`);
  const theoMaSV = cauHinh.dinhDanh === "MA_SINH_VIEN";

  // ---- danh sách thí sinh: sinh viên đã import (chưa có trong khóa) + thí sinh tự do ----
  const daCo = await prisma.dangKyHoc.findMany({ where: { khoaId: khoa.id }, select: { hocVien: { select: { maSinhVien: true, soCCCD: true } } } });
  const daCoMaSV = new Set(daCo.map((d) => d.hocVien.maSinhVien).filter(Boolean));
  const daCoCCCD = new Set(daCo.map((d) => d.hocVien.soCCCD).filter(Boolean));
  const dsSV = (await prisma.sinhVien.findMany({ orderBy: { maSinhVien: "asc" } })).filter((sv) => !daCoMaSV.has(sv.maSinhVien) && !daCoCCCD.has(sv.soCCCD));
  const soSV = Math.min(dsSV.length, SV_TOI_DA, so);
  const thiSinh: ThiSinh[] = [];
  let stt = 0;
  for (const sv of tronDs(dsSV).slice(0, soSV)) {
    stt++;
    thiSinh.push({ loai: "SV", hoTen: sv.hoTen, maSinhVien: sv.maSinhVien, soCCCD: sv.soCCCD, lopSinhHoat: sv.lopSinhHoat, sdt: `${DAU_SDT}${String(stt).padStart(6, "0")}`, email: `${sv.maSinhVien.toLowerCase()}@${MIEN_EMAIL}` });
  }
  console.log(`Sinh viên trong danh sách đã import: ${dsSV.length} chưa đăng ký khóa này -> dùng ${soSV}; thí sinh tự do: ${so - soSV}`);

  // ---- HV-05: đăng ký dự thi; soOn thí sinh chọn thêm phần ôn thi ----
  const chonOn = new Set(tronDs([...Array(so).keys()]).slice(0, soOn));
  const daDangKy: { dangKyId: string; hocVienId: string; coOn: boolean }[] = [];
  let soTuDo = 0;
  for (let i = 0; daDangKy.length < so; i++) {
    let ts = thiSinh[i];
    if (!ts) {
      soTuDo++;
      stt++;
      ts = { loai: "TU_DO", hoTen: tenNgauNhien(), soCCCD: `${DAU_CCCD_TU_DO}${String(20261000 + soTuDo).padStart(8, "0")}`, sdt: `${DAU_SDT}${String(stt).padStart(6, "0")}`, email: `ts${String(soTuDo).padStart(3, "0")}@${MIEN_EMAIL}` };
    }
    const coOn = chonOn.has(daDangKy.length) && !!phanOn;
    try {
      const giaTri = await giaTriForm(cauHinh.truong, ts);
      const dk = await dangKyDuThi({
        khoaId: khoa.id,
        hoTen: ts.hoTen,
        soCCCD: ts.soCCCD,
        maSinhVien: ts.loai === "SV" && theoMaSV ? ts.maSinhVien : null,
        lopSinhHoat: ts.loai === "SV" ? ts.lopSinhHoat : null,
        laThiSinhTuDo: theoMaSV && ts.loai === "TU_DO",
        dsThanhPhan: coOn ? [phanOn!.id] : [],
        duLieuForm: { giaTri, tep: {} },
      });
      // ngày đăng ký rải trong 12 ngày gần đây
      await prisma.dangKyHoc.update({ where: { id: dk.id }, data: { ngayDangKy: new Date(Date.now() - Math.floor(ngauNhien() * 12 * 86_400_000)) } });
      daDangKy.push({ dangKyId: dk.id, hocVienId: dk.hocVienId, coOn });
      if (daDangKy.length % 25 === 0) console.log(`  đã đăng ký ${daDangKy.length}/${so}`);
    } catch (e) {
      console.warn(`  bỏ qua ${ts.loai === "SV" ? `SV ${ts.maSinhVien}` : ts.hoTen}: ${e instanceof Error ? e.message : e}`);
      if (i > so * 3) throw new Error("Quá nhiều thí sinh bị từ chối - dừng lại, kiểm tra cấu hình form đăng ký của khóa");
    }
  }

  // ---- HP-02: xác nhận lệ phí theo thành phần (1 biên lai/lần); 1 phần người chọn ôn chỉ đóng phần thi ----
  const dsDong = tronDs(daDangKy).slice(0, Math.round(so * TY_LE_DA_DONG));
  for (const [n, d] of dsDong.entries()) {
    const hocPhi = await prisma.hocPhi.findFirst({ where: { khoaId: khoa.id, hocVienId: d.hocVienId }, include: { thanhPhans: { include: { thanhPhan: true } } } });
    if (!hocPhi) continue;
    const hinhThuc = ngauNhien() < 0.85 ? "Chuyển khoản" : "Tiền mặt";
    if (hocPhi.thanhPhans.length === 0) {
      const { xacNhanThanhToan } = await import("../src/server/services/hp/hp-02-thanh-toan");
      await xacNhanThanhToan(hocPhi.id, { soTien: Number(hocPhi.soTienPhaiNop), hinhThucNop: hinhThuc, nguoiXacNhanTen: TC.nguoiThucHienTen });
      continue;
    }
    const chiPhanBatBuoc = d.coOn && ngauNhien() < 0.15;
    const ds = hocPhi.thanhPhans.filter((p) => (chiPhanBatBuoc ? p.thanhPhan.batBuoc : true) && Number(p.soTienPhaiNop) > 0);
    if (ds.length) await xacNhanCacThanhPhan(hocPhi.id, ds.map((p) => p.id), TC, hinhThuc);
    if ((n + 1) % 25 === 0) console.log(`  đã xác nhận lệ phí ${n + 1}/${dsDong.length}`);
  }

  // ---- HV-07: duyệt chính thức (chỉ người đã được xác nhận lệ phí) ----
  const dsDuyet = dsDong.slice(0, Math.round(so * TY_LE_DA_DUYET)).map((d) => d.dangKyId);
  if (dsDuyet.length) await duyetHoSoChinhThuc(khoa.id, dsDuyet, CB);

  const daOn = daDangKy.filter((d) => d.coOn).length;
  console.log(
    `Xong ${maKhoa}: ${daDangKy.length} thí sinh (${soSV} sinh viên, ${daDangKy.length - soSV} tự do), ${daOn} đăng ký ôn, ` +
      `${dsDong.length} đã đóng lệ phí, ${dsDuyet.length} đã duyệt chính thức.`,
  );
}

async function xoaDuLieu(maKhoa: string) {
  const khoa = await khoaTheoMa(maKhoa);
  const dsDangKy = await prisma.dangKyHoc.findMany({ where: { khoaId: khoa.id, soDienThoaiXacThuc: { startsWith: DAU_SDT } }, select: { id: true, hocVienId: true } });
  const dsHocVienId = dsDangKy.map((d) => d.hocVienId);
  const dsHocPhi = await prisma.hocPhi.findMany({ where: { khoaId: khoa.id, hocVienId: { in: dsHocVienId } }, select: { id: true } });
  const dsHocPhiId = dsHocPhi.map((h) => h.id);
  await prisma.$transaction(
    async (tx) => {
      await tx.ketQuaKhoa.deleteMany({ where: { khoaId: khoa.id, hocVienId: { in: dsHocVienId } } });
      await tx.giaoDichNganHang.updateMany({ where: { hocPhiId: { in: dsHocPhiId } }, data: { hocPhiId: null } });
      await tx.phieuThu.deleteMany({ where: { hocPhiId: { in: dsHocPhiId } } });
      await tx.hocPhi.deleteMany({ where: { id: { in: dsHocPhiId } } });
      await tx.dangKyHoc.deleteMany({ where: { id: { in: dsDangKy.map((d) => d.id) } } });
      // hồ sơ học viên do script tạo (email @thi-demo.vn) không còn dữ liệu nào khác
      const hv = await tx.hocVien.findMany({
        where: { id: { in: dsHocVienId }, email: { endsWith: `@${MIEN_EMAIL}` }, dangKys: { none: {} }, hocPhis: { none: {} }, nguoiDung: null },
        select: { id: true },
      });
      await tx.thongBao.deleteMany({ where: { hocVienId: { in: hv.map((h) => h.id) } } });
      await tx.hocVien.deleteMany({ where: { id: { in: hv.map((h) => h.id) } } });
    },
    { timeout: 120_000 },
  );
  console.log(`Đã xóa ${dsDangKy.length} thí sinh test của ${maKhoa} (biên lai test bị xóa - số biên lai đã cấp không dùng lại).`);
}

async function main() {
  const args = process.argv.slice(2);
  const maKhoa = args.find((a) => !a.startsWith("--"));
  if (!maKhoa) throw new Error("Thiếu mã khóa, vd: npx tsx prisma/seed-du-thi-khoa.ts KH2026002");
  const so = Number(args.find((a) => a.startsWith("--so="))?.slice(5) ?? 150);
  const soOn = Number(args.find((a) => a.startsWith("--on="))?.slice(5) ?? 100);
  if (!(so > 0) || !(soOn >= 0) || soOn > so) throw new Error("--so phải > 0, --on trong khoảng 0..so");
  if (args.includes("--xoa")) await xoaDuLieu(maKhoa);
  else await taoDuLieu(maKhoa, so, soOn, args.includes("--cho-gui-email"));
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
