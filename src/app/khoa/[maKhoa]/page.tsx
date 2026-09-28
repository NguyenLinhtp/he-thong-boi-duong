import { notFound } from "next/navigation";
import { layKhoaTheoMa } from "@/server/services/kh/kh-06-thong-bao-tuyen-sinh";
import { coTheNhanDangKy } from "@/server/services/kh/kh-05-trang-thai-si-so";
import { dsDonViLienKetChoKhoa } from "@/server/services/hv/hv-12-dang-ky-qua-dvlk";
import { FormDangKy } from "./form-dang-ky";
import { FormXacNhanThamGia } from "./form-xac-nhan-tham-gia";
import { auth } from "@/lib/auth";
import { hocVienCuaTaiKhoan } from "@/server/services/kq/kq-05-tra-cuu";
import { dinhDangNgay, dinhDangTien } from "@/lib/dinh-dang";
import { FormDangKyDuThi } from "./form-dang-ky-du-thi";
import { FormDangKyQuaDVLK } from "./form-dang-ky-qua-dvlk";

// HV-04: học viên đã đăng nhập (tài khoản liên kết hồ sơ học viên) xác nhận
// tham gia bằng tài khoản, không cần gõ CCCD/mã số
async function hocVienDangNhap() {
  const userId = (await auth())?.phienDangNhap?.userId;
  if (!userId) return null;
  const hocVien = await hocVienCuaTaiKhoan(userId);
  return hocVien ? { hoTen: hocVien.hoTen, maHocVien: hocVien.maHocVien } : null;
}

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
  const dsDonViLienKet =
    khoa.chuongTrinh.phuongThucDangKy === "QUA_DON_VI_LIEN_KET"
      ? await dsDonViLienKetChoKhoa(khoa.id)
      : [];

  return (
    <main>
      <section className="bg-ued-blue-dam text-white">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <p className="text-sm font-medium tracking-wide text-ued-vang uppercase">Đăng ký khóa bồi dưỡng</p>
          <h1 className="mt-2 text-2xl leading-tight font-bold text-balance md:text-3xl">{khoa.chuongTrinh.ten}</h1>
          <p className="mt-1 text-sm text-white/80">Mã khóa: {khoa.maKhoa}</p>
          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-white/70">Khai giảng</dt>
              <dd className="text-base font-bold">{dinhDangNgay(khoa.thoiGianKhaiGiang)}</dd>
            </div>
            <div>
              <dt className="text-white/70">Bế giảng</dt>
              <dd className="text-base font-bold">{dinhDangNgay(khoa.thoiGianBeGiang)}</dd>
            </div>
            <div>
              <dt className="text-white/70">Mức học phí</dt>
              <dd className="text-base font-bold">{dinhDangTien(khoa.mucHocPhi, "Liên hệ trực tiếp")}</dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="mx-auto -mt-4 flex max-w-3xl flex-col gap-4 px-4 pb-12">
        <div className="rounded-lg border bg-card p-6 shadow-md">
          {khoa.chuongTrinh.phuongThucDangKy === "TRUC_TUYEN_NOP_GIAY" &&
            (conMo ? (
              <FormDangKy khoaId={khoa.id} maKhoa={khoa.maKhoa} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Khóa hiện không còn mở đăng ký (đã đóng đăng ký hoặc đã đủ sĩ số).
              </p>
            ))}

          {khoa.chuongTrinh.phuongThucDangKy === "IMPORT_TU_XAC_NHAN" &&
            (conMoXacNhanThamGia ? (
              <FormXacNhanThamGia khoaId={khoa.id} hocVienDangNhap={await hocVienDangNhap()} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Khóa hiện chưa/không còn mở xác nhận tham gia.
              </p>
            ))}

          {khoa.chuongTrinh.phuongThucDangKy === "CHI_DU_THI" &&
            (conMo ? (
              <FormDangKyDuThi khoaId={khoa.id} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Đợt thi hiện không còn mở đăng ký (đã đóng đăng ký hoặc đã đủ sĩ số).
              </p>
            ))}

          {khoa.chuongTrinh.phuongThucDangKy === "QUA_DON_VI_LIEN_KET" &&
            (!conMo ? (
              <p className="text-sm text-muted-foreground">
                Khóa hiện không còn mở đăng ký (đã đóng đăng ký hoặc đã đủ sĩ số).
              </p>
            ) : dsDonViLienKet.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Khóa chưa có đơn vị liên kết nào được phân công tiếp nhận hồ sơ. Vui lòng liên hệ trực
                tiếp trung tâm.
              </p>
            ) : (
              <FormDangKyQuaDVLK
                khoaId={khoa.id}
                maKhoa={khoa.maKhoa}
                dsDonViLienKet={dsDonViLienKet.map((hd) => ({
                  id: hd.donViLienKetId,
                  ten: hd.donViLienKet.ten,
                }))}
              />
            ))}

          {khoa.chuongTrinh.phuongThucDangKy &&
            !["TRUC_TUYEN_NOP_GIAY", "IMPORT_TU_XAC_NHAN", "CHI_DU_THI", "QUA_DON_VI_LIEN_KET"].includes(
              khoa.chuongTrinh.phuongThucDangKy,
            ) && (
              <p className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
                Khóa đang mở đăng ký theo hình thức khác đăng ký trực tuyến. Vui lòng liên hệ trực tiếp
                trung tâm/đơn vị liên kết để biết chi tiết.
              </p>
            )}
        </div>
      </div>
    </main>
  );
}
