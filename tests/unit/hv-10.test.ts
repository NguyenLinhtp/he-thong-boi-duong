import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { guiThongBao, danhSachThongBaoCuaHocVien } from "@/server/services/hv/hv-10-thong-bao";
import {
  layCauHinhSmtpHienThi,
  layCauHinhSmtpNoiBo,
  luuCauHinhSmtp,
  ThieuMatKhauSmtpError,
} from "@/server/services/hv/cau-hinh-smtp";

const hocVienTaoTrongTest: string[] = [];
let cauHinhSmtpGocTruoc: Awaited<ReturnType<typeof prisma.cauHinhSmtp.findFirst>> = null;

beforeAll(async () => {
  cauHinhSmtpGocTruoc = await prisma.cauHinhSmtp.findFirst();
});

afterAll(async () => {
  await prisma.hocVien.deleteMany({ where: { id: { in: hocVienTaoTrongTest } } });

  await prisma.cauHinhSmtp.deleteMany();
  if (cauHinhSmtpGocTruoc) {
    // Trả đúng nguyên trạng (kể cả mật khẩu đã mã hóa gốc) nếu trước khi
    // test chạy đã có sẵn 1 cấu hình SMTP thật.
    const { id, host, port, taiKhoan, matKhauMaHoa, tuDiaChi } = cauHinhSmtpGocTruoc;
    await prisma.cauHinhSmtp.create({
      data: { id, host, port, taiKhoan, matKhauMaHoa, tuDiaChi },
    });
  }
});

async function taoHocVien(email: string | null) {
  const hv = await prisma.hocVien.create({
    data: {
      maHocVien: `HV_HV10_${crypto.randomUUID()}`,
      hoTen: "Học viên test HV-10",
      email,
    },
  });
  hocVienTaoTrongTest.push(hv.id);
  return hv;
}

describe("HV-10 gửi thông báo tự động cho học viên", () => {
  it("ghi nhận thông báo, báo lỗi 'chưa có email' khi học viên không có email", async () => {
    const hv = await taoHocVien(null);
    const tb = await guiThongBao(hv.id, "TRUNG_TUYEN", "Tiêu đề", "Nội dung");

    expect(tb?.daGuiEmail).toBe(false);
    expect(tb?.loiGuiEmail).toBe("Người nhận chưa có địa chỉ email");
  });

  it("ghi nhận thông báo, báo lỗi 'chưa cấu hình SMTP' khi chưa có cấu hình", async () => {
    await prisma.cauHinhSmtp.deleteMany();
    const hv = await taoHocVien("hocvien@example.com");
    const tb = await guiThongBao(hv.id, "NHAC_NOP_HO_SO_GIAY", "Tiêu đề", "Nội dung");

    expect(tb?.daGuiEmail).toBe(false);
    expect(tb?.loiGuiEmail).toBe("Chưa cấu hình SMTP");
  });

  it(
    "khi đã cấu hình SMTP nhưng host không kết nối được, ghi lỗi thay vì treo/ném lỗi",
    async () => {
      await luuCauHinhSmtp({
        host: "smtp.invalid.khong-ton-tai.test",
        port: 587,
        taiKhoan: "user@example.com",
        matKhau: "mat-khau-test",
        tuDiaChi: "he-thong@example.com",
      });

      const hv = await taoHocVien("hocvien2@example.com");
      const tb = await guiThongBao(hv.id, "LICH_HOC_LICH_THI", "Tiêu đề", "Nội dung");

      expect(tb?.daGuiEmail).toBe(false);
      expect(tb?.loiGuiEmail).toBeTruthy();
    },
    15_000,
  );

  it("danh sách thông báo của học viên trả về mới nhất trước", async () => {
    const hv = await taoHocVien(null);
    await guiThongBao(hv.id, "TRUNG_TUYEN", "Thông báo 1", "Nội dung 1");
    await guiThongBao(hv.id, "LICH_HOC_LICH_THI", "Thông báo 2", "Nội dung 2");

    const ds = await danhSachThongBaoCuaHocVien(hv.id);
    expect(ds).toHaveLength(2);
    expect(ds[0].tieuDe).toBe("Thông báo 2");
    expect(ds[1].tieuDe).toBe("Thông báo 1");
  });

  it("guiThongBao trả về null khi không tìm thấy học viên (không ném lỗi)", async () => {
    const ketQua = await guiThongBao("khong-ton-tai", "TRUNG_TUYEN", "X", "Y");
    expect(ketQua).toBeNull();
  });
});

describe("HV-10 cấu hình SMTP", () => {
  it("lưu cấu hình lần đầu bắt buộc phải có mật khẩu", async () => {
    await prisma.cauHinhSmtp.deleteMany();
    await expect(
      luuCauHinhSmtp({
        host: "smtp.test.local",
        port: 587,
        taiKhoan: "user",
        matKhau: "",
        tuDiaChi: "a@b.com",
      }),
    ).rejects.toThrow(ThieuMatKhauSmtpError);
  });

  it("lưu và đọc lại mật khẩu đúng qua mã hóa/giải mã, không lộ ra bản hiển thị", async () => {
    await luuCauHinhSmtp({
      host: "smtp.test.local",
      port: 465,
      taiKhoan: "user@test.local",
      matKhau: "mat-khau-bi-mat",
      tuDiaChi: "he-thong@test.local",
    });

    const hienThi = await layCauHinhSmtpHienThi();
    expect(hienThi?.host).toBe("smtp.test.local");
    expect(hienThi).not.toHaveProperty("matKhau");
    expect(hienThi).not.toHaveProperty("matKhauMaHoa");

    const noiBo = await layCauHinhSmtpNoiBo();
    expect(noiBo?.matKhau).toBe("mat-khau-bi-mat");
  });

  it("để trống mật khẩu khi lưu lại giữ nguyên mật khẩu cũ", async () => {
    await luuCauHinhSmtp({
      host: "smtp.test.local",
      port: 465,
      taiKhoan: "user@test.local",
      matKhau: "mat-khau-ban-dau",
      tuDiaChi: "he-thong@test.local",
    });

    await luuCauHinhSmtp({
      host: "smtp.moi.test.local",
      port: 25,
      taiKhoan: "user2@test.local",
      matKhau: "",
      tuDiaChi: "he-thong2@test.local",
    });

    const noiBo = await layCauHinhSmtpNoiBo();
    expect(noiBo?.host).toBe("smtp.moi.test.local");
    expect(noiBo?.matKhau).toBe("mat-khau-ban-dau");
  });
});
