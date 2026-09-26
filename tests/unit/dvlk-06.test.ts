import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { taoDonViLienKet } from "@/server/services/dvlk/dvlk-01-danh-muc";
import { capNhatHopDong } from "@/server/services/dvlk/dvlk-03-hop-dong";
import { xacNhanThuHoSo } from "@/server/services/dvlk/dvlk-05-xac-nhan-thu-ho-so";
import { doiChieuThanhLy, thanhLyHopDong, duLieuBienBanThanhLy } from "@/server/services/dvlk/dvlk-06-thanh-ly";
import { daHoanTatNghiaVuTaiChinh } from "@/server/services/hp/hp-06-dieu-kien";
import { xetDeNghiCapChungChi } from "@/server/services/cc/cc-01-de-nghi";
import {
  ChuaPheDuyetKetQuaDvlkError,
  HopDongDaThanhLyError,
  SoLieuHopDongKhongHopLeError,
  ThieuThongTinDvlkError,
  HopDongChuaThanhLyDvlkError,
} from "@/server/services/dvlk/loi-dvlk";

const uid = () => crypto.randomUUID().slice(0, 8);
const donViIds: string[] = [];
const loaiHinhIds: string[] = [];
const chuongTrinhIds: string[] = [];
const khoaIds: string[] = [];
const hocVienIds: string[] = [];
const NGUOI = { nguoiThucHienTen: "Cán bộ tài chính test DVLK-06" };

afterAll(async () => {
  await prisma.thongBao.deleteMany({ where: { hocVienId: { in: hocVienIds } } });
  await prisma.hocPhi.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.ketQuaKhoa.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.loNopHoSo.deleteMany({ where: { hopDongLienKet: { khoaId: { in: khoaIds } } } });
  await prisma.hopDongLienKet.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.donViLienKet.deleteMany({ where: { id: { in: donViIds } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: hocVienIds } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaIds } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinhIds } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinhIds } } });
});

/**
 * Khóa Phương thức 4 có 2 hợp đồng. Hợp đồng A (đơn giá 1.000.000) gồm:
 *  An    - Chính thức, đạt (có dòng HocPhi CHO_THANH_LY_HOP_DONG)
 *  Bình  - Hoàn thành, không đạt (chưa có dòng HocPhi)
 *  Cường - Thôi học
 *  Dũng  - Hủy do quá hạn nộp giấy
 *  Em    - Hồ sơ còn chờ thu giấy
 * Hợp đồng B: Giang - Chính thức, đạt.
 */
async function taoKhoa(opts: { pheDuyet?: boolean } = {}) {
  const lh = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH06_${uid()}`, ten: "LH" } });
  loaiHinhIds.push(lh.id);
  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT06_${uid()}`,
      ten: "CT DVLK-06",
      loaiHinhBoiDuongId: lh.id,
      trangThai: "DA_BAN_HANH",
      phuongThucDangKy: "QUA_DON_VI_LIEN_KET",
      loaiVanBang: "CHUNG_NHAN",
    },
  });
  chuongTrinhIds.push(ct.id);
  const khoa = await prisma.khoa.create({
    data: { maKhoa: `K06_${uid()}`, chuongTrinhId: ct.id, siSoToiDa: 30, trangThai: "DA_KET_THUC" },
  });
  khoaIds.push(khoa.id);
  const taoHopDong = async (donGia: number | null) => {
    const dv = await taoDonViLienKet({ ma: `DV06_${uid()}`, ten: `Đơn vị ${uid()}` });
    donViIds.push(dv.id);
    return prisma.hopDongLienKet.create({
      data: { maHopDong: `HD06_${uid()}`, donViLienKetId: dv.id, khoaId: khoa.id, soLuongDuKien: 6, donGiaThoaThuan: donGia },
    });
  };
  const hdA = await taoHopDong(1000000);
  const hdB = await taoHopDong(null);

  const tao = async (
    hoTen: string,
    hopDongId: string,
    trangThai: "CHINH_THUC" | "HOAN_THANH" | "THOI_HOC" | "HUY_QUA_HAN_NOP_GIAY" | "CHO_NOP_GIAY",
    ketQua?: { datHocTap: boolean },
  ) => {
    const hv = await prisma.hocVien.create({ data: { maHocVien: `HV06_${uid()}`, hoTen } });
    hocVienIds.push(hv.id);
    const dk = await prisma.dangKyHoc.create({
      data: {
        hocVienId: hv.id,
        khoaId: khoa.id,
        trangThai,
        hopDongLienKetId: hopDongId,
        hanNopGiay: trangThai === "CHO_NOP_GIAY" ? new Date(Date.now() + 7 * 864e5) : null,
      },
    });
    if (ketQua) {
      await prisma.ketQuaKhoa.create({
        data: {
          hocVienId: hv.id,
          khoaId: khoa.id,
          diemTongKet: ketQua.datHocTap ? 8 : 3,
          datHocTap: ketQua.datHocTap,
          daPheDuyet: opts.pheDuyet ?? true,
        },
      });
    }
    return { hv, dk };
  };
  const an = await tao("An", hdA.id, "CHINH_THUC", { datHocTap: true });
  await prisma.hocPhi.create({
    data: { hocVienId: an.hv.id, khoaId: khoa.id, soTienPhaiNop: 0, trangThai: "CHO_THANH_LY_HOP_DONG" },
  });
  const binh = await tao("Bình", hdA.id, "HOAN_THANH", { datHocTap: false });
  const cuong = await tao("Cường", hdA.id, "THOI_HOC");
  const dung = await tao("Dũng", hdA.id, "HUY_QUA_HAN_NOP_GIAY");
  const em = await tao("Em", hdA.id, "CHO_NOP_GIAY");
  const giang = await tao("Giang", hdB.id, "CHINH_THUC", { datHocTap: true });
  return { khoa, hdA, hdB, an, binh, cuong, dung, em, giang };
}

describe("DVLK-06 thanh lý hợp đồng liên kết tuyển sinh cuối khóa", () => {
  it("bước 1 đối chiếu: phân loại hoàn thành/không đạt/thôi học/chưa xử lý/không tính, số tiền gợi ý", async () => {
    const f = await taoKhoa();

    const dc = await doiChieuThanhLy(f.hdA.id);

    const phanLoai = Object.fromEntries(dc.dong.map((d) => [d.hoTen, d.phanLoai]));
    expect(phanLoai).toEqual({ An: "HOAN_THANH", Bình: "KHONG_DAT", Cường: "THOI_HOC", Dũng: "KHONG_TINH", Em: "CHUA_XU_LY" });
    expect(dc.tong).toEqual({ duKien: 6, hopLe: 3, hoanThanh: 1, khongDat: 1, chuaCoKetQua: 0, thoiHoc: 1, chuaXuLy: 1, khongTinh: 1 });
    expect(dc.soTienGoiY).toBe(3000000);
    expect(dc.ketQuaDaPheDuyet).toBe(true);
    expect((await doiChieuThanhLy(f.hdB.id)).soTienGoiY).toBeNull();
  });

  it("chặn: kết quả khóa chưa phê duyệt, thiếu/âm số tiền, ngày không hợp lệ - hợp đồng giữ nguyên", async () => {
    const chuaDuyet = await taoKhoa({ pheDuyet: false });
    await expect(thanhLyHopDong(chuaDuyet.hdA.id, { ...NGUOI, soTienQuyetToan: 1 })).rejects.toThrow(ChuaPheDuyetKetQuaDvlkError);

    const f = await taoKhoa();
    await expect(thanhLyHopDong(f.hdA.id, { ...NGUOI, soTienQuyetToan: null })).rejects.toThrow(ThieuThongTinDvlkError);
    await expect(thanhLyHopDong(f.hdA.id, { ...NGUOI, soTienQuyetToan: -1 })).rejects.toThrow(SoLieuHopDongKhongHopLeError);
    await expect(thanhLyHopDong(f.hdA.id, { ...NGUOI, soTienQuyetToan: 1, ngayThanhLy: "abc" })).rejects.toThrow(
      ThieuThongTinDvlkError,
    );
    await expect(duLieuBienBanThanhLy(f.hdA.id)).rejects.toThrow(HopDongChuaThanhLyDvlkError);
    const hd = await prisma.hopDongLienKet.findUniqueOrThrow({ where: { id: f.hdA.id } });
    expect([hd.trangThai, hd.soTienQuyetToan]).toEqual(["DANG_TRIEN_KHAI", null]);
    expect(await daHoanTatNghiaVuTaiChinh(f.an.hv.id, f.khoa.id)).toBe(false);
  });

  it("bước 2 thanh lý: chốt biên bản, cập nhật hàng loạt Đã hoàn tất cho học viên hợp lệ; không đụng hợp đồng khác", async () => {
    const f = await taoKhoa();

    const { hopDong, soHocVienCapNhat } = await thanhLyHopDong(f.hdA.id, {
      ...NGUOI,
      soTienQuyetToan: 2500000,
      ngayThanhLy: "2026-12-15",
      ghiChu: " Giảm trừ 1 học viên thôi học ",
    });

    expect(soHocVienCapNhat).toBe(3);
    expect(hopDong).toMatchObject({
      trangThai: "DA_THANH_LY",
      soBienBanThanhLy: `BBTL-${f.hdA.maHopDong}`,
      soLuongThucTe: 3,
      soHocVienHoanThanh: 1,
      soHocVienThoiHoc: 1,
      nguoiThanhLy: NGUOI.nguoiThucHienTen,
      ghiChuThanhLy: "Giảm trừ 1 học viên thôi học",
    });
    expect(Number(hopDong.soTienQuyetToan)).toBe(2500000);
    expect(hopDong.ngayQuyetToan?.toISOString().slice(0, 10)).toBe("2026-12-15");

    const hocPhi = await prisma.hocPhi.findMany({ where: { khoaId: f.khoa.id } });
    const theoHv = new Map(hocPhi.map((hp) => [hp.hocVienId, hp.trangThai]));
    // An: cập nhật dòng có sẵn; Bình, Cường: tạo mới; Dũng, Em (không hợp lệ) và Giang (hợp đồng B): không có
    expect([f.an, f.binh, f.cuong].map((x) => theoHv.get(x.hv.id))).toEqual(["DA_HOAN_TAT", "DA_HOAN_TAT", "DA_HOAN_TAT"]);
    expect([f.dung, f.em, f.giang].map((x) => theoHv.get(x.hv.id))).toEqual([undefined, undefined, undefined]);
    expect((await prisma.hopDongLienKet.findUniqueOrThrow({ where: { id: f.hdB.id } })).trangThai).toBe("DANG_TRIEN_KHAI");

    expect(await prisma.nhatKyThaoTac.count({ where: { hanhDong: "THANH_LY_HOP_DONG_LIEN_KET", doiTuongId: f.hdA.id } })).toBe(1);
    const tb = await prisma.thongBao.findFirstOrThrow({ where: { hocVienId: f.an.hv.id, loaiSuKien: "CAP_CHUNG_CHI" } });
    expect(tb.noiDung).toContain("giấy chứng nhận");
    expect(await prisma.thongBao.count({ where: { hocVienId: f.binh.hv.id, loaiSuKien: "CAP_CHUNG_CHI" } })).toBe(0);

    const bienBan = await duLieuBienBanThanhLy(f.hdA.id);
    expect(bienBan.tong.hoanThanh).toBe(1);
  });

  it("liên thông: sau thanh lý học viên đạt đủ điều kiện tài chính (HP-06) và vào danh sách đề nghị cấp (CC-01)", async () => {
    const f = await taoKhoa();
    expect(await daHoanTatNghiaVuTaiChinh(f.an.hv.id, f.khoa.id)).toBe(false);
    let xet = await xetDeNghiCapChungChi(f.khoa.id);
    expect(xet.duDieuKien.map((kq) => kq.hocVienId)).not.toContain(f.an.hv.id);

    await thanhLyHopDong(f.hdA.id, { ...NGUOI, soTienQuyetToan: 3000000 });

    expect(await daHoanTatNghiaVuTaiChinh(f.an.hv.id, f.khoa.id)).toBe(true);
    xet = await xetDeNghiCapChungChi(f.khoa.id);
    expect(xet.duDieuKien.map((kq) => kq.hocVienId)).toContain(f.an.hv.id);
    // hợp đồng B chưa thanh lý -> Giang vẫn bị loại
    expect(xet.khongDuDieuKien.find((kq) => kq.hocVienId === f.giang.hv.id)?.lyDo).toContain("Chờ thanh lý hợp đồng");
    // Bình không đạt học tập vẫn không vào danh sách dù đã hoàn tất tài chính
    expect(xet.duDieuKien.map((kq) => kq.hocVienId)).not.toContain(f.binh.hv.id);
  });

  it("sau thanh lý: không thanh lý lại, không sửa hợp đồng, không xác nhận thu hồ sơ thêm", async () => {
    const f = await taoKhoa();
    await thanhLyHopDong(f.hdA.id, { ...NGUOI, soTienQuyetToan: 0 });

    await expect(thanhLyHopDong(f.hdA.id, { ...NGUOI, soTienQuyetToan: 1 })).rejects.toThrow(HopDongDaThanhLyError);
    await expect(capNhatHopDong(f.hdA.id, { soLuongDuKien: 1 })).rejects.toThrow(HopDongDaThanhLyError);
    await expect(xacNhanThuHoSo({ loai: "TRUONG" }, { ...NGUOI, dangKyIds: [f.em.dk.id] })).rejects.toThrow(
      HopDongDaThanhLyError,
    );
    expect(Number((await prisma.hopDongLienKet.findUniqueOrThrow({ where: { id: f.hdA.id } })).soTienQuyetToan)).toBe(0);
  });
});
