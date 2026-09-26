import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { xetDeNghiCapChungChi, lapDanhSachDeNghi } from "@/server/services/cc/cc-01-de-nghi";
import { ChuaPheDuyetKetQuaError } from "@/server/services/cc/loi-chung-chi";

const loaiHinhIds: string[] = [];
const chuongTrinhIds: string[] = [];
const khoaIds: string[] = [];
const hocVienIds: string[] = [];
const donViLienKetIds: string[] = [];

afterAll(async () => {
  await prisma.chungChi.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.banGiaoChungChi.deleteMany({ where: { hopDongLienKet: { khoaId: { in: khoaIds } } } });
  await prisma.ketQuaKhoa.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.hocPhi.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.hopDongLienKet.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.donViLienKet.deleteMany({ where: { id: { in: donViLienKetIds } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaIds } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: hocVienIds } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinhIds } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinhIds } } });
});

const uid = () => crypto.randomUUID();
const NGUOI = { nguoiThucHienTen: "Cán bộ test CC" };

/**
 * Khóa đã phê duyệt kết quả (KQ-04) với 5 học viên:
 *  datCaNhan - đạt, không có học phí (khóa miễn phí) -> đủ điều kiện
 *  khongDat  - không đạt học tập
 *  conNo     - đạt nhưng còn nợ học phí cá nhân
 *  quaDvlk   - đạt, qua đơn vị liên kết, CHƯA có dòng HocPhi, hợp đồng chưa thanh lý
 *  thoiHoc   - đạt nhưng đã thôi học
 */
async function taoKhoaDaPheDuyet(opts: { pheDuyet?: boolean } = {}) {
  const lh = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH_CC_${uid()}`, ten: "LH CC" } });
  loaiHinhIds.push(lh.id);
  const ct = await prisma.chuongTrinh.create({
    data: { maCT: `CT_CC_${uid()}`, ten: "Chương trình CC", loaiHinhBoiDuongId: lh.id, trangThai: "DA_BAN_HANH" },
  });
  chuongTrinhIds.push(ct.id);
  const khoa = await prisma.khoa.create({
    data: { maKhoa: `KH_CC_${uid().slice(0, 8)}`, chuongTrinhId: ct.id, siSoToiDa: 30, trangThai: "DA_KET_THUC" },
  });
  khoaIds.push(khoa.id);

  const dvlk = await prisma.donViLienKet.create({ data: { ma: `DVLK_CC_${uid()}`, ten: "ĐVLK CC" } });
  donViLienKetIds.push(dvlk.id);
  const hopDong = await prisma.hopDongLienKet.create({
    data: { maHopDong: `HD_CC_${uid().slice(0, 8)}`, donViLienKetId: dvlk.id, khoaId: khoa.id },
  });

  const tao = async (
    hoTen: string,
    datHocTap: boolean,
    dangKy: { trangThai?: "HOAN_THANH" | "CHINH_THUC" | "THOI_HOC"; hopDongLienKetId?: string } = {},
  ) => {
    const hv = await prisma.hocVien.create({ data: { maHocVien: `HV_CC_${uid()}`, hoTen } });
    hocVienIds.push(hv.id);
    await prisma.dangKyHoc.create({
      data: {
        hocVienId: hv.id,
        khoaId: khoa.id,
        trangThai: dangKy.trangThai ?? "HOAN_THANH",
        hopDongLienKetId: dangKy.hopDongLienKetId ?? null,
      },
    });
    await prisma.ketQuaKhoa.create({
      data: {
        hocVienId: hv.id,
        khoaId: khoa.id,
        diemTongKet: datHocTap ? 8 : 3,
        datHocTap,
        daPheDuyet: opts.pheDuyet ?? true,
        soQuyetDinh: "QD-KQ",
      },
    });
    return hv;
  };

  const datCaNhan = await tao("A Đạt cá nhân", true);
  const khongDat = await tao("B Không đạt", false, { trangThai: "CHINH_THUC" });
  const conNo = await tao("C Còn nợ", true, { trangThai: "CHINH_THUC" });
  await prisma.hocPhi.create({
    data: { hocVienId: conNo.id, khoaId: khoa.id, soTienPhaiNop: 1000, soTienDaNop: 200, trangThai: "CON_NO" },
  });
  const quaDvlk = await tao("D Qua ĐVLK", true, { trangThai: "CHINH_THUC", hopDongLienKetId: hopDong.id });
  const thoiHoc = await tao("E Thôi học", true, { trangThai: "THOI_HOC" });

  return { khoa, hopDong, datCaNhan, khongDat, conNo, quaDvlk, thoiHoc };
}

describe("CC-01 lập danh sách đề nghị cấp chứng chỉ", () => {
  it("chặn khi kết quả khóa chưa phê duyệt (KQ-04)", async () => {
    const { khoa } = await taoKhoaDaPheDuyet({ pheDuyet: false });
    await expect(xetDeNghiCapChungChi(khoa.id)).rejects.toThrow(ChuaPheDuyetKetQuaError);
    await expect(lapDanhSachDeNghi(khoa.id, NGUOI)).rejects.toThrow(ChuaPheDuyetKetQuaError);
  });

  it("chỉ học viên đủ CẢ 2 điều kiện vào danh sách; người bị loại có lý do", async () => {
    const f = await taoKhoaDaPheDuyet();

    const xet = await xetDeNghiCapChungChi(f.khoa.id);

    expect(xet.duDieuKien.map((kq) => kq.hocVienId)).toEqual([f.datCaNhan.id]);
    const lyDo = new Map(xet.khongDuDieuKien.map((kq) => [kq.hocVienId, kq.lyDo]));
    expect(lyDo.get(f.khongDat.id)).toContain("Không đạt");
    expect(lyDo.get(f.conNo.id)).toContain("học phí cá nhân");
    expect(lyDo.get(f.quaDvlk.id)).toContain(`Chờ thanh lý hợp đồng liên kết ${f.hopDong.maHopDong}`);
    expect(lyDo.get(f.thoiHoc.id)).toContain("thôi học");
  });

  it("lập đề nghị tạo chứng chỉ DE_NGHI, chạy lại không trùng; ĐVLK vào danh sách sau khi thanh lý", async () => {
    const f = await taoKhoaDaPheDuyet();

    const lan1 = await lapDanhSachDeNghi(f.khoa.id, NGUOI);
    expect(lan1.map((cc) => [cc.hocVienId, cc.trangThai, cc.soHieu])).toEqual([[f.datCaNhan.id, "DE_NGHI", null]]);
    expect(await lapDanhSachDeNghi(f.khoa.id, NGUOI)).toHaveLength(0);

    await prisma.hopDongLienKet.update({ where: { id: f.hopDong.id }, data: { trangThai: "DA_THANH_LY" } });
    const lan3 = await lapDanhSachDeNghi(f.khoa.id, NGUOI);
    expect(lan3.map((cc) => cc.hocVienId)).toEqual([f.quaDvlk.id]);

    const xet = await xetDeNghiCapChungChi(f.khoa.id);
    expect(xet.daCoChungChi.map((kq) => kq.hocVienId).sort()).toEqual([f.datCaNhan.id, f.quaDvlk.id].sort());
    expect(
      await prisma.nhatKyThaoTac.count({ where: { hanhDong: "LAP_DE_NGHI_CAP_CHUNG_CHI", doiTuongId: f.khoa.id } }),
    ).toBe(2);
  });
});
