import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { thongTinDieuChinh } from "@/server/services/hv/hv-06-dieu-chinh-thong-tin";
import { KhongTimThayDangKyError } from "@/server/services/hv/loi-hoc-vien";
import { FormDieuChinhThongTin } from "./form-dieu-chinh";

// (bổ sung 05/10/2026 - HV-06) cán bộ đào tạo điều chỉnh thông tin thí sinh của 1 hồ sơ đăng ký
export default async function DieuChinhThongTinPage({ params }: { params: Promise<{ id: string; dangKyId: string }> }) {
  try {
    await requirePermission("HV-06");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) return <KhongCoQuyen thongBao={error.message} />;
    throw error;
  }
  const { id, dangKyId } = await params;
  let tt;
  try {
    tt = await thongTinDieuChinh(dangKyId);
  } catch (error) {
    if (error instanceof KhongTimThayDangKyError) notFound();
    throw error;
  }
  if (tt.dangKy.khoaId !== id) notFound();
  const { dangKy, laDuThi, daPheDuyet, dsTruong } = tt;
  const hv = dangKy.hocVien;

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <div className="flex flex-col gap-1">
        <Link href={`/khoa-hoc/${id}/tuyen-sinh`} className="text-sm text-primary underline">
          ← Tuyển sinh khóa {dangKy.khoa.maKhoa}
        </Link>
        <h1 className="text-xl font-bold text-ued-blue-dam">Điều chỉnh thông tin thí sinh</h1>
        <p className="text-sm text-muted-foreground">
          Mã hồ sơ <span className="font-mono">{hv.maHocVien}</span>
          {hv.maSinhVien && (
            <>
              {" "}
              · Mã SV <span className="font-mono">{hv.maSinhVien}</span> · Lớp {hv.lopSinhHoat ?? "—"}
            </>
          )}{" "}
          · {dangKy.khoa.chuongTrinh.ten}.{" "}
          <Link href={`/khoa/${dangKy.khoa.maKhoa}/don-dang-ky/${dangKy.id}`} target="_blank" className="text-primary underline">
            In đơn
          </Link>
        </p>
        <p className="text-sm text-muted-foreground">
          Họ tên, CCCD, ngày sinh, liên hệ thuộc hồ sơ học viên dùng chung mọi khóa - sửa ở đây áp dụng cho cả các khóa khác của học viên.
        </p>
      </div>
      {daPheDuyet ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Kết quả khóa đã được phê duyệt (KQ-04) - không điều chỉnh thông tin thí sinh được nữa.
        </p>
      ) : (
        <FormDieuChinhThongTin
          khoaId={id}
          dangKyId={dangKy.id}
          laDuThi={laDuThi}
          giaTri={{
            hoTen: hv.hoTen,
            soCCCD: hv.soCCCD ?? "",
            ngaySinh: hv.ngaySinh ? hv.ngaySinh.toISOString().slice(0, 10) : "",
            soDienThoai: hv.soDienThoai ?? "",
            email: hv.email ?? "",
            donViCongTac: hv.donViCongTac ?? "",
            soDienThoaiXacThuc: dangKy.soDienThoaiXacThuc ?? hv.soDienThoai ?? "",
          }}
          dsTruong={dsTruong.map((t) => ({
            ma: t.ma,
            nhan: t.nhan,
            kieu: t.kieu,
            batBuoc: t.batBuoc,
            luaChon: t.luaChon,
            coDinh: t.coDinh,
            giaTri: t.coDinh && t.macDinh ? t.macDinh : t.giaTri,
          }))}
        />
      )}
    </main>
  );
}
