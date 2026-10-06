import { notFound } from "next/navigation";
import { layDangKy } from "@/server/services/hv/hv-01-dang-ky-truc-tuyen";
import { hoSoBoSung } from "@/server/services/hv/form-dang-ky";
import { thongTinLePhiDuThi } from "@/server/services/hv/hv-05-dang-ky-du-thi";
import { layThamSo } from "@/server/services/qt/qt-05-tham-so";
import { MA_TEP_NOP_PHI } from "@/lib/form-dang-ky";
import { dinhDangNgay, dinhDangTien } from "@/lib/dinh-dang";
import { NutIn } from "./nut-in";
import { FormMinhChungLePhi } from "./form-minh-chung";
import { FormDoiThanhPhan } from "./form-doi-thanh-phan";
import { prisma } from "@/lib/db/prisma";

export default async function TrangDonDangKy({
  params,
  searchParams,
}: {
  params: Promise<{ maKhoa: string; dangKyId: string }>;
  searchParams: Promise<{ daDangKy?: string }>;
}) {
  const { maKhoa, dangKyId } = await params;
  const { daDangKy } = await searchParams;

  let dangKy;
  try {
    dangKy = await layDangKy(dangKyId);
  } catch {
    notFound();
  }
  if (dangKy.khoa.maKhoa !== maKhoa) notFound();
  // (bổ sung 30/09/2026) trường tùy chỉnh + tệp minh chứng theo form cấu hình
  const boSung = await hoSoBoSung(dangKy.id);
  const tepHoSo = boSung.tep.filter((t) => t.maTruong !== MA_TEP_NOP_PHI);
  const chucDanh = dangKy.hocVien.chucDanhHocViId
    ? await prisma.chucDanhHocVi.findUnique({ where: { id: dangKy.hocVien.chucDanhHocViId } })
    : null;
  const laDuThi = dangKy.khoa.chuongTrinh.phuongThucDangKy === "CHI_DU_THI";
  const hv = dangKy.hocVien;

  const thongTinBoSung = (
    <>
      {boSung.thongTin.map((m) => (
        <p key={m.ma}>
          {m.nhan}: {m.kieu === "NGAY" ? new Date(m.giaTri).toLocaleDateString("vi-VN") : m.giaTri}
        </p>
      ))}
      {tepHoSo.length > 0 && (
        <div className="mt-2">
          <p>Minh chứng đã nộp kèm:</p>
          <ul className="list-disc pl-5">
            {tepHoSo.map((t) => (
              <li key={t.id}>
                {t.nhan}: {t.tenFile}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );

  if (laDuThi) {
    const [lePhi, tenCoQuan] = await Promise.all([thongTinLePhiDuThi(dangKy.id), layThamSo("CC_TEN_CO_QUAN_CAP")]);
    const homNay = new Date();
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
        <div className="flex flex-col gap-4 print:hidden">
          <p className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
            {daDangKy
              ? "Bạn đã đăng ký đợt thi này trước đó - dưới đây là đơn của bạn."
              : "Đăng ký dự thi thành công! Vui lòng in đơn, ký tên và hoàn tất lệ phí theo hướng dẫn bên dưới."}{" "}
            Lưu lại đường dẫn trang này để quay lại nộp minh chứng (hoặc mở lại đơn bằng{" "}
            {hv.maSinhVien ? "mã sinh viên" : "số CCCD"} + số điện thoại đã khai trên trang đăng ký) - không cần tài khoản.
          </p>

          {lePhi && (
            <section className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
              <h2 className="font-bold text-ued-blue-dam">Lệ phí thi: {dinhDangTien(lePhi.soTienPhaiNop)}</h2>
              {/* (bổ sung 06/10/2026) thành phần lệ phí đã đăng ký + đổi lựa chọn đến hạn đăng ký */}
              {lePhi.thanhPhan &&
                (lePhi.thanhPhan.duocDoi && lePhi.thanhPhan.ds.some((t) => !t.coDinh || !t.daChon) ? (
                  <FormDoiThanhPhan
                    dangKyId={dangKy.id}
                    maKhoa={maKhoa}
                    ds={lePhi.thanhPhan.ds.map((t) => ({ id: t.id, ten: t.ten, batBuoc: t.batBuoc, mucSinhVien: t.muc, mucTuDo: null }))}
                    daChon={lePhi.thanhPhan.ds.filter((t) => t.daChon).map((t) => t.id)}
                    khoaChon={lePhi.thanhPhan.ds.filter((t) => t.daChon && t.coDinh && !t.batBuoc).map((t) => t.id)}
                  />
                ) : (
                  <ul className="flex flex-col gap-1 text-sm">
                    {lePhi.thanhPhan.ds
                      .filter((t) => t.daChon)
                      .map((t) => (
                        <li key={t.id} className="flex justify-between gap-3 border-b pb-1 last:border-0">
                          <span>{t.ten}</span>
                          <span className="tabular-nums">
                            {dinhDangTien(t.muc)}
                            {t.trangThai && ["DA_NOP_DU", "MIEN_GIAM"].includes(t.trangThai) && <span className="ml-2 text-success">đã xác nhận</span>}
                          </span>
                        </li>
                      ))}
                  </ul>
                ))}
              {lePhi.daXong ? (
                <p className="rounded-lg bg-success/10 p-3 text-sm text-success">Nhà trường đã xác nhận bạn đã nộp lệ phí thi.</p>
              ) : (
                <>
                  {lePhi.nganHang ? (
                    <div className="flex flex-wrap items-start gap-4">
                      {lePhi.qrSvg && (
                        <div
                          className="size-44 shrink-0 rounded-lg border bg-white p-1"
                          aria-label="Mã QR chuyển khoản"
                          // SVG do thư viện qrcode sinh từ chuỗi VietQR phía máy chủ
                          dangerouslySetInnerHTML={{ __html: lePhi.qrSvg }}
                        />
                      )}
                      <dl className="grid gap-1 text-sm">
                        <dt className="text-muted-foreground">Ngân hàng</dt>
                        <dd className="font-medium">{lePhi.nganHang.tenNganHang ?? "—"}</dd>
                        <dt className="text-muted-foreground">Số tài khoản</dt>
                        <dd className="font-mono text-base font-bold">{lePhi.nganHang.soTaiKhoan}</dd>
                        <dt className="text-muted-foreground">Chủ tài khoản</dt>
                        <dd className="font-medium">{lePhi.nganHang.chuTaiKhoan ?? "—"}</dd>
                        <dt className="text-muted-foreground">Số tiền</dt>
                        <dd className="font-bold">{dinhDangTien(lePhi.soTienConLai)}</dd>
                        <dt className="text-muted-foreground">Nội dung chuyển khoản (ghi đúng)</dt>
                        <dd className="font-mono text-base font-bold">{lePhi.noiDung}</dd>
                      </dl>
                    </div>
                  ) : (
                    <p className="text-sm text-warning">
                      Nhà trường chưa công bố tài khoản nhận lệ phí trên hệ thống - vui lòng liên hệ phòng đào tạo. Khi chuyển
                      khoản ghi nội dung: <b className="font-mono">{lePhi.noiDung}</b>
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Quét mã QR bằng ứng dụng ngân hàng (tự điền số tài khoản, số tiền, nội dung). Sau khi chuyển khoản, tải lên
                    ảnh chụp/biên lai giao dịch để nhà trường đối soát. Danh sách chính thức chỉ gồm thí sinh đã được xác nhận lệ phí.
                  </p>
                  {lePhi.minhChung && (
                    <p className="text-sm">
                      Đã nộp minh chứng: <b>{lePhi.minhChung.tenFile}</b> lúc {lePhi.minhChung.taiLenLuc.toLocaleString("vi-VN")} - đang
                      chờ đối soát.
                    </p>
                  )}
                  {lePhi.choNopMinhChung && <FormMinhChungLePhi dangKyId={dangKy.id} maKhoa={maKhoa} daNop={!!lePhi.minhChung} />}
                </>
              )}
            </section>
          )}
          <NutIn />
        </div>

        <article className="rounded-lg border bg-white p-8 text-sm leading-relaxed text-black">
          <div className="grid grid-cols-2 gap-4 text-center text-xs">
            <p className="font-bold uppercase">{tenCoQuan ?? "Cơ sở đào tạo, bồi dưỡng"}</p>
            <p>
              <b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</b>
              <br />
              <span className="underline underline-offset-4">Độc lập - Tự do - Hạnh phúc</span>
            </p>
          </div>
          <h1 className="mt-6 text-center text-lg font-bold uppercase">Đơn đăng ký dự thi</h1>
          <p className="text-center font-semibold uppercase">{dangKy.khoa.tenKhoa ?? dangKy.khoa.chuongTrinh.ten}</p>
          <p className="mt-4">Kính gửi: {tenCoQuan ?? "Phòng/Trung tâm bồi dưỡng"}</p>
          <div className="mt-2 grid grid-cols-2 gap-x-4">
            <p>Họ và tên: <b>{hv.hoTen}</b></p>
            {hv.maSinhVien ? <p>Mã sinh viên: {hv.maSinhVien}</p> : <p>Đối tượng: Thí sinh tự do</p>}
            <p>Số CCCD: {hv.soCCCD ?? "—"}</p>
            {hv.maSinhVien && <p>Lớp sinh hoạt: {hv.lopSinhHoat ?? "—"}</p>}
            {hv.ngaySinh && <p>Ngày sinh: {dinhDangNgay(hv.ngaySinh)}</p>}
            {hv.soDienThoai && <p>Điện thoại: {hv.soDienThoai}</p>}
            {hv.email && <p className="col-span-2">Email: {hv.email}</p>}
          </div>
          {thongTinBoSung}
          <p className="mt-3">
            Đăng ký dự thi: <b>{dangKy.khoa.tenKhoa ?? dangKy.khoa.chuongTrinh.ten}</b> - đợt thi <b>{dangKy.khoa.maKhoa}</b>
            {dangKy.khoa.thoiGianKhaiGiang && <>, ngày thi dự kiến {dinhDangNgay(dangKy.khoa.thoiGianKhaiGiang)}</>}.
          </p>
          {lePhi && (
            <p>
              Lệ phí thi: {dinhDangTien(lePhi.soTienPhaiNop)}
              {lePhi.thanhPhan &&
                ` (${lePhi.thanhPhan.ds
                  .filter((t) => t.daChon)
                  .map((t) => `${t.ten}: ${dinhDangTien(t.muc)}`)
                  .join("; ")})`}
              .
            </p>
          )}
          <p>Mã hồ sơ: {hv.maHocVien} · Ngày đăng ký: {dinhDangNgay(dangKy.ngayDangKy)}</p>
          <p className="mt-3">
            Tôi xin cam đoan những thông tin trên là đúng sự thật và chấp hành nghiêm túc quy chế thi của nhà trường.
          </p>
          <div className="mt-6 grid grid-cols-2 text-center">
            <span />
            <div>
              <p className="italic">
                ......, ngày {homNay.getDate()} tháng {homNay.getMonth() + 1} năm {homNay.getFullYear()}
              </p>
              <p className="font-bold">Người làm đơn</p>
              <p className="italic">(Ký và ghi rõ họ tên)</p>
              <p className="mt-16 font-semibold">{hv.hoTen}</p>
            </div>
          </div>
        </article>
      </main>
    );
  }

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
        <p className="mt-2">Tôi tên là: {hv.hoTen}</p>
        <p>Số CCCD: {hv.soCCCD ?? "—"}</p>
        <p>
          Ngày sinh:{" "}
          {hv.ngaySinh
            ? new Date(hv.ngaySinh).toLocaleDateString("vi-VN")
            : "—"}
        </p>
        <p>Số điện thoại: {hv.soDienThoai ?? "—"}</p>
        <p>Email: {hv.email ?? "—"}</p>
        <p>Đơn vị công tác: {hv.donViCongTac ?? "—"}</p>
        {chucDanh && <p>Chức danh, học hàm/học vị: {chucDanh.ten}</p>}
        {thongTinBoSung}
        <p className="mt-4">
          Đăng ký tham gia khóa bồi dưỡng: <strong>{dangKy.khoa.tenKhoa ?? dangKy.khoa.chuongTrinh.ten}</strong>
        </p>
        <p>Mã khóa: {dangKy.khoa.maKhoa}</p>
        <p>Mã học viên: {hv.maHocVien}</p>
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
