import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { dieuKienChiemCho, daQuaHanDangKy } from "@/server/services/kh/kh-05-trang-thai-si-so";
import { lapPhieuThu } from "@/server/services/hp/hp-04-phieu-thu";
import { apDungLePhiTuDo } from "@/server/services/hp/hp-01-thiet-lap";
import { ghiThaoTac, type NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";
import { layThamSo } from "@/server/services/qt/qt-05-tham-so";
import { taoBangExcel } from "@/server/services/chung/bang-tinh";
import {
  DA_XONG,
  mucThanhPhanChoThiSinh,
  tongHopThanhPhan,
  trangThaiTheoSoTien,
} from "@/server/services/hp/thanh-phan-le-phi-chung";
import { KhongTimThayKhoaError, ThanhPhanLePhiKhongHopLeError } from "@/server/services/hp/loi-hoc-phi";

/**
 * (bổ sung 06/10/2026 - HP-01/HP-02/HV-05) Thành phần lệ phí cấu hình động của khóa dự thi
 * (Phương thức 3), vd. "Đăng ký thi" (bắt buộc) + "Đăng ký ôn thi" (tùy chọn):
 * - mỗi thành phần có mức sinh viên và mức thí sinh tự do (null = như sinh viên);
 * - thí sinh luôn có các thành phần bắt buộc, tick thêm thành phần tùy chọn khi đăng ký
 *   và đổi được (thêm/bỏ phần chưa xác nhận) đến hạn đăng ký;
 * - HocPhi của thí sinh là khoản chung = tổng các HocPhiThanhPhan đã chọn; cán bộ tài chính
 *   xác nhận/hủy theo từng thành phần, mỗi lần xác nhận lập 1 phiếu thu gắn thành phần;
 * - danh sách chính thức dự thi xét thành phần bắt buộc (thanh-phan-le-phi-chung.ts).
 */
export type ThanhPhanNhap = {
  id?: string | null;
  ten: string;
  batBuoc: boolean;
  mucSinhVien: number;
  mucTuDo: number | null;
};

const TOI_DA_THANH_PHAN = 10;

export async function dsThanhPhanLePhi(khoaId: string, db: Pick<typeof prisma, "thanhPhanLePhi"> = prisma) {
  return db.thanhPhanLePhi.findMany({ where: { khoaId }, orderBy: { thuTu: "asc" } });
}

const tien = (n: number) => `${n.toLocaleString("vi-VN")}đ`;

/** Cấu hình (thay toàn bộ) danh sách thành phần lệ phí của khóa. Danh sách rỗng = bỏ chế độ thành phần. */
export async function luuThanhPhanLePhi(khoaId: string, dsNhap: ThanhPhanNhap[], lyDo: string | null | undefined, nguoi: NguoiThucHien) {
  const khoa = await prisma.khoa.findUnique({ where: { id: khoaId }, include: { chuongTrinh: true } });
  if (!khoa) throw new KhongTimThayKhoaError();
  if (khoa.chuongTrinh.phuongThucDangKy !== "CHI_DU_THI") throw new ThanhPhanLePhiKhongHopLeError("chỉ áp dụng cho khóa dự thi (Phương thức 3)");
  const theoDoiTuong = await apDungLePhiTuDo(khoaId);

  const ds = dsNhap.map((t) => ({ ...t, ten: t.ten.trim(), mucTuDo: theoDoiTuong ? t.mucTuDo : null }));
  if (ds.length > TOI_DA_THANH_PHAN) throw new ThanhPhanLePhiKhongHopLeError(`tối đa ${TOI_DA_THANH_PHAN} thành phần`);
  const daGap = new Set<string>();
  for (const t of ds) {
    if (!t.ten) throw new ThanhPhanLePhiKhongHopLeError("tên thành phần không được để trống");
    if (t.ten.length > 100) throw new ThanhPhanLePhiKhongHopLeError(`tên "${t.ten.slice(0, 30)}..." quá dài (tối đa 100 ký tự)`);
    const khoaTen = t.ten.toLowerCase();
    if (daGap.has(khoaTen)) throw new ThanhPhanLePhiKhongHopLeError(`trùng tên thành phần "${t.ten}"`);
    daGap.add(khoaTen);
    if (!Number.isFinite(t.mucSinhVien) || t.mucSinhVien < 0) throw new ThanhPhanLePhiKhongHopLeError(`mức của "${t.ten}" không hợp lệ`);
    if (t.mucTuDo !== null && (!Number.isFinite(t.mucTuDo) || t.mucTuDo < 0)) {
      throw new ThanhPhanLePhiKhongHopLeError(`mức thí sinh tự do của "${t.ten}" không hợp lệ`);
    }
  }
  if (ds.length > 0 && !ds.some((t) => t.batBuoc)) throw new ThanhPhanLePhiKhongHopLeError("phải có ít nhất 1 thành phần bắt buộc (vd. Đăng ký thi)");

  const cu = await dsThanhPhanLePhi(khoaId);
  const theoId = new Map(cu.map((t) => [t.id, t]));
  for (const t of ds) if (t.id && !theoId.has(t.id)) throw new ThanhPhanLePhiKhongHopLeError("thành phần không thuộc khóa");
  const soDangKy = await prisma.dangKyHoc.count({ where: { khoaId } });
  const dsXoa = cu.filter((c) => !ds.some((t) => t.id === c.id));

  if (soDangKy > 0) {
    if ((cu.length === 0) !== (ds.length === 0)) {
      throw new ThanhPhanLePhiKhongHopLeError("khóa đã có thí sinh đăng ký - không chuyển sang/bỏ chế độ thành phần lệ phí được");
    }
    for (const t of ds) {
      const c = t.id ? theoId.get(t.id) : undefined;
      if (!c && t.batBuoc) throw new ThanhPhanLePhiKhongHopLeError(`khóa đã có đăng ký - thành phần mới "${t.ten}" chỉ được là tùy chọn`);
      if (c && c.batBuoc !== t.batBuoc) throw new ThanhPhanLePhiKhongHopLeError(`khóa đã có đăng ký - không đổi bắt buộc/tùy chọn của "${c.ten}"`);
    }
  }
  if (dsXoa.length > 0) {
    const dangDung = await prisma.hocPhiThanhPhan.findFirst({ where: { thanhPhanId: { in: dsXoa.map((c) => c.id) } }, include: { thanhPhan: true } });
    if (dangDung) throw new ThanhPhanLePhiKhongHopLeError(`không xóa được "${dangDung.thanhPhan.ten}" - đã có thí sinh chọn`);
  }
  const doiMuc = ds.some((t) => {
    const c = t.id ? theoId.get(t.id) : undefined;
    return c && (Number(c.mucSinhVien) !== t.mucSinhVien || (c.mucTuDo === null ? null : Number(c.mucTuDo)) !== t.mucTuDo || c.ten !== t.ten);
  });
  if (soDangKy > 0 && doiMuc && !lyDo?.trim()) throw new ThanhPhanLePhiKhongHopLeError("khóa đã có thí sinh đăng ký - cần nhập lý do điều chỉnh");

  return prisma.$transaction(
    async (tx) => {
      const giuLai: string[] = [];
      for (const [i, t] of ds.entries()) {
        const data = { ten: t.ten, batBuoc: t.batBuoc, mucSinhVien: t.mucSinhVien, mucTuDo: t.mucTuDo, thuTu: i };
        const tp = t.id ? await tx.thanhPhanLePhi.update({ where: { id: t.id }, data }) : await tx.thanhPhanLePhi.create({ data: { ...data, khoaId } });
        giuLai.push(tp.id);
      }
      await tx.thanhPhanLePhi.deleteMany({ where: { khoaId, id: { notIn: giuLai } } });

      // mức hiển thị/điều kiện "khóa có thu lệ phí" của khóa = tổng các thành phần bắt buộc
      if (ds.length > 0) {
        const batBuoc = ds.filter((t) => t.batBuoc);
        const tuDo = theoDoiTuong && ds.some((t) => t.mucTuDo !== null) ? batBuoc.reduce((s, t) => s + (t.mucTuDo ?? t.mucSinhVien), 0) : null;
        await tx.khoa.update({
          where: { id: khoaId },
          data: { mucHocPhi: batBuoc.reduce((s, t) => s + t.mucSinhVien, 0), mucHocPhiTuDo: tuDo, ...(doiMuc && lyDo?.trim() ? { lyDoDieuChinhHocPhi: lyDo.trim() } : {}) },
        });
      }

      // đồng bộ số phải nộp các thành phần chưa nộp/còn nợ theo mức mới
      if (doiMuc) {
        const dsDong = await tx.hocPhiThanhPhan.findMany({
          where: { thanhPhan: { khoaId }, trangThai: { in: ["CHUA_NOP", "CON_NO"] } },
          include: { thanhPhan: true, hocPhi: { include: { hocVien: true } } },
        });
        const canTongHop = new Set<string>();
        for (const d of dsDong) {
          const phaiNop = mucThanhPhanChoThiSinh(d.thanhPhan, theoDoiTuong && !d.hocPhi.hocVien.maSinhVien);
          await tx.hocPhiThanhPhan.update({
            where: { id: d.id },
            data: { soTienPhaiNop: phaiNop, trangThai: trangThaiTheoSoTien(phaiNop, Number(d.soTienDaNop)) },
          });
          canTongHop.add(d.hocPhiId);
        }
        for (const id of canTongHop) await capNhatTongHocPhi(tx, id);
      }

      await ghiThaoTac(
        nguoi,
        cu.length === 0 ? "THIET_LAP_THANH_PHAN_LE_PHI" : "DIEU_CHINH_THANH_PHAN_LE_PHI",
        "Khoa",
        khoaId,
        `${khoa.maKhoa}: ` +
          (ds.length === 0
            ? "bỏ thành phần lệ phí"
            : ds.map((t) => `${t.ten}${t.batBuoc ? " (bắt buộc)" : ""} ${tien(t.mucSinhVien)}${t.mucTuDo !== null ? `/tự do ${tien(t.mucTuDo)}` : ""}`).join("; ")) +
          (lyDo?.trim() ? ` - lý do: ${lyDo.trim()}` : ""),
        tx,
      );
      return dsThanhPhanLePhi(khoaId, tx);
    },
    { timeout: 60_000 },
  );
}

/** Cập nhật khoản lệ phí chung (HocPhi) theo các thành phần đã chọn. */
export async function capNhatTongHocPhi(db: Prisma.TransactionClient, hocPhiId: string) {
  const dsDong = await db.hocPhiThanhPhan.findMany({ where: { hocPhiId } });
  if (dsDong.length === 0) return null;
  const t = tongHopThanhPhan(dsDong);
  return db.hocPhi.update({ where: { id: hocPhiId }, data: { soTienPhaiNop: t.phaiNop, soTienDaNop: t.daNop, trangThai: t.trangThai } });
}

/** Chuẩn hóa lựa chọn: luôn gồm thành phần bắt buộc; id lạ thì báo lỗi. */
function chuanHoaLuaChon<T extends { id: string; batBuoc: boolean }>(dsTp: T[], dsChon: string[] | null | undefined): T[] {
  const hopLe = new Set(dsTp.map((t) => t.id));
  for (const id of dsChon ?? []) if (!hopLe.has(id)) throw new ThanhPhanLePhiKhongHopLeError("thành phần đã chọn không thuộc khóa");
  const chon = new Set(dsChon ?? []);
  return dsTp.filter((t) => t.batBuoc || chon.has(t.id));
}

/**
 * Khi thí sinh đăng ký (HV-05): tạo khoản lệ phí chung + các thành phần đã chọn. Trả null nếu
 * khóa không dùng thành phần (để luồng lệ phí 1 mức xử lý như cũ).
 */
export async function taoLePhiTheoThanhPhan(dangKyId: string, dsChon: string[] | null | undefined) {
  const dangKy = await prisma.dangKyHoc.findUnique({ where: { id: dangKyId }, include: { hocVien: true } });
  if (!dangKy) return null;
  const dsTp = await dsThanhPhanLePhi(dangKy.khoaId);
  if (dsTp.length === 0) return null;
  const chon = chuanHoaLuaChon(dsTp, dsChon);
  const laTuDo = (await apDungLePhiTuDo(dangKy.khoaId)) && !dangKy.hocVien.maSinhVien;
  return prisma.$transaction(async (tx) => {
    const hocPhi = await tx.hocPhi.upsert({
      where: { hocVienId_khoaId: { hocVienId: dangKy.hocVienId, khoaId: dangKy.khoaId } },
      create: { hocVienId: dangKy.hocVienId, khoaId: dangKy.khoaId, soTienPhaiNop: 0 },
      update: {},
    });
    for (const tp of chon) {
      await tx.hocPhiThanhPhan.upsert({
        where: { hocPhiId_thanhPhanId: { hocPhiId: hocPhi.id, thanhPhanId: tp.id } },
        create: { hocPhiId: hocPhi.id, thanhPhanId: tp.id, soTienPhaiNop: mucThanhPhanChoThiSinh(tp, laTuDo) },
        update: {},
      });
    }
    return capNhatTongHocPhi(tx, hocPhi.id);
  });
}

/** Các thành phần của 1 khóa kèm lựa chọn + trạng thái của 1 đăng ký (hiện trên đơn, form đổi lựa chọn). */
export async function thanhPhanCuaDangKy(dangKyId: string) {
  const dangKy = await prisma.dangKyHoc.findUnique({ where: { id: dangKyId }, include: { hocVien: true, khoa: true } });
  if (!dangKy) return null;
  const dsTp = await dsThanhPhanLePhi(dangKy.khoaId);
  if (dsTp.length === 0) return null;
  const hocPhi = await prisma.hocPhi.findUnique({
    where: { hocVienId_khoaId: { hocVienId: dangKy.hocVienId, khoaId: dangKy.khoaId } },
    include: { thanhPhans: true },
  });
  const laTuDo = (await apDungLePhiTuDo(dangKy.khoaId)) && !dangKy.hocVien.maSinhVien;
  const theoTp = new Map((hocPhi?.thanhPhans ?? []).map((d) => [d.thanhPhanId, d]));
  const duocDoi =
    dangKy.khoa.trangThai === "DANG_TUYEN_SINH" && !daQuaHanDangKy(dangKy.khoa) && !["KHONG_HOP_LE", "THOI_HOC", "HOAN_THANH"].includes(dangKy.trangThai);
  return {
    duocDoi,
    ds: dsTp.map((tp) => {
      const d = theoTp.get(tp.id);
      return {
        id: tp.id,
        ten: tp.ten,
        batBuoc: tp.batBuoc,
        muc: d ? Number(d.soTienPhaiNop) : mucThanhPhanChoThiSinh(tp, laTuDo),
        daChon: !!d,
        trangThai: d?.trangThai ?? null,
        daNop: d ? Number(d.soTienDaNop) : 0,
        // phần đã xác nhận/đã có tiền thì không bỏ được
        coDinh: tp.batBuoc || (!!d && (DA_XONG.includes(d.trangThai) || Number(d.soTienDaNop) > 0)),
      };
    }),
  };
}

/**
 * Thí sinh mở lại đơn và đổi thành phần đã chọn (HV-05 bổ sung 06/10/2026): đến hạn đăng ký,
 * thêm/bỏ thành phần tùy chọn chưa được xác nhận/chưa có tiền; bắt buộc luôn giữ.
 */
export async function doiThanhPhanDaChon(dangKyId: string, dsChon: string[], nguoi: NguoiThucHien) {
  const tt = await thanhPhanCuaDangKy(dangKyId);
  if (!tt) throw new ThanhPhanLePhiKhongHopLeError("khóa không chia thành phần lệ phí");
  if (!tt.duocDoi) throw new ThanhPhanLePhiKhongHopLeError("đã hết hạn đăng ký hoặc hồ sơ không còn hiệu lực - không đổi lựa chọn được");
  const chon = new Set(chuanHoaLuaChon(tt.ds, dsChon).map((t) => t.id));
  for (const t of tt.ds) if (t.daChon && t.coDinh && !chon.has(t.id)) throw new ThanhPhanLePhiKhongHopLeError(`"${t.ten}" đã được xác nhận lệ phí - không bỏ được`);
  const them = tt.ds.filter((t) => !t.daChon && chon.has(t.id));
  const bo = tt.ds.filter((t) => t.daChon && !chon.has(t.id));
  if (them.length === 0 && bo.length === 0) return tt;

  const dangKy = await prisma.dangKyHoc.findUniqueOrThrow({ where: { id: dangKyId } });
  await prisma.$transaction(async (tx) => {
    const hocPhi = await tx.hocPhi.upsert({
      where: { hocVienId_khoaId: { hocVienId: dangKy.hocVienId, khoaId: dangKy.khoaId } },
      create: { hocVienId: dangKy.hocVienId, khoaId: dangKy.khoaId, soTienPhaiNop: 0 },
      update: {},
    });
    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`, `HP02:${hocPhi.id}`);
    // kiểm tra lại trong khóa: phần định bỏ chưa có tiền (tránh đua với tài chính vừa xác nhận)
    const boLai = await tx.hocPhiThanhPhan.findMany({ where: { hocPhiId: hocPhi.id, thanhPhanId: { in: bo.map((t) => t.id) } } });
    if (boLai.some((d) => Number(d.soTienDaNop) > 0 || DA_XONG.includes(d.trangThai))) {
      throw new ThanhPhanLePhiKhongHopLeError("thành phần định bỏ vừa được xác nhận lệ phí - không bỏ được");
    }
    await tx.hocPhiThanhPhan.deleteMany({ where: { id: { in: boLai.map((d) => d.id) } } });
    for (const t of them) {
      await tx.hocPhiThanhPhan.create({ data: { hocPhiId: hocPhi.id, thanhPhanId: t.id, soTienPhaiNop: t.muc } });
    }
    const sau = await capNhatTongHocPhi(tx, hocPhi.id);
    await ghiThaoTac(
      nguoi,
      "DOI_THANH_PHAN_LE_PHI",
      "DangKyHoc",
      dangKyId,
      [them.length ? `thêm ${them.map((t) => t.ten).join(", ")}` : "", bo.length ? `bỏ ${bo.map((t) => t.ten).join(", ")}` : ""].filter(Boolean).join("; ") +
        (sau ? ` - lệ phí ${tien(Number(sau.soTienPhaiNop))}` : ""),
      tx,
    );
  });
  return thanhPhanCuaDangKy(dangKyId);
}

/**
 * (sửa 07/10/2026) Ghi nhận 1 lần nộp cho 1 hoặc nhiều thành phần của cùng thí sinh: lập ĐÚNG 1
 * biên lai (HP-04) có mỗi thành phần 1 dòng chi tiết, cập nhật khoản chung, ghi nhật ký.
 * soTien null = số còn thiếu của thành phần đó. Dùng trong transaction của người gọi.
 */
export async function ghiNhanCacThanhPhan(
  tx: Prisma.TransactionClient,
  dsNhap: { hocPhiThanhPhanId: string; soTien: number | null }[],
  hinhThucNop: string,
  nguoi: NguoiThucHien,
) {
  if (dsNhap.length === 0) throw new ThanhPhanLePhiKhongHopLeError("chưa chọn thành phần lệ phí");
  const dsMuc: { hocPhiThanhPhanId: string; noiDung: string; soTien: number; trangThai: string }[] = [];
  let hocPhiId: string | null = null;
  for (const { hocPhiThanhPhanId, soTien } of dsNhap) {
    const d = await tx.hocPhiThanhPhan.findUniqueOrThrow({ where: { id: hocPhiThanhPhanId }, include: { thanhPhan: true } });
    if (hocPhiId && d.hocPhiId !== hocPhiId) throw new ThanhPhanLePhiKhongHopLeError("các thành phần phải cùng 1 khoản lệ phí");
    hocPhiId = d.hocPhiId;
    const conThieu = Number(d.soTienPhaiNop) - Number(d.soTienDaNop);
    const nop = soTien ?? conThieu;
    if (!(nop > 0)) throw new ThanhPhanLePhiKhongHopLeError(`"${d.thanhPhan.ten}" không còn số phải thu`);
    const daNop = Number(d.soTienDaNop) + nop;
    const trangThai = trangThaiTheoSoTien(Number(d.soTienPhaiNop), daNop);
    await tx.hocPhiThanhPhan.update({ where: { id: d.id }, data: { soTienDaNop: daNop, trangThai } });
    dsMuc.push({ hocPhiThanhPhanId: d.id, noiDung: d.thanhPhan.ten, soTien: nop, trangThai });
  }
  const tong = dsMuc.reduce((t, m) => t + m.soTien, 0);
  const phieuThu = await lapPhieuThu(
    {
      hocPhiId: hocPhiId!,
      soTien: tong,
      hinhThucNop,
      nguoiLapId: nguoi.nguoiThucHienId,
      nguoiLapTen: nguoi.nguoiThucHienTen,
      dsMuc: dsMuc.map(({ hocPhiThanhPhanId, noiDung, soTien }) => ({ hocPhiThanhPhanId, noiDung, soTien })),
    },
    tx,
  );
  const hocPhi = await capNhatTongHocPhi(tx, hocPhiId!);
  await tx.hocPhi.update({ where: { id: hocPhiId! }, data: { ngayNop: new Date(), hinhThucNop, nguoiXacNhanId: nguoi.nguoiThucHienId ?? null } });
  await ghiThaoTac(
    nguoi,
    "XAC_NHAN_THANH_TOAN",
    "HocPhi",
    hocPhiId!,
    `${dsMuc.map((m) => `${m.noiDung}: nộp ${tien(m.soTien)} -> ${m.trangThai}`).join("; ")} (${hinhThucNop}), biên lai ${phieuThu.soPhieu}, khoản chung -> ${hocPhi?.trangThai}`,
    tx,
  );
  return { phieuThu, hocPhi };
}

/** Ghi nhận 1 thành phần (1 biên lai). */
export async function ghiNhanThanhPhan(
  tx: Prisma.TransactionClient,
  hocPhiThanhPhanId: string,
  soTien: number | null,
  hinhThucNop: string,
  nguoi: NguoiThucHien,
) {
  return ghiNhanCacThanhPhan(tx, [{ hocPhiThanhPhanId, soTien }], hinhThucNop, nguoi);
}

/**
 * Ghi nhận theo khoản chung cho khóa có thành phần (HP-02 "Ghi thanh toán", Excel "Đã đóng"):
 * phân bổ lần lượt vào thành phần bắt buộc trước rồi tùy chọn, theo thứ tự cấu hình.
 * soTien null = đóng đủ mọi phần còn thiếu. (sửa 07/10/2026) cả lần nộp lập chung 1 biên lai.
 */
export async function phanBoThanhToan(tx: Prisma.TransactionClient, hocPhiId: string, soTien: number | null, hinhThucNop: string, nguoi: NguoiThucHien) {
  const dsDong = await tx.hocPhiThanhPhan.findMany({ where: { hocPhiId }, include: { thanhPhan: true } });
  const thuTu = dsDong
    .filter((d) => !DA_XONG.includes(d.trangThai) && Number(d.soTienPhaiNop) > Number(d.soTienDaNop))
    .sort((a, b) => Number(b.thanhPhan.batBuoc) - Number(a.thanhPhan.batBuoc) || a.thanhPhan.thuTu - b.thanhPhan.thuTu);
  let conLai = soTien ?? Infinity;
  const dsNhap: { hocPhiThanhPhanId: string; soTien: number }[] = [];
  for (const d of thuTu) {
    if (conLai <= 0) break;
    const nop = Math.min(conLai, Number(d.soTienPhaiNop) - Number(d.soTienDaNop));
    dsNhap.push({ hocPhiThanhPhanId: d.id, soTien: nop });
    conLai -= nop;
  }
  if (dsNhap.length === 0) throw new ThanhPhanLePhiKhongHopLeError("khoản lệ phí không còn số phải thu");
  if (Number.isFinite(conLai) && conLai > 0) throw new ThanhPhanLePhiKhongHopLeError(`số tiền vượt số còn phải nộp ${tien((soTien ?? 0) - conLai)}`);
  const kq = await ghiNhanCacThanhPhan(tx, dsNhap, hinhThucNop, nguoi);
  return { hocPhi: kq.hocPhi!, phieuThu: kq.phieuThu, dsPhieuThu: [kq.phieuThu] };
}

/**
 * Hủy ghi nhận 1 hoặc nhiều thành phần của cùng thí sinh: số đã nộp về 0. (sửa 07/10/2026) biên
 * lai là chứng từ không sửa được: mọi biên lai có dòng của các thành phần bị hủy chuyển Đã hủy
 * (giữ số); dòng của thành phần KHÔNG bị hủy trên biên lai đó được lập lại thành biên lai mới
 * (ghi "lập thay cho biên lai số ...").
 */
export async function huyGhiNhanCacThanhPhan(tx: Prisma.TransactionClient, dsId: string[], lyDo: string, nguoi: NguoiThucHien) {
  const dsDong = await tx.hocPhiThanhPhan.findMany({ where: { id: { in: dsId } }, include: { thanhPhan: true } });
  if (dsDong.length === 0) throw new ThanhPhanLePhiKhongHopLeError("chưa chọn thành phần lệ phí");
  const hocPhiId = dsDong[0].hocPhiId;
  if (dsDong.some((d) => d.hocPhiId !== hocPhiId)) throw new ThanhPhanLePhiKhongHopLeError("các thành phần phải cùng 1 khoản lệ phí");
  const huy = new Set(dsDong.map((d) => d.id));
  const dsPhieu = await tx.phieuThu.findMany({
    where: { hocPhiId, daHuy: false, chiTiets: { some: { hocPhiThanhPhanId: { in: [...huy] } } } },
    include: { chiTiets: true },
    orderBy: { soPhieu: "asc" },
  });
  await tx.phieuThu.updateMany({
    where: { id: { in: dsPhieu.map((p) => p.id) } },
    data: { daHuy: true, lyDoHuy: lyDo, huyLuc: new Date(), nguoiHuyTen: nguoi.nguoiThucHienTen },
  });
  const phieuThayThe: string[] = [];
  for (const p of dsPhieu) {
    const giuLai = p.chiTiets.filter((c) => !huy.has(c.hocPhiThanhPhanId));
    if (giuLai.length === 0) continue;
    const moi = await lapPhieuThu(
      {
        hocPhiId,
        soTien: giuLai.reduce((t, c) => t + Number(c.soTien), 0),
        hinhThucNop: p.hinhThucNop,
        nguoiLapId: nguoi.nguoiThucHienId,
        nguoiLapTen: nguoi.nguoiThucHienTen,
        dsMuc: giuLai.map((c) => ({ hocPhiThanhPhanId: c.hocPhiThanhPhanId, noiDung: c.noiDung, soTien: Number(c.soTien) })),
        thayChoSoPhieu: p.soPhieu,
      },
      tx,
    );
    phieuThayThe.push(`${moi.soPhieu} (thay ${p.soPhieu})`);
  }
  const tongHuy = dsPhieu.flatMap((p) => p.chiTiets).filter((c) => huy.has(c.hocPhiThanhPhanId)).reduce((t, c) => t + Number(c.soTien), 0);
  await tx.hocPhiThanhPhan.updateMany({ where: { id: { in: [...huy] } }, data: { soTienDaNop: 0, trangThai: "CHUA_NOP" } });
  const hocPhi = await capNhatTongHocPhi(tx, hocPhiId);
  return { dsThanhPhan: dsDong.map((d) => d.thanhPhan), phieuDaHuy: dsPhieu.map((p) => p.soPhieu), phieuThayThe, tongHuy, hocPhi };
}

/** Miễn giảm khoản chung có thành phần: mọi thành phần chưa xong -> Miễn giảm. */
export async function mienGiamThanhPhan(tx: Prisma.TransactionClient, hocPhiId: string) {
  await tx.hocPhiThanhPhan.updateMany({ where: { hocPhiId, trangThai: { in: ["CHUA_NOP", "CON_NO"] } }, data: { trangThai: "MIEN_GIAM" } });
  return capNhatTongHocPhi(tx, hocPhiId);
}

/** Danh sách theo từng thành phần cho cán bộ đào tạo (vd. danh sách ôn thi, danh sách thi). */
export async function danhSachTheoThanhPhan(khoaId: string) {
  const [dsTp, dsDong] = await Promise.all([
    dsThanhPhanLePhi(khoaId),
    prisma.hocPhiThanhPhan.findMany({
      where: { thanhPhan: { khoaId }, hocPhi: { hocVien: { dangKys: { some: dieuKienChiemCho(khoaId) } } } },
      include: { hocPhi: { include: { hocVien: true } } },
      orderBy: [{ hocPhi: { hocVien: { lopSinhHoat: "asc" } } }, { hocPhi: { hocVien: { hoTen: "asc" } } }],
    }),
  ]);
  return dsTp.map((tp) => ({ thanhPhan: tp, ds: dsDong.filter((d) => d.thanhPhanId === tp.id) }));
}

/** Kiểm tra lựa chọn thành phần trước khi tạo hồ sơ đăng ký (không tạo gì). */
export async function kiemTraLuaChonThanhPhan(khoaId: string, dsChon: string[] | null | undefined) {
  const dsTp = await dsThanhPhanLePhi(khoaId);
  if (dsTp.length > 0) chuanHoaLuaChon(dsTp, dsChon);
}

const NHAN_PHI: Record<string, string> = { CHUA_NOP: "Chưa đóng", CON_NO: "Nộp thiếu", DA_NOP_DU: "Đã đóng", MIEN_GIAM: "Miễn giảm" };

/** Excel danh sách thí sinh của 1 thành phần (vd. danh sách ôn thi) cho cán bộ đào tạo. */
export async function xuatExcelTheoThanhPhan(khoaId: string, thanhPhanId: string) {
  const [khoa, ds, tenCoQuan] = await Promise.all([
    prisma.khoa.findUnique({ where: { id: khoaId }, include: { chuongTrinh: true } }),
    danhSachTheoThanhPhan(khoaId),
    layThamSo("CC_TEN_CO_QUAN_CAP"),
  ]);
  const muc = ds.find((x) => x.thanhPhan.id === thanhPhanId);
  if (!khoa || !muc) throw new KhongTimThayKhoaError();
  const noiDung = await taoBangExcel(
    muc.thanhPhan.ten.slice(0, 30),
    [
      (tenCoQuan ?? "CƠ SỞ ĐÀO TẠO, BỒI DƯỠNG").toUpperCase(),
      `DANH SÁCH ${muc.thanhPhan.ten.toUpperCase()}`,
      `${khoa.chuongTrinh.ten} · Mã khóa: ${khoa.maKhoa}`,
    ],
    [
      { tieuDe: "STT", rong: 6 },
      { tieuDe: "Mã hồ sơ", rong: 14 },
      { tieuDe: "Mã sinh viên", rong: 14 },
      { tieuDe: "Họ và tên", rong: 26 },
      { tieuDe: "Số CCCD", rong: 16 },
      { tieuDe: "Lớp sinh hoạt", rong: 14 },
      { tieuDe: "Số điện thoại", rong: 14 },
      { tieuDe: "Lệ phí", rong: 12, so: true },
      { tieuDe: "Trạng thái lệ phí", rong: 14 },
    ],
    muc.ds.map((d, i) => [
      i + 1,
      d.hocPhi.hocVien.maHocVien,
      d.hocPhi.hocVien.maSinhVien ?? "",
      d.hocPhi.hocVien.hoTen,
      d.hocPhi.hocVien.soCCCD ?? "",
      d.hocPhi.hocVien.lopSinhHoat ?? "",
      d.hocPhi.hocVien.soDienThoai ?? "",
      Number(d.soTienPhaiNop),
      d.hocPhi.boQuaKiemTra ? "Bỏ chặn" : (NHAN_PHI[d.trangThai] ?? d.trangThai),
    ]),
  );
  return { tenFile: `${khoa.maKhoa}-${muc.thanhPhan.thuTu + 1}.xlsx`, noiDung };
}
