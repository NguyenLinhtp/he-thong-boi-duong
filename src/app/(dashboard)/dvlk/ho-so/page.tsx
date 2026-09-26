import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { hoSoCuaDonVi } from "@/server/services/dvlk/dvlk-04-tiep-nhan";
import { KhongPhaiTaiKhoanDvlkError } from "@/server/services/dvlk/loi-dvlk";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { NHAN_TRANG_THAI_HO_SO, NHAN_TRANG_THAI_HOP_DONG } from "../../don-vi-lien-ket/nhan";
import { FormXacNhanThuHoSo, ID_FORM_XAC_NHAN } from "../../don-vi-lien-ket/form-xac-nhan-thu-ho-so";
import { xacNhanThuHoSoDvlkAction } from "./actions";

const TRANG_THAI_LOC = ["CHO_NOP_GIAY", "DA_NOP_GIAY", "HUY_QUA_HAN_NOP_GIAY", "HOP_LE", "KHONG_HOP_LE", "CHINH_THUC", "HOAN_THANH", "THOI_HOC"] as const;

async function coQuyen(maCN: string): Promise<boolean> {
  try {
    await requirePermission(maCN);
    return true;
  } catch (error) {
    if (error instanceof KhongCoQuyenError) return false;
    throw error;
  }
}

// DVLK-04 (tiếp nhận): cán bộ đơn vị liên kết xem hồ sơ thuộc các hợp đồng của đơn vị mình
export default async function HoSoDonViLienKetPage({
  searchParams,
}: {
  searchParams: Promise<{ hopDong?: string; trangThai?: string; q?: string }>;
}) {
  let phien;
  try {
    phien = await requirePermission("DVLK-04");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <p className="p-6 text-destructive">{error.message}</p>;
    }
    throw error;
  }

  const { hopDong, trangThai, q } = await searchParams;
  let duLieu;
  try {
    duLieu = await hoSoCuaDonVi(phien.userId, {
      hopDongId: hopDong,
      tuKhoa: q,
      trangThai: (TRANG_THAI_LOC as readonly string[]).includes(trangThai ?? "")
        ? (trangThai as (typeof TRANG_THAI_LOC)[number])
        : null,
    });
  } catch (error) {
    if (error instanceof KhongPhaiTaiKhoanDvlkError) return <p className="p-6 text-destructive">{error.message}</p>;
    throw error;
  }
  const { donVi, dsHopDong, dsHoSo } = duLieu;
  const hopDongTheoId = new Map(dsHopDong.map((hd) => [hd.id, hd]));
  const choPhepDVLK05 = await coQuyen("DVLK-05");
  // hợp đồng đã thanh lý không nhận xác nhận thu thêm
  const choThu = (hs: (typeof dsHoSo)[number]) =>
    hs.trangThai === "CHO_NOP_GIAY" && hopDongTheoId.get(hs.hopDongLienKetId!)?.trangThai === "DANG_TRIEN_KHAI";

  return (
    <main className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">
          DVLK-04 · Hồ sơ học viên qua đơn vị {donVi.ten}
        </h1>
        <Link href="/dvlk/dang-ky" className="text-sm underline">
          Đăng ký hộ học viên (4a) →
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        Gồm hồ sơ đơn vị đăng ký hộ và hồ sơ học viên tự đăng ký trực tuyến chọn đơn vị thu hồ sơ giấy.
        Học viên in đơn, ký và nộp bản giấy về đơn vị trước hạn.
      </p>

      {choPhepDVLK05 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">DVLK-05 · Xác nhận đã thu hồ sơ giấy, gửi về trường theo lô</h2>
          <p className="text-xs text-muted-foreground">
            Hồ sơ chưa được xác nhận thu trước hạn nộp giấy sẽ tự động bị hủy đăng ký.
          </p>
          <FormXacNhanThuHoSo action={xacNhanThuHoSoDvlkAction} soChoThu={dsHoSo.filter(choThu).length} />
        </section>
      )}

      <form method="get" className="flex flex-wrap items-end gap-2">
        <select name="hopDong" defaultValue={hopDong ?? ""} className="h-8 rounded-lg border px-2 text-sm">
          <option value="">Mọi hợp đồng / khóa</option>
          {dsHopDong.map((hd) => (
            <option key={hd.id} value={hd.id}>
              {hd.maHopDong} · khóa {hd.khoa.maKhoa} ({NHAN_TRANG_THAI_HOP_DONG[hd.trangThai]})
            </option>
          ))}
        </select>
        <select name="trangThai" defaultValue={trangThai ?? ""} className="h-8 rounded-lg border px-2 text-sm">
          <option value="">Mọi trạng thái hồ sơ</option>
          {TRANG_THAI_LOC.map((tt) => (
            <option key={tt} value={tt}>
              {NHAN_TRANG_THAI_HO_SO[tt]}
            </option>
          ))}
        </select>
        <Input name="q" defaultValue={q ?? ""} placeholder="Họ tên, mã HV, CCCD" className="w-56" />
        <button type="submit" className="h-8 rounded-lg border px-3 text-sm hover:bg-muted">
          Lọc
        </button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            {choPhepDVLK05 && <TableHead className="w-8" />}
            <TableHead>Họ tên</TableHead>
            <TableHead>CCCD</TableHead>
            <TableHead>Liên hệ</TableHead>
            <TableHead>Đơn vị công tác</TableHead>
            <TableHead>Khóa / hợp đồng</TableHead>
            <TableHead>Ngày đăng ký</TableHead>
            <TableHead>Hạn nộp giấy</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Đơn</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dsHoSo.length === 0 && (
            <TableRow>
              <TableCell colSpan={10} className="text-muted-foreground">
                Chưa có hồ sơ phù hợp.
              </TableCell>
            </TableRow>
          )}
          {dsHoSo.map((hs) => (
            <TableRow key={hs.id}>
              {choPhepDVLK05 && (
                <TableCell>
                  {choThu(hs) && (
                    <input
                      type="checkbox"
                      name="dangKyIds"
                      value={hs.id}
                      form={ID_FORM_XAC_NHAN}
                      aria-label={"Chọn " + hs.hocVien.hoTen}
                    />
                  )}
                </TableCell>
              )}
              <TableCell>
                <b>{hs.hocVien.hoTen}</b>
                <div className="text-xs text-muted-foreground">{hs.hocVien.maHocVien}</div>
              </TableCell>
              <TableCell>{hs.hocVien.soCCCD ?? "—"}</TableCell>
              <TableCell>{[hs.hocVien.soDienThoai, hs.hocVien.email].filter(Boolean).join(" · ") || "—"}</TableCell>
              <TableCell>{hs.hocVien.donViCongTac ?? "—"}</TableCell>
              <TableCell>
                {hs.khoa.maKhoa}
                <div className="text-xs text-muted-foreground">
                  {hopDongTheoId.get(hs.hopDongLienKetId!)?.maHopDong}
                </div>
              </TableCell>
              <TableCell>{hs.ngayDangKy.toLocaleDateString("vi-VN")}</TableCell>
              <TableCell>{hs.hanNopGiay ? hs.hanNopGiay.toLocaleDateString("vi-VN") : "—"}</TableCell>
              <TableCell>
                {NHAN_TRANG_THAI_HO_SO[hs.trangThai] ?? hs.trangThai}
                {hs.loNopHoSo && <div className="text-xs text-muted-foreground">Lô {hs.loNopHoSo.maLo}</div>}
              </TableCell>
              <TableCell>
                <a href={`/khoa/${hs.khoa.maKhoa}/don-dang-ky/${hs.id}`} target="_blank" className="text-sm underline">
                  In đơn
                </a>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </main>
  );
}
