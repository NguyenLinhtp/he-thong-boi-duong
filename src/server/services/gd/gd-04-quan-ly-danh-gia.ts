import { prisma } from "@/lib/db/prisma";
import { ghiThaoTac, HE_THONG, type NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";
import { giangVienHieuLuc } from "@/server/services/kh/kh-03-thoi-khoa-bieu";
import { cuoiNgayVN, daQuaBeGiang, ngayVN } from "@/server/services/kh/kh-05-trang-thai-si-so";
import { ketQuaKhoaDaPheDuyet, soLanToiDaCuaHocVien, trongHanGiaHan } from "@/server/services/gd/gd-04-danh-gia";
import { chuanHoaDanhSachId, LoKhongHopLeError, xuLyLo } from "@/server/services/chung/xu-ly-lo";

/**
 * (bổ sung 25/10/2026 - GD-04/KQ-01) Quản lý bài làm trực tuyến của 1 khóa: tình hình làm bài trắc nghiệm,
 * nộp/chấm sản phẩm cuối khóa, đạt/chưa đạt theo từng học viên, theo khóa/lớp và theo giảng viên chấm;
 * gia hạn riêng từng học viên (thêm lượt làm bài, mở nộp lại sản phẩm, hạn làm sau ngày bế giảng).
 */

export type MucBai = {
  key: string; // TN-<id> | SP-<id>
  loai: "TN" | "SP";
  id: string;
  ten: string;
  hocPhanId: string;
  hocPhan: string;
  soLanToiDa: number | null;
  diemDat: number | null;
  tinhDiem: boolean;
  thangDiem: number;
};

export type TrangThaiO = "CHUA_LAM" | "DANG_LAM" | "CHUA_CHAM" | "DAT" | "CHUA_DAT" | "CO_DIEM";

export type OBai = {
  trangThai: TrangThaiO;
  diem: number | null;
  // TN: số lần đã bắt đầu / tối đa của học viên (kể cả gia hạn)
  soLan: number;
  soLanToiDa: number | null;
  // SP: giảng viên chấm (theo phân công lớp/khóa) và người đã chấm
  giangVien: string | null;
  nguoiCham: string | null;
  giaHan: { soLanThem: number; moNopLai: boolean; hanDen: Date | null; conHieuLuc: boolean } | null;
};

export type DongHocVien = {
  hocVienId: string;
  maHocVien: string;
  hoTen: string;
  soCCCD: string | null;
  lopId: string | null;
  lop: string | null;
  o: Record<string, OBai>;
  // nội dung chưa đạt (bài có điểm đạt mà chưa làm/chưa chấm/dưới điểm đạt)
  chuaDat: string[];
};

/** Trạng thái 1 ô theo điểm và điểm đạt của bài. */
function trangThaiTheoDiem(diem: number | null, diemDat: number | null): TrangThaiO {
  if (diem === null) return "CHUA_LAM";
  if (diemDat === null) return "CO_DIEM";
  return diem >= diemDat ? "DAT" : "CHUA_DAT";
}

export async function bangDanhGiaKhoa(khoaId: string) {
  const khoa = await prisma.khoa.findUniqueOrThrow({ where: { id: khoaId }, include: { chuongTrinh: true, lopHocs: { orderBy: { ten: "asc" } } } });
  const [dsHp, dsDangKy, dsPhanCong, dsGiangVien] = await Promise.all([
    prisma.hocPhan.findMany({
      where: { chuongTrinhId: khoa.chuongTrinhId },
      orderBy: { thuTu: "asc" },
      include: { baiTracNghiems: { orderBy: [{ thuTu: "asc" }, { createdAt: "asc" }] }, yeuCauSanPhams: { orderBy: [{ thuTu: "asc" }, { createdAt: "asc" }] } },
    }),
    prisma.dangKyHoc.findMany({
      where: { khoaId, trangThai: { in: ["CHINH_THUC", "HOAN_THANH"] } },
      include: { hocVien: true, lop: true },
      orderBy: { hocVien: { hoTen: "asc" } },
    }),
    prisma.giangVienHocPhan.findMany({ where: { khoaId } }),
    prisma.giangVien.findMany({ where: { hocPhans: { some: { khoaId } } }, select: { id: true, hoTen: true } }),
  ]);
  const dsMuc: MucBai[] = dsHp.flatMap((hp) => [
    ...hp.baiTracNghiems.map((b) => ({
      key: `TN-${b.id}`, loai: "TN" as const, id: b.id, ten: b.tieuDe, hocPhanId: hp.id, hocPhan: hp.ten,
      soLanToiDa: b.soLanToiDa, diemDat: b.diemDat == null ? null : Number(b.diemDat), tinhDiem: b.tinhDiem, thangDiem: b.thangDiem,
    })),
    ...hp.yeuCauSanPhams.map((y) => ({
      key: `SP-${y.id}`, loai: "SP" as const, id: y.id, ten: y.tieuDe, hocPhanId: hp.id, hocPhan: hp.ten,
      soLanToiDa: null, diemDat: y.diemDat == null ? null : Number(y.diemDat), tinhDiem: y.tinhDiem, thangDiem: y.thangDiem,
    })),
  ]);
  const dsHocVienId = dsDangKy.map((d) => d.hocVienId);
  const [dsLan, dsNop, dsGiaHan, daPheDuyet] = await Promise.all([
    prisma.lanLamTracNghiem.findMany({ where: { khoaId, hocVienId: { in: dsHocVienId } }, select: { baiId: true, hocVienId: true, nopLuc: true, diem: true } }),
    prisma.baiNopSanPham.findMany({ where: { khoaId, hocVienId: { in: dsHocVienId } }, select: { yeuCauId: true, hocVienId: true, diem: true, nguoiCham: true } }),
    prisma.giaHanDanhGia.findMany({ where: { khoaId, hocVienId: { in: dsHocVienId } } }),
    ketQuaKhoaDaPheDuyet(khoaId),
  ]);
  const tenGv = new Map(dsGiangVien.map((g) => [g.id, g.hoTen]));

  const dsDong: DongHocVien[] = dsDangKy.map((dk) => {
    const o: Record<string, OBai> = {};
    const chuaDat: string[] = [];
    for (const m of dsMuc) {
      const gh = dsGiaHan.find((g) => g.hocVienId === dk.hocVienId && g.mucKey === m.key) ?? null;
      const giaHan = gh ? { soLanThem: gh.soLanThem, moNopLai: gh.moNopLai, hanDen: gh.hanDen, conHieuLuc: trongHanGiaHan(gh) } : null;
      const gvId = giangVienHieuLuc(dsPhanCong, khoaId, m.hocPhanId, dk.lopId);
      const giangVien = gvId ? (tenGv.get(gvId) ?? null) : null;
      if (m.loai === "TN") {
        const cua = dsLan.filter((l) => l.baiId === m.id && l.hocVienId === dk.hocVienId);
        const diemNop = cua.filter((l) => l.nopLuc && l.diem != null).map((l) => Number(l.diem));
        const diem = diemNop.length ? Math.max(...diemNop) : null;
        let trangThai = trangThaiTheoDiem(diem, m.diemDat);
        if (diem === null && cua.some((l) => !l.nopLuc)) trangThai = "DANG_LAM";
        o[m.key] = { trangThai, diem, soLan: cua.length, soLanToiDa: soLanToiDaCuaHocVien(m.soLanToiDa, gh), giangVien, nguoiCham: null, giaHan };
      } else {
        const bn = dsNop.find((b) => b.yeuCauId === m.id && b.hocVienId === dk.hocVienId);
        const diem = bn?.diem == null ? null : Number(bn.diem);
        const trangThai: TrangThaiO = !bn ? "CHUA_LAM" : diem === null ? "CHUA_CHAM" : trangThaiTheoDiem(diem, m.diemDat);
        o[m.key] = { trangThai, diem, soLan: bn ? 1 : 0, soLanToiDa: null, giangVien, nguoiCham: bn?.nguoiCham ?? null, giaHan };
      }
      if (m.diemDat !== null) {
        const t = o[m.key].trangThai;
        if (t === "CHUA_LAM" || t === "DANG_LAM") chuaDat.push(`${m.loai === "TN" ? "Chưa làm" : "Chưa nộp"}: ${m.ten}`);
        else if (t === "CHUA_CHAM") chuaDat.push(`Chưa chấm: ${m.ten}`);
        else if (t === "CHUA_DAT") chuaDat.push(`${m.ten} ${o[m.key].diem}/${m.thangDiem} < ${m.diemDat}`);
      }
    }
    return {
      hocVienId: dk.hocVienId,
      maHocVien: dk.hocVien.maHocVien,
      hoTen: dk.hocVien.hoTen,
      soCCCD: dk.hocVien.soCCCD,
      lopId: dk.lopId,
      lop: dk.lop?.ten ?? null,
      o,
      chuaDat,
    };
  });

  return {
    khoa,
    dsLop: khoa.lopHocs.map((l) => ({ id: l.id, ten: l.ten })),
    dsMuc,
    dsDong,
    daPheDuyet,
    quaBeGiang: daQuaBeGiang(khoa),
  };
}

export type ThongKeBai = {
  muc: MucBai;
  tong: number;
  daLam: number; // TN: đã nộp ít nhất 1 lần; SP: đã nộp
  chuaLam: number;
  dangLam: number;
  daCham: number; // SP
  chuaCham: number; // SP
  dat: number;
  chuaDat: number; // chỉ bài có điểm đạt: chưa làm/chưa chấm/dưới điểm đạt
  diemTB: number | null;
};

/** Thống kê từng bài trên 1 nhóm học viên (cả khóa hoặc 1 lớp). */
export function thongKeTheoBai(dsMuc: MucBai[], dsDong: DongHocVien[]): ThongKeBai[] {
  return dsMuc.map((m) => {
    const ds = dsDong.map((d) => d.o[m.key]);
    const coDiem = ds.filter((x) => x.diem !== null).map((x) => x.diem as number);
    const dem = (...t: TrangThaiO[]) => ds.filter((x) => t.includes(x.trangThai)).length;
    return {
      muc: m,
      tong: ds.length,
      daLam: dem("CHUA_CHAM", "DAT", "CHUA_DAT", "CO_DIEM"),
      chuaLam: dem("CHUA_LAM"),
      dangLam: dem("DANG_LAM"),
      daCham: m.loai === "SP" ? coDiem.length : 0,
      chuaCham: dem("CHUA_CHAM"),
      dat: dem("DAT"),
      chuaDat: m.diemDat === null ? 0 : ds.length - dem("DAT"),
      diemTB: coDiem.length ? Math.round((coDiem.reduce((a, b) => a + b, 0) / coDiem.length) * 100) / 100 : null,
    };
  });
}

export type ThongKeCham = { giangVien: string; daNop: number; daCham: number; chuaCham: number };

/** Tình hình chấm sản phẩm theo giảng viên phụ trách (phân công lớp, không có thì cấp khóa). */
export function thongKeChamTheoGiangVien(dsMuc: MucBai[], dsDong: DongHocVien[]): ThongKeCham[] {
  const theoGv = new Map<string, ThongKeCham>();
  for (const m of dsMuc.filter((x) => x.loai === "SP")) {
    for (const d of dsDong) {
      const o = d.o[m.key];
      if (o.trangThai === "CHUA_LAM") continue;
      const ten = o.giangVien ?? "(chưa phân công giảng viên)";
      const tk = theoGv.get(ten) ?? { giangVien: ten, daNop: 0, daCham: 0, chuaCham: 0 };
      tk.daNop++;
      if (o.trangThai === "CHUA_CHAM") tk.chuaCham++;
      else tk.daCham++;
      theoGv.set(ten, tk);
    }
  }
  return [...theoGv.values()].sort((a, b) => b.chuaCham - a.chuaCham || a.giangVien.localeCompare(b.giangVien, "vi"));
}

// ---------------- gia hạn riêng từng học viên ----------------

export class GiaHanKhongHopLeError extends Error {
  constructor(msg: string) {
    super(msg);
  }
}

export type GiaHanInput = {
  mucKey: string;
  // TN: số lượt làm thêm (0-20)
  soLanThem?: number;
  // SP: mở nộp lại (kể cả bài đã chấm)
  moNopLai?: boolean;
  // "yyyy-mm-dd": được làm/nộp đến hết ngày này kể cả khi đã qua ngày bế giảng
  hanDen?: string | null;
  lyDo: string;
};

/**
 * Gia hạn cho nhiều học viên cùng lúc ở 1 bài: chỉ học viên được mở mới làm lại được. Lượt thêm cộng dồn
 * qua các lần cấp; hạn lấy theo lần cấp mới nhất (để trống thì giữ hạn cũ). Bắt buộc lý do; không gia hạn
 * khi kết quả khóa đã phê duyệt; khóa đã qua ngày bế giảng thì phải có hạn. Mỗi học viên ghi 1 dòng nhật ký.
 */
export async function giaHanDanhGiaLo(khoaId: string, hocVienIds: string[], input: GiaHanInput, nguoi: NguoiThucHien = HE_THONG) {
  const ids = chuanHoaDanhSachId(hocVienIds);
  const khoa = await prisma.khoa.findUnique({ where: { id: khoaId }, include: { chuongTrinh: true } });
  if (!khoa) throw new LoKhongHopLeError("Không tìm thấy khóa");
  if (khoa.chuongTrinh.phuongThucDangKys.includes("CHI_DU_THI")) throw new LoKhongHopLeError("Khóa chỉ dự thi không có bài làm trực tuyến");
  if (await ketQuaKhoaDaPheDuyet(khoaId)) throw new LoKhongHopLeError("Kết quả khóa đã phê duyệt - không gia hạn bài làm");
  const lyDo = input.lyDo?.trim();
  if (!lyDo) throw new LoKhongHopLeError("Nhập lý do gia hạn");

  const m = /^(TN|SP)-(.+)$/.exec(input.mucKey ?? "");
  if (!m) throw new LoKhongHopLeError("Chưa chọn bài trắc nghiệm/sản phẩm");
  const loai = m[1] as "TN" | "SP";
  const bai =
    loai === "TN"
      ? await prisma.baiTracNghiem.findUnique({ where: { id: m[2] }, include: { hocPhan: true } })
      : await prisma.yeuCauSanPham.findUnique({ where: { id: m[2] }, include: { hocPhan: true } });
  if (!bai || bai.hocPhan.chuongTrinhId !== khoa.chuongTrinhId) throw new LoKhongHopLeError("Bài không thuộc chương trình của khóa");

  const soLanThem = loai === "TN" ? Math.trunc(Number(input.soLanThem ?? 0)) : 0;
  if (!Number.isFinite(soLanThem) || soLanThem < 0 || soLanThem > 20) throw new LoKhongHopLeError("Số lượt thêm là số nguyên từ 0 đến 20");
  const moNopLai = loai === "SP" && Boolean(input.moNopLai);
  const hanDen = input.hanDen?.trim() || null;
  if (hanDen !== null) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(hanDen)) throw new LoKhongHopLeError("Hạn gia hạn không hợp lệ");
    if (cuoiNgayVN(hanDen) < new Date()) throw new LoKhongHopLeError("Hạn gia hạn không được trước hôm nay");
  }
  if (!soLanThem && !moNopLai && !hanDen) {
    throw new LoKhongHopLeError(loai === "TN" ? "Nhập số lượt làm thêm hoặc hạn gia hạn" : "Chọn mở nộp lại hoặc nhập hạn gia hạn");
  }
  if (daQuaBeGiang(khoa) && !hanDen) {
    const conHan = await prisma.giaHanDanhGia.count({ where: { khoaId, mucKey: input.mucKey, hocVienId: { in: ids }, hanDen: { gte: new Date() } } });
    if (conHan < ids.length) throw new LoKhongHopLeError(`Khóa đã qua ngày bế giảng (${ngayVN(khoa.thoiGianBeGiang)}) - nhập hạn gia hạn để học viên làm được`);
  }

  const dsDangKy = await prisma.dangKyHoc.findMany({ where: { khoaId, hocVienId: { in: ids } }, include: { hocVien: true } });
  const thieu = ids.length - dsDangKy.length;
  return xuLyLo(
    dsDangKy,
    (dk) => dk.hocVien.hoTen,
    async (dk) => {
      if (dk.trangThai !== "CHINH_THUC") throw new GiaHanKhongHopLeError("chỉ gia hạn cho học viên chính thức");
      await prisma.$transaction(async (tx) => {
        await tx.giaHanDanhGia.upsert({
          where: { khoaId_hocVienId_mucKey: { khoaId, hocVienId: dk.hocVienId, mucKey: input.mucKey } },
          create: { khoaId, hocVienId: dk.hocVienId, mucKey: input.mucKey, soLanThem, moNopLai, hanDen: hanDen ? new Date(hanDen) : null, lyDo, nguoiCap: nguoi.nguoiThucHienTen },
          update: {
            soLanThem: { increment: soLanThem },
            ...(moNopLai ? { moNopLai: true } : {}),
            ...(hanDen ? { hanDen: new Date(hanDen) } : {}),
            lyDo,
            nguoiCap: nguoi.nguoiThucHienTen,
          },
        });
        const noiDung = [soLanThem && `thêm ${soLanThem} lượt`, moNopLai && "mở nộp lại", hanDen && `hạn đến ${hanDen}`].filter(Boolean).join(", ");
        await ghiThaoTac(nguoi, "GIA_HAN_DANH_GIA", "GiaHanDanhGia", dk.hocVienId, `Khóa ${khoa.maKhoa}, ${dk.hocVien.hoTen} - ${bai.tieuDe}: ${noiDung}. Lý do: ${lyDo}`, tx);
      });
    },
    thieu,
  );
}

/** Thu hồi gia hạn của các học viên ở 1 bài (cấp nhầm): học viên trở lại theo số lần/ngày bế giảng chung. */
export async function thuHoiGiaHanLo(khoaId: string, hocVienIds: string[], mucKey: string, nguoi: NguoiThucHien = HE_THONG) {
  const ids = chuanHoaDanhSachId(hocVienIds);
  const khoa = await prisma.khoa.findUnique({ where: { id: khoaId } });
  if (!khoa) throw new LoKhongHopLeError("Không tìm thấy khóa");
  if (!/^(TN|SP)-.+$/.test(mucKey ?? "")) throw new LoKhongHopLeError("Chưa chọn bài trắc nghiệm/sản phẩm");
  const dsGiaHan = await prisma.giaHanDanhGia.findMany({ where: { khoaId, mucKey, hocVienId: { in: ids } }, include: { hocVien: true } });
  return xuLyLo(dsGiaHan, (g) => g.hocVien.hoTen, async (g) => {
    await prisma.$transaction(async (tx) => {
      await tx.giaHanDanhGia.delete({ where: { id: g.id } });
      await ghiThaoTac(nguoi, "THU_HOI_GIA_HAN_DANH_GIA", "GiaHanDanhGia", g.hocVienId, `Khóa ${khoa.maKhoa}, ${g.hocVien.hoTen} - ${mucKey}`, tx);
    });
  });
}
