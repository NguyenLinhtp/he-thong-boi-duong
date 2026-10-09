import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  danhDauDaXuLy,
  docWebhookCasso,
  docWebhookSePay,
  ganGiaoDichVaoKhoan,
  rutGon,
  taoGiaoDichThuNghiem,
  xacThucWebhook,
  xuLyGiaoDichDen,
  XuLyGiaoDichError,
  type GiaoDichDen,
} from "@/server/services/hp/hp-02-giao-dich-ngan-hang";

// (bổ sung 08/10/2026 - HP-02) thanh toán online: tự ghi nhận lệ phí từ giao dịch chuyển khoản ngân hàng

const NGUOI = { nguoiThucHienId: null, nguoiThucHienTen: "Cán bộ tài chính test" };
const loaiHinh: string[] = [];
const chuongTrinh: string[] = [];
const khoaIds: string[] = [];
const hocVienIds: string[] = [];
const THAM_SO = ["TT_TU_DONG_GHI_NHAN", "TT_CHO_PHEP_THU_NGHIEM"];
let thamSoCu: { ma: string; giaTri: string }[] = [];

beforeAll(async () => {
  thamSoCu = await prisma.thamSoHeThong.findMany({ where: { ma: { in: THAM_SO } } });
  await prisma.thamSoHeThong.deleteMany({ where: { ma: { in: THAM_SO } } });
});

afterAll(async () => {
  await prisma.giaoDichNganHang.deleteMany({ where: { OR: [{ hocPhi: { khoaId: { in: khoaIds } } }, { noiDung: { contains: "GDTEST" } }] } });
  await prisma.phieuThu.deleteMany({ where: { hocPhi: { khoaId: { in: khoaIds } } } });
  await prisma.hocPhi.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.thanhPhanLePhi.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: hocVienIds } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaIds } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinh } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinh } } });
  await prisma.thamSoHeThong.deleteMany({ where: { ma: { in: THAM_SO } } });
  for (const t of thamSoCu) await prisma.thamSoHeThong.create({ data: { ma: t.ma, giaTri: t.giaTri } });
});

const uid = () => crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();

async function taoKhoa() {
  const lh = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH_GD_${uid()}`, ten: "LH giao dịch" } });
  loaiHinh.push(lh.id);
  const ct = await prisma.chuongTrinh.create({
    data: { maCT: `CT_GD_${uid()}`, ten: "CT dự thi", loaiHinhBoiDuongId: lh.id, trangThai: "DA_BAN_HANH", phuongThucDangKys: ["CHI_DU_THI"] },
  });
  chuongTrinh.push(ct.id);
  const khoa = await prisma.khoa.create({ data: { maKhoa: `KHGD${uid()}`, chuongTrinhId: ct.id, siSoToiDa: 50 } });
  khoaIds.push(khoa.id);
  return khoa;
}

async function taoThiSinh(khoaId: string, phaiNop = 450000, maSinhVien: string | null = `SV${uid()}`, trangThaiDk: "CHO_DUYET" | "KHONG_HOP_LE" = "CHO_DUYET") {
  const hv = await prisma.hocVien.create({ data: { maHocVien: `HV${uid()}`, hoTen: "Thí sinh chuyển khoản", maSinhVien } });
  hocVienIds.push(hv.id);
  await prisma.dangKyHoc.create({ data: { hocVienId: hv.id, khoaId, trangThai: trangThaiDk } });
  const hocPhi = await prisma.hocPhi.create({ data: { hocVienId: hv.id, khoaId, soTienPhaiNop: phaiNop } });
  return { hv, hocPhi };
}

const giaoDich = (soTien: number, noiDung: string, them: Partial<GiaoDichDen> = {}): GiaoDichDen => ({
  nguon: "SEPAY",
  maGiaoDichNguon: uid(),
  soTaiKhoan: null,
  soTien,
  noiDung,
  maThamChieu: null,
  thoiGian: new Date(),
  laTienVao: true,
  duLieuGoc: null,
  ...them,
});

describe("HP-02 đọc webhook ngân hàng", () => {
  it("SePay: đọc số tiền, nội dung, giờ Việt Nam; giao dịch tiền ra đánh dấu không phải tiền vào", () => {
    const [gd] = docWebhookSePay({
      id: 92704,
      gateway: "Vietcombank",
      transactionDate: "2026-10-08 14:02:37",
      accountNumber: "0123499999",
      content: "KH2026006 SV001",
      transferType: "in",
      transferAmount: 1100000,
      referenceCode: "MBVCB.3278907687",
    });
    expect(gd).toMatchObject({ nguon: "SEPAY", maGiaoDichNguon: "92704", soTien: 1100000, noiDung: "KH2026006 SV001", laTienVao: true });
    expect(gd.thoiGian.toISOString()).toBe("2026-10-08T07:02:37.000Z");
    expect(docWebhookSePay({ id: 1, transferAmount: 5, transferType: "out" })[0].laTienVao).toBe(false);
    expect(() => docWebhookSePay({ content: "x" })).toThrow();
  });

  it("Casso: nhận data dạng mảng hoặc 1 đối tượng; số tiền âm là tiền ra", () => {
    const ds = docWebhookCasso({ error: 0, data: [{ id: 1, tid: "T1", description: "KH1 SV1", amount: 450000, when: "2026-10-08 08:00:00" }, { id: 2, amount: -10 }] });
    expect(ds.map((g) => [g.maGiaoDichNguon, g.soTien, g.laTienVao])).toEqual([
      ["1", 450000, true],
      ["2", 10, false],
    ]);
    expect(docWebhookCasso({ error: 0, data: { id: 3, amount: 1, description: "a" } })).toHaveLength(1);
  });

  it("xác thực bằng khóa NGAN_HANG_WEBHOOK_KEY: sai/thiếu khóa hoặc chưa cấu hình khóa đều bị từ chối", () => {
    const cu = process.env.NGAN_HANG_WEBHOOK_KEY;
    process.env.NGAN_HANG_WEBHOOK_KEY = "bi-mat";
    expect(xacThucWebhook("SEPAY", new Headers({ Authorization: "Apikey bi-mat" }))).toBe(true);
    expect(xacThucWebhook("SEPAY", new Headers({ Authorization: "Apikey sai" }))).toBe(false);
    expect(xacThucWebhook("CASSO", new Headers({ "secure-token": "bi-mat" }))).toBe(true);
    expect(xacThucWebhook("CASSO", new Headers())).toBe(false);
    delete process.env.NGAN_HANG_WEBHOOK_KEY;
    expect(xacThucWebhook("SEPAY", new Headers({ Authorization: "Apikey " }))).toBe(false);
    if (cu !== undefined) process.env.NGAN_HANG_WEBHOOK_KEY = cu;
  });

  it("rút gọn nội dung: bỏ dấu, khoảng trắng, ký tự lạ, viết hoa", () => {
    expect(rutGon("MBVCB.123.kh2026006 sv-001.CT từ ...")).toBe("MBVCB123KH2026006SV001CTTU");
  });
});

describe("HP-02 tự ghi nhận giao dịch chuyển khoản", () => {
  it("chuyển đúng số + nội dung (ngân hàng chèn tiền tố, bỏ khoảng trắng): Đã đóng, lập biên lai, ghi nhật ký", async () => {
    const khoa = await taoKhoa();
    const { hv, hocPhi } = await taoThiSinh(khoa.id);
    const gd = await xuLyGiaoDichDen(giaoDich(450000, `MBVCB.99.${khoa.maKhoa.toLowerCase()}${hv.maSinhVien}.CT tu NGUYEN VAN A`));
    expect(gd?.trangThai).toBe("DA_GHI_NHAN");
    expect(gd?.hocPhiId).toBe(hocPhi.id);
    const sau = await prisma.hocPhi.findUniqueOrThrow({ where: { id: hocPhi.id }, include: { phieuThus: true } });
    expect(sau.trangThai).toBe("DA_NOP_DU");
    expect(sau.phieuThus).toHaveLength(1);
    expect(sau.phieuThus[0].soPhieu).toBe(gd?.soPhieuThu);
    expect(sau.phieuThus[0].hinhThucNop).toMatch(/tự động/);
    const nk = await prisma.nhatKyThaoTac.findFirst({ where: { hanhDong: "TU_DONG_GHI_NHAN_CHUYEN_KHOAN", doiTuongId: hocPhi.id } });
    expect(nk?.chiTiet).toContain(gd!.soPhieuThu!);
  });

  it("dịch vụ gửi lại cùng giao dịch: không ghi nhận/lập biên lai lần 2", async () => {
    const khoa = await taoKhoa();
    const { hv, hocPhi } = await taoThiSinh(khoa.id, 900000);
    const g = giaoDich(300000, `${khoa.maKhoa} ${hv.maSinhVien}`);
    const a = await xuLyGiaoDichDen(g);
    const [b, c] = await Promise.all([xuLyGiaoDichDen(g), xuLyGiaoDichDen(g)]);
    expect(b?.id).toBe(a?.id);
    expect(c?.id).toBe(a?.id);
    expect(await prisma.phieuThu.count({ where: { hocPhiId: hocPhi.id } })).toBe(1);
    expect(Number((await prisma.hocPhi.findUniqueOrThrow({ where: { id: hocPhi.id } })).soTienDaNop)).toBe(300000);
  });

  it("chuyển thiếu: ghi nhận số đã chuyển, khoản Còn nợ; chuyển thừa: ghi nhận phần còn phải nộp, phần thừa chờ xử lý", async () => {
    const khoa = await taoKhoa();
    const { hv, hocPhi } = await taoThiSinh(khoa.id, 450000);
    const thieu = await xuLyGiaoDichDen(giaoDich(200000, `${khoa.maKhoa} ${hv.maSinhVien}`));
    expect(thieu?.trangThai).toBe("DA_GHI_NHAN");
    expect((await prisma.hocPhi.findUniqueOrThrow({ where: { id: hocPhi.id } })).trangThai).toBe("CON_NO");
    const thua = await xuLyGiaoDichDen(giaoDich(500000, `${khoa.maKhoa} ${hv.maSinhVien}`));
    expect(thua?.trangThai).toBe("THUA_TIEN");
    expect(Number(thua?.soTienGhiNhan)).toBe(250000);
    expect(thua?.ghiChu).toContain("250.000");
    const sau = await prisma.hocPhi.findUniqueOrThrow({ where: { id: hocPhi.id } });
    expect([sau.trangThai, Number(sau.soTienDaNop)]).toEqual(["DA_NOP_DU", 450000]);
  });

  it("thí sinh không có mã SV khớp theo mã học viên; mã trùng phần đầu thì lấy mã khớp dài nhất", async () => {
    const khoa = await taoKhoa();
    const tuDo = await taoThiSinh(khoa.id, 450000, null);
    expect((await xuLyGiaoDichDen(giaoDich(450000, `${khoa.maKhoa} ${tuDo.hv.maHocVien}`)))?.hocPhiId).toBe(tuDo.hocPhi.id);

    const goc = `SVGD${uid()}`;
    const ngan = await taoThiSinh(khoa.id, 450000, goc);
    const dai = await taoThiSinh(khoa.id, 450000, `${goc}2`);
    expect((await xuLyGiaoDichDen(giaoDich(450000, `${khoa.maKhoa} ${goc}2`)))?.hocPhiId).toBe(dai.hocPhi.id);
    expect((await prisma.hocPhi.findUniqueOrThrow({ where: { id: ngan.hocPhi.id } })).trangThai).toBe("CHUA_NOP");
  });

  it("khóa có thành phần lệ phí: phân bổ vào phần bắt buộc trước, chung 1 biên lai", async () => {
    const khoa = await taoKhoa();
    const { hv, hocPhi } = await taoThiSinh(khoa.id, 1100000);
    const thi = await prisma.thanhPhanLePhi.create({ data: { khoaId: khoa.id, ten: "Đăng ký thi", batBuoc: true, mucSinhVien: 700000, thuTu: 1 } });
    const on = await prisma.thanhPhanLePhi.create({ data: { khoaId: khoa.id, ten: "Đăng ký ôn thi", batBuoc: false, mucSinhVien: 400000, thuTu: 0 } });
    await prisma.hocPhiThanhPhan.createMany({
      data: [
        { hocPhiId: hocPhi.id, thanhPhanId: thi.id, soTienPhaiNop: 700000 },
        { hocPhiId: hocPhi.id, thanhPhanId: on.id, soTienPhaiNop: 400000 },
      ],
    });
    const gd = await xuLyGiaoDichDen(giaoDich(800000, `${khoa.maKhoa} ${hv.maSinhVien}`));
    expect(gd?.trangThai).toBe("DA_GHI_NHAN");
    const dong = await prisma.hocPhiThanhPhan.findMany({ where: { hocPhiId: hocPhi.id }, include: { thanhPhan: true } });
    expect(Object.fromEntries(dong.map((d) => [d.thanhPhan.ten, [d.trangThai, Number(d.soTienDaNop)]]))).toEqual({
      "Đăng ký thi": ["DA_NOP_DU", 700000],
      "Đăng ký ôn thi": ["CON_NO", 100000],
    });
    const phieu = await prisma.phieuThu.findMany({ where: { hocPhiId: hocPhi.id }, include: { chiTiets: true } });
    expect(phieu).toHaveLength(1);
    expect(phieu[0].chiTiets).toHaveLength(2);
  });

  it("không tự ghi nhận: sai nội dung, khoản đã đóng đủ, hồ sơ không hợp lệ, sai tài khoản nhận, đang tắt tự động; tiền ra bỏ qua", async () => {
    const khoa = await taoKhoa();
    const { hv, hocPhi } = await taoThiSinh(khoa.id);
    const lech = await xuLyGiaoDichDen(giaoDich(450000, "GDTEST chuyen tien hoc phi"));
    expect([lech?.trangThai, lech?.hocPhiId]).toEqual(["CAN_XU_LY", null]);
    expect(lech?.ghiChu).toMatch(/mã khóa/);
    const saiMa = await xuLyGiaoDichDen(giaoDich(450000, `${khoa.maKhoa} SVKHONGCO`));
    expect(saiMa?.trangThai).toBe("CAN_XU_LY");

    await xuLyGiaoDichDen(giaoDich(450000, `${khoa.maKhoa} ${hv.maSinhVien}`));
    const lan2 = await xuLyGiaoDichDen(giaoDich(450000, `${khoa.maKhoa} ${hv.maSinhVien}`));
    expect([lan2?.trangThai, lan2?.ghiChu]).toEqual(["CAN_XU_LY", "khoản đã đóng đủ trước đó"]);
    expect(await prisma.phieuThu.count({ where: { hocPhiId: hocPhi.id } })).toBe(1);

    const huy = await taoThiSinh(khoa.id, 450000, `SV${uid()}`, "KHONG_HOP_LE");
    const gdHuy = await xuLyGiaoDichDen(giaoDich(450000, `${khoa.maKhoa} ${huy.hv.maSinhVien}`));
    expect([gdHuy?.trangThai, gdHuy?.ghiChu]).toEqual(["CAN_XU_LY", "hồ sơ đăng ký đã bị từ chối/hủy"]);

    const b = await taoThiSinh(khoa.id);
    const tkNhan = await prisma.thamSoHeThong.findUnique({ where: { ma: "NH_SO_TAI_KHOAN" } });
    if (tkNhan) {
      const saiTk = await xuLyGiaoDichDen(giaoDich(450000, `${khoa.maKhoa} ${b.hv.maSinhVien}`, { soTaiKhoan: `${tkNhan.giaTri}9` }));
      expect(saiTk?.ghiChu).toMatch(/không phải tài khoản nhận/);
    }
    await prisma.thamSoHeThong.create({ data: { ma: "TT_TU_DONG_GHI_NHAN", giaTri: "0" } });
    const tat = await xuLyGiaoDichDen(giaoDich(450000, `${khoa.maKhoa} ${b.hv.maSinhVien}`));
    await prisma.thamSoHeThong.delete({ where: { ma: "TT_TU_DONG_GHI_NHAN" } });
    expect(tat?.trangThai).toBe("CAN_XU_LY");
    expect(await xuLyGiaoDichDen(giaoDich(450000, `${khoa.maKhoa} ${b.hv.maSinhVien}`, { laTienVao: false }))).toBeNull();
    expect((await prisma.hocPhi.findUniqueOrThrow({ where: { id: b.hocPhi.id } })).trangThai).toBe("CHUA_NOP");
  });
});

describe("HP-02 cán bộ tài chính xử lý giao dịch chưa tự ghi nhận", () => {
  it("gán giao dịch sai nội dung vào thí sinh (theo mã SV hoặc CCCD): ghi nhận + biên lai; không gán lại lần 2", async () => {
    const khoa = await taoKhoa();
    const { hv, hocPhi } = await taoThiSinh(khoa.id);
    const gd = await xuLyGiaoDichDen(giaoDich(450000, "GDTEST nop le phi thi"));
    await expect(ganGiaoDichVaoKhoan(gd!.id, { maKhoa: khoa.maKhoa, ma: "khong-co" }, NGUOI)).rejects.toThrow(XuLyGiaoDichError);
    const sau = await ganGiaoDichVaoKhoan(gd!.id, { maKhoa: khoa.maKhoa, ma: hv.maSinhVien! }, NGUOI);
    expect([sau.trangThai, sau.hocPhiId, sau.xuLyBoiTen]).toEqual(["DA_XU_LY", hocPhi.id, NGUOI.nguoiThucHienTen]);
    expect((await prisma.hocPhi.findUniqueOrThrow({ where: { id: hocPhi.id } })).trangThai).toBe("DA_NOP_DU");
    await expect(ganGiaoDichVaoKhoan(gd!.id, { maKhoa: khoa.maKhoa, ma: hv.maSinhVien! }, NGUOI)).rejects.toThrow(/chờ xử lý/);
    expect(await prisma.phieuThu.count({ where: { hocPhiId: hocPhi.id } })).toBe(1);
  });

  it("không gán vào khoản đã đóng đủ; đánh dấu đã xử lý bắt buộc ghi chú, không xử lý lại giao dịch đã ghi nhận", async () => {
    const khoa = await taoKhoa();
    const { hv } = await taoThiSinh(khoa.id);
    const ok = await xuLyGiaoDichDen(giaoDich(450000, `${khoa.maKhoa} ${hv.maSinhVien}`));
    const lech = await xuLyGiaoDichDen(giaoDich(450000, "GDTEST chuyen nham"));
    await expect(ganGiaoDichVaoKhoan(lech!.id, { maKhoa: khoa.maKhoa, ma: hv.maSinhVien! }, NGUOI)).rejects.toThrow(/đã đóng đủ/);
    await expect(danhDauDaXuLy(lech!.id, "  ", NGUOI)).rejects.toThrow(/ghi chú/);
    const xong = await danhDauDaXuLy(lech!.id, "Đã hoàn tiền cho người chuyển nhầm", NGUOI);
    expect(xong.trangThai).toBe("DA_XU_LY");
    expect(xong.ghiChu).toContain("Đã hoàn tiền");
    await expect(danhDauDaXuLy(ok!.id, "x", NGUOI)).rejects.toThrow(/chờ xử lý/);
  });

  it("giao dịch thử nghiệm chỉ tạo được khi bật TT_CHO_PHEP_THU_NGHIEM = 1, đi đúng luồng tự động", async () => {
    const khoa = await taoKhoa();
    const { hv, hocPhi } = await taoThiSinh(khoa.id);
    await expect(taoGiaoDichThuNghiem({ soTien: 450000, noiDung: `${khoa.maKhoa} ${hv.maSinhVien}` }, NGUOI)).rejects.toThrow(/TT_CHO_PHEP_THU_NGHIEM/);
    await prisma.thamSoHeThong.create({ data: { ma: "TT_CHO_PHEP_THU_NGHIEM", giaTri: "1" } });
    const gd = await taoGiaoDichThuNghiem({ soTien: 450000, noiDung: `${khoa.maKhoa} ${hv.maSinhVien}` }, NGUOI);
    expect([gd.nguon, gd.trangThai]).toEqual(["THU_NGHIEM", "DA_GHI_NHAN"]);
    expect((await prisma.hocPhi.findUniqueOrThrow({ where: { id: hocPhi.id } })).trangThai).toBe("DA_NOP_DU");
  });
});
