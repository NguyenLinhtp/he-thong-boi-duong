import { prisma } from "@/lib/db/prisma";
import { duyetHoSoChinhThuc, hocVienChuaXacNhanLePhi } from "@/server/services/hv/hv-07-xet-duyet-chinh-thuc";
import { canXacNhanHocPhiTruoc, TRANG_THAI_CHO_DUYET } from "@/server/services/hp/thanh-phan-le-phi-chung";
import { layThamSo } from "@/server/services/qt/qt-05-tham-so";
import { chuanHoaChu, docBangTinh, maKhoaTrongTep, taoBangExcel, timDongTieuDe, type CotXuat } from "@/server/services/chung/bang-tinh";
import { DuLieuImportLoiError, KhongTimThayKhoaError, TepDanhSachKhongHopLeError, type DongLoiImport } from "@/server/services/hv/loi-hoc-vien";
import type { NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";

/**
 * (bổ sung 05/10/2026 - HV-07) Xét duyệt danh sách chính thức theo tệp: tải danh
 * sách hồ sơ Hợp lệ (kèm hồ sơ đã Chính thức để đối chiếu), ghi "Chính thức" ở
 * cột Xét duyệt, tải lên -> duyệt 1 lô qua xetDuyetDanhSachChinhThuc (giữ nguyên
 * kiểm tra sĩ số, thông báo trúng tuyển, lập học phí). Có dòng lỗi hoặc vượt sĩ
 * số thì không duyệt hồ sơ nào. Để trống ở hồ sơ đã Chính thức không tự hủy (chỉ cảnh báo).
 * (sửa 11/10/2026 - duyệt 1 bước) tệp gồm mọi hồ sơ đang chờ duyệt (không cần thẩm định Hợp lệ
 * trước), duyệt qua duyetHoSoChinhThuc; hồ sơ PT1/PT3 chưa được xác nhận học phí/lệ phí là dòng lỗi.
 */
const NHAN_TRANG_THAI: Record<string, string> = {
  DA_NOP_GIAY: "Đã nộp hồ sơ giấy",
  DA_XAC_NHAN_THAM_GIA: "Đã xác nhận tham gia",
  CHO_DUYET: "Chờ duyệt",
  HOP_LE: "Hợp lệ",
};
export const CHINH_THUC = "Chính thức";

const COT: CotXuat[] = [
  { tieuDe: "STT", rong: 6 },
  { tieuDe: "Mã hồ sơ", rong: 14 },
  { tieuDe: "Mã sinh viên", rong: 14 },
  { tieuDe: "Họ và tên", rong: 26 },
  { tieuDe: "Số CCCD", rong: 16 },
  { tieuDe: "Ngày sinh", rong: 12 },
  { tieuDe: "Số điện thoại", rong: 14 },
  { tieuDe: "Đơn vị công tác", rong: 24 },
  { tieuDe: "Ngày đăng ký", rong: 13 },
  { tieuDe: "Học phí/lệ phí", rong: 16 },
  { tieuDe: "Trạng thái hiện tại", rong: 16 },
  { tieuDe: "Xét duyệt", rong: 14, luaChon: [CHINH_THUC] },
  { tieuDe: "Ghi chú", rong: 26 },
];

async function duLieuXetDuyet(khoaId: string) {
  const khoa = await prisma.khoa.findUnique({ where: { id: khoaId }, include: { chuongTrinh: true } });
  if (!khoa) throw new KhongTimThayKhoaError();
  const dsDangKy = await prisma.dangKyHoc.findMany({
    where: { khoaId, trangThai: { in: [...TRANG_THAI_CHO_DUYET, "CHINH_THUC"] } },
    include: { hocVien: true },
    orderBy: [{ trangThai: "asc" }, { ngayDangKy: "asc" }],
  });
  // (sửa 11/10/2026) hồ sơ PT1/PT3: chỉ duyệt chính thức khi đã xác nhận học phí/lệ phí
  const canXacNhan = dsDangKy.filter((dk) => canXacNhanHocPhiTruoc(dk, khoa.chuongTrinh.phuongThucDangKys));
  const chuaXacNhan = await hocVienChuaXacNhanLePhi(khoa, canXacNhan.map((dk) => dk.hocVienId));
  return { khoa, dsDangKy, canXacNhan: new Set(canXacNhan.map((dk) => dk.id)), chuaXacNhan };
}

export async function xuatExcelXetDuyet(khoaId: string) {
  const [{ khoa, dsDangKy, canXacNhan, chuaXacNhan }, tenCoQuan] = await Promise.all([duLieuXetDuyet(khoaId), layThamSo("CC_TEN_CO_QUAN_CAP")]);
  const soChinhThuc = dsDangKy.filter((dk) => dk.trangThai === "CHINH_THUC").length;
  const noiDung = await taoBangExcel(
    "Xét duyệt chính thức",
    [
      (tenCoQuan ?? "CƠ SỞ ĐÀO TẠO, BỒI DƯỠNG").toUpperCase(),
      "DANH SÁCH XÉT DUYỆT HỌC VIÊN/THÍ SINH CHÍNH THỨC",
      `${khoa.chuongTrinh.ten} · Mã khóa: ${khoa.maKhoa}`,
      `Sĩ số tối đa ${khoa.siSoToiDa}, đã chính thức ${soChinhThuc}, còn ${Math.max(khoa.siSoToiDa - soChinhThuc, 0)} chỗ. Ghi "${CHINH_THUC}" ở cột Xét duyệt cho hồ sơ được duyệt, giữ nguyên cột Mã hồ sơ, rồi tải tệp lên hệ thống.`,
    ],
    COT,
    dsDangKy.map((dk, i) => [
      i + 1,
      dk.hocVien.maHocVien,
      dk.hocVien.maSinhVien ?? "",
      dk.hocVien.hoTen,
      dk.hocVien.soCCCD ?? "",
      dk.hocVien.ngaySinh ? dk.hocVien.ngaySinh.toLocaleDateString("vi-VN") : "",
      dk.soDienThoaiXacThuc ?? dk.hocVien.soDienThoai ?? "",
      dk.hocVien.donViCongTac ?? "",
      dk.ngayDangKy.toLocaleDateString("vi-VN"),
      canXacNhan.has(dk.id) ? (chuaXacNhan.has(dk.hocVienId) ? "Chưa xác nhận" : "Đã xác nhận") : "",
      dk.trangThai === "CHINH_THUC" ? CHINH_THUC : (NHAN_TRANG_THAI[dk.trangThai] ?? dk.trangThai),
      dk.trangThai === "CHINH_THUC" ? CHINH_THUC : "",
      "",
    ]),
  );
  return { tenFile: `xet-duyet-${khoa.maKhoa}.xlsx`, noiDung };
}

export type KetQuaXetDuyetTuTep = { daDuyet: { maHoSo: string; hoTen: string }[]; daCoTruoc: number; khongDuyet: number; canhBao: string[] };

const laChinhThuc = (s: string) => ["chinh thuc", "x", "duyet", "co"].includes(chuanHoaChu(s));

export async function nhapExcelXetDuyet(khoaId: string, noiDung: Buffer, tenTep: string, nguoi: NguoiThucHien): Promise<KetQuaXetDuyetTuTep> {
  const khoa = await prisma.khoa.findUnique({ where: { id: khoaId }, include: { chuongTrinh: true } });
  if (!khoa) throw new KhongTimThayKhoaError();
  const dsDong = await docBangTinh(noiDung, tenTep);
  const tieuDe = timDongTieuDe(dsDong, { maHoSo: (t) => t.includes("ma ho so"), xetDuyet: (t) => t === "xet duyet" }, ["maHoSo", "xetDuyet"]);
  if (!tieuDe) throw new TepDanhSachKhongHopLeError('không thấy cột "Mã hồ sơ" và "Xét duyệt" - hãy dùng tệp tải từ hệ thống');
  const maKhoaTep = maKhoaTrongTep(dsDong, tieuDe.viTriTieuDe);
  if (maKhoaTep !== khoa.maKhoa) {
    throw new TepDanhSachKhongHopLeError(
      maKhoaTep ? `đây là danh sách của khóa ${maKhoaTep}, không phải ${khoa.maKhoa}` : "không xác định được mã khóa trong tệp - hãy dùng tệp tải từ hệ thống",
    );
  }

  const dsCuaKhoa = await prisma.dangKyHoc.findMany({ where: { khoaId }, include: { hocVien: true } });
  const chuaXacNhan = await hocVienChuaXacNhanLePhi(
    khoa,
    dsCuaKhoa.filter((dk) => canXacNhanHocPhiTruoc(dk, khoa.chuongTrinh.phuongThucDangKys)).map((dk) => dk.hocVienId),
  );
  const theoMa = new Map(dsCuaKhoa.map((dk) => [dk.hocVien.maHocVien, dk]));
  const loi: DongLoiImport[] = [];
  const daGap = new Set<string>();
  const canDuyet: typeof dsCuaKhoa = [];
  const kq: KetQuaXetDuyetTuTep = { daDuyet: [], daCoTruoc: 0, khongDuyet: 0, canhBao: [] };
  for (const { soDong, o } of dsDong.slice(tieuDe.viTriTieuDe + 1)) {
    const ma = (o[tieuDe.cot.maHoSo!] ?? "").trim();
    if (!ma) continue;
    const giaTri = o[tieuDe.cot.xetDuyet!] ?? "";
    const dk = theoMa.get(ma);
    if (!dk) {
      loi.push({ dong: soDong, loi: `Mã hồ sơ ${ma} không thuộc danh sách đăng ký của khóa` });
      continue;
    }
    if (daGap.has(ma)) {
      loi.push({ dong: soDong, loi: `Mã hồ sơ ${ma} xuất hiện nhiều lần` });
      continue;
    }
    daGap.add(ma);
    if (laChinhThuc(giaTri)) {
      if (dk.trangThai === "CHINH_THUC") kq.daCoTruoc++;
      else if (!(TRANG_THAI_CHO_DUYET as readonly string[]).includes(dk.trangThai))
        loi.push({ dong: soDong, loi: `Hồ sơ ${ma} không ở trạng thái chờ duyệt - không duyệt chính thức được` });
      else if (chuaXacNhan.has(dk.hocVienId)) loi.push({ dong: soDong, loi: `Hồ sơ ${ma} chưa được xác nhận lệ phí/học phí - không duyệt chính thức được` });
      else canDuyet.push(dk);
    } else if (chuanHoaChu(giaTri) === "") {
      kq.khongDuyet++;
      if (dk.trangThai === "CHINH_THUC") {
        kq.canhBao.push(`${ma} - ${dk.hocVien.hoTen}: tệp để trống nhưng hồ sơ đã Chính thức - không tự hủy, xử lý ở HV-09 nếu cần`);
      }
    } else loi.push({ dong: soDong, loi: `Giá trị Xét duyệt "${giaTri}" không hợp lệ (chỉ "${CHINH_THUC}" hoặc để trống)` });
  }
  if (loi.length > 0) throw new DuLieuImportLoiError(loi);

  // kiểm tra sĩ số, thông báo, lập học phí theo đúng HV-07 - vượt sĩ số thì không duyệt hồ sơ nào
  if (canDuyet.length > 0) await duyetHoSoChinhThuc(khoaId, canDuyet.map((dk) => dk.id), nguoi);
  kq.daDuyet = canDuyet.map((dk) => ({ maHoSo: dk.hocVien.maHocVien, hoTen: dk.hocVien.hoTen }));
  return kq;
}
