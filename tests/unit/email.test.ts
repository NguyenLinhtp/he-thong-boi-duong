import { describe, expect, it } from "vitest";
import { chuanHoaEmail, laEmailHopLe } from "@/lib/email";
import { chuanHoaCauHinh, kiemTraDuLieu, type CauHinhForm } from "@/lib/form-dang-ky";

// (bổ sung 08/10/2026) kiểm tra định dạng email ở form đăng ký và các form hồ sơ

describe("định dạng email", () => {
  it.each(["ten@gmail.com", "Nguyen.Van_A+1@ued.udn.vn", "a-b@sub.truong-hoc.edu.vn", " ten@gmail.com "])("hợp lệ: %s", (e) => {
    expect(laEmailHopLe(e)).toBe(true);
  });

  it.each([
    "ten@gmail",
    "ten@gmail..com",
    "ten@gmail,com",
    "tên@gmail.com",
    "ten@@gmail.com",
    "ten@gmail.c",
    ".ten@gmail.com",
    "ten.@gmail.com",
    "te..n@gmail.com",
    "ten gmail@gmail.com",
    "ten@-gmail.com",
    "ten@gmail-.com",
    "@gmail.com",
    "ten@",
    `${"a".repeat(65)}@gmail.com`,
  ])("sai: %s", (e) => {
    expect(laEmailHopLe(e)).toBe(false);
  });

  it("chuẩn hóa: bỏ khoảng trắng 2 đầu, viết thường", () => {
    expect(chuanHoaEmail("  Ten@Gmail.COM ")).toBe("ten@gmail.com");
  });
});

describe("form đăng ký: email có sẵn và trường tùy chỉnh tên có chữ email", () => {
  const c = (
    chuanHoaCauHinh({
      truong: [
        { ma: "email", hien: true, batBuoc: true },
        { ma: "emailCoQuan", nhan: "Email cơ quan", kieu: "VAN_BAN", hien: true },
        { ma: "ghiChu", nhan: "Ghi chú", kieu: "VAN_BAN", hien: true },
      ],
    }) as { cauHinh: CauHinhForm }
  ).cauHinh;
  const kiem = (giaTri: Record<string, string>) => {
    const kq = kiemTraDuLieu(c, { giaTri, tep: {} });
    return "loi" in kq ? kq.loi : kq.ketQua;
  };

  it("chặn email sai định dạng kèm ví dụ; trường tùy chỉnh 'Email cơ quan' cũng kiểm tra; trường khác không", () => {
    expect(kiem({ email: "ten@gmail" })).toBe('"Email" chưa đúng định dạng email (ví dụ: ten@gmail.com)');
    expect(kiem({ email: "ten@gmail.com", bs_emailCoQuan: "phongdt@ued" })).toMatch(/"Email cơ quan" chưa đúng định dạng/);
    const ok = kiem({ email: " Ten@Gmail.com ", bs_emailCoQuan: "PDT@ued.udn.vn", bs_ghiChu: "không phải @email" }) as {
      coSan: Record<string, string>;
      boSung: { ma: string; giaTri: string }[];
    };
    expect(ok.coSan.email).toBe("ten@gmail.com");
    expect(ok.boSung.find((b) => b.ma === "emailCoQuan")?.giaTri).toBe("pdt@ued.udn.vn");
    expect(ok.boSung.find((b) => b.ma === "ghiChu")?.giaTri).toBe("không phải @email");
  });
});
