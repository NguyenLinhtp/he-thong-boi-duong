import { prisma } from "@/lib/db/prisma";
import type { MucBoSung } from "@/lib/form-dang-ky";
import { cauHinhHieuLuc, minhChungConThieu } from "@/server/services/hv/form-dang-ky";
import { thamDinhHoSo, TRANG_THAI_SAN_SANG_THAM_DINH, type KetQuaThamDinh } from "@/server/services/hv/hv-06-tham-dinh";
import { layThamSo } from "@/server/services/qt/qt-05-tham-so";
import { chuanHoaChu, docBangTinh, maKhoaTrongTep, taoBangExcel, timDongTieuDe, type CotXuat } from "@/server/services/chung/bang-tinh";
import { DuLieuImportLoiError, KhongTimThayKhoaError, TepDanhSachKhongHopLeError, type DongLoiImport } from "@/server/services/hv/loi-hoc-vien";
import type { NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";

/**
 * (bổ sung 05/10/2026 - HV-06) Thẩm định theo danh sách từ tệp: cán bộ đào tạo
 * tải danh sách hồ sơ (chờ thẩm định + đã thẩm định, chưa duyệt chính thức) kèm
 * thông tin đăng ký và tình trạng minh chứng, ghi cột "Kết quả thẩm định"
 * (Hợp lệ/Không hợp lệ, để trống = giữ nguyên) + "Lý do", tải lên để cập nhật
 * hàng loạt (mỗi hồ sơ đi qua thamDinhHoSo - cùng quy tắc, ghi nhật ký).
 * Có dòng lỗi thì không cập nhật dòng nào.
 */
export const HOP_LE = "Hợp lệ";
export const KHONG_HOP_LE = "Không hợp lệ";

const NHAN_TRANG_THAI: Record<string, string> = {
  CHO_DUYET: "Chờ thẩm định",
  DA_NOP_GIAY: "Đã nộp giấy - chờ thẩm định",
  DA_XAC_NHAN_THAM_GIA: "Đã xác nhận tham gia - chờ thẩm định",
  HOP_LE: HOP_LE,
  KHONG_HOP_LE: KHONG_HOP_LE,
};

async function duLieuThamDinh(khoaId: string) {
  const khoa = await prisma.khoa.findUnique({ where: { id: khoaId }, include: { chuongTrinh: true } });
  if (!khoa) throw new KhongTimThayKhoaError();
  const dsDangKy = await prisma.dangKyHoc.findMany({
    where: { khoaId, trangThai: { in: TRANG_THAI_SAN_SANG_THAM_DINH } },
    include: { hocVien: true },
    orderBy: [{ ngayDangKy: "asc" }],
  });
  return { khoa, dsDangKy };
}

export async function xuatExcelThamDinh(khoaId: string) {
  const [{ khoa, dsDangKy }, { cauHinh }, tenCoQuan] = await Promise.all([
    duLieuThamDinh(khoaId),
    cauHinhHieuLuc(khoaId),
    layThamSo("CC_TEN_CO_QUAN_CAP"),
  ]);
  // trường tùy chỉnh (không phải tệp) của form đăng ký -> thêm cột để cán bộ đối chiếu
  const dsTruong = cauHinh.truong.filter((t) => !t.coSan && t.kieu !== "TEP" && t.hien);
  const cot: CotXuat[] = [
    { tieuDe: "STT", rong: 6 },
    { tieuDe: "Mã hồ sơ", rong: 14 },
    { tieuDe: "Mã sinh viên", rong: 14 },
    { tieuDe: "Họ và tên", rong: 26 },
    { tieuDe: "Số CCCD", rong: 16 },
    { tieuDe: "Ngày sinh", rong: 12 },
    { tieuDe: "Số điện thoại", rong: 14 },
    { tieuDe: "Email", rong: 24 },
    { tieuDe: "Đơn vị công tác", rong: 22 },
    ...dsTruong.map((t) => ({ tieuDe: t.nhan, rong: Math.min(30, Math.max(14, t.nhan.length + 2)) })),
    { tieuDe: "Minh chứng bắt buộc", rong: 24 },
    { tieuDe: "Ngày đăng ký", rong: 13 },
    { tieuDe: "Trạng thái hiện tại", rong: 18 },
    { tieuDe: "Kết quả thẩm định", rong: 16, luaChon: [HOP_LE, KHONG_HOP_LE] },
    { tieuDe: "Lý do", rong: 30 },
  ];
  const dong: (string | number | null)[][] = [];
  for (const [i, dk] of dsDangKy.entries()) {
    const hv = dk.hocVien;
    const boSung = Array.isArray(dk.thongTinBoSung) ? (dk.thongTinBoSung as MucBoSung[]) : [];
    const thieu = await minhChungConThieu(dk.id);
    dong.push([
      i + 1,
      hv.maHocVien,
      hv.maSinhVien ?? "",
      hv.hoTen,
      hv.soCCCD ?? "",
      hv.ngaySinh ? hv.ngaySinh.toLocaleDateString("vi-VN") : "",
      dk.soDienThoaiXacThuc ?? hv.soDienThoai ?? "",
      hv.email ?? "",
      hv.donViCongTac ?? "",
      ...dsTruong.map((t) => boSung.find((b) => b.ma === t.ma)?.giaTri ?? ""),
      thieu.length > 0 ? `Thiếu: ${thieu.join(", ")}` : "Đủ",
      dk.ngayDangKy.toLocaleDateString("vi-VN"),
      NHAN_TRANG_THAI[dk.trangThai] ?? dk.trangThai,
      dk.trangThai === "HOP_LE" ? HOP_LE : dk.trangThai === "KHONG_HOP_LE" ? KHONG_HOP_LE : "",
      dk.ghiChuThamDinh ?? "",
    ]);
  }
  const noiDung = await taoBangExcel(
    "Thẩm định hồ sơ",
    [
      (tenCoQuan ?? "CƠ SỞ ĐÀO TẠO, BỒI DƯỠNG").toUpperCase(),
      "DANH SÁCH HỒ SƠ ĐĂNG KÝ - THẨM ĐỊNH",
      `${khoa.chuongTrinh.ten} · Mã khóa: ${khoa.maKhoa}`,
      `Ghi "${HOP_LE}" hoặc "${KHONG_HOP_LE}" ở cột Kết quả thẩm định (Không hợp lệ phải ghi Lý do; để trống = giữ nguyên), giữ nguyên cột Mã hồ sơ, rồi tải tệp lên hệ thống.`,
    ],
    cot,
    dong,
  );
  return { tenFile: `tham-dinh-${khoa.maKhoa}.xlsx`, noiDung };
}

export type KetQuaThamDinhTuTep = { hopLe: number; khongHopLe: number; khongDoi: number; boTrong: number };

const docKetQua = (s: string): KetQuaThamDinh | "" | null => {
  const t = chuanHoaChu(s);
  if (t === "") return "";
  if (["hop le", "dat", "x"].includes(t)) return "HOP_LE";
  if (["khong hop le", "khong dat", "loai"].includes(t)) return "KHONG_HOP_LE";
  return null;
};

export async function nhapExcelThamDinh(khoaId: string, noiDung: Buffer, tenTep: string, nguoi: NguoiThucHien): Promise<KetQuaThamDinhTuTep> {
  const { khoa } = await duLieuThamDinh(khoaId);
  const dsDong = await docBangTinh(noiDung, tenTep);
  const tieuDe = timDongTieuDe(
    dsDong,
    { maHoSo: (t) => t.includes("ma ho so"), ketQua: (t) => t.includes("ket qua tham dinh"), lyDo: (t) => t === "ly do" },
    ["maHoSo", "ketQua"],
  );
  if (!tieuDe) throw new TepDanhSachKhongHopLeError('không thấy cột "Mã hồ sơ" và "Kết quả thẩm định" - hãy dùng tệp tải từ hệ thống');
  const maKhoaTep = maKhoaTrongTep(dsDong, tieuDe.viTriTieuDe);
  if (maKhoaTep !== khoa.maKhoa) {
    throw new TepDanhSachKhongHopLeError(
      maKhoaTep ? `đây là danh sách của khóa ${maKhoaTep}, không phải ${khoa.maKhoa}` : "không xác định được mã khóa trong tệp - hãy dùng tệp tải từ hệ thống",
    );
  }

  // tra theo mọi hồ sơ của khóa để báo đúng lỗi "đã duyệt chính thức" thay vì "không thuộc khóa"
  const dsCuaKhoa = await prisma.dangKyHoc.findMany({ where: { khoaId }, include: { hocVien: true } });
  const theoMa = new Map(dsCuaKhoa.map((dk) => [dk.hocVien.maHocVien, dk]));
  const loi: DongLoiImport[] = [];
  const daGap = new Set<string>();
  const canCapNhat: { dangKyId: string; ketQua: KetQuaThamDinh; lyDo: string | null }[] = [];
  const kq: KetQuaThamDinhTuTep = { hopLe: 0, khongHopLe: 0, khongDoi: 0, boTrong: 0 };
  for (const { soDong, o } of dsDong.slice(tieuDe.viTriTieuDe + 1)) {
    const ma = (o[tieuDe.cot.maHoSo!] ?? "").trim();
    if (!ma) continue;
    const ketQua = docKetQua(o[tieuDe.cot.ketQua!] ?? "");
    const lyDo = tieuDe.cot.lyDo !== undefined ? (o[tieuDe.cot.lyDo] ?? "").trim() || null : null;
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
    if (ketQua === null) {
      loi.push({ dong: soDong, loi: `Kết quả thẩm định "${o[tieuDe.cot.ketQua!]}" không hợp lệ (chỉ "${HOP_LE}", "${KHONG_HOP_LE}" hoặc để trống)` });
      continue;
    }
    if (ketQua === "") {
      kq.boTrong++;
      continue;
    }
    if (!TRANG_THAI_SAN_SANG_THAM_DINH.includes(dk.trangThai)) {
      loi.push({ dong: soDong, loi: `Hồ sơ ${ma} đang ở trạng thái ${dk.trangThai} - không thẩm định được` });
      continue;
    }
    if (ketQua === "KHONG_HOP_LE" && !lyDo) {
      loi.push({ dong: soDong, loi: `Hồ sơ ${ma}: "${KHONG_HOP_LE}" phải ghi Lý do` });
      continue;
    }
    if (ketQua === "HOP_LE") {
      const thieu = await minhChungConThieu(dk.id);
      if (thieu.length > 0) {
        loi.push({ dong: soDong, loi: `Hồ sơ ${ma} thiếu minh chứng bắt buộc (${thieu.join(", ")}) - không được "${HOP_LE}"` });
        continue;
      }
    }
    if (dk.trangThai === ketQua && (dk.ghiChuThamDinh ?? null) === lyDo) {
      kq.khongDoi++;
      continue;
    }
    canCapNhat.push({ dangKyId: dk.id, ketQua, lyDo });
  }
  if (loi.length > 0) throw new DuLieuImportLoiError(loi);

  for (const c of canCapNhat) {
    await thamDinhHoSo(c.dangKyId, c.ketQua, c.lyDo, nguoi);
    if (c.ketQua === "HOP_LE") kq.hopLe++;
    else kq.khongHopLe++;
  }
  return kq;
}
