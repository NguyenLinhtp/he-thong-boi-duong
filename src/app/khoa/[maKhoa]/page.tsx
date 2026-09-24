import { notFound } from "next/navigation";
import { layKhoaTheoMa } from "@/server/services/kh/kh-06-thong-bao-tuyen-sinh";
import { coTheNhanDangKy } from "@/server/services/kh/kh-05-trang-thai-si-so";

export default async function TrangDangKyCongKhaiKhoa({
  params,
}: {
  params: Promise<{ maKhoa: string }>;
}) {
  const { maKhoa } = await params;
  const khoa = await layKhoaTheoMa(maKhoa);
  if (!khoa) notFound();

  const conMo = await coTheNhanDangKy(khoa.id);

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">{khoa.chuongTrinh.ten}</h1>
      <p className="text-sm text-muted-foreground">Mã khóa: {khoa.maKhoa}</p>

      <div className="rounded-lg border p-4 text-sm">
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
        <p>Mức học phí: {khoa.mucHocPhi ? khoa.mucHocPhi.toString() : "Liên hệ trực tiếp"}</p>
      </div>

      {conMo ? (
        <p className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
          Khóa đang mở đăng ký. Chức năng đăng ký trực tuyến sẽ sớm được bổ sung.
        </p>
      ) : (
        <p className="rounded-lg border p-4 text-sm text-muted-foreground">
          Khóa hiện không còn mở đăng ký (đã đóng đăng ký hoặc đã đủ sĩ số).
        </p>
      )}
    </main>
  );
}
