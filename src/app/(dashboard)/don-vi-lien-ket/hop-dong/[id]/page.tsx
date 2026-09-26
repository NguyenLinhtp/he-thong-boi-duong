import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { layHopDong } from "@/server/services/dvlk/dvlk-03-hop-dong";
import { KhongTimThayHopDongDvlkError } from "@/server/services/dvlk/loi-dvlk";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { FormSuaHopDong, FormThanhLy } from "../cac-form";
import { doiChieuThanhLy, NHAN_PHAN_LOAI } from "@/server/services/dvlk/dvlk-06-thanh-ly";
import { NHAN_TRANG_THAI_HOP_DONG, NHAN_TRANG_THAI_HO_SO, dinhDangTien } from "../../nhan";
import { FormXacNhanThuHoSo, ID_FORM_XAC_NHAN } from "../../form-xac-nhan-thu-ho-so";
import { xacNhanThuHoSoTruongAction } from "../actions";

async function coQuyen(maCN: string): Promise<boolean> {
  try {
    await requirePermission(maCN);
    return true;
  } catch (error) {
    if (error instanceof KhongCoQuyenError) return false;
    throw error;
  }
}


export default async function ChiTietHopDongPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("DVLK-03");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <p className="p-6 text-destructive">{error.message}</p>;
    }
    throw error;
  }

  const { id } = await params;
  let hd;
  try {
    hd = await layHopDong(id);
  } catch (error) {
    if (error instanceof KhongTimThayHopDongDvlkError) return <p className="p-6 text-destructive">{error.message}</p>;
    throw error;
  }
  const daThanhLy = hd.trangThai === "DA_THANH_LY";
  const choPhepDVLK05 = !daThanhLy && (await coQuyen("DVLK-05"));
  const soChoThu = hd.dangKys.filter((dk) => dk.trangThai === "CHO_NOP_GIAY").length;
  const choPhepDVLK06 = await coQuyen("DVLK-06");
  const doiChieu = choPhepDVLK06 && !daThanhLy ? await doiChieuThanhLy(hd.id) : null;

  return (
    <main className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">
          Hợp đồng {hd.maHopDong}
          <span className="ml-2 rounded border px-2 py-0.5 text-sm font-normal">
            {NHAN_TRANG_THAI_HOP_DONG[hd.trangThai]}
          </span>
        </h1>
        <Link href="/don-vi-lien-ket/hop-dong" className="text-sm underline">
          ← Danh sách hợp đồng
        </Link>
      </div>

      <section className="flex flex-col gap-3 rounded-lg border p-4 text-sm">
        <h2 className="font-semibold">DVLK-03 · Thông tin hợp đồng</h2>
        <p>
          Đơn vị liên kết:{" "}
          <b>
            {hd.donViLienKet.ma} · {hd.donViLienKet.ten}
          </b>
          {" · "}Khóa:{" "}
          <Link href={`/khoa-hoc/${hd.khoa.id}`} className="underline">
            {hd.khoa.maKhoa} · {hd.khoa.chuongTrinh.ten}
          </Link>
        </p>
        <p>
          Số học viên dự kiến: <b>{hd.soLuongDuKien ?? "—"}</b> · thực tế: <b>{hd.thucTe}</b>
          {" · "}Đơn giá thỏa thuận: <b>{dinhDangTien(hd.donGiaThoaThuan)}</b>
        </p>
        <p className="text-xs text-muted-foreground">
          Thực tế = hồ sơ gắn hợp đồng, không tính hồ sơ bị hủy do quá hạn thu hồ sơ hoặc không hợp lệ.
        </p>
        {daThanhLy ? (
          <p>
            Biên bản <b>{hd.soBienBanThanhLy}</b> ·{" "}
            <a href={`/don-vi-lien-ket/hop-dong/${hd.id}/bien-ban`} target="_blank" className="underline">
              In biên bản thanh lý
            </a>
            {" · "}
            Đã thanh lý{hd.ngayQuyetToan ? ` ngày ${hd.ngayQuyetToan.toLocaleDateString("vi-VN")}` : ""} · số tiền
            quyết toán: <b>{dinhDangTien(hd.soTienQuyetToan)}</b>
          </p>
        ) : (
          <FormSuaHopDong
            id={hd.id}
            soLuongDuKien={hd.soLuongDuKien}
            donGiaThoaThuan={hd.donGiaThoaThuan === null ? null : Number(hd.donGiaThoaThuan)}
            ghiChu={hd.ghiChu}
          />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Học viên theo hợp đồng ({hd.dangKys.length})</h2>
        {choPhepDVLK05 && (
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">
              DVLK-05 phía trường: xác nhận thay khi đơn vị liên kết mang hồ sơ giấy về trường. Hồ sơ quá hạn
              nộp giấy tự động bị hủy.
            </p>
            <FormXacNhanThuHoSo action={xacNhanThuHoSoTruongAction} soChoThu={soChoThu} truongAn={{ hopDongId: hd.id }} />
          </div>
        )}
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(hd.theoTrangThai).map(([trangThai, so]) => (
            <span key={trangThai} className="rounded border px-2 py-0.5">
              {NHAN_TRANG_THAI_HO_SO[trangThai] ?? trangThai}: {so}
            </span>
          ))}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              {choPhepDVLK05 && <TableHead className="w-8" />}
              <TableHead>Mã học viên</TableHead>
              <TableHead>Họ tên</TableHead>
              <TableHead>Ngày đăng ký</TableHead>
              <TableHead>Trạng thái hồ sơ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hd.dangKys.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  Chưa có học viên đăng ký qua hợp đồng này.
                </TableCell>
              </TableRow>
            )}
            {hd.dangKys.map((dk) => (
              <TableRow key={dk.id}>
                {choPhepDVLK05 && (
                  <TableCell>
                    {dk.trangThai === "CHO_NOP_GIAY" && (
                      <input
                      type="checkbox"
                      name="dangKyIds"
                      value={dk.id}
                      form={ID_FORM_XAC_NHAN}
                      aria-label={"Chọn " + dk.hocVien.hoTen}
                    />
                    )}
                  </TableCell>
                )}
                <TableCell>{dk.hocVien.maHocVien}</TableCell>
                <TableCell>{dk.hocVien.hoTen}</TableCell>
                <TableCell>{dk.ngayDangKy.toLocaleDateString("vi-VN")}</TableCell>
                <TableCell>
                  {NHAN_TRANG_THAI_HO_SO[dk.trangThai] ?? dk.trangThai}
                  {dk.loNopHoSo && <div className="text-xs text-muted-foreground">Lô {dk.loNopHoSo.maLo}</div>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
      {doiChieu && (
        <section className="flex flex-col gap-3 rounded-lg border p-4">
          <h2 className="text-sm font-semibold">DVLK-06 · Thanh lý hợp đồng cuối khóa</h2>
          <p className="text-sm font-medium">Bước 1 · Đối chiếu số học viên với hợp đồng</p>
          {!doiChieu.ketQuaDaPheDuyet && (
            <p className="text-sm text-destructive">
              Kết quả khóa chưa được phê duyệt (KQ-04) - chưa thanh lý được.
            </p>
          )}
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded border px-2 py-0.5">Dự kiến: {doiChieu.tong.duKien ?? "—"}</span>
            <span className="rounded border px-2 py-0.5 font-semibold">Hợp lệ (quyết toán): {doiChieu.tong.hopLe}</span>
            <span className="rounded border px-2 py-0.5">Hoàn thành: {doiChieu.tong.hoanThanh}</span>
            <span className="rounded border px-2 py-0.5">Không đạt: {doiChieu.tong.khongDat}</span>
            <span className="rounded border px-2 py-0.5">Thôi học: {doiChieu.tong.thoiHoc}</span>
            {doiChieu.tong.chuaCoKetQua > 0 && (
              <span className="rounded border px-2 py-0.5">Chưa có kết quả: {doiChieu.tong.chuaCoKetQua}</span>
            )}
            {doiChieu.tong.chuaXuLy > 0 && (
              <span className="rounded border border-destructive px-2 py-0.5 text-destructive">
                Hồ sơ chưa xử lý: {doiChieu.tong.chuaXuLy} (sẽ không được xét tiếp sau thanh lý)
              </span>
            )}
            <span className="rounded border px-2 py-0.5">Không tính: {doiChieu.tong.khongTinh}</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã học viên</TableHead>
                <TableHead>Họ tên</TableHead>
                <TableHead>Trạng thái hồ sơ</TableHead>
                <TableHead>Điểm tổng kết</TableHead>
                <TableHead>Đối chiếu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {doiChieu.dong.map((d) => (
                <TableRow key={d.dangKyId}>
                  <TableCell>{d.maHocVien}</TableCell>
                  <TableCell>{d.hoTen}</TableCell>
                  <TableCell>{NHAN_TRANG_THAI_HO_SO[d.trangThaiDangKy] ?? d.trangThaiDangKy}</TableCell>
                  <TableCell>{d.diemTongKet ?? "—"}</TableCell>
                  <TableCell>{NHAN_PHAN_LOAI[d.phanLoai]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-sm font-medium">Bước 2 · Lập biên bản, ghi nhận số tiền quyết toán</p>
          <p className="text-xs text-muted-foreground">
            Gợi ý = đơn giá thỏa thuận × số học viên hợp lệ
            {doiChieu.soTienGoiY != null ? ` = ${dinhDangTien(doiChieu.soTienGoiY)}` : " (hợp đồng chưa có đơn giá)"}. Sau khi
            thanh lý, toàn bộ học viên hợp lệ được cập nhật tài chính &quot;Đã hoàn tất&quot;; học viên đạt được xét cấp văn
            bằng và bàn giao theo lô về đơn vị liên kết.
          </p>
          <FormThanhLy id={hd.id} soTienGoiY={doiChieu.soTienGoiY} choPhep={doiChieu.ketQuaDaPheDuyet} />
        </section>
      )}

      {hd.loNopHoSos.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">DVLK-05 · Các lô hồ sơ đã gửi về trường</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã lô</TableHead>
                <TableHead>Ngày gửi</TableHead>
                <TableHead>Hình thức</TableHead>
                <TableHead>Số hồ sơ</TableHead>
                <TableHead>Người xác nhận</TableHead>
                <TableHead>Ghi chú</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hd.loNopHoSos.map((lo) => (
                <TableRow key={lo.id}>
                  <TableCell>{lo.maLo}</TableCell>
                  <TableCell>{lo.ngayGui.toLocaleDateString("vi-VN")}</TableCell>
                  <TableCell>{lo.hinhThuc ?? "—"}</TableCell>
                  <TableCell>{lo._count.dangKys}</TableCell>
                  <TableCell>{lo.nguoiXacNhan}</TableCell>
                  <TableCell>{lo.ghiChu ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}
    </main>
  );
}
