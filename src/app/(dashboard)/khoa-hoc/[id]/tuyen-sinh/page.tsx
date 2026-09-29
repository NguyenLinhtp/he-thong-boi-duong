import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { layKhoa, danhSachKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { danhSachChoNopGiay } from "@/server/services/hv/hv-02-xac-nhan-nop-giay";
import { danhSachChoTuXacNhan } from "@/server/services/hv/hv-03-import-danh-sach";
import { danhSachThiSinh } from "@/server/services/hv/hv-05-dang-ky-du-thi";
import { danhSachChoThamDinh, danhSachDaThamDinh } from "@/server/services/hv/hv-06-tham-dinh";
import { danhSachHopLeChoXetDuyet, danhSachChinhThuc } from "@/server/services/hv/hv-07-xet-duyet-chinh-thuc";
import { danhSachHocVienTheoKhoa, lichSuThayDoiDanhSach, NHAN_HANH_DONG_HV09 } from "@/server/services/hv/hv-09-quan-ly-danh-sach-khoa";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { NhanTrangThai } from "@/components/chung/nhan-trang-thai";
import { DauTrangKhoa } from "@/components/khoa/dau-trang-khoa";
import { FormImport } from "../form-import";
import { FormThamDinh } from "../form-tham-dinh";
import { FormXetDuyet } from "../form-xet-duyet";
import { FormThemHocVien } from "../form-them-hoc-vien";
import { FormChuyenKhoa } from "../form-chuyen-khoa";
import { FormXoaHocVien } from "../form-xoa-hoc-vien";
import { xacNhanNopGiayAction, ghiNhanThoiHocAction } from "../actions";

const NHAN_KET_QUA_THAM_DINH: Record<string, string> = {
  HOP_LE: "Hợp lệ",
  KHONG_HOP_LE: "Không hợp lệ",
};

const NHAN_TRANG_THAI_DANG_KY: Record<string, string> = {
  CHO_NOP_GIAY: "Chờ nộp bản giấy",
  DA_NOP_GIAY: "Đã nộp bản giấy - chờ duyệt",
  HUY_QUA_HAN_NOP_GIAY: "Hủy (quá hạn nộp giấy)",
  CHO_TU_XAC_NHAN: "Chờ tự xác nhận",
  DA_XAC_NHAN_THAM_GIA: "Đã xác nhận tham gia",
  CHO_DUYET: "Chờ duyệt",
  HOP_LE: "Hợp lệ",
  KHONG_HOP_LE: "Không hợp lệ",
  CHINH_THUC: "Chính thức",
  HOAN_THANH: "Hoàn thành",
  THOI_HOC: "Thôi học",
};

// Tab Tuyển sinh của khóa: hồ sơ theo phương thức (HV-02/03/05), thẩm định (HV-06), xét duyệt (HV-07), danh sách (HV-09)
export default async function TuyenSinhKhoaPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("KH-01");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <KhongCoQuyen thongBao={error.message} />;
    }
    throw error;
  }

  const { id } = await params;
  const khoa = await layKhoa(id);
  if (!khoa) notFound();

  const [
    dsChoNopGiay,
    dsChoTuXacNhan,
    dsThiSinh,
    dsChoThamDinh,
    dsDaThamDinh,
    dsHopLeChoXetDuyet,
    dsChinhThuc,
    dsHocVienTheoKhoa,
    dsKhoaKhac,
    lichSuDanhSach,
  ] = await Promise.all([
    danhSachChoNopGiay(id),
    danhSachChoTuXacNhan(id),
    danhSachThiSinh(id),
    danhSachChoThamDinh(id),
    danhSachDaThamDinh(id),
    danhSachHopLeChoXetDuyet(id),
    danhSachChinhThuc(id),
    danhSachHocVienTheoKhoa(id),
    danhSachKhoa(),
    lichSuThayDoiDanhSach(id),
  ]);
  const dsKhoaKhacRutGon = dsKhoaKhac
    .filter((k) => k.id !== khoa.id)
    .map((k) => ({ id: k.id, maKhoa: k.maKhoa }));

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <DauTrangKhoa khoa={khoa} dangChon="tuyen-sinh" />
      {khoa.chuongTrinh.phuongThucDangKy === "TRUC_TUYEN_NOP_GIAY" && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-bold text-ued-blue-dam">HV-02 · Xác nhận đã nhận hồ sơ giấy</h2>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Học viên</TableHead>
                <TableHead>CCCD</TableHead>
                <TableHead>Ngày đăng ký</TableHead>
                <TableHead>Hạn nộp giấy</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {dsChoNopGiay.map((dk) => (
                <TableRow key={dk.id}>
                  <TableCell>{dk.hocVien.hoTen}</TableCell>
                  <TableCell>{dk.hocVien.soCCCD ?? "—"}</TableCell>
                  <TableCell>{new Date(dk.ngayDangKy).toLocaleDateString("vi-VN")}</TableCell>
                  <TableCell>
                    {dk.hanNopGiay ? new Date(dk.hanNopGiay).toLocaleDateString("vi-VN") : "—"}
                  </TableCell>
                  <TableCell>
                    <form action={xacNhanNopGiayAction.bind(null, khoa.id, dk.id)}>
                      <Button type="submit" variant="secondary" className="h-7 px-2 text-xs">
                        Xác nhận đã nhận
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
              {dsChoNopGiay.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    Không có hồ sơ nào đang chờ nộp bản giấy
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </section>
      )}

      {khoa.chuongTrinh.phuongThucDangKy === "IMPORT_TU_XAC_NHAN" && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-bold text-ued-blue-dam">HV-03 · Import danh sách học viên</h2>

          <FormImport khoaId={khoa.id} />

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Học viên</TableHead>
                <TableHead>CCCD/mã số</TableHead>
                <TableHead>Đơn vị công tác</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dsChoTuXacNhan.map((dk) => (
                <TableRow key={dk.id}>
                  <TableCell>{dk.hocVien.hoTen}</TableCell>
                  <TableCell>{dk.hocVien.soCCCD ?? "—"}</TableCell>
                  <TableCell>{dk.hocVien.donViCongTac ?? "—"}</TableCell>
                  <TableCell>Chờ tự xác nhận</TableCell>
                </TableRow>
              ))}
              {dsChoTuXacNhan.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                    Chưa có học viên nào được import
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </section>
      )}

      {khoa.chuongTrinh.phuongThucDangKy === "CHI_DU_THI" && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-bold text-ued-blue-dam">HV-05 · Danh sách thí sinh dự thi</h2>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thí sinh</TableHead>
                <TableHead>CCCD</TableHead>
                <TableHead>Ngày đăng ký</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dsThiSinh.map((dk) => (
                <TableRow key={dk.id}>
                  <TableCell>{dk.hocVien.hoTen}</TableCell>
                  <TableCell>{dk.hocVien.soCCCD ?? "—"}</TableCell>
                  <TableCell>{new Date(dk.ngayDangKy).toLocaleDateString("vi-VN")}</TableCell>
                </TableRow>
              ))}
              {dsThiSinh.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                    Chưa có thí sinh nào đăng ký dự thi
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-ued-blue-dam">HV-06 · Kiểm tra, thẩm định hồ sơ đăng ký</h2>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Học viên</TableHead>
              <TableHead>CCCD/mã số</TableHead>
              <TableHead>Ngày đăng ký</TableHead>
              <TableHead>Thẩm định</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dsChoThamDinh.map((dk) => (
              <TableRow key={dk.id}>
                <TableCell>{dk.hocVien.hoTen}</TableCell>
                <TableCell>{dk.hocVien.soCCCD ?? "—"}</TableCell>
                <TableCell>{new Date(dk.ngayDangKy).toLocaleDateString("vi-VN")}</TableCell>
                <TableCell>
                  <FormThamDinh khoaId={khoa.id} dangKyId={dk.id} />
                </TableCell>
              </TableRow>
            ))}
            {dsChoThamDinh.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                  Không có hồ sơ nào đang chờ thẩm định
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {dsDaThamDinh.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Học viên</TableHead>
                <TableHead>Kết quả</TableHead>
                <TableHead>Ghi chú</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dsDaThamDinh.map((dk) => (
                <TableRow key={dk.id}>
                  <TableCell>{dk.hocVien.hoTen}</TableCell>
                  <TableCell>{NHAN_KET_QUA_THAM_DINH[dk.trangThai] ?? dk.trangThai}</TableCell>
                  <TableCell>{dk.ghiChuThamDinh ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-ued-blue-dam">HV-07 · Xét duyệt danh sách chính thức</h2>

        <FormXetDuyet
          khoaId={khoa.id}
          dsHopLe={dsHopLeChoXetDuyet.map((dk) => ({
            id: dk.id,
            hoTen: dk.hocVien.hoTen,
            soCCCD: dk.hocVien.soCCCD,
          }))}
        />

        {dsChinhThuc.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Đã có <strong className="text-foreground">{dsChinhThuc.length}</strong> học viên chính thức - xem ở danh sách HV-09 bên dưới.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-ued-blue-dam">HV-09 · Quản lý danh sách học viên theo khóa</h2>

        <FormThemHocVien khoaId={khoa.id} />

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Học viên</TableHead>
              <TableHead>CCCD/mã số</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Chuyển khóa · thôi học · xóa</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dsHocVienTheoKhoa.map((dk) => (
              <TableRow key={dk.id}>
                <TableCell>{dk.hocVien.hoTen}</TableCell>
                <TableCell>{dk.hocVien.soCCCD ?? "—"}</TableCell>
                <TableCell><NhanTrangThai ma={dk.trangThai}>{NHAN_TRANG_THAI_DANG_KY[dk.trangThai] ?? dk.trangThai}</NhanTrangThai></TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-2">
                    <FormChuyenKhoa khoaId={khoa.id} dangKyId={dk.id} dsKhoaKhac={dsKhoaKhacRutGon} />
                    {dk.trangThai !== "THOI_HOC" && (
                      <form action={ghiNhanThoiHocAction.bind(null, khoa.id, dk.id)}>
                        <Button type="submit" variant="secondary" className="h-7 px-2 text-xs">
                          Ghi nhận thôi học
                        </Button>
                      </form>
                    )}
                    <FormXoaHocVien khoaId={khoa.id} dangKyId={dk.id} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {dsHocVienTheoKhoa.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                  Chưa có học viên nào trong khóa này
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {lichSuDanhSach.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer font-medium">Lịch sử thay đổi danh sách ({lichSuDanhSach.length})</summary>
            <ul className="mt-2 flex flex-col gap-1">
              {lichSuDanhSach.map((ls) => (
                <li key={ls.id}>
                  <span className="text-muted-foreground">{ls.thoiGian.toLocaleString("vi-VN")}</span> ·{" "}
                  {NHAN_HANH_DONG_HV09[ls.hanhDong] ?? ls.hanhDong}: {ls.chiTiet} ·{" "}
                  <span className="text-muted-foreground">{ls.nguoiThucHienTen}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>
    </main>
  );
}
