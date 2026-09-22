import { describe, expect, it } from "vitest";
import { kiemTraQuyen, KhongCoQuyenError, ChuaDangNhapError } from "@/lib/auth/loi";
import type { PhienDangNhap } from "@/lib/auth/permissions";

function phien(maCNDuocPhep: string[]): PhienDangNhap {
  return { userId: "u1", hoTen: "Test", vaiTros: ["ADMIN"], maCNDuocPhep };
}

describe("kiemTraQuyen", () => {
  it("cho qua khi phiên có quyền với mã CN", () => {
    const p = phien(["QT-01"]);
    expect(kiemTraQuyen(p, "QT-01")).toBe(p);
  });

  it("ném ChuaDangNhapError khi không có phiên", () => {
    expect(() => kiemTraQuyen(null, "QT-01")).toThrow(ChuaDangNhapError);
  });

  it("ném KhongCoQuyenError khi phiên không có mã CN đó", () => {
    expect(() => kiemTraQuyen(phien(["QT-02"]), "QT-01")).toThrow(KhongCoQuyenError);
  });

  it("hợp quyền của nhiều vai trò (OR) - có quyền nếu bất kỳ vai trò nào cấp", () => {
    // layPhienDangNhap() đã hợp nhất maCNDuocPhep từ mọi vai trò của tài khoản
    // trước khi tới đây, nên 1 tài khoản giữ nhiều vai trò chỉ cần 1 vai trò
    // có quyền là qua được.
    const p = phien(["QT-01", "QT-02", "DM-01"]);
    expect(() => kiemTraQuyen(p, "DM-01")).not.toThrow();
  });
});
