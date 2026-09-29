import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { layKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { tinhTrangLinkTrucTuyen } from "@/server/services/kh/kh-04-hinh-thuc-giang-day";
import { tinhTrangSiSo } from "@/server/services/kh/kh-05-trang-thai-si-so";
import { linkDangKyCongKhai } from "@/server/services/kh/kh-06-thong-bao-tuyen-sinh";
import { Button } from "@/components/ui/button";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { DauTrangKhoa } from "@/components/khoa/dau-trang-khoa";
import { dinhDangNgay, dinhDangTien } from "@/lib/dinh-dang";
import { FormHinhThuc } from "./form-hinh-thuc";
import { FormTrangThai } from "./form-trang-thai";
import { FormThongBao } from "./form-thong-bao";
import { tuDongTaoLinkAction } from "./actions";

const NHAN_PHUONG_THUC: Record<string, string> = {
  TRUC_TUYEN_NOP_GIAY: "PT1 · Đăng ký trực tuyến, in đơn nộp bản giấy",
  IMPORT_TU_XAC_NHAN: "PT2 · Import danh sách sẵn, học viên tự xác nhận",
  CHI_DU_THI: "PT3 · Chỉ đăng ký dự thi, không qua học",
  QUA_DON_VI_LIEN_KET: "PT4 · Qua đơn vị liên kết",
};

// Tab Tổng quan của khóa: thông tin chung, trạng thái (KH-05), hình thức (KH-04), thông báo (KH-06)
export default async function ChiTietKhoaPage({ params }: { params: Promise<{ id: string }> }) {
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

  const [tinhTrangLink, siSo, linkCongKhai] = await Promise.all([
    tinhTrangLinkTrucTuyen(id),
    tinhTrangSiSo(id),
    linkDangKyCongKhai(id),
  ]);

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <DauTrangKhoa khoa={khoa} dangChon="tong-quan" />
      <dl className="grid gap-x-6 gap-y-3 rounded-lg border bg-card p-4 text-sm shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground">Chương trình</dt>
          <dd className="font-medium">
            <Link href={`/chuong-trinh/${khoa.chuongTrinh.id}`}>
              {khoa.chuongTrinh.maCT} · {khoa.chuongTrinh.ten}
            </Link>
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground">Phương thức đăng ký (kế thừa từ chương trình)</dt>
          <dd className="font-medium">
            {khoa.chuongTrinh.phuongThucDangKy
              ? (NHAN_PHUONG_THUC[khoa.chuongTrinh.phuongThucDangKy] ?? khoa.chuongTrinh.phuongThucDangKy)
              : "Chưa thiết lập ở chương trình"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Khai giảng – bế giảng</dt>
          <dd className="font-medium">
            {dinhDangNgay(khoa.thoiGianKhaiGiang)} – {dinhDangNgay(khoa.thoiGianBeGiang)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Sĩ số</dt>
          <dd className="font-medium">
            {siSo.siSoHienTai}/{siSo.siSoToiDa} {siSo.daDayDu && <span className="text-warning">(đã đủ)</span>}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Mức học phí</dt>
          <dd className="font-medium">{dinhDangTien(khoa.mucHocPhi)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Đợt tuyển sinh</dt>
          <dd className="font-medium">{khoa.dotTuyenSinh?.ten ?? "—"}</dd>
        </div>
      </dl>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-ued-blue-dam">KH-05 · Trạng thái khóa</h2>
        <FormTrangThai khoaId={khoa.id} trangThaiHienTai={khoa.trangThai} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-ued-blue-dam">KH-04 · Hình thức giảng dạy</h2>

        <FormHinhThuc khoaId={khoa.id} hinhThucHienTai={khoa.hinhThucGiangDay} />

        {tinhTrangLink.apDung && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4 shadow-sm text-sm">
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
        <h2 className="text-base font-bold text-ued-blue-dam">KH-06 · Thông báo tuyển sinh/mở khóa</h2>
        <FormThongBao khoaId={khoa.id} linkHienTai={linkCongKhai} />
      </section>
    </main>
  );
}
