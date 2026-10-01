/**
 * Form đăng ký cấu hình theo chương trình/khóa (bổ sung 30/09/2026 - HV-01/04/05/11/12).
 * Module thuần (không truy cập CSDL) - dùng chung cho trình biên tập cấu hình,
 * form đăng ký phía trình duyệt và kiểm tra phía máy chủ.
 *
 * - Họ tên + CCCD luôn có (định danh học viên - HV-08), không nằm trong cấu hình.
 * - Trường có sẵn (ghi vào hồ sơ học viên): bật/tắt, bắt buộc, danh sách chọn
 *   sẵn (đơn vị công tác), giá trị mặc định/cố định; không đổi kiểu, không xóa.
 * - Trường tùy chỉnh (lưu kèm hồ sơ đăng ký): chữ, số, ngày, danh sách chọn, tệp minh chứng.
 */

export type KieuTruong = "VAN_BAN" | "SO" | "NGAY" | "LUA_CHON" | "TEP";

export const NHAN_KIEU_TRUONG: Record<KieuTruong, string> = {
  VAN_BAN: "Chữ",
  SO: "Số",
  NGAY: "Ngày",
  LUA_CHON: "Danh sách chọn",
  TEP: "Tệp minh chứng",
};

export const MA_TRUONG_CO_SAN = ["ngaySinh", "soDienThoai", "email", "donViCongTac", "chucDanhHocViId"] as const;
export type MaTruongCoSan = (typeof MA_TRUONG_CO_SAN)[number];

export type TruongForm = {
  ma: string;
  nhan: string;
  kieu: KieuTruong;
  coSan: boolean;
  hien: boolean;
  batBuoc: boolean;
  // LUA_CHON: các lựa chọn; donViCongTac: có lựa chọn thì học viên chọn thay vì gõ tự do
  luaChon: string[];
  // giá trị điền sẵn; coDinh = học viên không sửa được (máy chủ luôn ghi giá trị này)
  macDinh: string | null;
  coDinh: boolean;
  goiY: string | null;
};

/**
 * (bổ sung 01/10/2026) cách định danh thí sinh: CCCD = họ tên + CCCD tự nhập (mặc định);
 * MA_SINH_VIEN = nhập mã sinh viên, hệ thống tra danh sách sinh viên đã import (HV-03)
 * để lấy họ tên/CCCD/lớp - chỉ cho chương trình Phương thức 3 (đăng ký dự thi).
 */
export type DinhDanh = "CCCD" | "MA_SINH_VIEN";

export type CauHinhForm = { dinhDanh?: DinhDanh; truong: TruongForm[] };

const KIEU_CO_SAN: Record<MaTruongCoSan, { nhan: string; kieu: KieuTruong }> = {
  ngaySinh: { nhan: "Ngày sinh", kieu: "NGAY" },
  soDienThoai: { nhan: "Số điện thoại", kieu: "VAN_BAN" },
  email: { nhan: "Email", kieu: "VAN_BAN" },
  donViCongTac: { nhan: "Đơn vị công tác", kieu: "VAN_BAN" },
  // lựa chọn lấy từ danh mục DM-02
  chucDanhHocViId: { nhan: "Chức danh, học hàm/học vị", kieu: "LUA_CHON" },
};

export const laTruongCoSan = (ma: string): ma is MaTruongCoSan => (MA_TRUONG_CO_SAN as readonly string[]).includes(ma);

function truongCoSanMacDinh(ma: MaTruongCoSan): TruongForm {
  return {
    ma,
    ...KIEU_CO_SAN[ma],
    coSan: true,
    // form trước đây: ngày sinh, SĐT, email, đơn vị công tác; chưa có chức danh
    hien: ma !== "chucDanhHocViId",
    batBuoc: false,
    luaChon: [],
    macDinh: null,
    coDinh: false,
    goiY: null,
  };
}

/** Form mặc định khi chương trình/khóa chưa cấu hình - giữ đúng form trước khi có tính năng. */
export const CAU_HINH_MAC_DINH: CauHinhForm = { dinhDanh: "CCCD", truong: MA_TRUONG_CO_SAN.map(truongCoSanMacDinh) };

export const SO_TRUONG_TOI_DA = 30;
// (bổ sung 01/10/2026) mã "trường" của tệp minh chứng chuyển khoản lệ phí thi (HV-05) -
// bắt đầu bằng "_" nên không trùng mã trường cấu hình (luôn bắt đầu bằng chữ cái)
export const MA_TEP_NOP_PHI = "_nop_phi";
export const DUOI_MINH_CHUNG = [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"];

/**
 * Chuẩn hóa + kiểm tra cấu hình (dữ liệu từ trình biên tập hoặc CSDL). Trả về
 * lỗi đầu tiên dạng chuỗi thay vì throw để dùng được ở cả client lẫn server.
 * Luôn đủ 5 trường có sẵn (thiếu thì bổ sung ở cuối theo mặc định).
 */
export function chuanHoaCauHinh(tho: unknown): { cauHinh: CauHinhForm } | { loi: string } {
  const ds = (tho as { truong?: unknown })?.truong;
  if (!Array.isArray(ds)) return { loi: "thiếu danh sách trường" };
  if (ds.length > SO_TRUONG_TOI_DA + MA_TRUONG_CO_SAN.length) return { loi: `tối đa ${SO_TRUONG_TOI_DA} trường tùy chỉnh` };

  const ketQua: TruongForm[] = [];
  const daCo = new Set<string>();
  for (const [i, t] of ds.entries()) {
    const x = (t ?? {}) as Record<string, unknown>;
    const ma = String(x.ma ?? "").trim();
    const viTri = `trường thứ ${i + 1}`;
    if (!/^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(ma)) return { loi: `${viTri}: mã trường không hợp lệ` };
    if (daCo.has(ma)) return { loi: `${viTri}: trùng mã "${ma}"` };
    daCo.add(ma);
    const coSan = laTruongCoSan(ma);
    const kieu = coSan ? KIEU_CO_SAN[ma].kieu : (String(x.kieu) as KieuTruong);
    if (!(kieu in NHAN_KIEU_TRUONG)) return { loi: `${viTri}: kiểu trường không hợp lệ` };
    const nhan = String(x.nhan ?? "").trim() || (coSan ? KIEU_CO_SAN[ma].nhan : "");
    if (!nhan) return { loi: `${viTri}: chưa nhập tên trường` };
    if (nhan.length > 150) return { loi: `"${nhan.slice(0, 30)}…": tên trường quá dài` };
    const hien = coSan ? x.hien !== false : true;
    const luaChon = [...new Set((Array.isArray(x.luaChon) ? x.luaChon : []).map((l) => String(l).trim()).filter(Boolean))];
    if (luaChon.some((l) => l.length > 200)) return { loi: `"${nhan}": lựa chọn quá dài` };
    // chức danh lấy từ danh mục; chỉ LUA_CHON tùy chỉnh và đơn vị công tác có danh sách riêng
    const dungLuaChon = kieu === "LUA_CHON" && !coSan ? luaChon : ma === "donViCongTac" ? luaChon : [];
    if (kieu === "LUA_CHON" && !coSan && dungLuaChon.length === 0) return { loi: `"${nhan}": danh sách chọn phải có ít nhất 1 lựa chọn` };
    let macDinh = x.macDinh == null ? null : String(x.macDinh).trim() || null;
    let coDinh = x.coDinh === true;
    if (kieu === "TEP") {
      macDinh = null;
      coDinh = false;
    }
    if (macDinh && dungLuaChon.length > 0 && !dungLuaChon.includes(macDinh)) return { loi: `"${nhan}": giá trị mặc định phải thuộc danh sách chọn` };
    if (macDinh && kieu === "SO" && !Number.isFinite(Number(macDinh))) return { loi: `"${nhan}": giá trị mặc định phải là số` };
    if (macDinh && kieu === "NGAY" && Number.isNaN(Date.parse(macDinh))) return { loi: `"${nhan}": giá trị mặc định phải là ngày` };
    if (coDinh && !macDinh) return { loi: `"${nhan}": trường cố định phải có giá trị` };
    ketQua.push({
      ma,
      nhan,
      kieu,
      coSan,
      hien,
      // trường ẩn không bắt buộc được
      batBuoc: hien && x.batBuoc === true,
      luaChon: dungLuaChon,
      macDinh: hien ? macDinh : null,
      coDinh: hien && coDinh,
      goiY: x.goiY == null ? null : String(x.goiY).trim().slice(0, 300) || null,
    });
  }
  for (const ma of MA_TRUONG_CO_SAN) if (!daCo.has(ma)) ketQua.push(truongCoSanMacDinh(ma));
  const dinhDanh: DinhDanh = (tho as { dinhDanh?: unknown }).dinhDanh === "MA_SINH_VIEN" ? "MA_SINH_VIEN" : "CCCD";
  return { cauHinh: { dinhDanh, truong: ketQua } };
}

/** Đọc cấu hình đã lưu (JSON trong CSDL); hỏng/không có thì null. */
export function docCauHinh(json: unknown): CauHinhForm | null {
  if (json == null) return null;
  const kq = chuanHoaCauHinh(json);
  return "cauHinh" in kq ? kq.cauHinh : null;
}

/** Mã ngẫu nhiên cho trường tùy chỉnh mới. */
export function sinhMaTruong() {
  return `tc_${Math.random().toString(36).slice(2, 10)}`;
}

/** Tên input trong form HTML: trường có sẵn dùng đúng tên cột, trường tùy chỉnh thêm tiền tố. */
export const tenInput = (t: Pick<TruongForm, "ma" | "coSan">) => (t.coSan ? t.ma : `bs_${t.ma}`);

export type TepGui = { ten: string; loai: string; noiDung: Buffer | Uint8Array };

export type DuLieuForm = {
  // giá trị chữ của mọi trường (theo tên input), đã trim
  giaTri: Record<string, string>;
  tep: Record<string, TepGui | undefined>;
};

export type MucBoSung = { ma: string; nhan: string; kieu: KieuTruong; giaTri: string };

export type KetQuaKiemTra = {
  coSan: Partial<Record<MaTruongCoSan, string>>;
  boSung: MucBoSung[];
  tep: { ma: string; nhan: string; tep: TepGui }[];
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Kiểm tra dữ liệu học viên gửi theo cấu hình hiệu lực. hienCo: giá trị hồ sơ
 * đang có (PT2 xác nhận tham gia - trường bắt buộc đã có từ lúc import thì
 * không bắt nhập lại). Trường cố định luôn lấy giá trị cấu hình, bỏ qua dữ liệu gửi lên.
 */
export function kiemTraDuLieu(
  cauHinh: CauHinhForm,
  duLieu: DuLieuForm,
  tuyChon: { dsChucDanhId?: string[]; hienCo?: Partial<Record<MaTruongCoSan, string | null>>; toiDaMb?: number } = {},
): { ketQua: KetQuaKiemTra } | { loi: string } {
  const ketQua: KetQuaKiemTra = { coSan: {}, boSung: [], tep: [] };
  for (const t of cauHinh.truong) {
    if (!t.hien) continue;
    const ten = tenInput(t);
    if (t.kieu === "TEP") {
      const tep = duLieu.tep[ten];
      if (!tep || tep.noiDung.length === 0) {
        if (t.batBuoc) return { loi: `Chưa nộp "${t.nhan}"` };
        continue;
      }
      const duoi = tep.ten.includes(".") ? tep.ten.slice(tep.ten.lastIndexOf(".")).toLowerCase() : "";
      if (!DUOI_MINH_CHUNG.includes(duoi)) return { loi: `"${t.nhan}": chỉ nhận tệp ${DUOI_MINH_CHUNG.join(", ")}` };
      const toiDa = tuyChon.toiDaMb ?? 10;
      if (tep.noiDung.length > toiDa * 1024 * 1024) return { loi: `"${t.nhan}": tệp vượt ${toiDa}MB` };
      ketQua.tep.push({ ma: t.ma, nhan: t.nhan, tep });
      continue;
    }
    const gui = (duLieu.giaTri[ten] ?? "").trim();
    const giaTri = t.coDinh && t.macDinh ? t.macDinh : gui;
    if (!giaTri) {
      const daCo = t.coSan ? tuyChon.hienCo?.[t.ma as MaTruongCoSan] : null;
      if (t.batBuoc && !daCo) return { loi: `Chưa nhập "${t.nhan}"` };
      continue;
    }
    if (giaTri.length > 500) return { loi: `"${t.nhan}": quá dài` };
    if (t.kieu === "SO" && !Number.isFinite(Number(giaTri.replace(",", ".")))) return { loi: `"${t.nhan}" phải là số` };
    if (t.kieu === "NGAY" && Number.isNaN(Date.parse(giaTri))) return { loi: `"${t.nhan}" không phải ngày hợp lệ` };
    if (t.ma === "email" && !EMAIL.test(giaTri)) return { loi: "Email không hợp lệ" };
    if (t.ma === "chucDanhHocViId" && tuyChon.dsChucDanhId && !tuyChon.dsChucDanhId.includes(giaTri))
      return { loi: `"${t.nhan}" không hợp lệ` };
    if (t.luaChon.length > 0 && !t.luaChon.includes(giaTri)) return { loi: `"${t.nhan}": giá trị không thuộc danh sách chọn` };
    if (t.coSan) ketQua.coSan[t.ma as MaTruongCoSan] = giaTri;
    else ketQua.boSung.push({ ma: t.ma, nhan: t.nhan, kieu: t.kieu, giaTri });
  }
  return { ketQua };
}

/**
 * (bổ sung 01/10/2026) Khóa có giai đoạn học (Phương thức 1, 2, 4) cần tài khoản
 * học viên để đăng ký (học trực tuyến, xem điểm, nhận thông báo); khóa chỉ đăng
 * ký dự thi (Phương thức 3) không cần - thí sinh mở lại đơn bằng 4 số cuối CCCD.
 */
export function canTaiKhoanKhiDangKy(phuongThuc: string | null | undefined) {
  return phuongThuc !== "CHI_DU_THI";
}
