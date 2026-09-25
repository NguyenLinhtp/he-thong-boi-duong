import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { layKhoa, danhSachKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { danhSachGiangVien } from "@/server/services/kh/dung-chung";
import { danhSachPhanCong } from "@/server/services/kh/kh-02-phan-cong-giang-vien";
import { danhSachBuoiHoc, lichDayGiangVien } from "@/server/services/kh/kh-03-thoi-khoa-bieu";
import { danhSachPhongHoc } from "@/server/services/dm/dm-04-phong-hoc";
import { tinhTrangLinkTrucTuyen } from "@/server/services/kh/kh-04-hinh-thuc-giang-day";
import { tinhTrangSiSo } from "@/server/services/kh/kh-05-trang-thai-si-so";
import { linkDangKyCongKhai } from "@/server/services/kh/kh-06-thong-bao-tuyen-sinh";
import { danhSachChoNopGiay } from "@/server/services/hv/hv-02-xac-nhan-nop-giay";
import { danhSachChoTuXacNhan } from "@/server/services/hv/hv-03-import-danh-sach";
import { danhSachThiSinh } from "@/server/services/hv/hv-05-dang-ky-du-thi";
import { danhSachChoThamDinh, danhSachDaThamDinh } from "@/server/services/hv/hv-06-tham-dinh";
import {
  danhSachHopLeChoXetDuyet,
  danhSachChinhThuc,
} from "@/server/services/hv/hv-07-xet-duyet-chinh-thuc";
import { danhSachHocVienTheoKhoa } from "@/server/services/hv/hv-09-quan-ly-danh-sach-khoa";
import { buoiHocDaKetThuc } from "@/server/services/gd/gd-05-link-truc-tuyen";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FormPhanCong } from "./form-phan-cong";
import { FormBuoiHoc } from "./form-buoi-hoc";
import { FormHinhThuc } from "./form-hinh-thuc";
import { FormTrangThai } from "./form-trang-thai";
import { FormThongBao } from "./form-thong-bao";
import { FormImport } from "./form-import";
import { FormThamDinh } from "./form-tham-dinh";
import { FormXetDuyet } from "./form-xet-duyet";
import { FormThemHocVien } from "./form-them-hoc-vien";
import { FormChuyenKhoa } from "./form-chuyen-khoa";
import { HangBuoiHoc } from "./hang-buoi-hoc";
import {
  tuDongTaoLinkAction,
  xacNhanNopGiayAction,
  xoaHocVienKhoiKhoaAction,
  ghiNhanThoiHocAction,
} from "./actions";

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

async function coQuyen(maCN: string): Promise<boolean> {
  try {
    await requirePermission(maCN);
    return true;
  } catch (error) {
    if (error instanceof KhongCoQuyenError) return false;
    throw error;
  }
}

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

  const choPhepGD03 = await coQuyen("GD-03");
  const choPhepGD05 = await coQuyen("GD-05");

  const { id } = await params;
  const khoa = await layKhoa(id);
  if (!khoa) notFound();

  const [
    dsPhanCong,
    dsGiangVien,
    dsBuoiHoc,
    dsPhongHoc,
    tinhTrangLink,
    siSo,
    linkCongKhai,
    dsChoNopGiay,
    dsChoTuXacNhan,
    dsThiSinh,
    dsChoThamDinh,
    dsDaThamDinh,
    dsHopLeChoXetDuyet,
    dsChinhThuc,
    dsHocVienTheoKhoa,
    dsKhoaKhac,
  ] = await Promise.all([
    danhSachPhanCong(id),
    danhSachGiangVien(),
    danhSachBuoiHoc(id),
    danhSachPhongHoc(),
    tinhTrangLinkTrucTuyen(id),
    tinhTrangSiSo(id),
    linkDangKyCongKhai(id),
    danhSachChoNopGiay(id),
    danhSachChoTuXacNhan(id),
    danhSachThiSinh(id),
    danhSachChoThamDinh(id),
    danhSachDaThamDinh(id),
    danhSachHopLeChoXetDuyet(id),
    danhSachChinhThuc(id),
    danhSachHocVienTheoKhoa(id),
    danhSachKhoa(),
  ]);
  const dsKhoaKhacRutGon = dsKhoaKhac
    .filter((k) => k.id !== khoa.id)
    .map((k) => ({ id: k.id, maKhoa: k.maKhoa }));
  const hocPhanDaPhanCong = new Set(dsPhanCong.map((pc) => pc.hocPhanId));
  const hocPhanChuaPhanCong = khoa.chuongTrinh.hocPhans.filter((hp) => !hocPhanDaPhanCong.has(hp.id));

  const giangVienDaPhanCong = [
    ...new Map(dsPhanCong.map((pc) => [pc.giangVienId, pc.giangVien])).entries(),
  ];
  const lichDayTheoGiangVien = await Promise.all(
    giangVienDaPhanCong.map(async ([giangVienId, giangVien]) => ({
      giangVienId,
      giangVien,
      lich: (await lichDayGiangVien(giangVienId)).filter((bh) => bh.khoaId !== khoa.id),
    })),
  );

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
        <p>
          Sĩ số: {siSo.siSoHienTai}/{siSo.siSoToiDa} {siSo.daDayDu && "(đã đủ)"}
        </p>
        <p>Mức học phí: {khoa.mucHocPhi ? khoa.mucHocPhi.toString() : "—"}</p>
        <p>Đợt tuyển sinh: {khoa.dotTuyenSinh?.ten ?? "—"}</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">KH-05 · Trạng thái khóa</h2>
        <FormTrangThai khoaId={khoa.id} trangThaiHienTai={khoa.trangThai} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">KH-04 · Hình thức giảng dạy</h2>

        <FormHinhThuc khoaId={khoa.id} hinhThucHienTai={khoa.hinhThucGiangDay} />

        {tinhTrangLink.apDung && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border p-4 text-sm">
            <p>
              {tinhTrangLink.daDu
                ? "Mọi buổi học đã có link trực tuyến."
                : tinhTrangLink.tongBuoi === 0
                  ? "Khóa trực tuyến chưa có buổi học nào trong thời khóa biểu (KH-03) để gán link."
                  : `Còn ${tinhTrangLink.buoiThieuLink}/${tinhTrangLink.tongBuoi} buổi học chưa có link - phải hoàn tất trước ngày khai giảng.`}
            </p>
            {!tinhTrangLink.daDu && tinhTrangLink.buoiThieuLink > 0 && (
              <form action={tuDongTaoLinkAction.bind(null, khoa.id)}>
                <Button type="submit" variant="secondary" className="h-7 px-2 text-xs">
                  Tự động tạo link cho các buổi còn thiếu
                </Button>
              </form>
            )}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">KH-06 · Thông báo tuyển sinh/mở khóa</h2>
        <FormThongBao khoaId={khoa.id} linkHienTai={linkCongKhai} />
      </section>

      {khoa.chuongTrinh.phuongThucDangKy === "TRUC_TUYEN_NOP_GIAY" && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">HV-02 · Xác nhận đã nhận hồ sơ giấy</h2>

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
          <h2 className="text-base font-semibold">HV-03 · Import danh sách học viên</h2>

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
          <h2 className="text-base font-semibold">HV-05 · Danh sách thí sinh dự thi</h2>

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
        <h2 className="text-base font-semibold">HV-06 · Kiểm tra, thẩm định hồ sơ đăng ký</h2>

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
        <h2 className="text-base font-semibold">HV-07 · Xét duyệt danh sách chính thức</h2>

        <FormXetDuyet
          khoaId={khoa.id}
          dsHopLe={dsHopLeChoXetDuyet.map((dk) => ({
            id: dk.id,
            hoTen: dk.hocVien.hoTen,
            soCCCD: dk.hocVien.soCCCD,
          }))}
        />

        {dsChinhThuc.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Học viên chính thức</TableHead>
                <TableHead>CCCD/mã số</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dsChinhThuc.map((dk) => (
                <TableRow key={dk.id}>
                  <TableCell>{dk.hocVien.hoTen}</TableCell>
                  <TableCell>{dk.hocVien.soCCCD ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">HV-09 · Quản lý danh sách học viên theo khóa</h2>

        <FormThemHocVien khoaId={khoa.id} />

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Học viên</TableHead>
              <TableHead>CCCD/mã số</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {dsHocVienTheoKhoa.map((dk) => (
              <TableRow key={dk.id}>
                <TableCell>{dk.hocVien.hoTen}</TableCell>
                <TableCell>{dk.hocVien.soCCCD ?? "—"}</TableCell>
                <TableCell>{NHAN_TRANG_THAI_DANG_KY[dk.trangThai] ?? dk.trangThai}</TableCell>
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
                    <form action={xoaHocVienKhoiKhoaAction.bind(null, khoa.id, dk.id)}>
                      <Button type="submit" variant="ghost" className="h-7 px-2 text-xs text-destructive">
                        Xóa
                      </Button>
                    </form>
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
      </section>

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

        {lichDayTheoGiangVien.some((l) => l.lich.length > 0) && (
          <div className="rounded-lg border p-4 text-sm">
            <p className="font-medium">
              Lịch dạy hiện có của giảng viên đã phân công (ở khóa khác đang vận hành) - tham khảo
              trước khi xếp thêm buổi học để tránh trùng lịch:
            </p>
            <div className="mt-2 flex flex-col gap-2">
              {lichDayTheoGiangVien
                .filter((l) => l.lich.length > 0)
                .map(({ giangVienId, giangVien, lich }) => (
                  <div key={giangVienId}>
                    <p className="font-medium">{giangVien.hoTen}</p>
                    <ul className="list-disc pl-5 text-muted-foreground">
                      {lich.map((bh) => (
                        <li key={bh.id}>
                          {new Date(bh.ngayHoc).toLocaleDateString("vi-VN")}
                          {bh.gioBatDau && bh.gioKetThuc ? ` ${bh.gioBatDau}–${bh.gioKetThuc}` : ""} ·{" "}
                          {bh.khoa.maKhoa} - {bh.khoa.chuongTrinh.ten}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          </div>
        )}

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
              <HangBuoiHoc
                key={bh.id}
                khoaId={khoa.id}
                buoiHoc={{
                  id: bh.id,
                  ngayHoc: bh.ngayHoc.toISOString(),
                  gioBatDau: bh.gioBatDau,
                  gioKetThuc: bh.gioKetThuc,
                  hocPhanId: bh.hocPhanId,
                  hocPhanTen: bh.hocPhan?.ten ?? null,
                  phongHocId: bh.phongHocId,
                  phongHocTen: bh.phongHoc?.ten ?? null,
                  linkTrucTuyen: bh.linkTrucTuyen,
                  linkConHieuLuc: bh.linkTrucTuyen ? !bh.daHuy && !buoiHocDaKetThuc(bh) : false,
                  daHuy: bh.daHuy,
                  lyDoThayDoi: bh.lyDoThayDoi,
                  noiDungDaGiang: bh.noiDungDaGiang,
                  nhanXet: bh.nhanXet,
                }}
                dsHocPhan={khoa.chuongTrinh.hocPhans.map((hp) => ({ id: hp.id, ten: hp.ten }))}
                dsPhongHoc={dsPhongHoc.map((ph) => ({ id: ph.id, ten: `${ph.ma} · ${ph.ten}` }))}
                choPhepGD03={choPhepGD03}
                choPhepGD05={choPhepGD05}
              />
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
