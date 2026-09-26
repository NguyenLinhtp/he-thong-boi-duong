import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { xetDeNghiCapChungChi, lapDanhSachDeNghi } from "@/server/services/cc/cc-01-de-nghi";
import { sinhSoHieu, huyChungChi, duLieuInChungChi } from "@/server/services/cc/cc-02-so-hieu";
import { kyDuyetChungChi } from "@/server/services/cc/cc-03-ky-duyet";
import { traTrucTiep, banGiaoTheoLo, soCapChungChi } from "@/server/services/cc/cc-04-so-cap";
import {
  ChuaPheDuyetKetQuaError,
  SaiTrangThaiChungChiError,
  ThieuThongTinError,
  SaiKenhNhanChungChiError,
  HopDongChuaThanhLyError,
  LoTrongError,
} from "@/server/services/cc/loi-chung-chi";

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

/** Phần số thứ tự của số hiệu (sau dấu "-" cuối) để so sánh tương đối - dãy số dùng chung toàn hệ thống. */
const soThuTu = (soHieu: string | null) => Number(soHieu!.split("-").at(-1));

/** Khóa đã phê duyệt có n học viên đạt, khóa miễn phí (không có học phí) -> đều đủ điều kiện. */
async function taoKhoaDuDieuKien(soHocVien: number) {
  const f = await taoKhoaDaPheDuyet();
  await prisma.hopDongLienKet.update({ where: { id: f.hopDong.id }, data: { trangThai: "DA_THANH_LY" } });
  await prisma.hocPhi.updateMany({ where: { khoaId: f.khoa.id }, data: { trangThai: "DA_NOP_DU" } });
  await prisma.ketQuaKhoa.updateMany({ where: { khoaId: f.khoa.id }, data: { datHocTap: true } });
  await prisma.dangKyHoc.updateMany({ where: { khoaId: f.khoa.id, trangThai: "THOI_HOC" }, data: { trangThai: "HOAN_THANH" } });
  // giữ đúng soHocVien học viên đạt đầu tiên theo họ tên
  const ds = await prisma.ketQuaKhoa.findMany({ where: { khoaId: f.khoa.id }, include: { hocVien: true }, orderBy: { hocVien: { hoTen: "asc" } } });
  await prisma.ketQuaKhoa.updateMany({
    where: { id: { in: ds.slice(soHocVien).map((kq) => kq.id) } },
    data: { datHocTap: false },
  });
  await lapDanhSachDeNghi(f.khoa.id, NGUOI);
  return f;
}

describe("CC-02 sinh số hiệu và in chứng chỉ", () => {
  it("sinh số hiệu tăng dần liên tiếp theo họ tên, chuyển sang Chờ ký duyệt", async () => {
    const f = await taoKhoaDuDieuKien(3);

    const { daCapSo, boQua } = await sinhSoHieu(f.khoa.id, NGUOI);

    expect(boQua).toHaveLength(0);
    expect(daCapSo.map((c) => c.hoTen)).toEqual(["A Đạt cá nhân", "B Không đạt", "C Còn nợ"]);
    expect(daCapSo[0].soHieu).toMatch(/^\D+\d{4}-\d{5}$/);
    expect(daCapSo[0].soHieu).toContain(`${new Date().getFullYear()}-`);
    const so = daCapSo.map((c) => soThuTu(c.soHieu));
    expect(so[1]).toBe(so[0] + 1);
    expect(so[2]).toBe(so[1] + 1);
    const dsSau = await prisma.chungChi.findMany({ where: { khoaId: f.khoa.id } });
    expect(dsSau.every((cc) => cc.trangThai === "CHO_KY_DUYET" && cc.ngayInSoHieu)).toBe(true);
  });

  it("không cấp lại số đã hủy: đề nghị lại sau khi hủy nhận số mới lớn hơn", async () => {
    const f = await taoKhoaDuDieuKien(1);
    const { daCapSo } = await sinhSoHieu(f.khoa.id, NGUOI);
    const soCu = daCapSo[0].soHieu;

    await expect(huyChungChi(daCapSo[0].chungChiId, "  ", NGUOI)).rejects.toThrow(ThieuThongTinError);
    const daHuy = await huyChungChi(daCapSo[0].chungChiId, "In sai họ tên", NGUOI);
    expect(daHuy.trangThai).toBe("DA_HUY");
    expect(daHuy.soHieu).toBe(soCu);

    const deNghiLai = await lapDanhSachDeNghi(f.khoa.id, NGUOI);
    expect(deNghiLai).toHaveLength(1);
    const { daCapSo: capLai } = await sinhSoHieu(f.khoa.id, NGUOI);
    expect(capLai[0].soHieu).not.toBe(soCu);
    expect(soThuTu(capLai[0].soHieu)).toBeGreaterThan(soThuTu(soCu));

    const dsIn = await duLieuInChungChi([daCapSo[0].chungChiId, capLai[0].chungChiId]);
    expect(dsIn.dsChungChi.map((cc) => cc.soHieu)).toEqual([capLai[0].soHieu]);
  });

  it("kiểm tra lại điều kiện trước khi cấp số: người không còn đủ điều kiện bị bỏ qua kèm lý do", async () => {
    const f = await taoKhoaDuDieuKien(2);
    // phúc khảo (KQ-04) hạ điểm sau khi đã lập đề nghị
    await prisma.ketQuaKhoa.update({
      where: { hocVienId_khoaId: { hocVienId: f.datCaNhan.id, khoaId: f.khoa.id } },
      data: { datHocTap: false },
    });

    const { daCapSo, boQua } = await sinhSoHieu(f.khoa.id, NGUOI);

    expect(daCapSo.map((c) => c.hoTen)).toEqual(["B Không đạt"]);
    expect(boQua.map((b) => [b.hoTen, b.lyDo.startsWith("Không đạt")])).toEqual([["A Đạt cá nhân", true]]);
    const cc = await prisma.chungChi.findFirstOrThrow({ where: { khoaId: f.khoa.id, hocVienId: f.datCaNhan.id } });
    expect([cc.trangThai, cc.soHieu]).toEqual(["DE_NGHI", null]);
  });

  it("không hủy được chứng chỉ đã cấp", async () => {
    const f = await taoKhoaDuDieuKien(1);
    const { daCapSo } = await sinhSoHieu(f.khoa.id, NGUOI);
    await prisma.chungChi.update({ where: { id: daCapSo[0].chungChiId }, data: { trangThai: "DA_CAP" } });

    await expect(huyChungChi(daCapSo[0].chungChiId, "Lý do", NGUOI)).rejects.toThrow(SaiTrangThaiChungChiError);
  });
});

describe("CC-03 ký duyệt chứng chỉ", () => {
  const KY = { soQuyetDinh: "QĐ-CC-01", ngayKy: "2026-10-30", nguoiKy: "Hiệu trưởng", nguoiThucHienTen: "Cán bộ test CC" };

  it("ký toàn bộ chứng chỉ chờ ký của khóa: ghi QĐ/ngày/người ký, báo học viên kèm kênh nhận", async () => {
    const f = await taoKhoaDuDieuKien(2);
    await prisma.dangKyHoc.update({
      where: { hocVienId_khoaId: { hocVienId: f.khongDat.id, khoaId: f.khoa.id } },
      data: { hopDongLienKetId: f.hopDong.id },
    });
    await sinhSoHieu(f.khoa.id, NGUOI);

    const ds = await kyDuyetChungChi(f.khoa.id, KY);

    expect(ds).toHaveLength(2);
    expect(ds.every((cc) => cc.trangThai === "DA_KY_DUYET" && cc.soQuyetDinh === "QĐ-CC-01" && cc.nguoiKy === "Hiệu trưởng")).toBe(true);
    expect(ds[0].ngayCap?.toISOString().slice(0, 10)).toBe("2026-10-30");
    const tb = await prisma.thongBao.findFirstOrThrow({ where: { hocVienId: f.khongDat.id, loaiSuKien: "CAP_CHUNG_CHI" } });
    expect(tb.noiDung).toContain("ĐVLK CC");
    const tbCaNhan = await prisma.thongBao.findFirstOrThrow({ where: { hocVienId: f.datCaNhan.id, loaiSuKien: "CAP_CHUNG_CHI" } });
    expect(tbCaNhan.noiDung).toContain("Phòng/Trung tâm");
  });

  it("bắt buộc số quyết định/người ký; chặn cả lô nếu có chứng chỉ chưa có số hiệu", async () => {
    const f = await taoKhoaDuDieuKien(2);
    const { daCapSo } = await sinhSoHieu(f.khoa.id, NGUOI, [
      (await prisma.chungChi.findFirstOrThrow({ where: { khoaId: f.khoa.id, hocVienId: f.datCaNhan.id } })).id,
    ]);
    const chuaCoSo = await prisma.chungChi.findFirstOrThrow({ where: { khoaId: f.khoa.id, trangThai: "DE_NGHI" } });

    await expect(kyDuyetChungChi(f.khoa.id, { ...KY, soQuyetDinh: " " })).rejects.toThrow(ThieuThongTinError);
    await expect(kyDuyetChungChi(f.khoa.id, { ...KY, nguoiKy: "" })).rejects.toThrow(ThieuThongTinError);
    await expect(
      kyDuyetChungChi(f.khoa.id, { ...KY, chungChiIds: [daCapSo[0].chungChiId, chuaCoSo.id] }),
    ).rejects.toThrow(SaiTrangThaiChungChiError);
    const daKy = await prisma.chungChi.findUniqueOrThrow({ where: { id: daCapSo[0].chungChiId } });
    expect(daKy.trangThai).toBe("CHO_KY_DUYET");
  });

  it("không ký được chứng chỉ của khóa khác qua danh sách id", async () => {
    const f1 = await taoKhoaDuDieuKien(1);
    const f2 = await taoKhoaDuDieuKien(1);
    const { daCapSo } = await sinhSoHieu(f2.khoa.id, NGUOI);

    await expect(
      kyDuyetChungChi(f1.khoa.id, { ...KY, chungChiIds: [daCapSo[0].chungChiId] }),
    ).rejects.toThrow(SaiTrangThaiChungChiError);
  });
});

describe("CC-04 vào sổ cấp chứng chỉ, trao/bàn giao", () => {
  const KY = { soQuyetDinh: "QĐ-CC-04", ngayKy: "2026-11-02", nguoiKy: "Hiệu trưởng", nguoiThucHienTen: "Cán bộ test CC" };

  /** Khóa có 1 học viên tự đăng ký (A) + 1 học viên qua ĐVLK (D) - cả 2 đã ký duyệt. */
  async function khoaDaKyDuyet(opts: { hopDongThanhLy: boolean }) {
    const f = await taoKhoaDaPheDuyet();
    await prisma.ketQuaKhoa.updateMany({
      where: { khoaId: f.khoa.id, hocVienId: { notIn: [f.datCaNhan.id, f.quaDvlk.id] } },
      data: { datHocTap: false },
    });
    if (opts.hopDongThanhLy) {
      await prisma.hopDongLienKet.update({ where: { id: f.hopDong.id }, data: { trangThai: "DA_THANH_LY" } });
    } else {
      // HP-06 "bỏ chặn thủ công" cho phép đề nghị/ký, nhưng lô vẫn phải chờ thanh lý
      await prisma.hocPhi.create({
        data: {
          hocVienId: f.quaDvlk.id,
          khoaId: f.khoa.id,
          soTienPhaiNop: 0,
          trangThai: "CHO_THANH_LY_HOP_DONG",
          boQuaKiemTra: true,
          lyDoBoQua: "Lãnh đạo duyệt đặc biệt",
        },
      });
    }
    await lapDanhSachDeNghi(f.khoa.id, NGUOI);
    await sinhSoHieu(f.khoa.id, NGUOI);
    await kyDuyetChungChi(f.khoa.id, KY);
    const ccA = await prisma.chungChi.findFirstOrThrow({ where: { khoaId: f.khoa.id, hocVienId: f.datCaNhan.id } });
    const ccD = await prisma.chungChi.findFirstOrThrow({ where: { khoaId: f.khoa.id, hocVienId: f.quaDvlk.id } });
    return { ...f, ccA, ccD };
  }

  it("chỉ trả chứng chỉ đã ký duyệt", async () => {
    const f = await taoKhoaDuDieuKien(1);
    const { daCapSo } = await sinhSoHieu(f.khoa.id, NGUOI);
    await expect(traTrucTiep(daCapSo[0].chungChiId, { ...NGUOI, nguoiNhan: "A" })).rejects.toThrow(
      SaiTrangThaiChungChiError,
    );
  });

  it("trao trực tiếp cho học viên tự đăng ký: vào sổ, Đã cấp; học viên ĐVLK không được trao trực tiếp", async () => {
    const f = await khoaDaKyDuyet({ hopDongThanhLy: true });

    await expect(traTrucTiep(f.ccA.id, { ...NGUOI, nguoiNhan: " " })).rejects.toThrow(ThieuThongTinError);
    const sau = await traTrucTiep(f.ccA.id, { ...NGUOI, nguoiNhan: "A Đạt cá nhân", ngayNhan: "2026-11-05" });
    expect([sau.trangThai, sau.kenhNhan, sau.nguoiNhan]).toEqual(["DA_CAP", "TRUC_TIEP", "A Đạt cá nhân"]);
    expect(sau.soVaoSo).toMatch(/^\D+\d{4}-\d{5}$/);

    await expect(traTrucTiep(f.ccD.id, { ...NGUOI, nguoiNhan: "D" })).rejects.toThrow(SaiKenhNhanChungChiError);
  });

  it("bàn giao theo lô chỉ sau khi hợp đồng thanh lý, kể cả khi học phí đã được bỏ chặn thủ công", async () => {
    const f = await khoaDaKyDuyet({ hopDongThanhLy: false });
    expect(f.ccD.trangThai).toBe("DA_KY_DUYET");

    await expect(banGiaoTheoLo(f.hopDong.id, { ...NGUOI, nguoiDaiDienNhan: "Đại diện X" })).rejects.toThrow(
      HopDongChuaThanhLyError,
    );
    expect((await prisma.chungChi.findUniqueOrThrow({ where: { id: f.ccD.id } })).trangThai).toBe("DA_KY_DUYET");

    await prisma.hopDongLienKet.update({ where: { id: f.hopDong.id }, data: { trangThai: "DA_THANH_LY" } });
    const { lo, soChungChi, biLoai } = await banGiaoTheoLo(f.hopDong.id, {
      ...NGUOI,
      nguoiDaiDienNhan: "Đại diện X",
      ngayBanGiao: "2026-11-10",
    });

    expect([soChungChi, biLoai]).toEqual([1, []]);
    expect(lo.maLo).toBe(`LO-${f.hopDong.maHopDong}-01`);
    const ccD = await prisma.chungChi.findUniqueOrThrow({ where: { id: f.ccD.id } });
    expect([ccD.trangThai, ccD.kenhNhan, ccD.banGiaoId]).toEqual(["DA_CAP", "BAN_GIAO_DVLK", lo.id]);
    expect(ccD.nguoiNhan).toContain("ĐVLK CC");
    // chứng chỉ của học viên tự đăng ký cùng khóa không bị gom vào lô ĐVLK
    expect((await prisma.chungChi.findUniqueOrThrow({ where: { id: f.ccA.id } })).trangThai).toBe("DA_KY_DUYET");

    await expect(banGiaoTheoLo(f.hopDong.id, { ...NGUOI, nguoiDaiDienNhan: "Đại diện X" })).rejects.toThrow(
      LoTrongError,
    );
  });

  it("số vào sổ tăng liên tiếp; sổ cấp tra cứu được theo tên/số hiệu", async () => {
    const f = await khoaDaKyDuyet({ hopDongThanhLy: true });
    const a = await traTrucTiep(f.ccA.id, { ...NGUOI, nguoiNhan: "A" });
    await banGiaoTheoLo(f.hopDong.id, { ...NGUOI, nguoiDaiDienNhan: "Đại diện" });
    const d = await prisma.chungChi.findUniqueOrThrow({ where: { id: f.ccD.id } });

    expect(soThuTu(d.soVaoSo)).toBe(soThuTu(a.soVaoSo) + 1);

    const theoTen = await soCapChungChi({ tuKhoa: "D Qua", khoaId: f.khoa.id });
    expect(theoTen.map((cc) => cc.id)).toEqual([f.ccD.id]);
    const theoSoHieu = await soCapChungChi({ tuKhoa: a.soHieu });
    expect(theoSoHieu.map((cc) => cc.id)).toEqual([f.ccA.id]);
    expect((await soCapChungChi({ khoaId: f.khoa.id })).map((cc) => cc.soVaoSo)).toEqual([a.soVaoSo, d.soVaoSo]);
  });
});
