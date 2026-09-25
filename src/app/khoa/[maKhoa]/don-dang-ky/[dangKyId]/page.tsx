import { notFound } from "next/navigation";
import { layDangKy } from "@/server/services/hv/hv-01-dang-ky-truc-tuyen";
import { NutIn } from "./nut-in";

export default async function TrangDonDangKy({
  params,
}: {
  params: Promise<{ maKhoa: string; dangKyId: string }>;
}) {
  const { maKhoa, dangKyId } = await params;

  let dangKy;
  try {
    dangKy = await layDangKy(dangKyId);
  } catch {
    notFound();
  }
  if (dangKy.khoa.maKhoa !== maKhoa) notFound();

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 p-6">
      <div className="print:hidden">
        <p className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
          Đăng ký thành công! Vui lòng in đơn này, ký tên và nộp bản giấy về trung tâm/phòng bồi
          dưỡng theo thời hạn quy định.
        </p>
        <NutIn />
      </div>

      <article className="rounded-lg border p-6 text-sm">
        <h1 className="text-center text-lg font-semibold uppercase">Đơn đăng ký khóa bồi dưỡng</h1>
        <p className="mt-4">Kính gửi: Phòng/Trung tâm bồi dưỡng</p>
        <p className="mt-2">Tôi tên là: {dangKy.hocVien.hoTen}</p>
        <p>Số CCCD: {dangKy.hocVien.soCCCD ?? "—"}</p>
        <p>
          Ngày sinh:{" "}
          {dangKy.hocVien.ngaySinh
            ? new Date(dangKy.hocVien.ngaySinh).toLocaleDateString("vi-VN")
            : "—"}
        </p>
        <p>Số điện thoại: {dangKy.hocVien.soDienThoai ?? "—"}</p>
        <p>Email: {dangKy.hocVien.email ?? "—"}</p>
        <p>Đơn vị công tác: {dangKy.hocVien.donViCongTac ?? "—"}</p>
        <p className="mt-4">
          Đăng ký tham gia khóa bồi dưỡng: <strong>{dangKy.khoa.chuongTrinh.ten}</strong>
        </p>
        <p>Mã khóa: {dangKy.khoa.maKhoa}</p>
        <p>Mã học viên: {dangKy.hocVien.maHocVien}</p>
        <p>Ngày đăng ký: {new Date(dangKy.ngayDangKy).toLocaleDateString("vi-VN")}</p>
        {dangKy.hopDongLienKet && (
          <p className="mt-2">
            Đơn vị liên kết thu hồ sơ: <strong>{dangKy.hopDongLienKet.donViLienKet.ten}</strong>
            {dangKy.hopDongLienKet.donViLienKet.diaChi &&
              ` (${dangKy.hopDongLienKet.donViLienKet.diaChi})`}
          </p>
        )}
        <p className="mt-4 italic">
          Trạng thái: Đã đăng ký online - chờ nộp bản giấy về{" "}
          {dangKy.hopDongLienKet
            ? `đơn vị liên kết ${dangKy.hopDongLienKet.donViLienKet.ten}`
            : "trung tâm/phòng bồi dưỡng"}
          .
        </p>
        <p className="mt-8 text-right">Người đăng ký ký tên</p>
      </article>
    </main>
  );
}
