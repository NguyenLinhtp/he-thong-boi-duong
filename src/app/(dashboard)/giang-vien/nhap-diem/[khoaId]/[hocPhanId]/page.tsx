import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { giangVienCuaTaiKhoan } from "@/server/services/gd/dung-chung";
import { bangDiemHocPhan } from "@/server/services/kq/kq-01-nhap-diem";
import { LoiKetQua } from "@/server/services/kq/loi-ket-qua";
import { FormNhapDiem } from "./form-nhap-diem";

export default async function NhapDiemHocPhanPage({
  params,
}: {
  params: Promise<{ khoaId: string; hocPhanId: string }>;
}) {
  let phien;
  try {
    phien = await requirePermission("KQ-01");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <p className="p-6 text-destructive">{error.message}</p>;
    }
    throw error;
  }

  const giangVien = await giangVienCuaTaiKhoan(phien.userId);
  if (!giangVien) {
    return (
      <p className="p-6 text-destructive">Tài khoản đăng nhập chưa gắn với hồ sơ giảng viên nào.</p>
    );
  }

  const { khoaId, hocPhanId } = await params;
  let bang;
  try {
    bang = await bangDiemHocPhan(giangVien.id, khoaId, hocPhanId);
  } catch (error) {
    if (error instanceof LoiKetQua) return <p className="p-6 text-destructive">{error.message}</p>;
    throw error;
  }

  return (
    <main className="flex flex-col gap-6 p-6">
      <h1 className="text-lg font-semibold">
        KQ-01 · {bang.hocPhan.ten} · khóa {bang.khoa.maKhoa}
      </h1>
      <p className="text-sm text-muted-foreground">
        Điểm trong khoảng 0–10. Điểm học phần tự tính theo tỷ lệ thành phần/kết thúc cấu hình ở
        tham số hệ thống (mặc định 30%/70%). Điểm đã phê duyệt (KQ-04) không sửa được.
      </p>
      <FormNhapDiem khoaId={khoaId} hocPhanId={hocPhanId} dsDong={bang.dong} />
    </main>
  );
}
