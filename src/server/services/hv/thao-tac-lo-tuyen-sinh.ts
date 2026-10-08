import { prisma } from "@/lib/db/prisma";
import type { NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";
import { chuanHoaDanhSachId, LoKhongHopLeError, xuLyLo, type KetQuaLo } from "@/server/services/chung/xu-ly-lo";
import { xacNhanNopGiay } from "@/server/services/hv/hv-02-xac-nhan-nop-giay";
import { thamDinhHoSo, type KetQuaThamDinh } from "@/server/services/hv/hv-06-tham-dinh";
import { xetDuyetDanhSachChinhThuc } from "@/server/services/hv/hv-07-xet-duyet-chinh-thuc";
import { chuyenHocVienSangKhoa, ghiNhanThoiHoc, xoaHocVienKhoiKhoa } from "@/server/services/hv/hv-09-quan-ly-danh-sach-khoa";

/**
 * (bổ sung 07/10/2026) Thao tác hàng loạt trên các danh sách tuyển sinh của 1 khóa (cán bộ đào
 * tạo): xác nhận nộp giấy (HV-02), thẩm định (HV-06), xét duyệt chính thức (HV-07), thôi học /
 * chuyển khóa / xóa khỏi khóa (HV-09). Chỉ xử lý hồ sơ thuộc đúng khóa; mỗi hồ sơ áp đủ quy tắc
 * như thao tác từng dòng, hồ sơ bị chặn được báo lại kèm lý do.
 */
async function hoSoCuaKhoa(khoaId: string, ids: string[]) {
  const ds = chuanHoaDanhSachId(ids);
  const dsDangKy = await prisma.dangKyHoc.findMany({
    where: { id: { in: ds }, khoaId },
    select: { id: true, trangThai: true, hocVien: { select: { hoTen: true, maHocVien: true } } },
  });
  // giữ thứ tự đã chọn
  const theoId = new Map(dsDangKy.map((d) => [d.id, d]));
  return { ds: ds.map((id) => theoId.get(id)).filter((d) => d !== undefined), thieu: ds.length - dsDangKy.length };
}

const tenHoSo = (d: { hocVien: { hoTen: string; maHocVien: string } }) => `${d.hocVien.hoTen} (${d.hocVien.maHocVien})`;

export async function xacNhanNopGiayLo(khoaId: string, ids: string[]): Promise<KetQuaLo> {
  const { ds, thieu } = await hoSoCuaKhoa(khoaId, ids);
  return xuLyLo(ds, tenHoSo, async (d) => void (await xacNhanNopGiay(d.id)), thieu);
}

export async function thamDinhLo(
  khoaId: string,
  ids: string[],
  ketQua: KetQuaThamDinh,
  lyDo: string | null | undefined,
  nguoi: NguoiThucHien,
): Promise<KetQuaLo> {
  if (ketQua !== "HOP_LE" && ketQua !== "KHONG_HOP_LE") throw new LoKhongHopLeError("Kết quả thẩm định không hợp lệ");
  const ghiChu = (lyDo ?? "").trim() || null;
  // như thẩm định từ tệp (HV-06): Không hợp lệ phải có lý do
  if (ketQua === "KHONG_HOP_LE" && !ghiChu) throw new LoKhongHopLeError("Cần nhập lý do Không hợp lệ");
  const { ds, thieu } = await hoSoCuaKhoa(khoaId, ids);
  return xuLyLo(ds, tenHoSo, async (d) => void (await thamDinhHoSo(d.id, ketQua, ghiChu, nguoi)), thieu);
}

/** HV-07: đặc tả chặn cả lô (sĩ số, chưa xác nhận lệ phí) - không xử lý từng người. */
export async function xetDuyetLo(khoaId: string, ids: string[], nguoi: NguoiThucHien): Promise<KetQuaLo> {
  const ds = chuanHoaDanhSachId(ids);
  try {
    await xetDuyetDanhSachChinhThuc(khoaId, ds, nguoi);
    return { thanhCong: ds.length, loi: [], ghiChu: [] };
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return { thanhCong: 0, loi: [{ ten: `Cả ${ds.length} hồ sơ (chặn cả lô)`, loi: error.message }], ghiChu: [] };
  }
}

export async function thoiHocLo(khoaId: string, ids: string[], lyDo: string | null | undefined, nguoi: NguoiThucHien): Promise<KetQuaLo> {
  const { ds, thieu } = await hoSoCuaKhoa(khoaId, ids);
  return xuLyLo(
    ds,
    tenHoSo,
    async (d) => {
      if (d.trangThai === "THOI_HOC") throw new LoKhongHopLeError("đã ghi nhận thôi học trước đó");
      await ghiNhanThoiHoc(d.id, (lyDo ?? "").trim() || null, nguoi);
    },
    thieu,
  );
}

export async function xoaKhoiKhoaLo(khoaId: string, ids: string[], lyDo: string | null | undefined, nguoi: NguoiThucHien): Promise<KetQuaLo> {
  const { ds, thieu } = await hoSoCuaKhoa(khoaId, ids);
  return xuLyLo(ds, tenHoSo, async (d) => void (await xoaHocVienKhoiKhoa(d.id, (lyDo ?? "").trim() || null, nguoi)), thieu);
}

export async function chuyenKhoaLo(
  khoaId: string,
  ids: string[],
  khoaMoiId: string,
  lyDo: string | null | undefined,
  nguoi: NguoiThucHien,
): Promise<KetQuaLo> {
  if (!khoaMoiId) throw new LoKhongHopLeError("Chưa chọn khóa chuyển đến");
  const { ds, thieu } = await hoSoCuaKhoa(khoaId, ids);
  return xuLyLo(ds, tenHoSo, async (d) => void (await chuyenHocVienSangKhoa(d.id, khoaMoiId, (lyDo ?? "").trim() || null, nguoi)), thieu);
}
