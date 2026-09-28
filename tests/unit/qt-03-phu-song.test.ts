import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  taoTaiKhoan,
  ganVaiTro,
  khoaTaiKhoan,
  moKhoaTaiKhoan,
  datLaiMatKhau,
  xoaTaiKhoan,
  MatKhauYeuError,
} from "@/server/services/qt/qt-01-quan-ly-tai-khoan";
import { capNhatQuyen } from "@/server/services/qt/qt-02-phan-quyen";
import { taoChuongTrinh } from "@/server/services/ct/ct-01-tao-chuong-trinh";
import { themHocPhan } from "@/server/services/ct/ct-02-hoc-phan";
import { trinhThamDinh, pheDuyet, traVeDuThao } from "@/server/services/ct/ct-03-phe-duyet";
import { suaChuongTrinhDaBanHanh } from "@/server/services/ct/ct-04-cap-nhat-da-ban-hanh";
import { ngungHieuLucChuongTrinh } from "@/server/services/ct/ct-06-luu-tru";
import { thietLapPhuongThucDangKy } from "@/server/services/ct/ct-07-phuong-thuc-dang-ky";

/**
 * QT-03 "Ghi lại toàn bộ thao tác quan trọng": các thao tác quản trị/nghiệp vụ
 * quan trọng đều để lại nhật ký gắn người thực hiện; thao tác bị chặn thì
 * không để lại nhật ký.
 */

const uid = () => crypto.randomUUID().slice(0, 8);
const NGUOI = { nguoiThucHienId: null, nguoiThucHienTen: "Quản trị QT-03" };
const ids = {
  nguoiDung: [] as string[],
  chucNang: [] as string[],
  loaiHinh: [] as string[],
  chuongTrinh: [] as string[],
};

afterAll(async () => {
  await prisma.chuongTrinhPhienBan.deleteMany({ where: { chuongTrinhId: { in: ids.chuongTrinh } } });
  await prisma.hocPhan.deleteMany({ where: { chuongTrinhId: { in: ids.chuongTrinh } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: ids.chuongTrinh } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: ids.loaiHinh } } });
  await prisma.nguoiDung.deleteMany({ where: { id: { in: ids.nguoiDung } } });
  await prisma.chucNangHeThong.deleteMany({ where: { id: { in: ids.chucNang } } });
});

const nhatKy = (doiTuongId: string) =>
  prisma.nhatKyThaoTac.findMany({ where: { doiTuongId }, orderBy: { thoiGian: "asc" } });

describe("QT-03 phủ sóng nhật ký: QT-01 tài khoản, QT-02 phân quyền", () => {
  it("tạo/gán vai trò/khóa/mở khóa/đặt lại mật khẩu/xóa tài khoản đều ghi nhật ký, không lộ mật khẩu", async () => {
    const matKhau = `MatKhau${uid()}1`;
    const tk = await taoTaiKhoan(
      { tenDangNhap: `qt03_${uid()}`, matKhau, hoTen: "Tài khoản QT-03", vaiTros: ["GIANG_VIEN"] },
      NGUOI,
    );
    ids.nguoiDung.push(tk.id);
    await ganVaiTro(tk.id, ["GIANG_VIEN", "CAN_BO_TAI_CHINH"], NGUOI);
    await khoaTaiKhoan(tk.id, NGUOI);
    await moKhoaTaiKhoan(tk.id, NGUOI);
    const matKhauMoi = `MoiHon${uid()}2`;
    await datLaiMatKhau(tk.id, matKhauMoi, NGUOI);
    await xoaTaiKhoan(tk.id, NGUOI);

    const ds = await nhatKy(tk.id);
    expect(ds.map((x) => x.hanhDong)).toEqual([
      "TAO_TAI_KHOAN",
      "GAN_VAI_TRO",
      "KHOA_TAI_KHOAN",
      "MO_KHOA_TAI_KHOAN",
      "DAT_LAI_MAT_KHAU",
      "XOA_TAI_KHOAN",
    ]);
    expect(ds.every((x) => x.nguoiThucHienTen === "Quản trị QT-03")).toBe(true);
    expect(ds[1].chiTiet).toContain("GIANG_VIEN -> GIANG_VIEN, CAN_BO_TAI_CHINH");
    const toanBo = JSON.stringify(ds);
    expect(toanBo).not.toContain(matKhau);
    expect(toanBo).not.toContain(matKhauMoi);
  });

  it("thao tác bị chặn (mật khẩu yếu) không ghi nhật ký", async () => {
    const tk = await taoTaiKhoan(
      { tenDangNhap: `qt03_${uid()}`, matKhau: `MatKhau${uid()}1`, hoTen: "QT-03 chặn", vaiTros: [] },
      NGUOI,
    );
    ids.nguoiDung.push(tk.id);
    await expect(datLaiMatKhau(tk.id, "yeu", NGUOI)).rejects.toThrow(MatKhauYeuError);
    expect((await nhatKy(tk.id)).map((x) => x.hanhDong)).toEqual(["TAO_TAI_KHOAN"]);
  });

  it("gán/thu hồi quyền ghi nhật ký; gọi lặp cùng trạng thái không sinh nhật ký rác", async () => {
    const cn = await prisma.chucNangHeThong.create({
      data: { maCN: `TEST-${uid()}`, nhomChucNang: "Test", tenChucNang: "Chức năng tạm QT-03" },
    });
    ids.chucNang.push(cn.id);

    await capNhatQuyen("GIANG_VIEN", cn.maCN, true, NGUOI);
    await capNhatQuyen("GIANG_VIEN", cn.maCN, true, NGUOI);
    await capNhatQuyen("GIANG_VIEN", cn.maCN, false, NGUOI);
    await capNhatQuyen("GIANG_VIEN", cn.maCN, false, NGUOI);

    const ds = await prisma.nhatKyThaoTac.findMany({
      where: { doiTuong: "VaiTro", chiTiet: `GIANG_VIEN - ${cn.maCN}` },
      orderBy: { thoiGian: "asc" },
    });
    expect(ds.map((x) => x.hanhDong)).toEqual(["GAN_QUYEN", "THU_HOI_QUYEN"]);
    expect(await prisma.vaiTroChucNang.count({ where: { chucNangHeThongId: cn.id } })).toBe(0);
  });
});

describe("QT-03 phủ sóng nhật ký: vòng đời chương trình (CT-01/03/04/06/07)", () => {
  it("tạo, trình, trả về, phê duyệt, phương thức, sửa sau ban hành, ngừng hiệu lực đều ghi nhật ký; bị chặn thì không", async () => {
    const lh = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH_QT03_${uid()}`, ten: "LH QT-03" } });
    ids.loaiHinh.push(lh.id);
    const ct = await taoChuongTrinh({ ten: "CT QT-03", tongThoiLuong: 10, loaiHinhBoiDuongId: lh.id }, NGUOI);
    ids.chuongTrinh.push(ct.id);
    await themHocPhan(ct.id, { ten: "HP", soTiet: 10 });

    await trinhThamDinh(ct.id, null, NGUOI);
    await traVeDuThao(ct.id, "Bổ sung mục tiêu", NGUOI);
    await trinhThamDinh(ct.id, null, NGUOI);
    await expect(pheDuyet(ct.id, { soQuyetDinh: "  " }, NGUOI)).rejects.toThrow();
    await pheDuyet(ct.id, { soQuyetDinh: "QD-QT03" }, NGUOI);
    await thietLapPhuongThucDangKy(ct.id, "TRUC_TUYEN_NOP_GIAY", NGUOI);
    await thietLapPhuongThucDangKy(ct.id, "TRUC_TUYEN_NOP_GIAY", NGUOI); // không đổi -> không ghi
    await suaChuongTrinhDaBanHanh(ct.id, { ten: "CT QT-03 v2", loaiHinhBoiDuongId: lh.id, tongThoiLuong: 10, lyDoSua: "Đổi tên" }, NGUOI);
    await ngungHieuLucChuongTrinh(ct.id, "Hết nhu cầu", NGUOI);

    const ds = await nhatKy(ct.id);
    expect(ds.map((x) => x.hanhDong)).toEqual([
      "TAO_CHUONG_TRINH",
      "TRINH_THAM_DINH_CHUONG_TRINH",
      "TRA_VE_DU_THAO_CHUONG_TRINH",
      "TRINH_THAM_DINH_CHUONG_TRINH",
      "PHE_DUYET_CHUONG_TRINH",
      "THIET_LAP_PHUONG_THUC_DANG_KY",
      "SUA_CHUONG_TRINH_DA_BAN_HANH",
      "NGUNG_HIEU_LUC_CHUONG_TRINH",
    ]);
    expect(ds.every((x) => x.nguoiThucHienTen === "Quản trị QT-03")).toBe(true);
    expect(ds[4].chiTiet).toContain("QD-QT03");
    expect(ds[2].chiTiet).toContain("Bổ sung mục tiêu");
  });
});
