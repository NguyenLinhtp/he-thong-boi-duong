import { notFound } from "next/navigation";
import { layKhoaTheoMa } from "@/server/services/kh/kh-06-thong-bao-tuyen-sinh";
import { coTheNhanDangKy } from "@/server/services/kh/kh-05-trang-thai-si-so";
import { FormDangKy } from "./form-dang-ky";
import { FormXacNhanThamGia } from "./form-xac-nhan-tham-gia";
import { FormDangKyDuThi } from "./form-dang-ky-du-thi";

export default async function TrangDangKyCongKhaiKhoa({
  params,
}: {
  params: Promise<{ maKhoa: string }>;
}) {
  const { maKhoa } = await params;
  const khoa = await layKhoaTheoMa(maKhoa);
  if (!khoa) notFound();

  const conMo = await coTheNhanDangKy(khoa.id);
  // PT2: học viên đã import sẵn giữ chỗ từ trước, không cần kiểm tra lại sĩ
  // số khi xác nhận (khác với PT1 là đăng ký mới, phải qua coTheNhanDangKy).
  const conMoXacNhanThamGia = khoa.trangThai === "DANG_TUYEN_SINH";

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

      {khoa.chuongTrinh.phuongThucDangKy === "TRUC_TUYEN_NOP_GIAY" &&
        (conMo ? (
          <FormDangKy khoaId={khoa.id} maKhoa={khoa.maKhoa} />
        ) : (
          <p className="rounded-lg border p-4 text-sm text-muted-foreground">
            Khóa hiện không còn mở đăng ký (đã đóng đăng ký hoặc đã đủ sĩ số).
          </p>
        ))}

      {khoa.chuongTrinh.phuongThucDangKy === "IMPORT_TU_XAC_NHAN" &&
        (conMoXacNhanThamGia ? (
          <FormXacNhanThamGia khoaId={khoa.id} />
        ) : (
          <p className="rounded-lg border p-4 text-sm text-muted-foreground">
            Khóa hiện chưa/không còn mở xác nhận tham gia.
          </p>
        ))}

      {khoa.chuongTrinh.phuongThucDangKy === "CHI_DU_THI" &&
        (conMo ? (
          <FormDangKyDuThi khoaId={khoa.id} />
        ) : (
          <p className="rounded-lg border p-4 text-sm text-muted-foreground">
            Đợt thi hiện không còn mở đăng ký (đã đóng đăng ký hoặc đã đủ sĩ số).
          </p>
        ))}

      {khoa.chuongTrinh.phuongThucDangKy &&
        !["TRUC_TUYEN_NOP_GIAY", "IMPORT_TU_XAC_NHAN", "CHI_DU_THI"].includes(
          khoa.chuongTrinh.phuongThucDangKy,
        ) && (
          <p className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
            Khóa đang mở đăng ký theo hình thức khác đăng ký trực tuyến. Vui lòng liên hệ trực tiếp
            trung tâm/đơn vị liên kết để biết chi tiết.
          </p>
        )}
    </main>
  );
}
