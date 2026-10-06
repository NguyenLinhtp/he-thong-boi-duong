import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { chuyenTrangThaiLePhi } from "@/server/services/hp/hp-02-chuyen-trang-thai-le-phi";
import { xacNhanThanhToan } from "@/server/services/hp/hp-02-thanh-toan";
import { baoCaoDoanhThu } from "@/server/services/hp/hp-05-bao-cao";
import { locVaSapXepDoiSoat } from "@/server/services/hp/hp-02-doi-soat-excel";
import { catTrang } from "@/components/chung/phan-trang";
import { ChuyenTrangThaiLePhiKhongHopLeError, HocPhiQuaDonViLienKetError } from "@/server/services/hp/loi-hoc-phi";

// (bổ sung 06/10/2026 - HP-02) chuyển Đã đóng / Chưa đóng trên từng dòng bảng đối soát lệ phí

const NGUOI = { nguoiThucHienId: null, nguoiThucHienTen: "Cán bộ tài chính test" };
const loaiHinh: string[] = [];
const chuongTrinh: string[] = [];
const khoaIds: string[] = [];
const hocVienIds: string[] = [];

afterAll(async () => {
  await prisma.chungChi.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.ketQuaKhoa.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.phieuThu.deleteMany({ where: { hocPhi: { khoaId: { in: khoaIds } } } });
  await prisma.hocPhi.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: hocVienIds } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaIds } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinh } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinh } } });
});

async function taoLePhi(trangThai: "CHUA_NOP" | "MIEN_GIAM" | "CHO_THANH_LY_HOP_DONG" = "CHUA_NOP", phaiNop = 450000) {
  const lh = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH_LP_${crypto.randomUUID()}`, ten: "LH lệ phí" } });
  loaiHinh.push(lh.id);
  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_LP_${crypto.randomUUID()}`,
      ten: "CT dự thi test",
      loaiHinhBoiDuongId: lh.id,
      trangThai: "DA_BAN_HANH",
      phuongThucDangKy: "CHI_DU_THI",
    },
  });
  chuongTrinh.push(ct.id);
  const khoa = await prisma.khoa.create({ data: { maKhoa: `KH_LP_${crypto.randomUUID()}`, chuongTrinhId: ct.id, siSoToiDa: 30 } });
  khoaIds.push(khoa.id);
  const hv = await prisma.hocVien.create({ data: { maHocVien: `HV_LP_${crypto.randomUUID()}`, hoTen: "Thí sinh lệ phí" } });
  hocVienIds.push(hv.id);
  await prisma.dangKyHoc.create({ data: { hocVienId: hv.id, khoaId: khoa.id, trangThai: "CHO_DUYET" } });
  const hocPhi = await prisma.hocPhi.create({
    data: { hocVienId: hv.id, khoaId: khoa.id, soTienPhaiNop: trangThai === "CHO_THANH_LY_HOP_DONG" ? 0 : phaiNop, trangThai },
  });
  return { khoa, hv, hocPhi };
}

describe("HP-02 chuyển trạng thái lệ phí trên danh sách đối soát", () => {
  it("Chưa đóng -> Đã đóng: ghi nhận đủ lệ phí, lập phiếu thu", async () => {
    const { hocPhi } = await taoLePhi();
    const kq = await chuyenTrangThaiLePhi(hocPhi.id, "DA_DONG", null, NGUOI);
    expect("phieuThu" in kq && kq.phieuThu.soPhieu).toMatch(/^PT\d{4}\d{5}$/);
    const sau = await prisma.hocPhi.findUniqueOrThrow({ where: { id: hocPhi.id } });
    expect(sau.trangThai).toBe("DA_NOP_DU");
    expect(Number(sau.soTienDaNop)).toBe(450000);
  });

  it("nộp thiếu -> Đã đóng: chỉ ghi nhận phần còn thiếu", async () => {
    const { hocPhi } = await taoLePhi();
    await xacNhanThanhToan(hocPhi.id, { soTien: 200000, hinhThucNop: "Tiền mặt", nguoiXacNhanTen: NGUOI.nguoiThucHienTen });
    const kq = await chuyenTrangThaiLePhi(hocPhi.id, "DA_DONG", null, NGUOI);
    expect("phieuThu" in kq && Number(kq.phieuThu.soTien)).toBe(250000);
    expect((await prisma.hocPhi.findUniqueOrThrow({ where: { id: hocPhi.id } })).trangThai).toBe("DA_NOP_DU");
  });

  it("chặn chuyển Đã đóng khi đã đóng đủ hoặc thuộc diện miễn giảm", async () => {
    const { hocPhi } = await taoLePhi();
    await chuyenTrangThaiLePhi(hocPhi.id, "DA_DONG", null, NGUOI);
    await expect(chuyenTrangThaiLePhi(hocPhi.id, "DA_DONG", null, NGUOI)).rejects.toThrow(ChuyenTrangThaiLePhiKhongHopLeError);
    const mg = await taoLePhi("MIEN_GIAM");
    await expect(chuyenTrangThaiLePhi(mg.hocPhi.id, "DA_DONG", null, NGUOI)).rejects.toThrow(ChuyenTrangThaiLePhiKhongHopLeError);
    expect(await prisma.phieuThu.count({ where: { hocPhiId: hocPhi.id } })).toBe(1);
  });

  it("Đã đóng -> Chưa đóng: hủy phiếu thu (giữ số), số đã nộp về 0, doanh thu không tính phiếu hủy, ghi nhật ký", async () => {
    const { khoa, hocPhi } = await taoLePhi();
    const dong = await chuyenTrangThaiLePhi(hocPhi.id, "DA_DONG", null, NGUOI);
    const soPhieu = "phieuThu" in dong ? dong.phieuThu.soPhieu : "";
    expect((await baoCaoDoanhThu({ khoaId: khoa.id })).tongDoanhThu).toBe(450000);

    const kq = await chuyenTrangThaiLePhi(hocPhi.id, "CHUA_DONG", "Ghi nhận nhầm thí sinh", NGUOI);
    expect("phieuDaHuy" in kq && kq.phieuDaHuy).toEqual([soPhieu]);
    const sau = await prisma.hocPhi.findUniqueOrThrow({ where: { id: hocPhi.id } });
    expect(sau.trangThai).toBe("CHUA_NOP");
    expect(Number(sau.soTienDaNop)).toBe(0);
    const phieu = await prisma.phieuThu.findUniqueOrThrow({ where: { soPhieu } });
    expect(phieu.daHuy).toBe(true);
    expect(phieu.lyDoHuy).toBe("Ghi nhận nhầm thí sinh");
    const doanhThu = await baoCaoDoanhThu({ khoaId: khoa.id });
    expect(doanhThu.tongDoanhThu).toBe(0);
    expect(doanhThu.soPhieuThu).toBe(0);
    const nk = await prisma.nhatKyThaoTac.findFirst({ where: { hanhDong: "HUY_GHI_NHAN_THANH_TOAN", doiTuongId: hocPhi.id } });
    expect(nk?.chiTiet).toContain(soPhieu);

    // đóng lại sau khi hủy: phiếu mới số khác, không cấp lại số đã hủy
    const lai = await chuyenTrangThaiLePhi(hocPhi.id, "DA_DONG", null, NGUOI);
    expect("phieuThu" in lai && lai.phieuThu.soPhieu).not.toBe(soPhieu);
    expect((await baoCaoDoanhThu({ khoaId: khoa.id })).tongDoanhThu).toBe(450000);
  });

  it("chặn chuyển Chưa đóng khi thiếu lý do, đang Chưa đóng, miễn giảm hoặc qua đơn vị liên kết", async () => {
    const { hocPhi } = await taoLePhi();
    await expect(chuyenTrangThaiLePhi(hocPhi.id, "CHUA_DONG", "lý do", NGUOI)).rejects.toThrow(/đang ở trạng thái Chưa đóng/);
    await chuyenTrangThaiLePhi(hocPhi.id, "DA_DONG", null, NGUOI);
    await expect(chuyenTrangThaiLePhi(hocPhi.id, "CHUA_DONG", "   ", NGUOI)).rejects.toThrow(/lý do/);
    const mg = await taoLePhi("MIEN_GIAM");
    await expect(chuyenTrangThaiLePhi(mg.hocPhi.id, "CHUA_DONG", "lý do", NGUOI)).rejects.toThrow(/miễn giảm/);
    const lk = await taoLePhi("CHO_THANH_LY_HOP_DONG");
    await expect(chuyenTrangThaiLePhi(lk.hocPhi.id, "CHUA_DONG", "lý do", NGUOI)).rejects.toThrow(HocPhiQuaDonViLienKetError);
    expect((await prisma.hocPhi.findUniqueOrThrow({ where: { id: hocPhi.id } })).trangThai).toBe("DA_NOP_DU");
  });

  it("khóa dự thi: hủy ghi nhận lệ phí của thí sinh Chính thức thì hồ sơ trả về Hợp lệ; đã Hoàn thành thì chặn", async () => {
    const { khoa, hv, hocPhi } = await taoLePhi();
    await chuyenTrangThaiLePhi(hocPhi.id, "DA_DONG", null, NGUOI);
    await prisma.dangKyHoc.updateMany({ where: { khoaId: khoa.id, hocVienId: hv.id }, data: { trangThai: "CHINH_THUC" } });
    const kq = await chuyenTrangThaiLePhi(hocPhi.id, "CHUA_DONG", "Ngân hàng báo giao dịch lỗi", NGUOI);
    expect("traVeHopLe" in kq && kq.traVeHopLe).toBe(true);
    expect((await prisma.dangKyHoc.findFirstOrThrow({ where: { khoaId: khoa.id, hocVienId: hv.id } })).trangThai).toBe("HOP_LE");

    const b = await taoLePhi();
    await chuyenTrangThaiLePhi(b.hocPhi.id, "DA_DONG", null, NGUOI);
    await prisma.dangKyHoc.updateMany({ where: { khoaId: b.khoa.id }, data: { trangThai: "HOAN_THANH" } });
    await expect(chuyenTrangThaiLePhi(b.hocPhi.id, "CHUA_DONG", "lý do", NGUOI)).rejects.toThrow(/hoàn thành/);
    expect((await prisma.hocPhi.findUniqueOrThrow({ where: { id: b.hocPhi.id } })).trangThai).toBe("DA_NOP_DU");
  });

  it("chặn chuyển Chưa đóng khi kết quả khóa đã phê duyệt (KQ-04) hoặc thí sinh đã có văn bằng", async () => {
    const a = await taoLePhi();
    await chuyenTrangThaiLePhi(a.hocPhi.id, "DA_DONG", null, NGUOI);
    await prisma.ketQuaKhoa.create({ data: { hocVienId: a.hv.id, khoaId: a.khoa.id, daPheDuyet: true } });
    await expect(chuyenTrangThaiLePhi(a.hocPhi.id, "CHUA_DONG", "lý do", NGUOI)).rejects.toThrow(/KQ-04/);

    const b = await taoLePhi();
    await chuyenTrangThaiLePhi(b.hocPhi.id, "DA_DONG", null, NGUOI);
    await prisma.chungChi.create({ data: { hocVienId: b.hv.id, khoaId: b.khoa.id } });
    await expect(chuyenTrangThaiLePhi(b.hocPhi.id, "CHUA_DONG", "lý do", NGUOI)).rejects.toThrow(/văn bằng/);
    expect(await prisma.phieuThu.count({ where: { hocPhiId: { in: [a.hocPhi.id, b.hocPhi.id] }, daHuy: true } })).toBe(0);
  });
});

describe("HP-02 bảng đối soát trên màn hình: tìm nhanh, sắp xếp, phân trang", () => {
  const dong = (ma: string, cccd: string, hoTen: string, trangThai: string | null, ngayMinhChung: string | null, boQua = false) => ({
    hocVien: { maSinhVien: ma, soCCCD: cccd, maHocVien: `HV${ma}`, hoTen },
    hocPhi: trangThai ? { trangThai, boQuaKiemTra: boQua } : null,
    minhChung: ngayMinhChung ? { taiLenLuc: new Date(ngayMinhChung) } : null,
  });
  type D = Parameters<typeof locVaSapXepDoiSoat>[0][number];
  const ds = [
    dong("3122000001", "048000000001", "An", "DA_NOP_DU", "2026-10-03"),
    dong("3122000002", "048000000002", "Bình", "CHUA_NOP", "2026-10-01"),
    dong("3122000003", "048000000003", "Cường", "CHUA_NOP", null),
    dong("3122000004", "048000000004", "Dung", "CON_NO", "2026-10-05"),
    dong("3122000005", "048000000005", "Đức", "CHUA_NOP", "2026-10-04", true),
    dong("3122000006", "048000000006", "Giang", null, "2026-10-02"),
  ] as unknown as D[];

  it("chưa xác nhận lệ phí lên trên, trong nhóm theo minh chứng mới nhất, chưa nộp minh chứng xếp cuối nhóm", () => {
    expect(locVaSapXepDoiSoat(ds).map((d) => d.hocVien.hoTen)).toEqual(["Dung", "Giang", "Bình", "Cường", "Đức", "An"]);
  });

  it("tìm theo mã sinh viên hoặc số CCCD (bỏ khoảng trắng), không khớp thì rỗng", () => {
    expect(locVaSapXepDoiSoat(ds, " 3122000004 ").map((d) => d.hocVien.hoTen)).toEqual(["Dung"]);
    expect(locVaSapXepDoiSoat(ds, "048 000 000 002").map((d) => d.hocVien.hoTen)).toEqual(["Bình"]);
    expect(locVaSapXepDoiSoat(ds, "999")).toEqual([]);
  });

  it("20 dòng mỗi trang, trang ngoài khoảng kéo về trang hợp lệ", () => {
    const n = Array.from({ length: 45 }, (_, i) => i);
    expect(catTrang(n, undefined)).toMatchObject({ trang: 1, tongTrang: 3, tongDong: 45, tuDong: 0 });
    expect(catTrang(n, "3").dsTrang).toEqual([40, 41, 42, 43, 44]);
    expect(catTrang(n, "99").trang).toBe(3);
    expect(catTrang(n, "abc").trang).toBe(1);
    expect(catTrang([], "2")).toMatchObject({ trang: 1, tongTrang: 1, dsTrang: [] });
  });
});
