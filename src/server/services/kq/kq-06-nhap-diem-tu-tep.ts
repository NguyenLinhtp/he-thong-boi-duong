import { chuanHoaChu, docMoiSheet, maKhoaTrongTep, timDongTieuDe, TepBangTinhKhongHopLeError } from "@/server/services/chung/bang-tinh";
import { prisma } from "@/lib/db/prisma";
import { cauHinhDiemThiCuaKhoa, docDiem, nhapDiemThanhPhan } from "@/server/services/kq/cau-truc-diem-thi";
import { hocVienTinhKetQua, layKhoaKemChuongTrinh, laKhoaChiDuThi } from "@/server/services/kq/dung-chung";
import { KhongPhaiKhoaChiDuThiError, TepDiemThiCoLoiError, TepDiemThiKhongHopLeError } from "@/server/services/kq/loi-ket-qua";
import { nhapKetQuaThi } from "@/server/services/kq/kq-06-ket-qua-thi";
import type { NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";

/**
 * (bổ sung 13/10/2026 - KQ-06) Nhập điểm thi từ tệp danh sách phòng thi (tab Lịch thi & phòng thi xuất
 * ra: mỗi phòng 1 sheet, cột Mã hồ sơ + Điểm thi). Đọc mọi sheet có 2 cột này (bỏ qua sheet Tổng hợp),
 * tệp phải đúng khóa (dòng "Mã khóa: ..."). Ô điểm để trống = giữ nguyên điểm đang có. Điểm 0-10, nhận
 * dấu phẩy thập phân. Mã hồ sơ lạ/trùng hoặc điểm sai là dòng lỗi - có lỗi thì không nhập dòng nào.
 */
export async function nhapDiemThiTuTep(khoaId: string, noiDung: Buffer, tenTep: string, nguoi: NguoiThucHien) {
  const khoa = await layKhoaKemChuongTrinh(khoaId);
  if (!laKhoaChiDuThi(khoa)) throw new KhongPhaiKhoaChiDuThiError();
  let dsSheet;
  try {
    dsSheet = await docMoiSheet(noiDung, tenTep);
  } catch (error) {
    if (error instanceof TepBangTinhKhongHopLeError) throw new TepDiemThiKhongHopLeError(error.message);
    throw error;
  }

  // (bổ sung 13/10/2026) khóa có cấu trúc điểm: mỗi điểm thành phần 1 cột (tiêu đề = tên thành phần)
  const { cauHinh } = await cauHinhDiemThiCuaKhoa(khoaId);
  if (cauHinh) return nhapTheoThanhPhan(khoaId, dsSheet, khoa.maKhoa, cauHinh, nguoi);

  const dsThiSinh = await hocVienTinhKetQua(khoaId);
  const theoMa = new Map(dsThiSinh.map((dk) => [dk.hocVien.maHocVien, dk]));
  const loi: { dong: string; loi: string }[] = [];
  const daGap = new Set<string>();
  const dong: { hocVienId: string; diemThi: number }[] = [];
  let soSheet = 0;
  let deTrong = 0;

  for (const { tenSheet, dsDong } of dsSheet) {
    const tieuDe = timDongTieuDe(dsDong, { maHoSo: (t) => t === "ma ho so", diem: (t) => t.startsWith("diem thi") }, ["maHoSo", "diem"]);
    if (!tieuDe) continue;
    soSheet++;
    const maKhoa = maKhoaTrongTep(dsDong, tieuDe.viTriTieuDe);
    if (maKhoa !== khoa.maKhoa) {
      throw new TepDiemThiKhongHopLeError(
        maKhoa ? `sheet "${tenSheet}" là danh sách của khóa ${maKhoa}, không phải ${khoa.maKhoa}` : `sheet "${tenSheet}" không có mã khóa - hãy dùng tệp tải từ hệ thống`,
      );
    }
    for (const { soDong, o } of dsDong.slice(tieuDe.viTriTieuDe + 1)) {
      const ma = (o[tieuDe.cot.maHoSo!] ?? "").trim();
      if (!ma) continue;
      const viTri = `${tenSheet} - dòng ${soDong}`;
      const giaTri = (o[tieuDe.cot.diem!] ?? "").trim().replace(",", ".");
      const dk = theoMa.get(ma);
      if (!dk) {
        loi.push({ dong: viTri, loi: `Mã hồ sơ ${ma} không thuộc danh sách chính thức của khóa` });
        continue;
      }
      if (daGap.has(ma)) {
        loi.push({ dong: viTri, loi: `Mã hồ sơ ${ma} xuất hiện nhiều lần` });
        continue;
      }
      daGap.add(ma);
      if (giaTri === "") {
        deTrong++;
        continue;
      }
      const diem = Number(giaTri);
      if (!/^\d+(\.\d+)?$/.test(giaTri) || diem < 0 || diem > 10) {
        loi.push({ dong: viTri, loi: `Điểm "${o[tieuDe.cot.diem!]}" của ${dk.hocVien.hoTen} không hợp lệ (0-10)` });
        continue;
      }
      dong.push({ hocVienId: dk.hocVienId, diemThi: diem });
    }
  }
  if (soSheet === 0) throw new TepDiemThiKhongHopLeError('không thấy cột "Mã hồ sơ" và "Điểm thi" - hãy dùng tệp danh sách phòng thi tải từ hệ thống');
  if (loi.length > 0) throw new TepDiemThiCoLoiError(loi);
  if (dong.length > 0) await nhapKetQuaThi(khoaId, dong, nguoi);
  return { soNhap: dong.length, soDeTrong: deTrong, soSheet };
}

type Sheet = Awaited<ReturnType<typeof docMoiSheet>>[number];

async function nhapTheoThanhPhan(
  khoaId: string,
  dsSheet: Sheet[],
  maKhoa: string,
  cauHinh: NonNullable<Awaited<ReturnType<typeof cauHinhDiemThiCuaKhoa>>["cauHinh"]>,
  nguoi: NguoiThucHien,
) {
  if (cauHinh.thanhPhans.length === 0) throw new TepDiemThiKhongHopLeError("khóa được cấu hình không nhập điểm");
  const [dsThiSinh, dsKetQua] = await Promise.all([
    hocVienTinhKetQua(khoaId),
    prisma.ketQuaKhoa.findMany({ where: { khoaId }, select: { hocVienId: true, diemThanhPhan: true } }),
  ]);
  const theoMa = new Map(dsThiSinh.map((dk) => [dk.hocVien.maHocVien, dk]));
  const diemCu = new Map(dsKetQua.map((k) => [k.hocVienId, docDiem(k.diemThanhPhan)]));
  const loi: { dong: string; loi: string }[] = [];
  const daGap = new Set<string>();
  const dong: { hocVienId: string; diem: Record<string, number | null> }[] = [];
  let soSheet = 0;
  let deTrong = 0;
  const nhanDien = Object.fromEntries([
    ["maHoSo", (t: string) => t === "ma ho so"],
    ...cauHinh.thanhPhans.map((tp) => [tp.ma, (t: string) => t === chuanHoaChu(tp.ten)]),
  ]) as Record<string, (t: string) => boolean>;

  for (const { tenSheet, dsDong } of dsSheet) {
    const tieuDe = timDongTieuDe(dsDong, nhanDien, ["maHoSo"]);
    if (!tieuDe || !cauHinh.thanhPhans.some((tp) => tieuDe.cot[tp.ma] !== undefined)) continue;
    soSheet++;
    const maKhoaTep = maKhoaTrongTep(dsDong, tieuDe.viTriTieuDe);
    if (maKhoaTep !== maKhoa) {
      throw new TepDiemThiKhongHopLeError(
        maKhoaTep ? `sheet "${tenSheet}" là danh sách của khóa ${maKhoaTep}, không phải ${maKhoa}` : `sheet "${tenSheet}" không có mã khóa - hãy dùng tệp tải từ hệ thống`,
      );
    }
    for (const { soDong, o } of dsDong.slice(tieuDe.viTriTieuDe + 1)) {
      const ma = (o[tieuDe.cot.maHoSo!] ?? "").trim();
      if (!ma) continue;
      const viTri = `${tenSheet} - dòng ${soDong}`;
      const dk = theoMa.get(ma);
      if (!dk) {
        loi.push({ dong: viTri, loi: `Mã hồ sơ ${ma} không thuộc danh sách chính thức của khóa` });
        continue;
      }
      if (daGap.has(ma)) {
        loi.push({ dong: viTri, loi: `Mã hồ sơ ${ma} xuất hiện nhiều lần` });
        continue;
      }
      daGap.add(ma);
      // ô trống = giữ nguyên điểm đang có của thành phần đó
      const diem: Record<string, number | null> = { ...(diemCu.get(dk.hocVienId) ?? {}) };
      let coThayDoi = false;
      for (const tp of cauHinh.thanhPhans) {
        const c = tieuDe.cot[tp.ma];
        if (c === undefined) continue;
        const goc = (o[c] ?? "").trim();
        const chu = goc.replace(",", ".");
        if (chu === "") continue;
        const v = Number(chu);
        if (!/^\d+(\.\d+)?$/.test(chu) || v > tp.diemToiDa) {
          loi.push({ dong: viTri, loi: `${tp.ten} "${goc}" của ${dk.hocVien.hoTen} không hợp lệ (0-${tp.diemToiDa})` });
          continue;
        }
        diem[tp.ma] = v;
        coThayDoi = true;
      }
      if (coThayDoi) dong.push({ hocVienId: dk.hocVienId, diem });
      else deTrong++;
    }
  }
  if (soSheet === 0) {
    throw new TepDiemThiKhongHopLeError(`không thấy cột "Mã hồ sơ" và cột điểm thành phần (${cauHinh.thanhPhans.map((tp) => tp.ten).join(", ")}) - hãy dùng tệp danh sách phòng thi tải từ hệ thống`);
  }
  if (loi.length > 0) throw new TepDiemThiCoLoiError(loi);
  if (dong.length > 0) await nhapDiemThanhPhan(khoaId, dong, nguoi);
  return { soNhap: dong.length, soDeTrong: deTrong, soSheet };
}
