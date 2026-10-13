import ExcelJS from "exceljs";
import { prisma } from "@/lib/db/prisma";
import type { LoaiDotThi } from "@/generated/prisma/client";
import { ghiThaoTac, type NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";
import { layThamSo } from "@/server/services/qt/qt-05-tham-so";
import { lePhiTheoHocVien, thuocDanhSachThanhPhan } from "@/server/services/hv/xuat-danh-sach-tuyen-sinh";
import { cauHinhDiemThiCuaKhoa, docDiem } from "@/server/services/kq/cau-truc-diem-thi";

/**
 * (bổ sung 12/10/2026 - KH-03) Lịch thi, phòng thi của khóa chỉ đăng ký dự thi/ôn thi (Phương thức 3).
 * Cán bộ đào tạo tạo đợt thi (hoặc đợt ôn thi) lấy thí sinh từ danh sách chính thức (theo 1 thành
 * phần lệ phí nếu khóa chia thành phần, vd. danh sách thi / danh sách ôn thi), tạo các phòng (ngày,
 * ca, giờ, phòng vật lý, sức chứa) rồi xếp phòng: thí sinh sắp theo tên A->Z, lần lượt vào các phòng
 * đến hết sức chứa; thiếu chỗ thì mở thêm phòng và xếp lại. Đã chốt thì thí sinh bổ sung vào phòng
 * cuối cùng, không xếp lại toàn bộ.
 */

export class PhongThiError extends Error {}

export class ThieuChoPhongThiError extends PhongThiError {
  constructor(
    public thieu: number,
    public soPhongCanThem: number,
  ) {
    super(`Tổng sức chứa các phòng còn thiếu ${thieu} chỗ - cần mở thêm ${soPhongCanThem} phòng (theo sức chứa phòng cuối) rồi xếp lại`);
  }
}

export const NHAN_LOAI_DOT: Record<LoaiDotThi, string> = { THI: "Thi", ON_THI: "Ôn thi" };
const TEN_PHONG: Record<LoaiDotThi, string> = { THI: "Phòng thi", ON_THI: "Lớp ôn thi" };

const GIO = /^([01]\d|2[0-3]):[0-5]\d$/;

async function khoaDuThi(khoaId: string) {
  const khoa = await prisma.khoa.findUnique({ where: { id: khoaId }, include: { chuongTrinh: true } });
  if (!khoa) throw new PhongThiError("Không tìm thấy khóa");
  if (!khoa.chuongTrinh.phuongThucDangKys.includes("CHI_DU_THI")) {
    throw new PhongThiError("Chỉ khóa chỉ đăng ký dự thi/ôn thi (Phương thức 3) mới xếp phòng thi");
  }
  return khoa;
}

async function layDot(dotThiId: string) {
  const dot = await prisma.dotThi.findUnique({ where: { id: dotThiId }, include: { khoa: true, thanhPhan: true } });
  if (!dot) throw new PhongThiError("Không tìm thấy đợt thi");
  return dot;
}

/** Sắp tên A->Z theo cách Việt Nam: tên (chữ cuối), rồi họ đệm, rồi mã hồ sơ. */
export function soSanhTen(a: { hoTen: string; maHocVien: string }, b: { hoTen: string; maHocVien: string }) {
  const tach = (s: string) => {
    const ds = s.trim().split(/\s+/);
    return { ten: ds[ds.length - 1] ?? "", ho: ds.slice(0, -1).join(" ") };
  };
  const [x, y] = [tach(a.hoTen), tach(b.hoTen)];
  const so = (p: string, q: string) => p.localeCompare(q, "vi", { sensitivity: "base" });
  return so(x.ten, y.ten) || so(x.ho, y.ho) || a.maHocVien.localeCompare(b.maHocVien);
}

/** Thí sinh nguồn của đợt: danh sách chính thức (theo thành phần nếu có), sắp A->Z. */
export async function thiSinhNguon(dot: { khoaId: string; thanhPhanId: string | null }) {
  const ds = await prisma.dangKyHoc.findMany({
    where: { khoaId: dot.khoaId, trangThai: { in: ["CHINH_THUC", "HOAN_THANH"] } },
    include: { hocVien: true },
  });
  let loc = ds;
  if (dot.thanhPhanId) {
    const lePhi = await lePhiTheoHocVien(dot.khoaId, ds.map((d) => d.hocVienId));
    loc = ds.filter((d) => thuocDanhSachThanhPhan(lePhi.get(d.hocVienId), dot.thanhPhanId!));
  }
  return loc.sort((a, b) => soSanhTen(a.hocVien, b.hocVien));
}

// ---------------- đợt thi ----------------

export type DotThiInput = { ten: string; loai: LoaiDotThi; thanhPhanId?: string | null; moTa?: string | null };

export async function taoDotThi(khoaId: string, input: DotThiInput, nguoi: NguoiThucHien) {
  await khoaDuThi(khoaId);
  const ten = input.ten.trim();
  if (!ten) throw new PhongThiError("Cần nhập tên đợt thi");
  if (input.loai !== "THI" && input.loai !== "ON_THI") throw new PhongThiError("Loại đợt không hợp lệ");
  if (input.thanhPhanId && !(await prisma.thanhPhanLePhi.findFirst({ where: { id: input.thanhPhanId, khoaId } }))) {
    throw new PhongThiError("Danh sách nguồn không thuộc khóa này");
  }
  const dot = await prisma.dotThi.create({
    data: { khoaId, ten, loai: input.loai, thanhPhanId: input.thanhPhanId || null, moTa: input.moTa?.trim() || null },
  });
  await ghiThaoTac(nguoi, "TAO_DOT_THI", "DotThi", dot.id, `${ten} (${NHAN_LOAI_DOT[dot.loai]})`);
  return dot;
}

export async function xoaDotThi(dotThiId: string, nguoi: NguoiThucHien) {
  const dot = await layDot(dotThiId);
  if (dot.daChot) throw new PhongThiError("Đợt đã chốt danh sách phòng - mở chốt trước khi xóa");
  await prisma.dotThi.delete({ where: { id: dotThiId } });
  await ghiThaoTac(nguoi, "XOA_DOT_THI", "DotThi", dotThiId, dot.ten);
}

// ---------------- phòng thi ----------------

export type PhongThiInput = {
  ngay?: string | null; // yyyy-mm-dd
  ca?: string | null;
  gioBatDau?: string | null;
  gioKetThuc?: string | null;
  phongHocId?: string | null;
  diaDiem?: string | null;
  sucChua: number;
};

function chuanHoaPhong(input: PhongThiInput) {
  if (!Number.isInteger(input.sucChua) || input.sucChua < 1) throw new PhongThiError("Số lượng thí sinh của phòng phải là số nguyên từ 1");
  for (const g of [input.gioBatDau, input.gioKetThuc]) {
    if (g && !GIO.test(g)) throw new PhongThiError(`Giờ "${g}" không đúng định dạng HH:mm`);
  }
  if (input.gioBatDau && input.gioKetThuc && input.gioBatDau >= input.gioKetThuc) throw new PhongThiError("Giờ kết thúc phải sau giờ bắt đầu");
  if (input.ngay && !/^\d{4}-\d{2}-\d{2}$/.test(input.ngay)) throw new PhongThiError("Ngày không hợp lệ");
  return {
    ngay: input.ngay ? new Date(`${input.ngay}T00:00:00Z`) : null,
    ca: input.ca?.trim() || null,
    gioBatDau: input.gioBatDau || null,
    gioKetThuc: input.gioKetThuc || null,
    phongHocId: input.phongHocId || null,
    diaDiem: input.diaDiem?.trim() || null,
    sucChua: input.sucChua,
  };
}

/** Thêm soLuong phòng giống nhau vào cuối đợt (đặt tên tự động theo thứ tự). */
export async function themPhongThi(dotThiId: string, input: PhongThiInput, soLuong: number, nguoi: NguoiThucHien) {
  const dot = await layDot(dotThiId);
  const data = chuanHoaPhong(input);
  if (!Number.isInteger(soLuong) || soLuong < 1 || soLuong > 100) throw new PhongThiError("Số phòng thêm phải từ 1 đến 100");
  if (soLuong > 1 && data.phongHocId) throw new PhongThiError("Thêm nhiều phòng cùng lúc thì không chọn phòng vật lý - chọn sau ở từng phòng");
  const cuoi = await prisma.phongThi.findFirst({ where: { dotThiId }, orderBy: { thuTu: "desc" } });
  const batDau = (cuoi?.thuTu ?? 0) + 1;
  const dsPhong = Array.from({ length: soLuong }, (_, i) => ({
    ...data,
    dotThiId,
    thuTu: batDau + i,
    ten: `${TEN_PHONG[dot.loai]} ${String(batDau + i).padStart(2, "0")}`,
  }));
  await prisma.phongThi.createMany({ data: dsPhong });
  await ghiThaoTac(nguoi, "THEM_PHONG_THI", "DotThi", dotThiId, `${dot.ten}: thêm ${soLuong} phòng, sức chứa ${data.sucChua}`);
  return dsPhong.length;
}

export async function suaPhongThi(phongThiId: string, input: PhongThiInput, nguoi: NguoiThucHien) {
  const phong = await prisma.phongThi.findUnique({
    where: { id: phongThiId },
    include: { dotThi: true, _count: { select: { xepPhongThis: true } } },
  });
  if (!phong) throw new PhongThiError("Không tìm thấy phòng");
  const data = chuanHoaPhong(input);
  // (bổ sung 13/10/2026) chưa chốt: sửa số lượng tự do (kể cả nhỏ hơn số đang xếp) rồi xếp lại;
  // đã chốt thì không giảm dưới số thí sinh đang có trong phòng
  if (phong.dotThi.daChot && data.sucChua < phong._count.xepPhongThis) {
    throw new PhongThiError(`Đợt đã chốt, phòng đang có ${phong._count.xepPhongThis} thí sinh - số lượng không được nhỏ hơn (mở chốt để xếp lại)`);
  }
  await prisma.phongThi.update({ where: { id: phongThiId }, data });
  await ghiThaoTac(nguoi, "SUA_PHONG_THI", "PhongThi", phongThiId, `${phong.ten}: số lượng ${phong.sucChua} -> ${data.sucChua}`);
}

/**
 * (bổ sung 13/10/2026) Xóa xếp phòng của đợt (chưa chốt): bỏ toàn bộ thí sinh khỏi các phòng, giữ
 * nguyên các phòng - để sửa/xóa phòng rồi xếp lại.
 */
export async function xoaXepPhongThi(dotThiId: string, nguoi: NguoiThucHien) {
  const dot = await layDot(dotThiId);
  if (dot.daChot) throw new PhongThiError("Đợt đã chốt danh sách phòng - mở chốt trước khi xóa xếp phòng");
  const { count } = await prisma.xepPhongThi.deleteMany({ where: { dotThiId } });
  if (count === 0) throw new PhongThiError("Đợt chưa xếp phòng");
  await ghiThaoTac(nguoi, "XOA_XEP_PHONG_THI", "DotThi", dotThiId, `${dot.ten}: bỏ ${count} thí sinh khỏi các phòng`);
  return count;
}

/** Xóa phòng chưa có thí sinh; các phòng sau dồn lên giữ thứ tự liền mạch. */
export async function xoaPhongThi(phongThiId: string, nguoi: NguoiThucHien) {
  const phong = await prisma.phongThi.findUnique({ where: { id: phongThiId }, include: { _count: { select: { xepPhongThis: true } }, dotThi: true } });
  if (!phong) throw new PhongThiError("Không tìm thấy phòng");
  if (phong._count.xepPhongThis > 0) throw new PhongThiError("Phòng đã có thí sinh - bấm Xóa xếp phòng (khi chưa chốt) trước khi xóa phòng");
  await prisma.$transaction(async (tx) => {
    await tx.phongThi.delete({ where: { id: phongThiId } });
    const sau = await tx.phongThi.findMany({ where: { dotThiId: phong.dotThiId, thuTu: { gt: phong.thuTu } }, orderBy: { thuTu: "asc" } });
    for (const p of sau) {
      await tx.phongThi.update({
        where: { id: p.id },
        data: { thuTu: p.thuTu - 1, ...(p.ten === `${TEN_PHONG[phong.dotThi.loai]} ${String(p.thuTu).padStart(2, "0")}` ? { ten: `${TEN_PHONG[phong.dotThi.loai]} ${String(p.thuTu - 1).padStart(2, "0")}` } : {}) },
      });
    }
  });
  await ghiThaoTac(nguoi, "XOA_PHONG_THI", "DotThi", phong.dotThiId, phong.ten);
}

// ---------------- xếp phòng ----------------

/** Xếp toàn bộ (chỉ khi chưa chốt): A->Z, lần lượt vào các phòng theo thứ tự đến hết sức chứa. */
export async function xepPhongThi(dotThiId: string, nguoi: NguoiThucHien) {
  const dot = await layDot(dotThiId);
  if (dot.daChot) throw new PhongThiError("Đợt đã chốt danh sách phòng - thí sinh mới dùng Bổ sung vào phòng cuối");
  const [ds, dsPhong] = await Promise.all([thiSinhNguon(dot), prisma.phongThi.findMany({ where: { dotThiId }, orderBy: { thuTu: "asc" } })]);
  if (ds.length === 0) throw new PhongThiError("Danh sách chính thức của đợt chưa có thí sinh nào");
  if (dsPhong.length === 0) throw new PhongThiError("Chưa có phòng nào - tạo phòng trước khi xếp");
  const tongCho = dsPhong.reduce((t, p) => t + p.sucChua, 0);
  if (tongCho < ds.length) {
    const thieu = ds.length - tongCho;
    throw new ThieuChoPhongThiError(thieu, Math.ceil(thieu / dsPhong[dsPhong.length - 1].sucChua));
  }
  const xep: { phongThiId: string; dotThiId: string; dangKyId: string; soBaoDanh: number; thuTu: number }[] = [];
  let i = 0;
  for (const p of dsPhong) {
    for (let k = 0; k < p.sucChua && i < ds.length; k++, i++) {
      xep.push({ phongThiId: p.id, dotThiId, dangKyId: ds[i].id, soBaoDanh: i + 1, thuTu: k + 1 });
    }
  }
  await prisma.$transaction(async (tx) => {
    await tx.xepPhongThi.deleteMany({ where: { dotThiId } });
    await tx.xepPhongThi.createMany({ data: xep });
  });
  const soPhongDung = new Set(xep.map((x) => x.phongThiId)).size;
  await ghiThaoTac(nguoi, "XEP_PHONG_THI", "DotThi", dotThiId, `${dot.ten}: xếp ${ds.length} thí sinh vào ${soPhongDung}/${dsPhong.length} phòng (A->Z)`);
  return { soThiSinh: ds.length, soPhongDung, soPhongTrong: dsPhong.length - soPhongDung };
}

/** Thiếu chỗ: mở thêm phòng giống phòng cuối (ngày, ca, giờ, sức chứa; không gán phòng vật lý) rồi xếp lại. */
export async function moThemPhongVaXep(dotThiId: string, nguoi: NguoiThucHien) {
  const dot = await layDot(dotThiId);
  if (dot.daChot) throw new PhongThiError("Đợt đã chốt danh sách phòng");
  const [ds, dsPhong] = await Promise.all([thiSinhNguon(dot), prisma.phongThi.findMany({ where: { dotThiId }, orderBy: { thuTu: "asc" } })]);
  const cuoi = dsPhong[dsPhong.length - 1];
  if (!cuoi) throw new PhongThiError("Chưa có phòng nào - tạo phòng trước khi xếp");
  const thieu = ds.length - dsPhong.reduce((t, p) => t + p.sucChua, 0);
  if (thieu > 0) {
    await themPhongThi(
      dotThiId,
      {
        ngay: cuoi.ngay ? cuoi.ngay.toISOString().slice(0, 10) : null,
        ca: cuoi.ca,
        gioBatDau: cuoi.gioBatDau,
        gioKetThuc: cuoi.gioKetThuc,
        diaDiem: null,
        sucChua: cuoi.sucChua,
      },
      Math.ceil(thieu / cuoi.sucChua),
      nguoi,
    );
  }
  return xepPhongThi(dotThiId, nguoi);
}

export async function chotDotThi(dotThiId: string, nguoi: NguoiThucHien) {
  const dot = await layDot(dotThiId);
  if (dot.daChot) throw new PhongThiError("Đợt đã chốt");
  if ((await prisma.xepPhongThi.count({ where: { dotThiId } })) === 0) throw new PhongThiError("Chưa xếp phòng - xếp phòng trước khi chốt");
  await prisma.dotThi.update({ where: { id: dotThiId }, data: { daChot: true, chotLuc: new Date() } });
  await ghiThaoTac(nguoi, "CHOT_PHONG_THI", "DotThi", dotThiId, dot.ten);
}

export async function moChotDotThi(dotThiId: string, lyDo: string, nguoi: NguoiThucHien) {
  const dot = await layDot(dotThiId);
  if (!dot.daChot) throw new PhongThiError("Đợt chưa chốt");
  if (!lyDo.trim()) throw new PhongThiError("Cần nhập lý do mở chốt");
  await prisma.dotThi.update({ where: { id: dotThiId }, data: { daChot: false, chotLuc: null } });
  await ghiThaoTac(nguoi, "MO_CHOT_PHONG_THI", "DotThi", dotThiId, `${dot.ten} - lý do: ${lyDo.trim()}`);
}

/** Đã chốt: thí sinh mới vào danh sách chính thức được xếp (A->Z) vào phòng cuối, số báo danh nối tiếp. */
export async function boSungThiSinh(dotThiId: string, nguoi: NguoiThucHien) {
  const dot = await layDot(dotThiId);
  if (!dot.daChot) throw new PhongThiError("Đợt chưa chốt - dùng Xếp phòng để xếp lại toàn bộ");
  const [ds, daXep, cuoi, maxSbd] = await Promise.all([
    thiSinhNguon(dot),
    prisma.xepPhongThi.findMany({ where: { dotThiId }, select: { dangKyId: true } }),
    prisma.phongThi.findFirst({ where: { dotThiId }, orderBy: { thuTu: "desc" }, include: { _count: { select: { xepPhongThis: true } } } }),
    prisma.xepPhongThi.aggregate({ where: { dotThiId }, _max: { soBaoDanh: true } }),
  ]);
  if (!cuoi) throw new PhongThiError("Đợt chưa có phòng");
  const daCo = new Set(daXep.map((x) => x.dangKyId));
  const moi = ds.filter((d) => !daCo.has(d.id));
  if (moi.length === 0) return { soBoSung: 0, phong: cuoi.ten, vuotSucChua: 0 };
  const thuTuCuoi = (await prisma.xepPhongThi.aggregate({ where: { phongThiId: cuoi.id }, _max: { thuTu: true } }))._max.thuTu ?? 0;
  const sbd = maxSbd._max.soBaoDanh ?? 0;
  await prisma.xepPhongThi.createMany({
    data: moi.map((d, i) => ({ phongThiId: cuoi.id, dotThiId, dangKyId: d.id, soBaoDanh: sbd + i + 1, thuTu: thuTuCuoi + i + 1, boSung: true })),
  });
  const vuot = Math.max(cuoi._count.xepPhongThis + moi.length - cuoi.sucChua, 0);
  await ghiThaoTac(
    nguoi,
    "BO_SUNG_PHONG_THI",
    "DotThi",
    dotThiId,
    `${dot.ten}: bổ sung ${moi.length} thí sinh vào ${cuoi.ten} - ${moi.map((d) => d.hocVien.maHocVien).join(", ")}${vuot > 0 ? ` (vượt sức chứa ${vuot})` : ""}`,
  );
  return { soBoSung: moi.length, phong: cuoi.ten, vuotSucChua: vuot };
}

// ---------------- đọc, xuất ----------------

export const ngayIso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");
export const ngayVn = (d: Date | null) => (d ? ngayIso(d).split("-").reverse().join("/") : "");

/** Các đợt của khóa kèm phòng, thí sinh đã xếp và tình trạng so với danh sách chính thức hiện tại. */
export async function danhSachDotThi(khoaId: string) {
  const dsDot = await prisma.dotThi.findMany({
    where: { khoaId },
    orderBy: { createdAt: "asc" },
    include: {
      thanhPhan: true,
      phongThis: {
        orderBy: { thuTu: "asc" },
        include: {
          phongHoc: true,
          xepPhongThis: { orderBy: { thuTu: "asc" }, include: { dangKy: { include: { hocVien: true } } } },
        },
      },
    },
  });
  return Promise.all(
    dsDot.map(async (dot) => {
      const nguon = await thiSinhNguon(dot);
      const idNguon = new Set(nguon.map((d) => d.id));
      const daXep = new Set(dot.phongThis.flatMap((p) => p.xepPhongThis.map((x) => x.dangKyId)));
      return {
        ...dot,
        soNguon: nguon.length,
        chuaXep: nguon.filter((d) => !daXep.has(d.id)).length,
        // đã xếp nhưng không còn trong danh sách chính thức (thôi học, hủy xác nhận lệ phí...)
        khongConTrongDs: new Set([...daXep].filter((id) => !idNguon.has(id))),
      };
    }),
  );
}

const VIEN = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } } as const;

/** Excel danh sách thí sinh theo phòng: 1 sheet tổng hợp + 1 sheet mỗi phòng (có cột ký tên). */
export async function xuatExcelPhongThi(dotThiId: string) {
  const dot = (await danhSachDotThi((await layDot(dotThiId)).khoaId)).find((d) => d.id === dotThiId)!;
  const khoa = await prisma.khoa.findUniqueOrThrow({ where: { id: dot.khoaId }, include: { chuongTrinh: true } });
  const tenCoQuan = ((await layThamSo("CC_TEN_CO_QUAN_CAP")) ?? "CƠ SỞ ĐÀO TẠO, BỒI DƯỠNG").toUpperCase();
  const wb = new ExcelJS.Workbook();
  const laThi = dot.loai === "THI";
  const tieuDe = (ws: ExcelJS.Worksheet, soCot: number, dong: [string, boolean, number][]) => {
    for (const [s, dam, co] of dong) {
      const r = ws.addRow([s]);
      ws.mergeCells(r.number, 1, r.number, soCot);
      r.getCell(1).font = { bold: dam, size: co };
      r.getCell(1).alignment = { horizontal: "center", wrapText: true };
    }
    ws.addRow([]);
  };
  const thoiGian = (p: (typeof dot.phongThis)[number]) =>
    [p.ca, p.gioBatDau && `${p.gioBatDau}${p.gioKetThuc ? `-${p.gioKetThuc}` : ""}`, p.ngay && `ngày ${ngayVn(p.ngay)}`].filter(Boolean).join(", ");
  const phongVatLy = (p: (typeof dot.phongThis)[number]) =>
    [p.phongHoc && `${p.phongHoc.ten}${p.phongHoc.coSo ? ` (${p.phongHoc.coSo})` : ""}`, p.diaDiem].filter(Boolean).join(" - ");

  // tổng hợp
  const th = wb.addWorksheet("Tổng hợp", { pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  const cotTh = [6, 18, 14, 10, 16, 30, 10, 10];
  th.columns = cotTh.map((w) => ({ width: w }));
  tieuDe(th, cotTh.length, [
    [tenCoQuan, true, 11],
    [`DANH SÁCH ${laThi ? "PHÒNG THI" : "LỚP ÔN THI"} - ${dot.ten.toUpperCase()}`, true, 14],
    [`${khoa.tenKhoa ?? khoa.chuongTrinh.ten} · Mã khóa: ${khoa.maKhoa}`, false, 11],
  ]);
  const hTh = th.addRow(["STT", laThi ? "Phòng thi" : "Lớp ôn", "Ngày", "Ca", "Giờ", "Phòng vật lý / địa điểm", "Sức chứa", "Số thí sinh"]);
  hTh.font = { bold: true };
  dot.phongThis.forEach((p, i) =>
    th.addRow([i + 1, p.ten, ngayVn(p.ngay), p.ca ?? "", [p.gioBatDau, p.gioKetThuc].filter(Boolean).join("-"), phongVatLy(p), p.sucChua, p.xepPhongThis.length]),
  );
  th.addRow(["", "Tổng", "", "", "", "", dot.phongThis.reduce((t, p) => t + p.sucChua, 0), dot.phongThis.reduce((t, p) => t + p.xepPhongThis.length, 0)]);
  for (let r = hTh.number; r <= th.rowCount; r++) cotTh.forEach((_, c) => (th.getCell(r, c + 1).border = VIEN));

  // từng phòng
  // (bổ sung 13/10/2026 - KQ-06) đợt thi: thêm cột Mã hồ sơ + Điểm thi (điền sẵn điểm đã nhập) để nhập điểm
  // vào chính tệp này rồi tải lên ở tab Kết quả
  // (bổ sung 13/10/2026) khóa có cấu trúc điểm: mỗi điểm thành phần 1 cột (tiêu đề = tên thành phần);
  // cấu hình không nhập điểm thì không có cột điểm; chưa cấu hình thì 1 cột Điểm thi
  const { cauHinh } = laThi ? await cauHinhDiemThiCuaKhoa(dot.khoaId) : { cauHinh: null };
  const cotDiem: { tieuDe: string; ma: string | null }[] = !laThi
    ? []
    : cauHinh
      ? cauHinh.thanhPhans.map((tp) => ({ tieuDe: tp.ten, ma: tp.ma }))
      : [{ tieuDe: "Điểm thi", ma: null }];
  const dsKetQua = cotDiem.length > 0 ? await prisma.ketQuaKhoa.findMany({ where: { khoaId: dot.khoaId }, select: { hocVienId: true, diemTongKet: true, diemThanhPhan: true } }) : [];
  const diemDaNhap = new Map(
    dsKetQua.map((k) => [
      k.hocVienId,
      cotDiem.map((c) => (c.ma === null ? (k.diemTongKet == null ? null : Number(k.diemTongKet)) : (docDiem(k.diemThanhPhan)[c.ma] ?? null))),
    ]),
  );
  const tieuDeCot = ["STT", "SBD", "Mã hồ sơ", "Mã sinh viên", "Họ và tên", "Ngày sinh", "Số CCCD", "Lớp", ...cotDiem.map((c) => c.tieuDe), "Ký tên", "Ghi chú"];
  const laCotDiem = (c: number) => c >= 8 && c < 8 + cotDiem.length;
  const cot = [6, 8, 14, 14, 28, 12, 16, 12, ...cotDiem.map(() => 11), 14, 16];
  const tenSheet = new Set<string>();
  for (const p of dot.phongThis) {
    let ten = p.ten.replace(/[\\/?*[\]:]/g, " ").slice(0, 31);
    while (tenSheet.has(ten)) ten = `${ten.slice(0, 28)}_${tenSheet.size}`;
    tenSheet.add(ten);
    const ws = wb.addWorksheet(ten, { pageSetup: { orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
    ws.columns = cot.map((w) => ({ width: w }));
    tieuDe(ws, cot.length, [
      [tenCoQuan, true, 11],
      [`DANH SÁCH THÍ SINH ${p.ten.toUpperCase()}`, true, 14],
      [`${dot.ten} · ${khoa.tenKhoa ?? khoa.chuongTrinh.ten} · Mã khóa: ${khoa.maKhoa}`, false, 11],
      [[thoiGian(p), phongVatLy(p) && `Phòng: ${phongVatLy(p)}`].filter(Boolean).join(" · ") || " ", false, 11],
      [`Số thí sinh: ${p.xepPhongThis.length}`, false, 11],
    ]);
    const h = ws.addRow(tieuDeCot);
    h.font = { bold: true };
    h.alignment = { horizontal: "center", vertical: "middle" };
    p.xepPhongThis.forEach((x, i) => {
      const hv = x.dangKy.hocVien;
      ws.addRow([
        i + 1,
        String(x.soBaoDanh).padStart(3, "0"),
        hv.maHocVien,
        hv.maSinhVien ?? "",
        hv.hoTen,
        hv.ngaySinh ? hv.ngaySinh.toLocaleDateString("vi-VN") : "",
        hv.soCCCD ?? "",
        hv.lopSinhHoat ?? "",
        ...(diemDaNhap.get(hv.id) ?? cotDiem.map(() => null)),
        "",
        [x.boSung ? "Bổ sung" : "", dot.khongConTrongDs.has(x.dangKyId) ? "Không còn trong danh sách chính thức" : ""].filter(Boolean).join("; "),
      ]).height = 22;
    });
    for (let r = h.number; r <= ws.rowCount; r++) {
      cot.forEach((_, c) => {
        const o = ws.getCell(r, c + 1);
        o.border = VIEN;
        // mã giữ dạng chữ (không mất số 0 đầu); cột điểm để số
        if (r > h.number && !laCotDiem(c) && tieuDeCot[c] !== "STT") o.numFmt = "@";
      });
    }
  }
  return { tenFile: `phong-thi-${khoa.maKhoa}-${dot.ten}.xlsx`, noiDung: Buffer.from(await wb.xlsx.writeBuffer()) };
}
