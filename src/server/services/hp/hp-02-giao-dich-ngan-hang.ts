import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma/client";
import { layThamSo } from "@/server/services/qt/qt-05-tham-so";
import { ghiThaoTac, type NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";
import { ghiThanhToanTrongGiaoDich, khoaKhoanHocPhi } from "@/server/services/hp/hp-02-thanh-toan";
import { phanBoThanhToan } from "@/server/services/hp/hp-01-thanh-phan-le-phi";

/**
 * (bổ sung 08/10/2026 - HP-02) Thanh toán online: thí sinh quét mã VietQR trên đơn đăng ký và chuyển
 * khoản; dịch vụ theo dõi biến động số dư tài khoản nhận lệ phí (SePay hoặc Casso) gọi webhook của
 * hệ thống cho mỗi giao dịch đến. Hệ thống khớp nội dung chuyển khoản "<mã khóa> <mã SV/mã học viên>"
 * với khoản lệ phí, tự ghi nhận (Đã đóng) và lập biên lai - không cần cán bộ tài chính xác nhận tay.
 * Giao dịch không tự ghi nhận được (sai nội dung, khoản đã đóng, hồ sơ đã hủy...) được giữ lại để
 * cán bộ tài chính xử lý thủ công; mỗi giao dịch chỉ xử lý 1 lần dù dịch vụ gửi lại nhiều lần.
 */

export const NGUOI_TU_DONG: NguoiThucHien = { nguoiThucHienTen: "Tự động (đối soát chuyển khoản ngân hàng)" };
export const HINH_THUC_TU_DONG = "Chuyển khoản (tự động đối soát)";

export type NguonGiaoDich = "SEPAY" | "CASSO" | "THU_NGHIEM";

export type GiaoDichDen = {
  nguon: NguonGiaoDich;
  maGiaoDichNguon: string;
  soTaiKhoan: string | null;
  soTien: number;
  noiDung: string;
  maThamChieu: string | null;
  thoiGian: Date;
  /** false = tiền ra khỏi tài khoản - bỏ qua */
  laTienVao: boolean;
  duLieuGoc: unknown;
};

export class WebhookKhongHopLeError extends Error {}
export class XuLyGiaoDichError extends Error {
  constructor(lyDo: string) {
    super(`Không xử lý được giao dịch: ${lyDo}`);
  }
}

// ---------------- đọc dữ liệu webhook ----------------

/** "YYYY-MM-DD HH:mm:ss" theo giờ Việt Nam (định dạng của SePay/Casso) -> Date. */
function ngayGioVN(s: unknown): Date {
  if (typeof s !== "string" || !s.trim()) return new Date();
  const m = s.trim().match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(:\d{2})?)$/);
  const d = m ? new Date(`${m[1]}T${m[2]}${m[3] ? "" : ":00"}+07:00`) : new Date(s);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

const chuoi = (v: unknown) => (v === null || v === undefined ? "" : String(v)).trim();

/**
 * SePay: {id, gateway, transactionDate, accountNumber, content, transferType: "in"|"out",
 * transferAmount, referenceCode, description, ...}
 */
export function docWebhookSePay(body: unknown): GiaoDichDen[] {
  if (!body || typeof body !== "object") throw new WebhookKhongHopLeError("Dữ liệu webhook không hợp lệ");
  const b = body as Record<string, unknown>;
  if (b.id === undefined || b.transferAmount === undefined) throw new WebhookKhongHopLeError("Thiếu mã giao dịch/số tiền");
  return [
    {
      nguon: "SEPAY",
      maGiaoDichNguon: chuoi(b.id),
      soTaiKhoan: chuoi(b.accountNumber) || null,
      soTien: Number(b.transferAmount),
      noiDung: chuoi(b.content) || chuoi(b.description),
      maThamChieu: chuoi(b.referenceCode) || null,
      thoiGian: ngayGioVN(b.transactionDate),
      laTienVao: chuoi(b.transferType).toLowerCase() !== "out",
      duLieuGoc: body,
    },
  ];
}

/**
 * Casso: {error: 0, data: [...] | {...}} - mỗi giao dịch {id, tid|reference, description, amount
 * (âm = tiền ra), when|transactionDateTime, bank_sub_acc_id|accountNumber}.
 */
export function docWebhookCasso(body: unknown): GiaoDichDen[] {
  if (!body || typeof body !== "object") throw new WebhookKhongHopLeError("Dữ liệu webhook không hợp lệ");
  const data = (body as Record<string, unknown>).data;
  const ds = Array.isArray(data) ? data : data && typeof data === "object" ? [data] : [];
  return ds.map((x) => {
    const g = x as Record<string, unknown>;
    if (g.id === undefined || g.amount === undefined) throw new WebhookKhongHopLeError("Thiếu mã giao dịch/số tiền");
    const soTien = Number(g.amount);
    return {
      nguon: "CASSO" as const,
      maGiaoDichNguon: chuoi(g.id),
      soTaiKhoan: chuoi(g.bank_sub_acc_id ?? g.subAccId ?? g.accountNumber) || null,
      soTien: Math.abs(soTien),
      noiDung: chuoi(g.description),
      maThamChieu: chuoi(g.tid ?? g.reference) || null,
      thoiGian: ngayGioVN(g.when ?? g.transactionDateTime),
      laTienVao: soTien > 0,
      duLieuGoc: x,
    };
  });
}

/**
 * Khóa bí mật của webhook đặt ở biến môi trường NGAN_HANG_WEBHOOK_KEY (không để ở tham số QT-05 vì
 * tham số hiển thị cho quản trị). SePay gửi "Authorization: Apikey <khóa>", Casso gửi "secure-token".
 */
export function xacThucWebhook(nguon: "SEPAY" | "CASSO", headers: Headers): boolean {
  const khoa = process.env.NGAN_HANG_WEBHOOK_KEY;
  if (!khoa) return false;
  const gui =
    nguon === "SEPAY"
      ? (headers.get("authorization") ?? "").replace(/^apikey\s+/i, "").trim()
      : (headers.get("secure-token") ?? "").trim();
  return gui.length > 0 && gui === khoa;
}

// ---------------- khớp nội dung chuyển khoản ----------------

/** Chữ hoa, bỏ mọi ký tự không phải chữ/số - ứng dụng ngân hàng hay thêm/bỏ khoảng trắng, dấu chấm. */
export const rutGon = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "D")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

type KetQuaKhop = { hocPhiId: string } | { loi: string };

/**
 * Tìm khoản lệ phí theo nội dung "<mã khóa> <mã SV hoặc mã học viên>" (như noiDungChuyenKhoanDuThi):
 * ngân hàng có thể chèn tiền tố/hậu tố (vd "MBVCB.123.KH2026006 SV001.CT tu ...") nên tìm chuỗi rút
 * gọn mã khóa + mã người nộp ở bất kỳ vị trí nào; nhiều ứng viên thì lấy chuỗi khớp dài nhất, vẫn
 * nhiều hơn 1 khoản thì không tự ghi nhận.
 */
export async function timKhoanTheoNoiDung(noiDung: string, db: Prisma.TransactionClient = prisma): Promise<KetQuaKhop> {
  const nd = rutGon(noiDung);
  if (!nd) return { loi: "nội dung chuyển khoản trống" };
  const dsKhoa = (await db.khoa.findMany({ where: { trangThai: { not: "HUY" } }, select: { id: true, maKhoa: true } })).filter(
    (k) => rutGon(k.maKhoa).length >= 3 && nd.includes(rutGon(k.maKhoa)),
  );
  if (dsKhoa.length === 0) return { loi: "nội dung chuyển khoản không có mã khóa" };

  const dsHocPhi = await db.hocPhi.findMany({
    where: { khoaId: { in: dsKhoa.map((k) => k.id) } },
    select: { id: true, khoaId: true, hocVien: { select: { maSinhVien: true, maHocVien: true } } },
  });
  let tot: { dai: number; ids: Set<string> } = { dai: 0, ids: new Set() };
  for (const hp of dsHocPhi) {
    const mk = rutGon(dsKhoa.find((k) => k.id === hp.khoaId)!.maKhoa);
    for (const ma of [hp.hocVien.maSinhVien, hp.hocVien.maHocVien]) {
      const m = ma ? rutGon(ma) : "";
      if (!m || !nd.includes(mk + m)) continue;
      const dai = mk.length + m.length;
      if (dai > tot.dai) tot = { dai, ids: new Set([hp.id]) };
      else if (dai === tot.dai) tot.ids.add(hp.id);
    }
  }
  if (tot.ids.size === 0) return { loi: "nội dung có mã khóa nhưng không khớp mã sinh viên/mã học viên nào của khóa" };
  if (tot.ids.size > 1) return { loi: "nội dung khớp nhiều hồ sơ" };
  return { hocPhiId: [...tot.ids][0] };
}

// ---------------- ghi nhận ----------------

const TRANG_THAI_HO_SO_DA_HUY = ["KHONG_HOP_LE", "THOI_HOC", "HUY_QUA_HAN_NOP_GIAY"];
const tien = (n: number) => `${n.toLocaleString("vi-VN")}đ`;

/** Lý do khoản không nhận thanh toán (null = nhận được) + số còn phải nộp. */
async function kiemTraKhoan(tx: Prisma.TransactionClient, hocPhiId: string) {
  const hp = await tx.hocPhi.findUnique({ where: { id: hocPhiId } });
  if (!hp) return { loi: "không tìm thấy khoản lệ phí", conLai: 0 };
  const conLai = Number(hp.soTienPhaiNop) - Number(hp.soTienDaNop);
  if (["CHO_THANH_LY_HOP_DONG", "DA_HOAN_TAT"].includes(hp.trangThai)) return { loi: "khoản qua đơn vị liên kết, không thu cá nhân", conLai };
  if (hp.trangThai === "MIEN_GIAM") return { loi: "khoản đã được miễn giảm", conLai };
  if (hp.trangThai === "DA_NOP_DU" || conLai <= 0) return { loi: "khoản đã đóng đủ trước đó", conLai };
  const dk = await tx.dangKyHoc.findFirst({ where: { hocVienId: hp.hocVienId, khoaId: hp.khoaId }, orderBy: { ngayDangKy: "desc" } });
  if (!dk) return { loi: "không có hồ sơ đăng ký", conLai };
  if (TRANG_THAI_HO_SO_DA_HUY.includes(dk.trangThai)) return { loi: "hồ sơ đăng ký đã bị từ chối/hủy", conLai };
  return { loi: null, conLai };
}

/** Ghi số tiền vào khoản (khóa có thành phần thì phân bổ bắt buộc trước) - 1 biên lai. */
async function ghiVaoKhoan(tx: Prisma.TransactionClient, hocPhiId: string, soTien: number, hinhThuc: string, nguoi: NguoiThucHien) {
  if ((await tx.hocPhiThanhPhan.count({ where: { hocPhiId } })) > 0) {
    return (await phanBoThanhToan(tx, hocPhiId, soTien, hinhThuc, nguoi)).phieuThu;
  }
  const kq = await ghiThanhToanTrongGiaoDich(tx, hocPhiId, {
    soTien,
    hinhThucNop: hinhThuc,
    nguoiXacNhanId: nguoi.nguoiThucHienId,
    nguoiXacNhanTen: nguoi.nguoiThucHienTen,
  });
  return kq.phieuThu;
}

const laLoiTrung = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

/**
 * Xử lý 1 giao dịch đến: lưu lại (mỗi mã giao dịch của 1 nguồn 1 lần), khớp khoản, ghi nhận phần
 * còn phải nộp + lập biên lai. Trả về giao dịch đã lưu (hoặc null nếu là tiền ra - bỏ qua).
 */
export async function xuLyGiaoDichDen(gd: GiaoDichDen) {
  if (!gd.laTienVao) return null;
  if (!gd.maGiaoDichNguon) throw new WebhookKhongHopLeError("Thiếu mã giao dịch");
  const daCo = await prisma.giaoDichNganHang.findUnique({ where: { nguon_maGiaoDichNguon: { nguon: gd.nguon, maGiaoDichNguon: gd.maGiaoDichNguon } } });
  if (daCo) return daCo;

  const goc = {
    nguon: gd.nguon,
    maGiaoDichNguon: gd.maGiaoDichNguon,
    soTaiKhoan: gd.soTaiKhoan,
    soTien: Number.isFinite(gd.soTien) ? gd.soTien : 0,
    noiDung: gd.noiDung.slice(0, 1000),
    maThamChieu: gd.maThamChieu,
    thoiGianGiaoDich: gd.thoiGian,
    duLieuGoc: (gd.duLieuGoc ?? undefined) as Prisma.InputJsonValue | undefined,
  };
  const canXuLy = (ghiChu: string, hocPhiId: string | null = null) =>
    prisma.giaoDichNganHang.create({ data: { ...goc, trangThai: "CAN_XU_LY", ghiChu, hocPhiId } });

  try {
    if (!(goc.soTien > 0)) return await canXuLy("số tiền không hợp lệ");
    const tkNhan = (await layThamSo("NH_SO_TAI_KHOAN"))?.replace(/\s/g, "");
    if (gd.soTaiKhoan && tkNhan && gd.soTaiKhoan.replace(/\s/g, "") !== tkNhan) {
      return await canXuLy(`không phải tài khoản nhận lệ phí (${gd.soTaiKhoan})`);
    }
    if ((await layThamSo("TT_TU_DONG_GHI_NHAN"))?.trim() === "0") return await canXuLy("đang tắt tự động ghi nhận (tham số TT_TU_DONG_GHI_NHAN = 0)");

    const khop = await timKhoanTheoNoiDung(gd.noiDung);
    if ("loi" in khop) return await canXuLy(khop.loi);

    return await prisma.$transaction(async (tx) => {
      // lưu giao dịch trước: dịch vụ gửi trùng đồng thời thì lần sau vướng khóa duy nhất, không ghi 2 lần
      const ban = await tx.giaoDichNganHang.create({ data: { ...goc, trangThai: "CAN_XU_LY", hocPhiId: khop.hocPhiId } });
      await khoaKhoanHocPhi(tx, khop.hocPhiId);
      const kt = await kiemTraKhoan(tx, khop.hocPhiId);
      if (kt.loi) return tx.giaoDichNganHang.update({ where: { id: ban.id }, data: { ghiChu: kt.loi } });

      const ghi = Math.min(goc.soTien, kt.conLai);
      const phieu = await ghiVaoKhoan(tx, khop.hocPhiId, ghi, HINH_THUC_TU_DONG, NGUOI_TU_DONG);
      const thua = goc.soTien - ghi;
      await ghiThaoTac(
        NGUOI_TU_DONG,
        "TU_DONG_GHI_NHAN_CHUYEN_KHOAN",
        "HocPhi",
        khop.hocPhiId,
        `Giao dịch ${gd.nguon} #${gd.maGiaoDichNguon} ${tien(goc.soTien)} "${goc.noiDung}" -> ghi nhận ${tien(ghi)}, biên lai ${phieu.soPhieu}${thua > 0 ? `; thừa ${tien(thua)} chờ xử lý` : ""}`,
        tx,
      );
      return tx.giaoDichNganHang.update({
        where: { id: ban.id },
        data: {
          trangThai: thua > 0 ? "THUA_TIEN" : "DA_GHI_NHAN",
          soTienGhiNhan: ghi,
          soPhieuThu: phieu.soPhieu,
          ghiChu: thua > 0 ? `chuyển thừa ${tien(thua)} so với số còn phải nộp` : null,
        },
      });
    });
  } catch (e) {
    const timLai = () =>
      prisma.giaoDichNganHang.findUniqueOrThrow({ where: { nguon_maGiaoDichNguon: { nguon: gd.nguon, maGiaoDichNguon: gd.maGiaoDichNguon } } });
    if (laLoiTrung(e)) return timLai();
    // lỗi khi ghi nhận (transaction đã hoàn tác): vẫn lưu giao dịch để cán bộ tài chính xử lý, không
    // trả lỗi cho dịch vụ ngân hàng (tránh gửi lại mãi)
    try {
      return await canXuLy(`lỗi khi tự ghi nhận: ${e instanceof Error ? e.message : String(e)}`.slice(0, 500));
    } catch (e2) {
      if (laLoiTrung(e2)) return timLai();
      throw e2;
    }
  }
}

// ---------------- cán bộ tài chính xử lý thủ công ----------------

const CHO_XU_LY = ["CAN_XU_LY", "THUA_TIEN"] as const;

/**
 * Gán giao dịch chưa tự ghi nhận vào khoản của thí sinh (theo mã khóa + mã SV/mã học viên/số CCCD):
 * ghi nhận tối đa số còn phải nộp, lập biên lai; phần thừa ghi chú để hoàn trả.
 */
export async function ganGiaoDichVaoKhoan(id: string, chon: { maKhoa: string; ma: string }, nguoi: NguoiThucHien) {
  const maKhoa = chon.maKhoa.trim();
  const ma = chon.ma.trim();
  if (!maKhoa || !ma) throw new XuLyGiaoDichError("nhập mã khóa và mã sinh viên/mã học viên/số CCCD");
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`, `GDNH:${id}`);
    const gd = await tx.giaoDichNganHang.findUnique({ where: { id } });
    if (!gd) throw new XuLyGiaoDichError("không tìm thấy giao dịch");
    if (gd.trangThai !== "CAN_XU_LY") throw new XuLyGiaoDichError("chỉ gán được giao dịch đang chờ xử lý, chưa ghi nhận");
    const hp = await tx.hocPhi.findFirst({
      where: {
        khoa: { maKhoa },
        hocVien: { OR: [{ maSinhVien: ma }, { maHocVien: ma }, { soCCCD: ma.toUpperCase() }] },
      },
    });
    if (!hp) throw new XuLyGiaoDichError(`không tìm thấy khoản lệ phí của "${ma}" trong khóa ${maKhoa}`);
    await khoaKhoanHocPhi(tx, hp.id);
    const kt = await kiemTraKhoan(tx, hp.id);
    if (kt.loi) throw new XuLyGiaoDichError(kt.loi);
    const ghi = Math.min(Number(gd.soTien), kt.conLai);
    const phieu = await ghiVaoKhoan(tx, hp.id, ghi, "Chuyển khoản (đối soát thủ công)", nguoi);
    const thua = Number(gd.soTien) - ghi;
    await ghiThaoTac(
      nguoi,
      "GAN_GIAO_DICH_NGAN_HANG",
      "HocPhi",
      hp.id,
      `Gán giao dịch ${gd.nguon} #${gd.maGiaoDichNguon} ${tien(Number(gd.soTien))} "${gd.noiDung}" -> ghi nhận ${tien(ghi)}, biên lai ${phieu.soPhieu}${thua > 0 ? `; thừa ${tien(thua)}` : ""}`,
      tx,
    );
    return tx.giaoDichNganHang.update({
      where: { id },
      data: {
        hocPhiId: hp.id,
        soTienGhiNhan: ghi,
        soPhieuThu: phieu.soPhieu,
        trangThai: thua > 0 ? "THUA_TIEN" : "DA_XU_LY",
        ghiChu: thua > 0 ? `chuyển thừa ${tien(thua)} so với số còn phải nộp` : `gán thủ công (trước đó: ${gd.ghiChu ?? "không khớp"})`,
        xuLyBoiTen: nguoi.nguoiThucHienTen,
        xuLyLuc: new Date(),
      },
    });
  });
}

/** Đánh dấu đã xử lý ngoài hệ thống (đã hoàn tiền, không phải lệ phí...) - bắt buộc ghi chú. */
export async function danhDauDaXuLy(id: string, ghiChu: string, nguoi: NguoiThucHien) {
  const nd = ghiChu.trim();
  if (!nd) throw new XuLyGiaoDichError("cần ghi chú cách đã xử lý (vd. đã hoàn tiền thừa, không phải lệ phí)");
  const gd = await prisma.giaoDichNganHang.findUnique({ where: { id } });
  if (!gd) throw new XuLyGiaoDichError("không tìm thấy giao dịch");
  if (!(CHO_XU_LY as readonly string[]).includes(gd.trangThai)) throw new XuLyGiaoDichError("giao dịch không ở trạng thái chờ xử lý");
  const sau = await prisma.giaoDichNganHang.update({
    where: { id },
    data: { trangThai: "DA_XU_LY", ghiChu: `${gd.ghiChu ? `${gd.ghiChu}. ` : ""}Xử lý: ${nd}`, xuLyBoiTen: nguoi.nguoiThucHienTen, xuLyLuc: new Date() },
  });
  await ghiThaoTac(nguoi, "XU_LY_GIAO_DICH_NGAN_HANG", "GiaoDichNganHang", id, `#${gd.maGiaoDichNguon} ${tien(Number(gd.soTien))}: ${nd}`);
  return sau;
}

/**
 * Giao dịch thử nghiệm (chạy thử/UAT, chưa nối dịch vụ ngân hàng): chỉ khi tham số
 * TT_CHO_PHEP_THU_NGHIEM = 1; đi đúng luồng tự động như giao dịch thật.
 */
export async function taoGiaoDichThuNghiem(input: { soTien: number; noiDung: string }, nguoi: NguoiThucHien) {
  if ((await layThamSo("TT_CHO_PHEP_THU_NGHIEM"))?.trim() !== "1") {
    throw new XuLyGiaoDichError("chưa bật giao dịch thử nghiệm (tham số TT_CHO_PHEP_THU_NGHIEM = 1)");
  }
  if (!(input.soTien > 0)) throw new XuLyGiaoDichError("số tiền phải lớn hơn 0");
  const gd = await xuLyGiaoDichDen({
    nguon: "THU_NGHIEM",
    maGiaoDichNguon: crypto.randomUUID(),
    soTaiKhoan: null,
    soTien: input.soTien,
    noiDung: input.noiDung,
    maThamChieu: null,
    thoiGian: new Date(),
    laTienVao: true,
    duLieuGoc: { taoBoi: nguoi.nguoiThucHienTen },
  });
  await ghiThaoTac(nguoi, "TAO_GIAO_DICH_THU_NGHIEM", "GiaoDichNganHang", gd!.id, `${tien(input.soTien)} "${input.noiDung}" -> ${gd!.trangThai}`);
  return gd!;
}

export type LocGiaoDich = { trangThai?: string; tuKhoa?: string };

export async function danhSachGiaoDich(loc: LocGiaoDich = {}) {
  const tk = loc.tuKhoa?.trim();
  return prisma.giaoDichNganHang.findMany({
    where: {
      trangThai: loc.trangThai === "CHO_XU_LY" ? { in: [...CHO_XU_LY] } : (loc.trangThai as never) || undefined,
      ...(tk
        ? {
            OR: [
              { noiDung: { contains: tk, mode: "insensitive" } },
              { maGiaoDichNguon: { contains: tk } },
              { soPhieuThu: { contains: tk } },
              { hocPhi: { hocVien: { OR: [{ maSinhVien: { contains: tk } }, { hoTen: { contains: tk, mode: "insensitive" } }] } } },
            ],
          }
        : {}),
    },
    include: { hocPhi: { include: { hocVien: true, khoa: true } } },
    orderBy: { thoiGianGiaoDich: "desc" },
    take: 2000,
  });
}

export async function demGiaoDichChoXuLy() {
  return prisma.giaoDichNganHang.count({ where: { trangThai: { in: [...CHO_XU_LY] } } });
}
