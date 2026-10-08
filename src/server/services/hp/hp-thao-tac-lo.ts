import { prisma } from "@/lib/db/prisma";
import type { NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";
import { chuanHoaDanhSachId, LoKhongHopLeError, xuLyLo, type KetQuaLo } from "@/server/services/chung/xu-ly-lo";
import { chuyenTrangThaiLePhi, xacNhanCacThanhPhan, type TrangThaiDongPhi } from "@/server/services/hp/hp-02-chuyen-trang-thai-le-phi";
import { xacNhanMienGiam } from "@/server/services/hp/hp-02-thanh-toan";
import { datHanNop, guiNhacNoHocPhi } from "@/server/services/hp/hp-03-cong-no";
import { boQuaDieuKienHocPhi } from "@/server/services/hp/hp-06-dieu-kien";

/**
 * (bổ sung 07/10/2026) Thao tác hàng loạt của cán bộ tài chính trên các danh sách học phí/lệ phí
 * của 1 khóa: chuyển Đã đóng / Chưa đóng (HP-02, theo cả khoản hoặc theo 1 thành phần lệ phí),
 * miễn giảm (HP-02), đặt hạn nộp / gửi nhắc nợ (HP-03), bỏ chặn điều kiện (HP-06). Chỉ xử lý khoản
 * thuộc đúng khóa; mỗi khoản áp đủ quy tắc như thao tác từng dòng (vd. Đã đóng -> Chưa đóng bắt
 * buộc lý do, hủy phiếu thu), khoản bị chặn được báo lại kèm lý do.
 */
const CON_NO = ["CHUA_NOP", "CON_NO"];
const QUA_DVLK = ["CHO_THANH_LY_HOP_DONG", "DA_HOAN_TAT"];
const XONG = ["DA_NOP_DU", "MIEN_GIAM"];

async function hocPhiCuaKhoa(khoaId: string, ids: string[]) {
  const ds = chuanHoaDanhSachId(ids);
  const dsHocPhi = await prisma.hocPhi.findMany({
    where: { id: { in: ds }, khoaId },
    include: {
      hocVien: { select: { hoTen: true, maHocVien: true, maSinhVien: true } },
      thanhPhans: { include: { thanhPhan: { select: { id: true, ten: true, thuTu: true } } } },
    },
  });
  const theoId = new Map(dsHocPhi.map((h) => [h.id, h]));
  return { ds: ds.map((id) => theoId.get(id)).filter((h) => h !== undefined), thieu: ds.length - dsHocPhi.length };
}

const tenHocPhi = (h: { hocVien: { hoTen: string; maHocVien: string; maSinhVien: string | null } }) =>
  `${h.hocVien.hoTen} (${h.hocVien.maSinhVien ?? h.hocVien.maHocVien})`;

/**
 * HP-02 trên bảng đối soát: `thanhPhanId` = 1 thành phần lệ phí (vd. chỉ phần thi), null = cả khoản
 * (khóa có thành phần: Đã đóng ghi nhận lần lượt các phần thí sinh đã chọn còn chưa đóng, mỗi phần 1
 * phiếu thu; Chưa đóng hủy ghi nhận mọi phần đã có tiền).
 */
export async function chuyenLePhiLo(
  khoaId: string,
  ids: string[],
  trangThai: TrangThaiDongPhi,
  thanhPhanId: string | null | undefined,
  lyDo: string | null | undefined,
  nguoi: NguoiThucHien,
): Promise<KetQuaLo> {
  if (trangThai !== "DA_DONG" && trangThai !== "CHUA_DONG") throw new LoKhongHopLeError("Trạng thái lệ phí không hợp lệ");
  const lyDoGon = (lyDo ?? "").trim();
  if (trangThai === "CHUA_DONG" && !lyDoGon) throw new LoKhongHopLeError("Cần nhập lý do hủy ghi nhận đã đóng");
  const { ds, thieu } = await hocPhiCuaKhoa(khoaId, ids);
  return xuLyLo(
    ds,
    tenHocPhi,
    async (h) => {
      const coThanhPhan = h.thanhPhans.length > 0;
      if (thanhPhanId && !coThanhPhan) throw new LoKhongHopLeError("khoản lệ phí không chia thành phần");
      const dsPhan = [...h.thanhPhans].sort((a, b) => a.thanhPhan.thuTu - b.thanhPhan.thuTu);
      const chon = thanhPhanId ? dsPhan.filter((p) => p.thanhPhanId === thanhPhanId) : dsPhan;
      if (thanhPhanId && chon.length === 0) throw new LoKhongHopLeError("thí sinh không đăng ký thành phần này");

      if (trangThai === "CHUA_DONG") {
        // thành phần cụ thể: hủy riêng phần đó; cả khoản: service hủy mọi phần đã có tiền
        const kq = await chuyenTrangThaiLePhi(h.id, "CHUA_DONG", lyDoGon, nguoi, thanhPhanId ? chon[0].id : null);
        if (!("phieuDaHuy" in kq) || kq.phieuDaHuy.length === 0) return undefined;
        const thay = "phieuThayThe" in kq && kq.phieuThayThe && kq.phieuThayThe.length > 0 ? `; lập thay ${kq.phieuThayThe.join(", ")}` : "";
        return `hủy biên lai ${kq.phieuDaHuy.join(", ")}${thay}`;
      }
      if (!coThanhPhan) {
        const kq = await chuyenTrangThaiLePhi(h.id, "DA_DONG", null, nguoi);
        return "phieuThu" in kq ? `phiếu thu ${kq.phieuThu.soPhieu}` : undefined;
      }
      const canGhi = chon.filter((p) => !XONG.includes(p.trangThai));
      if (canGhi.length === 0) {
        throw new LoKhongHopLeError(thanhPhanId ? `"${chon[0].thanhPhan.ten}" đã đóng đủ hoặc miễn giảm` : "thí sinh đã đóng đủ các phần đã đăng ký");
      }
      // (sửa 07/10/2026) các phần đóng trong cùng lần -> 1 biên lai chung
      const kq = await xacNhanCacThanhPhan(h.id, canGhi.map((p) => p.id), nguoi);
      return `biên lai ${kq.phieuThu.soPhieu} (${canGhi.map((p) => p.thanhPhan.ten).join(", ")})`;
    },
    thieu,
  );
}

export async function mienGiamLo(khoaId: string, ids: string[], lyDo: string | null | undefined, nguoi: NguoiThucHien): Promise<KetQuaLo> {
  const { ds, thieu } = await hocPhiCuaKhoa(khoaId, ids);
  return xuLyLo(
    ds,
    tenHocPhi,
    async (h) => {
      if (!CON_NO.includes(h.trangThai)) throw new LoKhongHopLeError("khoản không còn nợ (đã nộp đủ, miễn giảm hoặc qua đơn vị liên kết)");
      await xacNhanMienGiam(h.id, {
        lyDo: (lyDo ?? "").trim() || "Miễn giảm theo chính sách khóa",
        nguoiXacNhanId: nguoi.nguoiThucHienId,
        nguoiXacNhanTen: nguoi.nguoiThucHienTen,
      });
    },
    thieu,
  );
}

export async function datHanNopLo(khoaId: string, ids: string[], hanNop: string): Promise<KetQuaLo> {
  const ngay = /^\d{4}-\d{2}-\d{2}$/.test(hanNop ?? "") ? new Date(hanNop) : null;
  if (!ngay || Number.isNaN(ngay.getTime())) throw new LoKhongHopLeError("Chưa chọn hạn nộp");
  const { ds, thieu } = await hocPhiCuaKhoa(khoaId, ids);
  return xuLyLo(
    ds,
    tenHocPhi,
    async (h) => {
      if (!CON_NO.includes(h.trangThai)) throw new LoKhongHopLeError("khoản không còn nợ");
      await datHanNop(h.id, ngay);
    },
    thieu,
  );
}

export async function nhacNoLo(khoaId: string, ids: string[]): Promise<KetQuaLo> {
  const { ds, thieu } = await hocPhiCuaKhoa(khoaId, ids);
  return xuLyLo(
    ds,
    tenHocPhi,
    async (h) => {
      if (!CON_NO.includes(h.trangThai)) throw new LoKhongHopLeError("khoản không còn nợ");
      await guiNhacNoHocPhi(h.id);
    },
    thieu,
  );
}

export async function boQuaDieuKienLo(khoaId: string, ids: string[], lyDo: string | null | undefined, nguoi: NguoiThucHien): Promise<KetQuaLo> {
  const lyDoGon = (lyDo ?? "").trim();
  if (!lyDoGon) throw new LoKhongHopLeError("Cần nhập lý do bỏ chặn (lãnh đạo phê duyệt)");
  const { ds, thieu } = await hocPhiCuaKhoa(khoaId, ids);
  return xuLyLo(
    ds,
    tenHocPhi,
    async (h) => {
      if (QUA_DVLK.includes(h.trangThai)) throw new LoKhongHopLeError("học viên qua đơn vị liên kết - xét theo thanh lý hợp đồng");
      if (h.boQuaKiemTra) throw new LoKhongHopLeError("đã được bỏ chặn trước đó");
      if (!CON_NO.includes(h.trangThai)) throw new LoKhongHopLeError("khoản không còn nợ");
      await boQuaDieuKienHocPhi(h.id, { lyDo: lyDoGon, nguoiPheDuyetId: nguoi.nguoiThucHienId, nguoiPheDuyetTen: nguoi.nguoiThucHienTen });
    },
    thieu,
  );
}
