import type { VaiTro } from "@/generated/prisma/client";

/**
 * Menu điều hướng khu nghiệp vụ: top bar theo module lớn + dải tab con của
 * module đang chọn (tham khảo taphuan.csdl.edu.vn - đặc tả mục 3.5).
 *
 * Menu chỉ để điều hướng: mục nào hiện ra phụ thuộc quyền (maCN) của phiên,
 * còn chặn truy cập thật vẫn nằm ở requirePermission() của từng route.
 */
export type MucMenu = {
  href: string;
  nhan: string;
  maCN: string;
  // mục dành riêng cho 1 số vai trò (vd. học liệu phía giảng viên / học viên
  // cùng mã GD-04 nhưng khác màn hình)
  vaiTro?: VaiTro[];
};

export type NhomMenu = {
  ma: string;
  nhan: string;
  // tiền tố URL thuộc module dù không có mục menu riêng (trang chi tiết)
  tienTo?: string[];
  muc: MucMenu[];
};

export const MENU: NhomMenu[] = [
  {
    ma: "tong-quan",
    nhan: "Tổng quan",
    muc: [{ href: "/bao-cao", nhan: "Dashboard", maCN: "BC-01" }],
  },
  {
    ma: "chuong-trinh",
    nhan: "Chương trình",
    muc: [{ href: "/chuong-trinh", nhan: "Chương trình bồi dưỡng", maCN: "CT-05" }],
  },
  {
    ma: "khoa-hoc",
    nhan: "Khóa học",
    muc: [{ href: "/khoa-hoc", nhan: "Khóa bồi dưỡng", maCN: "KH-01" }],
  },
  {
    ma: "hoc-vien",
    nhan: "Học viên",
    muc: [{ href: "/hoc-vien", nhan: "Hồ sơ học viên", maCN: "HV-08" }],
  },
  {
    ma: "giang-day",
    nhan: "Giảng dạy",
    tienTo: ["/giang-vien"],
    muc: [
      { href: "/giang-vien/buoi-hoc", nhan: "Buổi học & điểm danh", maCN: "GD-01" },
      { href: "/giang-vien/nhap-diem", nhan: "Nhập điểm", maCN: "KQ-01" },
      { href: "/giang-vien/hoc-lieu", nhan: "Học liệu", maCN: "GD-04", vaiTro: ["GIANG_VIEN"] },
    ],
  },
  {
    ma: "hoc-tap",
    nhan: "Học tập",
    muc: [
      { href: "/ket-qua/ca-nhan", nhan: "Kết quả học tập", maCN: "KQ-05" },
      { href: "/giang-day/hoc-lieu", nhan: "Học liệu", maCN: "GD-04", vaiTro: ["HOC_VIEN"] },
    ],
  },
  {
    ma: "hoc-phi",
    nhan: "Học phí",
    tienTo: ["/hoc-phi"],
    muc: [{ href: "/hoc-phi/bao-cao", nhan: "Doanh thu & công nợ", maCN: "HP-05" }],
  },
  {
    ma: "chung-chi",
    nhan: "Chứng chỉ",
    tienTo: ["/chung-chi"],
    muc: [{ href: "/chung-chi/so-cap", nhan: "Sổ cấp văn bằng", maCN: "CC-04" }],
  },
  {
    ma: "lien-ket",
    nhan: "Liên kết",
    muc: [
      { href: "/don-vi-lien-ket", nhan: "Đơn vị liên kết", maCN: "DVLK-01" },
      { href: "/don-vi-lien-ket/hop-dong", nhan: "Hợp đồng", maCN: "DVLK-03" },
      { href: "/don-vi-lien-ket/bao-cao", nhan: "Công nợ & doanh thu", maCN: "DVLK-07" },
      { href: "/dvlk/dang-ky", nhan: "Đăng ký học viên", maCN: "HV-11", vaiTro: ["CAN_BO_DON_VI_LIEN_KET"] },
      { href: "/dvlk/ho-so", nhan: "Hồ sơ đã tiếp nhận", maCN: "DVLK-04", vaiTro: ["CAN_BO_DON_VI_LIEN_KET"] },
    ],
  },
  {
    ma: "bao-cao",
    nhan: "Báo cáo",
    muc: [
      { href: "/bao-cao/dao-tao", nhan: "Hoạt động đào tạo", maCN: "BC-02" },
      { href: "/bao-cao/tai-chinh", nhan: "Tài chính học phí", maCN: "BC-03" },
      { href: "/bao-cao/mau-bieu", nhan: "Mẫu gửi cấp trên", maCN: "BC-04" },
      { href: "/bao-cao/ho-so-luu-tru", nhan: "Hồ sơ lưu trữ", maCN: "BC-05" },
    ],
  },
  {
    ma: "danh-muc",
    nhan: "Danh mục",
    muc: [
      { href: "/danh-muc/don-vi", nhan: "Đơn vị", maCN: "DM-01" },
      { href: "/danh-muc/chuc-danh", nhan: "Chức danh, học hàm/học vị", maCN: "DM-02" },
      { href: "/danh-muc/loai-hinh", nhan: "Loại hình bồi dưỡng", maCN: "DM-03" },
      { href: "/danh-muc/phong-hoc", nhan: "Phòng học", maCN: "DM-04" },
      { href: "/danh-muc/dot-tuyen-sinh", nhan: "Đợt tuyển sinh", maCN: "DM-05" },
    ],
  },
  {
    ma: "quan-tri",
    nhan: "Quản trị",
    muc: [
      { href: "/quan-tri/tai-khoan", nhan: "Tài khoản", maCN: "QT-01" },
      { href: "/quan-tri/phan-quyen", nhan: "Phân quyền", maCN: "QT-02" },
      { href: "/quan-tri/nhat-ky", nhan: "Nhật ký thao tác", maCN: "QT-03" },
      { href: "/quan-tri/sao-luu", nhan: "Sao lưu", maCN: "QT-04" },
      { href: "/quan-tri/tham-so", nhan: "Tham số", maCN: "QT-05" },
      { href: "/quan-tri/cau-hinh-smtp", nhan: "Email thông báo", maCN: "HV-10" },
    ],
  },
];

/** Menu rút gọn theo phiên: bỏ mục không có quyền, bỏ nhóm rỗng. */
export function menuTheoQuyen(
  phien: { maCNDuocPhep: string[]; vaiTros: VaiTro[] },
  menu: NhomMenu[] = MENU,
): NhomMenu[] {
  const quyen = new Set(phien.maCNDuocPhep);
  return menu
    .map((nhom) => ({
      ...nhom,
      muc: nhom.muc.filter(
        (m) => quyen.has(m.maCN) && (!m.vaiTro || m.vaiTro.some((v) => phien.vaiTros.includes(v))),
      ),
    }))
    .filter((nhom) => nhom.muc.length > 0);
}

const khopTienTo = (duongDan: string, tienTo: string) =>
  duongDan === tienTo || duongDan.startsWith(tienTo.endsWith("/") ? tienTo : tienTo + "/");

/**
 * Nhóm và mục đang chọn theo URL: mục có href khớp tiền tố dài nhất thắng
 * (/bao-cao/dao-tao thuộc Báo cáo chứ không thuộc Dashboard /bao-cao).
 */
export function mucDangChon(
  menu: NhomMenu[],
  duongDan: string,
): { nhom: NhomMenu | null; muc: MucMenu | null } {
  let tot: { nhom: NhomMenu; muc: MucMenu | null; doDai: number } | null = null;
  for (const nhom of menu) {
    for (const muc of nhom.muc) {
      if (khopTienTo(duongDan, muc.href) && (!tot || muc.href.length > tot.doDai))
        tot = { nhom, muc, doDai: muc.href.length };
    }
    for (const t of nhom.tienTo ?? []) {
      if (khopTienTo(duongDan, t) && (!tot || t.length > tot.doDai)) tot = { nhom, muc: null, doDai: t.length };
    }
  }
  return { nhom: tot?.nhom ?? null, muc: tot?.muc ?? null };
}

/** Trang đích sau đăng nhập: dashboard nếu có quyền, không thì mục đầu tiên. */
export function trangMacDinh(menu: NhomMenu[]): string | null {
  return menu[0]?.muc[0]?.href ?? null;
}
