import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { layCauHinhSmtpHienThi } from "@/server/services/hv/cau-hinh-smtp";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { FormCauHinhSmtp } from "./form-cau-hinh-smtp";

export default async function CauHinhSmtpPage() {
  try {
    await requirePermission("HV-10");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <KhongCoQuyen thongBao={error.message} />;
    }
    throw error;
  }

  const cauHinh = await layCauHinhSmtpHienThi();

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <h1 className="text-xl font-bold text-ued-blue-dam">HV-10 · Cấu hình SMTP gửi thông báo</h1>
      <p className="text-sm text-muted-foreground">
        Dùng để gửi email thật khi có sự kiện (trúng tuyển, nhắc nộp hồ sơ giấy, lịch khai
        giảng...). Mọi sự kiện luôn được ghi vào nhật ký thông báo trong hồ sơ học viên dù đã cấu
        hình SMTP hay chưa.
      </p>
      <FormCauHinhSmtp
        cauHinh={
          cauHinh ? { ...cauHinh, capNhatLuc: cauHinh.capNhatLuc.toISOString() } : null
        }
      />
    </main>
  );
}
