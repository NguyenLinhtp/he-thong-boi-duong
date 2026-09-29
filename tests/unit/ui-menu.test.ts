import { describe, expect, it } from "vitest";
import { MENU, menuTheoQuyen, mucDangChon, trangMacDinh } from "@/components/layout/menu";

describe("Menu điều hướng theo quyền", () => {
  it("chỉ hiện mục có quyền (maCN), bỏ nhóm rỗng", () => {
    const menu = menuTheoQuyen({ maCNDuocPhep: ["BC-03", "HP-05", "CT-05"], vaiTros: ["CAN_BO_TAI_CHINH"] });
    expect(menu.map((n) => n.ma)).toEqual(["chuong-trinh", "hoc-phi", "bao-cao"]);
    expect(menu.find((n) => n.ma === "bao-cao")!.muc.map((m) => m.maCN)).toEqual(["BC-03"]);
  });

  it("chặn: không có quyền nào thì menu rỗng, không có trang mặc định", () => {
    const menu = menuTheoQuyen({ maCNDuocPhep: [], vaiTros: ["HOC_VIEN"] });
    expect(menu).toEqual([]);
    expect(trangMacDinh(menu)).toBeNull();
  });

  it("chặn: mục dành riêng vai trò không hiện cho vai trò khác dù cùng mã CN", () => {
    // GD-04: học viên thấy học liệu phía học viên, không thấy màn hình tải lên của giảng viên
    const hv = menuTheoQuyen({ maCNDuocPhep: ["GD-04", "KQ-05"], vaiTros: ["HOC_VIEN"] });
    const hrefs = hv.flatMap((n) => n.muc.map((m) => m.href));
    expect(hrefs).toContain("/hoc-tap");
    expect(hrefs).not.toContain("/giang-vien/hoc-lieu");

    // DVLK-04: cán bộ đào tạo có mã nhưng không phải tài khoản đơn vị liên kết
    const cb = menuTheoQuyen({ maCNDuocPhep: ["DVLK-01", "DVLK-04"], vaiTros: ["CAN_BO_QUAN_LY_DAO_TAO"] });
    expect(cb.flatMap((n) => n.muc.map((m) => m.href))).toEqual(["/don-vi-lien-ket"]);
  });

  it("trang mặc định: dashboard nếu có BC-01, không thì mục đầu tiên được phép", () => {
    expect(trangMacDinh(menuTheoQuyen({ maCNDuocPhep: ["CT-05", "BC-01"], vaiTros: [] }))).toBe("/bao-cao");
    expect(trangMacDinh(menuTheoQuyen({ maCNDuocPhep: ["QT-01", "QT-02"], vaiTros: ["ADMIN"] }))).toBe("/quan-tri/tai-khoan");
  });

  it("mục đang chọn theo tiền tố dài nhất, trang chi tiết thuộc module cha", () => {
    expect(mucDangChon(MENU, "/bao-cao").muc?.maCN).toBe("BC-01");
    expect(mucDangChon(MENU, "/bao-cao/dao-tao").nhom?.ma).toBe("bao-cao");
    expect(mucDangChon(MENU, "/don-vi-lien-ket/hop-dong/abc").muc?.maCN).toBe("DVLK-03");
    expect(mucDangChon(MENU, "/khoa-hoc/abc/hoc-phi").nhom?.ma).toBe("khoa-hoc");
    expect(mucDangChon(MENU, "/hoc-phi/phieu-thu/abc").nhom?.ma).toBe("hoc-phi");
    // không nhầm tiền tố chuỗi: /bao-caox không thuộc /bao-cao
    expect(mucDangChon(MENU, "/bao-caox").nhom).toBeNull();
  });

  it("mọi mục menu trỏ tới mã CN có trong đặc tả", async () => {
    const { default: dacTa } = await import("../../docs/functions.json");
    const maHopLe = new Set((dacTa as { ma_cn: string }[]).map((f) => f.ma_cn));
    for (const m of MENU.flatMap((n) => n.muc)) expect(maHopLe, m.href).toContain(m.maCN);
  });
});
