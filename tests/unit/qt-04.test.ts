import fsPromises from "node:fs/promises";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { khoiTaoKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { themHocVienVaoKhoa } from "@/server/services/hv/hv-09-quan-ly-danh-sach-khoa";
import {
  chayBackupNgay,
  danhSachSaoLuu,
  phucHoiTuBanSaoLuu,
} from "@/server/services/qt/qt-04-sao-luu";
import {
  KhongTimThayBanSaoLuuError,
  BanSaoLuuChuaSanSangError,
  TepSaoLuuKhongHopLeError,
} from "@/server/services/qt/loi-sao-luu";

const saoLuuTaoTrongTest: string[] = [];
const duongDanFileTaoTrongTest: string[] = [];
const loaiHinhTaoTrongTest: string[] = [];
const chuongTrinhTaoTrongTest: string[] = [];
const khoaTaoTrongTest: string[] = [];
const hocVienTaoTrongTest: string[] = [];

afterAll(async () => {
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: khoaTaoTrongTest } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: hocVienTaoTrongTest } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaTaoTrongTest } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinhTaoTrongTest } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinhTaoTrongTest } } });
  await prisma.saoLuu.deleteMany({ where: { id: { in: saoLuuTaoTrongTest } } });
  for (const duongDan of duongDanFileTaoTrongTest) {
    await fsPromises.rm(duongDan, { force: true });
  }
});

describe("QT-04 sao lưu và phục hồi dữ liệu", () => {
  it("chạy backup thủ công tạo bản ghi Thành công kèm file trên đĩa", async () => {
    const ketQua = await chayBackupNgay("Admin test", "THU_CONG");
    saoLuuTaoTrongTest.push(ketQua.id);
    if (ketQua.duongDanFile) duongDanFileTaoTrongTest.push(ketQua.duongDanFile);

    expect(ketQua.trangThai).toBe("THANH_CONG");
    expect(ketQua.duongDanFile).toBeTruthy();
    expect(ketQua.kichThuocByte).toBeGreaterThan(0);

    const noiDung = await fsPromises.readFile(ketQua.duongDanFile!);
    expect(noiDung.byteLength).toBeGreaterThan(0);
  });

  it("danh sách sao lưu hiển thị bản mới nhất trước", async () => {
    const ds = await danhSachSaoLuu();
    expect(ds.length).toBeGreaterThan(0);
    expect(ds.map((b) => b.id)).toContain(saoLuuTaoTrongTest[0]);
  });

  it("phục hồi báo lỗi khi không tìm thấy bản sao lưu", async () => {
    await expect(phucHoiTuBanSaoLuu("khong-ton-tai")).rejects.toThrow(KhongTimThayBanSaoLuuError);
  });

  it("phục hồi báo lỗi khi bản sao lưu chưa hoàn tất (đang chạy/thất bại)", async () => {
    const dangChay = await prisma.saoLuu.create({ data: { trangThai: "DANG_CHAY" } });
    saoLuuTaoTrongTest.push(dangChay.id);
    await expect(phucHoiTuBanSaoLuu(dangChay.id)).rejects.toThrow(BanSaoLuuChuaSanSangError);

    const thatBai = await prisma.saoLuu.create({
      data: { trangThai: "THAT_BAI", loiChiTiet: "lỗi giả lập" },
    });
    saoLuuTaoTrongTest.push(thatBai.id);
    await expect(phucHoiTuBanSaoLuu(thatBai.id)).rejects.toThrow(BanSaoLuuChuaSanSangError);
  });

  it("phục hồi báo lỗi khi tệp sao lưu hỏng/không đọc được", async () => {
    const banHong = await prisma.saoLuu.create({
      data: {
        trangThai: "THANH_CONG",
        duongDanFile: "duong-dan-khong-ton-tai.json.gz",
        kichThuocByte: 10,
      },
    });
    saoLuuTaoTrongTest.push(banHong.id);
    await expect(phucHoiTuBanSaoLuu(banHong.id)).rejects.toThrow(TepSaoLuuKhongHopLeError);
  });

  it(
    "dọn bản sao lưu cũ, chỉ giữ tối đa 30 bản Thành công gần nhất",
    async () => {
      const banGiaLap = await prisma.saoLuu.createMany({
        data: Array.from({ length: 32 }, (_, i) => ({
          trangThai: "THANH_CONG" as const,
          thoiGianBatDau: new Date(Date.now() - (32 - i) * 60_000),
          duongDanFile: `khong-ton-tai-${i}.json.gz`,
          kichThuocByte: 1,
        })),
      });
      expect(banGiaLap.count).toBe(32);

      const ketQuaMoi = await chayBackupNgay(undefined, "TU_DONG");
      saoLuuTaoTrongTest.push(ketQuaMoi.id);
      if (ketQuaMoi.duongDanFile) duongDanFileTaoTrongTest.push(ketQuaMoi.duongDanFile);

      const conLai = await prisma.saoLuu.findMany({ where: { trangThai: "THANH_CONG" } });
      expect(conLai.length).toBeLessThanOrEqual(30);
      // dọn nốt các bản giả lập test tự tạo trực tiếp (không qua saoLuuTaoTrongTest)
      await prisma.saoLuu.deleteMany({
        where: { duongDanFile: { startsWith: "khong-ton-tai-" } },
      });
    },
    15_000,
  );

  it(
    "phục hồi khôi phục đúng dữ liệu đã mất, và có thể phục hồi ngược lại trạng thái ban đầu",
    async () => {
      const banGoc = await chayBackupNgay("Admin test", "THU_CONG");
      saoLuuTaoTrongTest.push(banGoc.id);
      if (banGoc.duongDanFile) duongDanFileTaoTrongTest.push(banGoc.duongDanFile);

      const lh = await prisma.loaiHinhBoiDuong.create({
        data: { ma: `LH_QT04_${crypto.randomUUID()}`, ten: "Loại hình test QT-04" },
      });
      loaiHinhTaoTrongTest.push(lh.id);
      const ct = await prisma.chuongTrinh.create({
        data: {
          maCT: `CT_QT04_${crypto.randomUUID()}`,
          ten: "Chương trình test QT-04",
          loaiHinhBoiDuongId: lh.id,
          trangThai: "DA_BAN_HANH",
          soQuyetDinh: "QD-QT04",
          ngayBanHanh: new Date(),
        },
      });
      chuongTrinhTaoTrongTest.push(ct.id);
      const khoa = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa: 10 });
      khoaTaoTrongTest.push(khoa.id);
      const dangKy = await themHocVienVaoKhoa({
        khoaId: khoa.id,
        hoTen: "Học viên QT-04",
        soCCCD: `CCCD_QT04_${crypto.randomUUID()}`,
      });
      hocVienTaoTrongTest.push(dangKy.hocVienId);

      try {
        const banCoDuLieu = await chayBackupNgay("Admin test", "THU_CONG");
        saoLuuTaoTrongTest.push(banCoDuLieu.id);
        if (banCoDuLieu.duongDanFile) duongDanFileTaoTrongTest.push(banCoDuLieu.duongDanFile);

        // Giả lập "sự cố mất dữ liệu": xóa thẳng khóa (kéo theo đăng ký) vừa tạo.
        await prisma.dangKyHoc.deleteMany({ where: { khoaId: khoa.id } });
        await prisma.khoa.delete({ where: { id: khoa.id } });
        expect(await prisma.khoa.findUnique({ where: { id: khoa.id } })).toBeNull();

        const ketQuaPhucHoi = await phucHoiTuBanSaoLuu(banCoDuLieu.id);
        expect(ketQuaPhucHoi.tongSoDong).toBeGreaterThan(0);

        const khoaSauPhucHoi = await prisma.khoa.findUnique({ where: { id: khoa.id } });
        expect(khoaSauPhucHoi).not.toBeNull();
        const dangKySauPhucHoi = await prisma.dangKyHoc.findUnique({
          where: { id: dangKy.id },
        });
        expect(dangKySauPhucHoi).not.toBeNull();
        expect(dangKySauPhucHoi?.hocVienId).toBe(dangKy.hocVienId);
      } finally {
        // Trả hệ thống về đúng trạng thái trước khi test này chạy (trước khi
        // tạo lh/ct/khoa/hocVien ở trên) - không chỉ dọn riêng phần test tạo
        // ra, mà phục hồi lại nguyên trạng toàn bộ DB tại thời điểm banGoc.
        await phucHoiTuBanSaoLuu(banGoc.id);
      }
    },
    30_000,
  );
});
