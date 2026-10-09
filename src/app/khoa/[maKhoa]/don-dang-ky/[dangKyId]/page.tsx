import { notFound } from "next/navigation";
import { layDangKy } from "@/server/services/hv/hv-01-dang-ky-truc-tuyen";
import { hoSoBoSung } from "@/server/services/hv/form-dang-ky";
import { thongTinLePhiDuThi } from "@/server/services/hv/hv-05-dang-ky-du-thi";
import { MA_TEP_NOP_PHI } from "@/lib/form-dang-ky";
import { dinhDangTien } from "@/lib/dinh-dang";
import { NutIn } from "./nut-in";
import { FormMinhChungLePhi } from "./form-minh-chung";
import { TuCapNhatLePhi } from "./tu-cap-nhat-le-phi";
import { FormDoiThanhPhan } from "./form-doi-thanh-phan";
import { prisma } from "@/lib/db/prisma";
import { bienCuaKhoa, mauDonHieuLuc } from "@/server/services/chung/mau-in";
import { BanInDonDangKy, type DuLieuDonDangKy } from "@/components/mau-in/ban-in-don-dang-ky";

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
  const laDuThi = dangKy.khoa.chuongTrinh.phuongThucDangKys.includes("CHI_DU_THI");
  const hv = dangKy.hocVien;

  // (bổ sung 07/10/2026) đơn in theo mẫu đơn của khóa/chương trình
  const [mauDon, lePhi] = await Promise.all([mauDonHieuLuc(dangKy.khoaId), laDuThi ? thongTinLePhiDuThi(dangKy.id) : Promise.resolve(null)]);
  const bien = await bienCuaKhoa(mauDon.khoa);
  const ngay = (d: Date | string | null) => (d ? new Date(d).toLocaleDateString("vi-VN") : "");
  const bangPhi: DuLieuDonDangKy["bangPhi"] = dangKy.hopDongLienKet
    ? null // hồ sơ qua đơn vị liên kết: không in học phí cá nhân
    : laDuThi
      ? lePhi
        ? lePhi.thanhPhan
          ? lePhi.thanhPhan.ds.filter((t) => t.daChon).map((t) => ({ noiDung: t.ten, soTien: t.muc }))
          : [{ noiDung: "Lệ phí thi", soTien: lePhi.soTienPhaiNop }]
        : null
      : dangKy.khoa.mucHocPhi
        ? [{ noiDung: "Học phí khóa bồi dưỡng", soTien: Number(dangKy.khoa.mucHocPhi) }]
        : null;
  const duLieuDon: DuLieuDonDangKy = {
    laDuThi,
    thongTin: [
      { nhan: "Họ và tên", giaTri: hv.hoTen, rong: true },
      { nhan: "Ngày sinh", giaTri: ngay(hv.ngaySinh) },
      { nhan: "Số CCCD", giaTri: hv.soCCCD ?? "" },
      ...(laDuThi
        ? hv.maSinhVien
          ? [
              { nhan: "Mã sinh viên", giaTri: hv.maSinhVien },
              { nhan: "Lớp sinh hoạt", giaTri: hv.lopSinhHoat ?? "" },
            ]
          : [{ nhan: "Đối tượng", giaTri: "Thí sinh tự do" }]
        : []),
      { nhan: "Điện thoại", giaTri: hv.soDienThoai ?? "" },
      { nhan: "Email", giaTri: hv.email ?? "" },
      ...(!laDuThi ? [{ nhan: "Đơn vị công tác", giaTri: hv.donViCongTac ?? "", rong: true }] : []),
      ...(chucDanh ? [{ nhan: "Chức danh, học hàm/học vị", giaTri: chucDanh.ten, rong: true }] : []),
      ...boSung.thongTin.map((m) => ({ nhan: m.nhan, giaTri: m.kieu === "NGAY" ? ngay(m.giaTri) : m.giaTri })),
    ],
    tepMinhChung: tepHoSo.map((t) => ({ nhan: t.nhan, tenFile: t.tenFile })),
    bangPhi,
    donViLienKet: dangKy.hopDongLienKet
      ? `${dangKy.hopDongLienKet.donViLienKet.ten}${dangKy.hopDongLienKet.donViLienKet.diaChi ? ` (${dangKy.hopDongLienKet.donViLienKet.diaChi})` : ""}`
      : null,
    maHoSo: hv.maHocVien,
    ngayDangKy: ngay(dangKy.ngayDangKy),
    hoTen: hv.hoTen,
  };
  const banIn = (
    <div className="rounded-lg border print:border-0">
      <BanInDonDangKy mau={mauDon.mau} bien={bien} duLieu={duLieuDon} />
    </div>
  );

  if (laDuThi) {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-4 p-6 print:max-w-none print:p-0">
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
              {lePhi.giaoDichGanNhat && (
                <p className="text-sm">
                  Đã nhận chuyển khoản {dinhDangTien(lePhi.giaoDichGanNhat.soTien)} lúc{" "}
                  {lePhi.giaoDichGanNhat.luc.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} - biên lai số{" "}
                  <b>{lePhi.giaoDichGanNhat.soPhieuThu}</b>.
                  {lePhi.giaoDichGanNhat.thua && " Bạn đã chuyển thừa so với lệ phí - nhà trường sẽ liên hệ hoàn trả phần thừa."}
                </p>
              )}
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
                  {lePhi.tuDongDoiSoat && lePhi.nganHang ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Quét mã QR bằng ứng dụng ngân hàng (tự điền số tài khoản, số tiền, nội dung) và giữ nguyên nội dung chuyển
                        khoản: hệ thống tự xác nhận lệ phí và lập biên lai trong vài phút sau khi tiền về tài khoản nhà trường, không
                        cần nộp minh chứng. Chỉ khi quá 30 phút chưa được xác nhận (hoặc đã chuyển sai nội dung) mới cần tải lên
                        ảnh chụp giao dịch bên dưới. Danh sách chính thức chỉ gồm thí sinh đã được xác nhận lệ phí.
                      </p>
                      <TuCapNhatLePhi />
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Quét mã QR bằng ứng dụng ngân hàng (tự điền số tài khoản, số tiền, nội dung). Sau khi chuyển khoản, tải lên
                      ảnh chụp/biên lai giao dịch để nhà trường đối soát. Danh sách chính thức chỉ gồm thí sinh đã được xác nhận lệ phí.
                    </p>
                  )}
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

        {banIn}
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 p-6 print:max-w-none print:p-0">
      <div className="print:hidden">
        <p className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
          Đăng ký thành công! Vui lòng in đơn này, ký tên và nộp bản giấy về{" "}
          {dangKy.hopDongLienKet ? `đơn vị liên kết ${dangKy.hopDongLienKet.donViLienKet.ten}` : "trung tâm/phòng bồi dưỡng"} theo thời hạn
          quy định.
        </p>
        <NutIn />
      </div>

      {banIn}
    </main>
  );
}
