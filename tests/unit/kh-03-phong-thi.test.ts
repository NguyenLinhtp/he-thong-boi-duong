import { afterAll, describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/db/prisma";
import type { PhuongThucDangKy } from "@/generated/prisma/client";
import {
  boSungThiSinh,
  chotDotThi,
  danhSachDotThi,
  moChotDotThi,
  moThemPhongVaXep,
  PhongThiError,
  soSanhTen,
  suaPhongThi,
  taoDotThi,
  themPhongThi,
  ThieuChoPhongThiError,
  xepPhongThi,
  xoaPhongThi,
  xoaXepPhongThi,
  xuatExcelPhongThi,
} from "@/server/services/kh/kh-03-phong-thi";

// (bổ sung 12/10/2026 - KH-03) lịch thi, phòng thi của khóa chỉ đăng ký dự thi/ôn thi

const NGUOI = { nguoiThucHienTen: "Cán bộ test phòng thi" };
const loaiHinh: string[] = [];
const chuongTrinh: string[] = [];
const khoaIds: string[] = [];
const hocVienIds: string[] = [];

afterAll(async () => {
  await prisma.hocPhi.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.dotThi.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.thanhPhanLePhi.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: hocVienIds } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaIds } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinh } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinh } } });
});

async function taoKhoa(phuongThucDangKys: PhuongThucDangKy[] = ["CHI_DU_THI"]) {
  const lh = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH_PT_${crypto.randomUUID()}`, ten: "LH phòng thi" } });
  loaiHinh.push(lh.id);
  const ct = await prisma.chuongTrinh.create({
    data: { maCT: `CT_PT_${crypto.randomUUID()}`, ten: "Thi chuẩn đầu ra tiếng Anh", loaiHinhBoiDuongId: lh.id, trangThai: "DA_BAN_HANH", phuongThucDangKys },
  });
  chuongTrinh.push(ct.id);
  const khoa = await prisma.khoa.create({ data: { maKhoa: `KHPT${crypto.randomUUID().slice(0, 8)}`, chuongTrinhId: ct.id, siSoToiDa: 100 } });
  khoaIds.push(khoa.id);
  return khoa;
}

async function thiSinh(khoaId: string, hoTen: string, trangThai: "CHINH_THUC" | "CHO_DUYET" = "CHINH_THUC") {
  const hv = await prisma.hocVien.create({ data: { maHocVien: `HVPT${crypto.randomUUID().slice(0, 10)}`, hoTen } });
  hocVienIds.push(hv.id);
  return prisma.dangKyHoc.create({ data: { hocVienId: hv.id, khoaId, trangThai, phuongThuc: "CHI_DU_THI" }, include: { hocVien: true } });
}

const tenTheoPhong = async (dotThiId: string) => {
  const dot = (await danhSachDotThi((await prisma.dotThi.findUniqueOrThrow({ where: { id: dotThiId } })).khoaId)).find((d) => d.id === dotThiId)!;
  return dot.phongThis.map((p) => p.xepPhongThis.map((x) => `${x.soBaoDanh}:${x.dangKy.hocVien.hoTen}`));
};

describe("sắp tên A->Z theo cách Việt Nam", () => {
  it("theo tên (chữ cuối) rồi họ đệm, có dấu", () => {
    const ds = ["Trần Văn Bình", "Nguyễn Thị An", "Lê Ánh", "Phạm Văn An", "Võ Đức Dũng", "Hồ Chí Danh"].map((hoTen, i) => ({ hoTen, maHocVien: `M${i}` }));
    expect(ds.sort(soSanhTen).map((x) => x.hoTen)).toEqual(["Nguyễn Thị An", "Phạm Văn An", "Lê Ánh", "Trần Văn Bình", "Hồ Chí Danh", "Võ Đức Dũng"]);
  });
});

describe("tạo đợt, phòng", () => {
  it("chỉ khóa dự thi; số thí sinh/phòng từ 1; giờ đúng định dạng; thêm nhiều phòng đặt tên theo thứ tự", async () => {
    const khoaThuong = await taoKhoa(["TRUC_TUYEN_NOP_GIAY"]);
    await expect(taoDotThi(khoaThuong.id, { ten: "Đợt 1", loai: "THI" }, NGUOI)).rejects.toThrow(/Phương thức 3/);

    const khoa = await taoKhoa();
    const dot = await taoDotThi(khoa.id, { ten: "Đợt thi 15/11", loai: "THI" }, NGUOI);
    await expect(themPhongThi(dot.id, { sucChua: 0 }, 1, NGUOI)).rejects.toThrow(/từ 1/);
    await expect(themPhongThi(dot.id, { sucChua: 20, gioBatDau: "25:00" }, 1, NGUOI)).rejects.toThrow(/HH:mm/);
    await expect(themPhongThi(dot.id, { sucChua: 20, gioBatDau: "09:00", gioKetThuc: "07:30" }, 1, NGUOI)).rejects.toThrow(/sau giờ bắt đầu/);
    await themPhongThi(dot.id, { sucChua: 20, ngay: "2026-11-15", ca: "Ca 1", gioBatDau: "07:30", gioKetThuc: "09:30" }, 3, NGUOI);
    const ds = await prisma.phongThi.findMany({ where: { dotThiId: dot.id }, orderBy: { thuTu: "asc" } });
    expect(ds.map((p) => p.ten)).toEqual(["Phòng thi 01", "Phòng thi 02", "Phòng thi 03"]);
    expect(ds[0].ngay?.toISOString().slice(0, 10)).toBe("2026-11-15");

    // xóa phòng giữa: các phòng sau dồn thứ tự và tên
    await xoaPhongThi(ds[1].id, NGUOI);
    expect((await prisma.phongThi.findMany({ where: { dotThiId: dot.id }, orderBy: { thuTu: "asc" } })).map((p) => p.ten)).toEqual(["Phòng thi 01", "Phòng thi 02"]);
  });
});

describe("xếp phòng A->Z, thiếu chỗ mở thêm phòng, chốt, bổ sung vào phòng cuối", () => {
  it("luồng đầy đủ", async () => {
    const khoa = await taoKhoa();
    for (const ten of ["Trần Văn Bình", "Nguyễn Thị An", "Võ Đức Dũng", "Lê Ánh", "Hồ Chí Danh"]) await thiSinh(khoa.id, ten);
    await thiSinh(khoa.id, "Đặng Chưa Duyệt", "CHO_DUYET"); // không thuộc danh sách chính thức
    const dot = await taoDotThi(khoa.id, { ten: "Đợt thi", loai: "THI" }, NGUOI);
    await expect(xepPhongThi(dot.id, NGUOI)).rejects.toThrow(/Chưa có phòng/);
    await themPhongThi(dot.id, { sucChua: 2, ca: "Ca 1" }, 2, NGUOI);

    // 5 thí sinh, 4 chỗ: thiếu 1 -> cần mở thêm 1 phòng
    const loi = await xepPhongThi(dot.id, NGUOI).catch((e) => e);
    expect(loi).toBeInstanceOf(ThieuChoPhongThiError);
    expect([loi.thieu, loi.soPhongCanThem]).toEqual([1, 1]);

    await moThemPhongVaXep(dot.id, NGUOI);
    expect(await tenTheoPhong(dot.id)).toEqual([
      ["1:Nguyễn Thị An", "2:Lê Ánh"],
      ["3:Trần Văn Bình", "4:Hồ Chí Danh"],
      ["5:Võ Đức Dũng"],
    ]);
    const phongMo = await prisma.phongThi.findFirstOrThrow({ where: { dotThiId: dot.id, thuTu: 3 } });
    expect([phongMo.ten, phongMo.ca, phongMo.sucChua]).toEqual(["Phòng thi 03", "Ca 1", 2]);

    await expect(boSungThiSinh(dot.id, NGUOI)).rejects.toThrow(/chưa chốt/);
    await chotDotThi(dot.id, NGUOI);
    await expect(xepPhongThi(dot.id, NGUOI)).rejects.toThrow(/đã chốt/);
    await expect(suaPhongThi(phongMo.id, { sucChua: 0 }, NGUOI)).rejects.toThrow();

    // có thêm 2 thí sinh chính thức: vào phòng cuối, số báo danh nối tiếp, không xếp lại người cũ
    await thiSinh(khoa.id, "Phan Văn Anh");
    await thiSinh(khoa.id, "Mai Xuân Yến");
    const kq = await boSungThiSinh(dot.id, NGUOI);
    expect(kq).toEqual({ soBoSung: 2, phong: "Phòng thi 03", vuotSucChua: 1 });
    expect(await tenTheoPhong(dot.id)).toEqual([
      ["1:Nguyễn Thị An", "2:Lê Ánh"],
      ["3:Trần Văn Bình", "4:Hồ Chí Danh"],
      ["5:Võ Đức Dũng", "6:Phan Văn Anh", "7:Mai Xuân Yến"],
    ]);
    expect((await boSungThiSinh(dot.id, NGUOI)).soBoSung).toBe(0);

    // mở chốt bắt buộc lý do, sau đó xếp lại toàn bộ được
    await expect(moChotDotThi(dot.id, " ", NGUOI)).rejects.toThrow(/lý do/);
    await moChotDotThi(dot.id, "Đổi phòng", NGUOI);
    await expect(xepPhongThi(dot.id, NGUOI)).rejects.toThrow(ThieuChoPhongThiError);
    await expect(xoaPhongThi(phongMo.id, NGUOI)).rejects.toThrow(PhongThiError);

    // Excel: 1 sheet tổng hợp + 1 sheet mỗi phòng
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await xuatExcelPhongThi(dot.id)).noiDung as unknown as ArrayBuffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Tổng hợp", "Phòng thi 01", "Phòng thi 02", "Phòng thi 03"]);
    const ws = wb.getWorksheet("Phòng thi 03")!;
    const ten: string[] = [];
    ws.eachRow((r) => ten.push(String(r.getCell(5).value ?? "")));
    expect(ten).toEqual(expect.arrayContaining(["Võ Đức Dũng", "Phan Văn Anh", "Mai Xuân Yến"]));
  });

  it("đợt ôn thi lấy nguồn theo thành phần: chỉ thí sinh đã chọn và đã được xác nhận ôn thi", async () => {
    const khoa = await taoKhoa();
    const thi = await prisma.thanhPhanLePhi.create({ data: { khoaId: khoa.id, ten: "Đăng ký thi", batBuoc: true, mucSinhVien: 300_000, thuTu: 1 } });
    const on = await prisma.thanhPhanLePhi.create({ data: { khoaId: khoa.id, ten: "Đăng ký ôn thi", mucSinhVien: 500_000, thuTu: 2 } });
    const tao = async (hoTen: string, trangThaiOn: "DA_NOP_DU" | "CHUA_NOP" | null) => {
      const dk = await thiSinh(khoa.id, hoTen);
      await prisma.hocPhi.create({
        data: {
          hocVienId: dk.hocVienId,
          khoaId: khoa.id,
          soTienPhaiNop: 800_000,
          thanhPhans: {
            create: [
              { thanhPhanId: thi.id, soTienPhaiNop: 300_000, soTienDaNop: 300_000, trangThai: "DA_NOP_DU" as const },
              ...(trangThaiOn ? [{ thanhPhanId: on.id, soTienPhaiNop: 500_000, trangThai: trangThaiOn }] : []),
            ],
          },
        },
      });
    };
    await tao("Lý Thu Hà", "DA_NOP_DU");
    await tao("Bùi Văn Khang", "CHUA_NOP");
    await tao("Cao Minh Long", null);
    const dotOn = await taoDotThi(khoa.id, { ten: "Lớp ôn tối", loai: "ON_THI", thanhPhanId: on.id }, NGUOI);
    const dotThi = await taoDotThi(khoa.id, { ten: "Đợt thi", loai: "THI", thanhPhanId: thi.id }, NGUOI);
    await themPhongThi(dotOn.id, { sucChua: 30 }, 1, NGUOI);
    await themPhongThi(dotThi.id, { sucChua: 30 }, 1, NGUOI);
    await xepPhongThi(dotOn.id, NGUOI);
    await xepPhongThi(dotThi.id, NGUOI);
    expect(await tenTheoPhong(dotOn.id)).toEqual([["1:Lý Thu Hà"]]);
    expect(await tenTheoPhong(dotThi.id)).toEqual([["1:Lý Thu Hà", "2:Bùi Văn Khang", "3:Cao Minh Long"]]);
    expect((await prisma.phongThi.findFirstOrThrow({ where: { dotThiId: dotOn.id } })).ten).toBe("Lớp ôn thi 01");
  });

  it("(bổ sung 13/10/2026) chưa chốt: sửa số lượng từng phòng rồi xếp lại; xóa xếp phòng để xóa/sửa phòng rồi xếp lại; đã chốt thì chặn", async () => {
    const khoa = await taoKhoa();
    for (const ten of ["Trần Văn Bình", "Nguyễn Thị An", "Võ Đức Dũng", "Lê Ánh"]) await thiSinh(khoa.id, ten);
    const dot = await taoDotThi(khoa.id, { ten: "Đợt sửa số lượng", loai: "THI" }, NGUOI);
    await themPhongThi(dot.id, { sucChua: 2 }, 2, NGUOI);
    await xepPhongThi(dot.id, NGUOI);
    const [p1, p2] = await prisma.phongThi.findMany({ where: { dotThiId: dot.id }, orderBy: { thuTu: "asc" } });

    // giảm phòng 1 xuống 1 (nhỏ hơn số đang xếp), tăng phòng 2 lên 3, xếp lại
    await suaPhongThi(p1.id, { sucChua: 1 }, NGUOI);
    await suaPhongThi(p2.id, { sucChua: 3 }, NGUOI);
    await xepPhongThi(dot.id, NGUOI);
    expect(await tenTheoPhong(dot.id)).toEqual([["1:Nguyễn Thị An"], ["2:Lê Ánh", "3:Trần Văn Bình", "4:Võ Đức Dũng"]]);

    // xóa xếp phòng: giữ phòng, bỏ thí sinh -> xóa được phòng 1, xếp lại vào phòng còn lại
    expect(await xoaXepPhongThi(dot.id, NGUOI)).toBe(4);
    expect(await tenTheoPhong(dot.id)).toEqual([[], []]);
    await expect(xoaXepPhongThi(dot.id, NGUOI)).rejects.toThrow(/chưa xếp/);
    await xoaPhongThi(p1.id, NGUOI);
    await suaPhongThi(p2.id, { sucChua: 4 }, NGUOI);
    await xepPhongThi(dot.id, NGUOI);
    expect(await tenTheoPhong(dot.id)).toEqual([["1:Nguyễn Thị An", "2:Lê Ánh", "3:Trần Văn Bình", "4:Võ Đức Dũng"]]);

    await chotDotThi(dot.id, NGUOI);
    await expect(xoaXepPhongThi(dot.id, NGUOI)).rejects.toThrow(/mở chốt/);
    await expect(suaPhongThi(p2.id, { sucChua: 3 }, NGUOI)).rejects.toThrow(/đã chốt/);
    await suaPhongThi(p2.id, { sucChua: 6 }, NGUOI);
  });
});
