import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { layKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { danhSachGiangVien } from "@/server/services/kh/dung-chung";
import { danhSachPhanCong } from "@/server/services/kh/kh-02-phan-cong-giang-vien";
import { danhSachBuoiHoc } from "@/server/services/kh/kh-03-thoi-khoa-bieu";
import { danhSachPhongHoc } from "@/server/services/dm/dm-04-phong-hoc";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FormPhanCong } from "./form-phan-cong";
import { FormBuoiHoc } from "./form-buoi-hoc";
import { xoaBuoiHocAction } from "./actions";

const NHAN_TRANG_THAI: Record<string, string> = {
  CHUAN_BI: "Chuẩn bị",
  DANG_TUYEN_SINH: "Đang tuyển sinh",
  DANG_DIEN_RA: "Đang diễn ra",
  DA_KET_THUC: "Đã kết thúc",
  HUY: "Hủy",
};

const NHAN_PHUONG_THUC: Record<string, string> = {
  TRUC_TUYEN_NOP_GIAY: "PT1 · Đăng ký trực tuyến, in đơn nộp bản giấy",
  IMPORT_TU_XAC_NHAN: "PT2 · Import danh sách sẵn, học viên tự xác nhận",
  CHI_DU_THI: "PT3 · Chỉ đăng ký dự thi, không qua học",
  QUA_DON_VI_LIEN_KET: "PT4 · Qua đơn vị liên kết",
};

export default async function ChiTietKhoaPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("KH-01");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <p className="p-6 text-destructive">{error.message}</p>;
    }
    throw error;
  }

  const { id } = await params;
  const khoa = await layKhoa(id);
  if (!khoa) notFound();

  const [dsPhanCong, dsGiangVien, dsBuoiHoc, dsPhongHoc] = await Promise.all([
    danhSachPhanCong(id),
    danhSachGiangVien(),
    danhSachBuoiHoc(id),
    danhSachPhongHoc(),
  ]);
  const hocPhanDaPhanCong = new Set(dsPhanCong.map((pc) => pc.hocPhanId));
  const hocPhanChuaPhanCong = khoa.chuongTrinh.hocPhans.filter((hp) => !hocPhanDaPhanCong.has(hp.id));

  return (
    <main className="flex flex-col gap-6 p-6">
      <h1 className="text-lg font-semibold">
        {khoa.maKhoa} · {khoa.chuongTrinh.ten}
      </h1>
      <div className="rounded-lg border p-4 text-sm">
        <p>Chương trình: {khoa.chuongTrinh.maCT} · {khoa.chuongTrinh.ten}</p>
        <p>Trạng thái: {NHAN_TRANG_THAI[khoa.trangThai] ?? khoa.trangThai}</p>
        <p>
          Phương thức đăng ký (kế thừa từ chương trình):{" "}
          {khoa.chuongTrinh.phuongThucDangKy
            ? (NHAN_PHUONG_THUC[khoa.chuongTrinh.phuongThucDangKy] ??
              khoa.chuongTrinh.phuongThucDangKy)
            : "Chưa thiết lập ở chương trình"}
        </p>
        <p>
          Khai giảng:{" "}
          {khoa.thoiGianKhaiGiang
            ? new Date(khoa.thoiGianKhaiGiang).toLocaleDateString("vi-VN")
            : "—"}
        </p>
        <p>
          Bế giảng:{" "}
          {khoa.thoiGianBeGiang ? new Date(khoa.thoiGianBeGiang).toLocaleDateString("vi-VN") : "—"}
        </p>
        <p>Sĩ số tối đa: {khoa.siSoToiDa}</p>
        <p>Mức học phí: {khoa.mucHocPhi ? khoa.mucHocPhi.toString() : "—"}</p>
        <p>Đợt tuyển sinh: {khoa.dotTuyenSinh?.ten ?? "—"}</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">KH-02 · Phân công giảng viên phụ trách học phần</h2>

        {hocPhanChuaPhanCong.length > 0 && dsGiangVien.length > 0 ? (
          <FormPhanCong
            khoaId={khoa.id}
            dsHocPhan={hocPhanChuaPhanCong.map((hp) => ({ id: hp.id, ten: hp.ten }))}
            dsGiangVien={dsGiangVien.map((gv) => ({ id: gv.id, hoTen: gv.hoTen }))}
          />
        ) : (
          <p className="rounded-lg border p-4 text-sm text-muted-foreground">
            {dsGiangVien.length === 0
              ? "Chưa có giảng viên nào trong hệ thống."
              : "Mọi học phần của chương trình đã được phân công giảng viên."}
          </p>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Học phần</TableHead>
              <TableHead>Giảng viên</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dsPhanCong.map((pc) => (
              <TableRow key={pc.id}>
                <TableCell>{pc.hocPhan.ten}</TableCell>
                <TableCell>{pc.giangVien.hoTen}</TableCell>
              </TableRow>
            ))}
            {dsPhanCong.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-sm text-muted-foreground">
                  Chưa phân công giảng viên nào
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">KH-03 · Thời khóa biểu</h2>

        <FormBuoiHoc
          khoaId={khoa.id}
          dsHocPhan={khoa.chuongTrinh.hocPhans.map((hp) => ({ id: hp.id, ten: hp.ten }))}
          dsPhongHoc={dsPhongHoc.map((ph) => ({ id: ph.id, ten: `${ph.ma} · ${ph.ten}` }))}
        />

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ngày</TableHead>
              <TableHead>Giờ</TableHead>
              <TableHead>Học phần</TableHead>
              <TableHead>Phòng / hình thức</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {dsBuoiHoc.map((bh) => (
              <TableRow key={bh.id}>
                <TableCell>{new Date(bh.ngayHoc).toLocaleDateString("vi-VN")}</TableCell>
                <TableCell>
                  {bh.gioBatDau && bh.gioKetThuc ? `${bh.gioBatDau} – ${bh.gioKetThuc}` : "—"}
                </TableCell>
                <TableCell>{bh.hocPhan?.ten ?? "—"}</TableCell>
                <TableCell>
                  {bh.phongHoc?.ten ?? (bh.linkTrucTuyen ? "Trực tuyến" : "—")}
                </TableCell>
                <TableCell>
                  <form action={xoaBuoiHocAction.bind(null, khoa.id, bh.id)}>
                    <Button type="submit" variant="ghost" className="h-7 px-2 text-xs text-destructive">
                      Xóa
                    </Button>
                  </form>
                </TableCell>
              </TableRow>
            ))}
            {dsBuoiHoc.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  Chưa có buổi học nào trong thời khóa biểu
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>
    </main>
  );
}
