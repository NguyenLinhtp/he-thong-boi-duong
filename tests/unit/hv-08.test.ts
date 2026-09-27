import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { khoiTaoKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { dangKyDuThi } from "@/server/services/hv/hv-05-dang-ky-du-thi";
import {
  danhSachHocVien,
  layHoSoHocVien,
  capNhatHoSoHocVien,
  phamViHoSoHocVien,
  PHAM_VI_TOAN_BO,
} from "@/server/services/hv/hv-08-ho-so-hoc-vien";
import { KhongTimThayHocVienError, CccdTrungError, NgoaiPhamViHoSoHocVienError } from "@/server/services/hv/loi-hoc-vien";

const loaiHinhTaoTrongTest: string[] = [];
const chuongTrinhTaoTrongTest: string[] = [];
const khoaTaoTrongTest: string[] = [];
const hocVienTaoTrongTest: string[] = [];
const nguoiDungTaoTrongTest: string[] = [];

afterAll(async () => {
  await prisma.hocVien.updateMany({ where: { id: { in: hocVienTaoTrongTest } }, data: { nguoiDungId: null } });
  await prisma.nguoiDung.deleteMany({ where: { id: { in: nguoiDungTaoTrongTest } } });
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: khoaTaoTrongTest } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: hocVienTaoTrongTest } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaTaoTrongTest } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinhTaoTrongTest } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinhTaoTrongTest } } });
});

async function taoHocVienDonGian(hoTen: string) {
  const cccd = `CCCD_${crypto.randomUUID()}`;
  const hv = await prisma.hocVien.create({
    data: { maHocVien: `HV_HV08_${crypto.randomUUID()}`, hoTen, soCCCD: cccd },
  });
  hocVienTaoTrongTest.push(hv.id);
  return hv;
}

describe("HV-08 quản lý hồ sơ học viên", () => {
  it("tìm kiếm theo tên, mã học viên, CCCD", async () => {
    const hv = await taoHocVienDonGian(`Nguyễn Test HV08 ${crypto.randomUUID()}`);

    const theoTen = await danhSachHocVien(hv.hoTen, PHAM_VI_TOAN_BO);
    expect(theoTen.map((h) => h.id)).toContain(hv.id);

    const theoMa = await danhSachHocVien(hv.maHocVien, PHAM_VI_TOAN_BO);
    expect(theoMa.map((h) => h.id)).toContain(hv.id);

    const theoCccd = await danhSachHocVien(hv.soCCCD!, PHAM_VI_TOAN_BO);
    expect(theoCccd.map((h) => h.id)).toContain(hv.id);
  });

  it("layHoSoHocVien trả về kèm lịch sử đăng ký các khóa", async () => {
    const lh = await prisma.loaiHinhBoiDuong.create({
      data: { ma: `LH_HV08_${crypto.randomUUID()}`, ten: "Loại hình test HV-08" },
    });
    loaiHinhTaoTrongTest.push(lh.id);
    const ct = await prisma.chuongTrinh.create({
      data: {
        maCT: `CT_HV08_${crypto.randomUUID()}`,
        ten: "CT test HV-08",
        loaiHinhBoiDuongId: lh.id,
        trangThai: "DA_BAN_HANH",
        soQuyetDinh: "QD",
        ngayBanHanh: new Date(),
        phuongThucDangKy: "CHI_DU_THI",
      },
    });
    chuongTrinhTaoTrongTest.push(ct.id);
    const khoa = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa: 10 });
    khoaTaoTrongTest.push(khoa.id);
    await prisma.khoa.update({ where: { id: khoa.id }, data: { trangThai: "DANG_TUYEN_SINH" } });

    const dangKy = await dangKyDuThi({
      khoaId: khoa.id,
      hoTen: "Học viên hồ sơ",
      soCCCD: `CCCD_${crypto.randomUUID()}`,
    });
    hocVienTaoTrongTest.push(dangKy.hocVienId);

    const hoSo = await layHoSoHocVien(dangKy.hocVienId, PHAM_VI_TOAN_BO);
    expect(hoSo.dangKys.map((dk) => dk.khoaId)).toContain(khoa.id);
    expect(hoSo.dangKys[0].khoa.chuongTrinh.id).toBe(ct.id);
  });

  it("layHoSoHocVien báo lỗi khi không tìm thấy", async () => {
    await expect(layHoSoHocVien("khong-ton-tai", PHAM_VI_TOAN_BO)).rejects.toThrow(KhongTimThayHocVienError);
  });

  it("cập nhật thông tin cá nhân thành công", async () => {
    const hv = await taoHocVienDonGian("Học viên cần sửa");
    const ketQua = await capNhatHoSoHocVien(hv.id, {
      soDienThoai: "0900000001",
      email: "moi@example.com",
      donViCongTac: "Trường mới",
    }, PHAM_VI_TOAN_BO);

    expect(ketQua.soDienThoai).toBe("0900000001");
    expect(ketQua.email).toBe("moi@example.com");
    expect(ketQua.donViCongTac).toBe("Trường mới");
    expect(ketQua.hoTen).toBe("Học viên cần sửa");
  });

  it("chặn sửa CCCD trùng với 1 học viên khác đã tồn tại", async () => {
    const hv1 = await taoHocVienDonGian("Học viên A");
    const hv2 = await taoHocVienDonGian("Học viên B");

    await expect(
      capNhatHoSoHocVien(hv2.id, { soCCCD: hv1.soCCCD }, PHAM_VI_TOAN_BO),
    ).rejects.toThrow(CccdTrungError);
  });

  it("cho phép giữ nguyên CCCD hiện tại khi cập nhật thông tin khác", async () => {
    const hv = await taoHocVienDonGian("Học viên C");
    const ketQua = await capNhatHoSoHocVien(hv.id, { soCCCD: hv.soCCCD, soDienThoai: "0911111111" }, PHAM_VI_TOAN_BO);
    expect(ketQua.soCCCD).toBe(hv.soCCCD);
    expect(ketQua.soDienThoai).toBe("0911111111");
  });

  it("cập nhật báo lỗi khi không tìm thấy học viên", async () => {
    await expect(capNhatHoSoHocVien("khong-ton-tai", { hoTen: "X" }, PHAM_VI_TOAN_BO)).rejects.toThrow(
      KhongTimThayHocVienError,
    );
  });
});

async function taoTaiKhoan(vaiTros: ("HOC_VIEN" | "GIANG_VIEN" | "CAN_BO_QUAN_LY_DAO_TAO")[], hocVienId?: string) {
  const nd = await prisma.nguoiDung.create({
    data: {
      tenDangNhap: `hv08_${crypto.randomUUID()}`,
      matKhauHash: "x",
      hoTen: "Tài khoản HV-08",
      vaiTros: { create: await Promise.all(vaiTros.map(async (ma) => ({ vaiTroId: (await prisma.vaiTroModel.findUniqueOrThrow({ where: { ma } })).id }))) },
    },
  });
  nguoiDungTaoTrongTest.push(nd.id);
  if (hocVienId) await prisma.hocVien.update({ where: { id: hocVienId }, data: { nguoiDungId: nd.id } });
  return nd;
}

describe("HV-08 phạm vi: học viên chỉ tự cập nhật hồ sơ của chính mình", () => {
  it("cán bộ quản lý đào tạo thao tác mọi hồ sơ", async () => {
    const nd = await taoTaiKhoan(["CAN_BO_QUAN_LY_DAO_TAO"]);
    expect(await phamViHoSoHocVien(nd.id)).toEqual({ toanBo: true });
  });

  it("học viên xem/sửa được hồ sơ của mình, bị chặn với hồ sơ người khác", async () => {
    const minh = await taoHocVienDonGian(`HV08 chính mình ${crypto.randomUUID()}`);
    const nguoiKhac = await taoHocVienDonGian(`HV08 người khác ${crypto.randomUUID()}`);
    const nd = await taoTaiKhoan(["HOC_VIEN"], minh.id);
    const phamVi = await phamViHoSoHocVien(nd.id);
    expect(phamVi).toEqual({ toanBo: false, hocVienId: minh.id });

    expect((await layHoSoHocVien(minh.id, phamVi)).id).toBe(minh.id);
    await expect(layHoSoHocVien(nguoiKhac.id, phamVi)).rejects.toThrow(NgoaiPhamViHoSoHocVienError);

    // tìm kiếm chỉ ra đúng hồ sơ của mình dù từ khóa khớp người khác
    expect((await danhSachHocVien("HV08", phamVi)).map((h) => h.id)).toEqual([minh.id]);
    expect(await danhSachHocVien(nguoiKhac.hoTen, phamVi)).toEqual([]);

    const sau = await capNhatHoSoHocVien(
      minh.id,
      { hoTen: minh.hoTen, soCCCD: minh.soCCCD, soDienThoai: "0988888888", email: "minh@example.com" },
      phamVi,
    );
    expect(sau.soDienThoai).toBe("0988888888");
    await expect(capNhatHoSoHocVien(nguoiKhac.id, { soDienThoai: "0900000000" }, phamVi)).rejects.toThrow(
      NgoaiPhamViHoSoHocVienError,
    );
    const khac = await prisma.hocVien.findUniqueOrThrow({ where: { id: nguoiKhac.id } });
    expect(khac.soDienThoai).toBeNull();
  });

  it("học viên không tự đổi họ tên/CCCD (định danh trên văn bằng, liên kết tài khoản)", async () => {
    const minh = await taoHocVienDonGian("HV08 định danh");
    const nd = await taoTaiKhoan(["HOC_VIEN"], minh.id);
    const phamVi = await phamViHoSoHocVien(nd.id);
    await expect(capNhatHoSoHocVien(minh.id, { hoTen: "Tên khác" }, phamVi)).rejects.toThrow(NgoaiPhamViHoSoHocVienError);
    await expect(capNhatHoSoHocVien(minh.id, { soCCCD: "CCCD_KHAC" }, phamVi)).rejects.toThrow(NgoaiPhamViHoSoHocVienError);
    const sau = await prisma.hocVien.findUniqueOrThrow({ where: { id: minh.id } });
    expect([sau.hoTen, sau.soCCCD]).toEqual([minh.hoTen, minh.soCCCD]);
  });

  it("giữ thêm vai trò không có HV-08 (giảng viên) vẫn chỉ trong phạm vi học viên; tài khoản chưa liên kết không thấy ai", async () => {
    const minh = await taoHocVienDonGian("HV08 kiêm giảng viên");
    const nd = await taoTaiKhoan(["HOC_VIEN", "GIANG_VIEN"], minh.id);
    expect(await phamViHoSoHocVien(nd.id)).toEqual({ toanBo: false, hocVienId: minh.id });

    const chuaLienKet = await taoTaiKhoan(["HOC_VIEN"]);
    const phamVi = await phamViHoSoHocVien(chuaLienKet.id);
    expect(phamVi).toEqual({ toanBo: false, hocVienId: null });
    expect(await danhSachHocVien(undefined, phamVi)).toEqual([]);
  });
});
