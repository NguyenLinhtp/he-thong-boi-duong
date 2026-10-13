import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma/client";
import { ghiThaoTac, HE_THONG, type NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";
import { chanNeuDaPheDuyet, hocVienTinhKetQua, khoaDaPheDuyetKetQua, laKhoaChiDuThi, layKhoaKemChuongTrinh } from "@/server/services/kq/dung-chung";
import { danhGiaHoanThanh } from "@/server/services/kq/kq-03-xet-hoan-thanh";
import { HocVienKhongThuocKhoaError, KhongPhaiKhoaChiDuThiError, LoiKetQua } from "@/server/services/kq/loi-ket-qua";

/**
 * (bổ sung 13/10/2026 - KQ-06) Cấu trúc điểm thi của chương trình chỉ thi (Phương thức 3), từng khóa sửa
 * riêng được: các điểm thành phần (tên, thang điểm, hệ số, điểm đạt riêng tùy chọn) và điểm đạt tổng
 * (tùy chọn). Điểm tổng = Σ điểm thành phần × hệ số. Đạt khi mọi điều kiện đã đặt đều thỏa; không đặt
 * điều kiện nào thì chỉ ghi điểm, không xét Đạt/Không đạt. Chưa cấu hình (null) = cách cũ: 1 điểm thi so
 * với điểm đạt (KQ_DIEM_DAT/chương trình/khóa). Danh sách thành phần rỗng = khóa không nhập điểm.
 */

export type ThanhPhanDiem = { ma: string; ten: string; heSo: number; diemToiDa: number; diemDat: number | null };
export type CauHinhDiemThi = { thanhPhans: ThanhPhanDiem[]; diemDatTong: number | null };
export type NguonCauHinh = "KHOA" | "CHUONG_TRINH";

export class CauTrucDiemThiError extends LoiKetQua {}

const so = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v.replace(",", ".")) : NaN);
const lamTron = (x: number) => Math.round(x * 100) / 100;

function taoMa(ten: string, daCo: Set<string>) {
  const goc =
    ten
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/gi, "d")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "diem";
  let ma = goc;
  for (let i = 2; daCo.has(ma); i++) ma = `${goc}-${i}`;
  daCo.add(ma);
  return ma;
}

/** Kiểm tra + chuẩn hóa cấu hình gửi lên (giữ mã thành phần cũ để không mất điểm đã nhập). */
export function chuanHoaCauHinh(input: unknown): CauHinhDiemThi {
  const goc = (input ?? {}) as { thanhPhans?: unknown[]; diemDatTong?: unknown };
  if (!Array.isArray(goc.thanhPhans)) throw new CauTrucDiemThiError("Cấu hình điểm không hợp lệ");
  if (goc.thanhPhans.length > 20) throw new CauTrucDiemThiError("Tối đa 20 điểm thành phần");
  const daCoMa = new Set<string>();
  const daCoTen = new Set<string>();
  const thanhPhans = goc.thanhPhans.map((x, i) => {
    const tp = (x ?? {}) as Record<string, unknown>;
    const ten = String(tp.ten ?? "").trim();
    if (!ten) throw new CauTrucDiemThiError(`Điểm thành phần thứ ${i + 1} chưa có tên`);
    if (ten.length > 60) throw new CauTrucDiemThiError(`Tên "${ten}" quá dài (tối đa 60 ký tự)`);
    const khoaTen = ten.toLowerCase();
    if (daCoTen.has(khoaTen)) throw new CauTrucDiemThiError(`Trùng tên điểm thành phần "${ten}"`);
    daCoTen.add(khoaTen);
    const diemToiDa = tp.diemToiDa === undefined || tp.diemToiDa === "" || tp.diemToiDa === null ? 10 : so(tp.diemToiDa);
    if (!Number.isFinite(diemToiDa) || diemToiDa <= 0 || diemToiDa > 100) throw new CauTrucDiemThiError(`Thang điểm của "${ten}" phải lớn hơn 0 và không quá 100`);
    const heSo = tp.heSo === undefined || tp.heSo === "" || tp.heSo === null ? 1 : so(tp.heSo);
    if (!Number.isFinite(heSo) || heSo <= 0 || heSo > 100) throw new CauTrucDiemThiError(`Hệ số của "${ten}" phải lớn hơn 0 và không quá 100`);
    const diemDat = tp.diemDat === undefined || tp.diemDat === "" || tp.diemDat === null ? null : so(tp.diemDat);
    if (diemDat !== null && (!Number.isFinite(diemDat) || diemDat < 0 || diemDat > diemToiDa)) {
      throw new CauTrucDiemThiError(`Điểm đạt của "${ten}" phải từ 0 đến ${diemToiDa}`);
    }
    const maCu = typeof tp.ma === "string" && /^[a-z0-9-]{1,40}$/.test(tp.ma) && !daCoMa.has(tp.ma) ? tp.ma : null;
    if (maCu) daCoMa.add(maCu);
    return { ma: maCu ?? "", ten, heSo: lamTron(heSo), diemToiDa: lamTron(diemToiDa), diemDat: diemDat === null ? null : lamTron(diemDat) };
  });
  for (const tp of thanhPhans) if (!tp.ma) tp.ma = taoMa(tp.ten, daCoMa);
  const diemDatTong = goc.diemDatTong === undefined || goc.diemDatTong === "" || goc.diemDatTong === null ? null : so(goc.diemDatTong);
  const tongToiDa = thanhPhans.reduce((t, tp) => t + tp.diemToiDa * tp.heSo, 0);
  if (diemDatTong !== null) {
    if (thanhPhans.length === 0) throw new CauTrucDiemThiError("Chưa có điểm thành phần nào để đặt điểm đạt tổng");
    if (!Number.isFinite(diemDatTong) || diemDatTong < 0 || diemDatTong > tongToiDa) {
      throw new CauTrucDiemThiError(`Điểm đạt tổng phải từ 0 đến ${lamTron(tongToiDa)} (điểm tổng tối đa)`);
    }
  }
  if (tongToiDa > 9999) throw new CauTrucDiemThiError("Điểm tổng tối đa (Σ thang điểm × hệ số) quá lớn");
  return { thanhPhans, diemDatTong: diemDatTong === null ? null : lamTron(diemDatTong) };
}

export function docCauHinh(json: Prisma.JsonValue | null | undefined): CauHinhDiemThi | null {
  if (json == null) return null;
  try {
    return chuanHoaCauHinh(json);
  } catch {
    return null;
  }
}

/** Có điều kiện đạt nào không (không có thì chỉ ghi điểm, không xét Đạt/Không đạt). */
export const coDieuKien = (ch: CauHinhDiemThi) => ch.diemDatTong !== null || ch.thanhPhans.some((tp) => tp.diemDat !== null);

/** Mô tả cách tính (hiển thị cho cán bộ). */
export function moTaCauHinh(ch: CauHinhDiemThi) {
  if (ch.thanhPhans.length === 0) return "Không nhập điểm, không xét kết quả";
  const congThuc = ch.thanhPhans.map((tp) => (tp.heSo === 1 ? tp.ten : `${tp.ten} × ${tp.heSo}`)).join(" + ");
  const dk = [
    ...ch.thanhPhans.filter((tp) => tp.diemDat !== null).map((tp) => `${tp.ten} ≥ ${tp.diemDat}/${tp.diemToiDa}`),
    ...(ch.diemDatTong !== null ? [`điểm tổng ≥ ${ch.diemDatTong}`] : []),
  ];
  return `Điểm tổng = ${congThuc}. ${dk.length > 0 ? `Đạt khi ${dk.join(" và ")}` : "Không xét Đạt/Không đạt"}.`;
}

/** Điểm tổng + Đạt/Không đạt theo cấu hình. datHocTap null = không xét (không có điều kiện). */
export function danhGiaTheoCauHinh(ch: CauHinhDiemThi, diem: Record<string, number | null>) {
  const coDiem = ch.thanhPhans.filter((tp) => diem[tp.ma] != null);
  const thieu = ch.thanhPhans.filter((tp) => diem[tp.ma] == null);
  const diemTong = coDiem.length === 0 ? null : lamTron(coDiem.reduce((t, tp) => t + (diem[tp.ma] as number) * tp.heSo, 0));
  if (!coDieuKien(ch)) return { diemTong, datHocTap: null as boolean | null, ghiChu: coDiem.length === 0 ? "Chưa có điểm" : null };
  const ghiChu: string[] = [];
  if (coDiem.length === 0) ghiChu.push("Chưa có điểm");
  else if (thieu.length > 0) ghiChu.push(`Thiếu điểm: ${thieu.map((tp) => tp.ten).join(", ")}`);
  for (const tp of coDiem) {
    if (tp.diemDat !== null && (diem[tp.ma] as number) < tp.diemDat) ghiChu.push(`${tp.ten} ${diem[tp.ma]} < ${tp.diemDat}`);
  }
  if (ch.diemDatTong !== null && diemTong !== null && thieu.length === 0 && diemTong < ch.diemDatTong) ghiChu.push(`Điểm tổng ${diemTong} < ${ch.diemDatTong}`);
  return { diemTong, datHocTap: ghiChu.length === 0, ghiChu: ghiChu.join("; ") || null };
}

/** Cấu hình đang áp dụng cho khóa (riêng của khóa, không có thì của chương trình); null = cách cũ 1 điểm thi. */
export async function cauHinhDiemThiCuaKhoa(khoaId: string): Promise<{ cauHinh: CauHinhDiemThi | null; nguon: NguonCauHinh | null }> {
  const khoa = await prisma.khoa.findUnique({ where: { id: khoaId }, select: { cauHinhDiemThi: true, chuongTrinh: { select: { cauHinhDiemThi: true } } } });
  const rieng = docCauHinh(khoa?.cauHinhDiemThi);
  if (rieng) return { cauHinh: rieng, nguon: "KHOA" };
  const ct = docCauHinh(khoa?.chuongTrinh.cauHinhDiemThi);
  if (ct) return { cauHinh: ct, nguon: "CHUONG_TRINH" };
  return { cauHinh: null, nguon: null };
}

const docDiem = (json: Prisma.JsonValue | null): Record<string, number | null> =>
  json && typeof json === "object" && !Array.isArray(json)
    ? Object.fromEntries(Object.entries(json).map(([k, v]) => [k, typeof v === "number" ? v : null]))
    : {};

async function dataKetQua(ch: CauHinhDiemThi, khoaId: string, hocVienId: string, diem: Record<string, number | null>) {
  const dg = danhGiaTheoCauHinh(ch, diem);
  const hoanThanh =
    dg.datHocTap === null
      ? { duDieuKienHocPhi: null, hoanThanh: null, ghiChu: dg.ghiChu }
      : await danhGiaHoanThanh({ hocVienId, khoaId, datHocTap: dg.datHocTap, ghiChu: dg.ghiChu });
  return {
    diemThanhPhan: diem as Prisma.InputJsonValue,
    diemTongKet: dg.diemTong,
    tyLeChuyenCan: null,
    datHocTap: dg.datHocTap,
    ...hoanThanh,
  };
}

export type DongDiemThanhPhan = { hocVienId: string; diem: Record<string, number | null> };

/** KQ-06 theo cấu trúc điểm: lưu điểm từng thành phần (ô trống = chưa có điểm), tính điểm tổng + Đạt/Không đạt. */
export async function nhapDiemThanhPhan(khoaId: string, danhSach: DongDiemThanhPhan[], nguoi: NguoiThucHien = HE_THONG) {
  const khoa = await layKhoaKemChuongTrinh(khoaId);
  if (!laKhoaChiDuThi(khoa)) throw new KhongPhaiKhoaChiDuThiError();
  await chanNeuDaPheDuyet(khoaId);
  const { cauHinh } = await cauHinhDiemThiCuaKhoa(khoaId);
  if (!cauHinh) throw new CauTrucDiemThiError("Khóa chưa cấu hình điểm thành phần");
  if (cauHinh.thanhPhans.length === 0) throw new CauTrucDiemThiError("Khóa được cấu hình không nhập điểm");
  const dsThiSinh = await hocVienTinhKetQua(khoaId);
  const hopLe = new Map(dsThiSinh.map((dk) => [dk.hocVienId, dk.hocVien]));
  if (danhSach.some((d) => !hopLe.has(d.hocVienId))) throw new HocVienKhongThuocKhoaError();

  const dsData = [];
  for (const dong of danhSach) {
    const diem: Record<string, number | null> = {};
    for (const tp of cauHinh.thanhPhans) {
      const v = dong.diem[tp.ma];
      if (v == null) diem[tp.ma] = null;
      else if (!Number.isFinite(v) || v < 0 || v > tp.diemToiDa) {
        throw new CauTrucDiemThiError(`${tp.ten} của ${hopLe.get(dong.hocVienId)!.hoTen} phải từ 0 đến ${tp.diemToiDa}`);
      } else diem[tp.ma] = lamTron(v);
    }
    dsData.push({ hocVienId: dong.hocVienId, data: await dataKetQua(cauHinh, khoaId, dong.hocVienId, diem) });
  }
  await prisma.$transaction([
    ghiThaoTac(
      nguoi,
      "NHAP_KET_QUA_THI",
      "Khoa",
      khoaId,
      `${khoa.maKhoa}: ` +
        dsData
          .map((d) => `${hopLe.get(d.hocVienId)!.maHocVien} ${cauHinh.thanhPhans.map((tp) => `${tp.ten} ${(d.data.diemThanhPhan as Record<string, number | null>)[tp.ma] ?? "-"}`).join(", ")}`)
          .join("; "),
    ),
    ...dsData.map(({ hocVienId, data }) =>
      prisma.ketQuaKhoa.upsert({ where: { hocVienId_khoaId: { hocVienId, khoaId } }, update: data, create: { hocVienId, khoaId, ...data } }),
    ),
  ]);
}

/** Tính lại điểm tổng/Đạt theo cấu hình hiện hành (khóa chưa phê duyệt). */
export async function tinhLaiTheoCauTruc(khoaId: string) {
  if (await khoaDaPheDuyetKetQua(khoaId)) return 0;
  const { cauHinh } = await cauHinhDiemThiCuaKhoa(khoaId);
  if (!cauHinh) return 0;
  const dsKq = await prisma.ketQuaKhoa.findMany({ where: { khoaId, daPheDuyet: false, diemThanhPhan: { not: Prisma.DbNull } } });
  for (const kq of dsKq) {
    const cu = docDiem(kq.diemThanhPhan);
    const diem = Object.fromEntries(cauHinh.thanhPhans.map((tp) => [tp.ma, cu[tp.ma] ?? null]));
    await prisma.ketQuaKhoa.update({ where: { id: kq.id }, data: await dataKetQua(cauHinh, khoaId, kq.hocVienId, diem) });
  }
  return dsKq.length;
}

/** Thành phần bị bỏ mà đã có điểm ở khóa (chưa phê duyệt) dùng cấu hình này -> chặn. */
async function chanBoThanhPhanDaCoDiem(dsKhoaId: string[], cu: CauHinhDiemThi | null, moi: CauHinhDiemThi | null) {
  if (!cu) return;
  const conLai = new Set((moi?.thanhPhans ?? []).map((tp) => tp.ma));
  const bo = cu.thanhPhans.filter((tp) => !conLai.has(tp.ma));
  if (bo.length === 0 || dsKhoaId.length === 0) return;
  const dsKq = await prisma.ketQuaKhoa.findMany({ where: { khoaId: { in: dsKhoaId }, daPheDuyet: false }, select: { diemThanhPhan: true } });
  const daCoDiem = bo.filter((tp) => dsKq.some((kq) => docDiem(kq.diemThanhPhan)[tp.ma] != null));
  if (daCoDiem.length > 0) throw new CauTrucDiemThiError(`Không xóa được điểm thành phần đã có điểm nhập: ${daCoDiem.map((tp) => tp.ten).join(", ")}`);
}

export async function luuCauHinhChuongTrinh(chuongTrinhId: string, input: unknown | null, nguoi: NguoiThucHien) {
  const ct = await prisma.chuongTrinh.findUnique({ where: { id: chuongTrinhId }, include: { khoas: { select: { id: true, cauHinhDiemThi: true } } } });
  if (!ct) throw new CauTrucDiemThiError("Không tìm thấy chương trình");
  if (!ct.phuongThucDangKys.includes("CHI_DU_THI")) throw new CauTrucDiemThiError("Cấu trúc điểm thi chỉ áp dụng cho chương trình chỉ đăng ký dự thi");
  if (ct.trangThai === "NGUNG_HIEU_LUC") throw new CauTrucDiemThiError("Chương trình đã ngừng hiệu lực");
  const moi = input === null ? null : chuanHoaCauHinh(input);
  const theoCt = ct.khoas.filter((k) => k.cauHinhDiemThi == null).map((k) => k.id);
  await chanBoThanhPhanDaCoDiem(theoCt, docCauHinh(ct.cauHinhDiemThi), moi);
  await prisma.chuongTrinh.update({ where: { id: chuongTrinhId }, data: { cauHinhDiemThi: moi ?? Prisma.DbNull } });
  await ghiThaoTac(nguoi, "CAU_HINH_DIEM_THI", "ChuongTrinh", chuongTrinhId, `${ct.maCT}: ${moi ? moTaCauHinh(moi) : "bỏ cấu hình (1 điểm thi)"}`);
  let soKhoa = 0;
  for (const id of theoCt) if ((await tinhLaiTheoCauTruc(id)) > 0) soKhoa++;
  return { cauHinh: moi, soKhoaTinhLai: soKhoa };
}

/** Cấu hình riêng của khóa; null = theo chương trình. */
export async function luuCauHinhKhoa(khoaId: string, input: unknown | null, nguoi: NguoiThucHien) {
  const khoa = await layKhoaKemChuongTrinh(khoaId);
  if (!laKhoaChiDuThi(khoa)) throw new KhongPhaiKhoaChiDuThiError();
  await chanNeuDaPheDuyet(khoaId);
  const moi = input === null ? null : chuanHoaCauHinh(input);
  const cu = (await cauHinhDiemThiCuaKhoa(khoaId)).cauHinh;
  await chanBoThanhPhanDaCoDiem([khoaId], cu, moi ?? docCauHinh(khoa.chuongTrinh.cauHinhDiemThi));
  await prisma.khoa.update({ where: { id: khoaId }, data: { cauHinhDiemThi: moi ?? Prisma.DbNull } });
  await ghiThaoTac(nguoi, "CAU_HINH_DIEM_THI", "Khoa", khoaId, `${khoa.maKhoa}: ${moi ? moTaCauHinh(moi) : "theo chương trình"}`);
  return { cauHinh: moi, soTinhLai: await tinhLaiTheoCauTruc(khoaId) };
}

/** KQ-04: chốt cấu hình đang áp dụng vào khóa khi phê duyệt - sửa ở chương trình sau đó không đổi khóa đã duyệt. */
export async function chotCauHinhKhiPheDuyet(khoaId: string) {
  const { cauHinh, nguon } = await cauHinhDiemThiCuaKhoa(khoaId);
  if (cauHinh && nguon === "CHUONG_TRINH") await prisma.khoa.update({ where: { id: khoaId }, data: { cauHinhDiemThi: cauHinh } });
}

export { docDiem };
