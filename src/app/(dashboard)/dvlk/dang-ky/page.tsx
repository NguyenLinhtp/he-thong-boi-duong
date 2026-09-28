import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { khoaDuocPhanCong } from "@/server/services/dvlk/dvlk-02-tai-khoan";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { FormDangKyThayMat } from "./form-dang-ky-thay-mat";

export default async function DangKyThayMatDVLKPage() {
  let phien;
  try {
    phien = await requirePermission("HV-11");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <KhongCoQuyen thongBao={error.message} />;
    }
    throw error;
  }

  const dsHopDong = await khoaDuocPhanCong(phien.userId, { conHieuLuc: true });

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-ued-blue-dam">HV-11 · Đăng ký học viên thay mặt đơn vị liên kết</h1>
        <Link href="/dvlk/ho-so" className="text-sm underline">
          Hồ sơ của đơn vị (DVLK-04/05) →
        </Link>
      </div>

      {dsHopDong.length === 0 ? (
        <p className="rounded-lg border bg-card p-4 shadow-sm text-sm text-muted-foreground">
          Tài khoản chưa được gán cho đơn vị liên kết nào, hoặc đơn vị chưa có hợp đồng còn hiệu
          lực với khóa nào. Vui lòng liên hệ quản trị hệ thống.
        </p>
      ) : (
        <FormDangKyThayMat
          dsKhoa={dsHopDong.map((hd) => ({
            id: hd.khoa.id,
            maKhoa: hd.khoa.maKhoa,
            ten: hd.khoa.chuongTrinh.ten,
          }))}
        />
      )}
    </main>
  );
}
