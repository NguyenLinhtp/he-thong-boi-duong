import Link from "next/link";
import { notFound } from "next/navigation";
import { layKhoaTheoMa } from "@/server/services/kh/kh-06-thong-bao-tuyen-sinh";
import { coTheNhanDangKy } from "@/server/services/kh/kh-05-trang-thai-si-so";
import { dsDonViLienKetChoKhoa } from "@/server/services/hv/hv-12-dang-ky-qua-dvlk";
import { FormDangKy } from "./form-dang-ky";
import { FormXacNhanThamGia } from "./form-xac-nhan-tham-gia";
import { auth } from "@/lib/auth";
import { hocVienCuaTaiKhoan } from "@/server/services/kq/kq-05-tra-cuu";
import { dinhDangNgay, dinhDangTien } from "@/lib/dinh-dang";
import { canTaiKhoanKhiDangKy } from "@/lib/form-dang-ky";
import { UserRoundCheck } from "lucide-react";
import { FormDangKyDuThi } from "./form-dang-ky-du-thi";
import { dsThanhPhanLePhi } from "@/server/services/hp/hp-01-thanh-phan-le-phi";
import { FormDangKyQuaDVLK } from "./form-dang-ky-qua-dvlk";
import { FormTimLaiDon } from "./form-tim-lai-don";
import { cauHinhHieuLuc, giaTriTuHoSo } from "@/server/services/hv/form-dang-ky";
import { danhSachChucDanhHocVi } from "@/server/services/dm/dm-02-chuc-danh-hoc-vi";
import type { DuLieuDungForm } from "./kieu-form";
import { thongBaoDaTonTai, timDangKyTrongKhoa } from "@/server/services/hv/kiem-tra-trung-khoa";
import { MA_NGAN_PHUONG_THUC, sapXepPhuongThuc, type MaPhuongThuc } from "@/lib/phuong-thuc";
import type { ReactNode } from "react";

// (bổ sung 08/10/2026 - CT-07) chương trình có nhiều phương thức: mỗi phương thức 1 cách đăng ký
const TIEU_DE_CACH_DANG_KY: Record<MaPhuongThuc, string> = {
  IMPORT_TU_XAC_NHAN: "Tôi được đơn vị cử đi học (đã có tên trong danh sách) - xác nhận tham gia",
  TRUC_TUYEN_NOP_GIAY: "Tự đăng ký trực tuyến, in đơn nộp bản giấy về trường",
  QUA_DON_VI_LIEN_KET: "Đăng ký và nộp hồ sơ giấy qua đơn vị liên kết",
  CHI_DU_THI: "Đăng ký dự thi",
};


export default async function TrangDangKyCongKhaiKhoa({
  params,
}: {
  params: Promise<{ maKhoa: string }>;
}) {
  const { maKhoa } = await params;
  const khoa = await layKhoaTheoMa(maKhoa);
  if (!khoa) notFound();

  const conMo = await coTheNhanDangKy(khoa.id);
  const laDuThi = khoa.chuongTrinh.phuongThucDangKys.includes("CHI_DU_THI");
  // PT2: học viên đã import sẵn giữ chỗ từ trước, không cần kiểm tra lại sĩ
  // số khi xác nhận (khác với PT1 là đăng ký mới, phải qua coTheNhanDangKy).
  const conMoXacNhanThamGia = khoa.trangThai === "DANG_TUYEN_SINH";
  // (bổ sung 30/09/2026) form theo cấu hình chương trình/khóa; học viên đã đăng nhập được điền sẵn từ hồ sơ
  const { cauHinh } = await cauHinhHieuLuc(khoa.id);
  // (bổ sung 01/10/2026) khóa dự thi theo mã SV có lệ phí thí sinh tự do riêng
  const lePhiTheoDoiTuong =
    laDuThi && cauHinh.dinhDanh === "MA_SINH_VIEN" && khoa.mucHocPhiTuDo !== null
      ? { sinhVien: dinhDangTien(khoa.mucHocPhi, "Liên hệ"), tuDo: dinhDangTien(khoa.mucHocPhiTuDo) }
      : null;
  // (bổ sung 06/10/2026) thành phần lệ phí của khóa dự thi (vd. ôn thi, thi)
  const dsThanhPhan = laDuThi ? await dsThanhPhanLePhi(khoa.id) : [];
  const userId = (await auth())?.phienDangNhap?.userId;
  const tuHoSo = await giaTriTuHoSo(userId, cauHinh);
  // (sửa 08/10/2026) danh sách phương thức của chương trình (PT3 đứng riêng)
  const dsPhuongThuc = sapXepPhuongThuc(khoa.chuongTrinh.phuongThucDangKys);
  const co = (m: MaPhuongThuc) => dsPhuongThuc.includes(m);
  // (bổ sung 01/10/2026) khóa bồi dưỡng cần tài khoản học viên; khóa chỉ thi thì không
  const canTaiKhoan = canTaiKhoanKhiDangKy(dsPhuongThuc);
  const hocVien = userId ? await hocVienCuaTaiKhoan(userId) : null;
  // (bổ sung 08/10/2026) học viên đang đăng nhập đã tồn tại trong khóa (theo tài khoản hoặc số CCCD):
  // có tên trong danh sách được cử đi học thì chỉ hiện mục xác nhận; đã đăng ký thì báo đã tồn tại
  const daCoTrongKhoa = hocVien && !laDuThi ? await timDangKyTrongKhoa(khoa.id, { hocVienId: hocVien.id, soCCCD: hocVien.soCCCD }) : null;
  const coTrongDanhSachCu = daCoTrongKhoa?.trangThai === "CHO_TU_XAC_NHAN" && co("IMPORT_TU_XAC_NHAN");
  const daDangKyRoi = !!daCoTrongKhoa && !coTrongDanhSachCu;
  const quayLai = `/khoa/${khoa.maKhoa}`;
  const chanTaiKhoan =
    canTaiKhoan && (conMo || conMoXacNhanThamGia) && !hocVien ? (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <UserRoundCheck className="size-10 text-primary" />
        <p className="font-bold text-ued-blue-dam">Khóa bồi dưỡng cần tài khoản học viên</p>
        <p className="max-w-md text-sm text-muted-foreground">
          {userId
            ? "Tài khoản đang đăng nhập không phải tài khoản học viên. Vui lòng đăng xuất và đăng nhập bằng tài khoản học viên."
            : "Tài khoản dùng để đăng ký, học trực tuyến, xem điểm và nhận thông báo. Tên đăng nhập là số CCCD của bạn."}
        </p>
        {!userId && (
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href={`/dang-nhap?callbackUrl=${encodeURIComponent(quayLai)}`}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Đăng nhập để đăng ký
            </Link>
            <Link
              href={`/dang-ky-tai-khoan?callbackUrl=${encodeURIComponent(quayLai)}`}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Chưa có tài khoản? Đăng ký
            </Link>
          </div>
        )}
      </div>
    ) : null;
  const form: DuLieuDungForm = {
    dinhDanh: cauHinh.dinhDanh,
    truong: cauHinh.truong,
    dsChucDanh: cauHinh.truong.some((t) => t.ma === "chucDanhHocViId" && t.hien)
      ? (await danhSachChucDanhHocVi()).map((c) => ({ id: c.id, ten: c.ten }))
      : [],
    giaTri: tuHoSo?.giaTri ?? null,
    lePhi: lePhiTheoDoiTuong,
    thanhPhan: dsThanhPhan.map((t) => ({
      id: t.id,
      ten: t.ten,
      batBuoc: t.batBuoc,
      mucSinhVien: Number(t.mucSinhVien),
      mucTuDo: t.mucTuDo === null ? null : Number(t.mucTuDo),
    })),
  };
  const goiYDangNhap =
    conMo && !chanTaiKhoan && !daDangKyRoi && (co("TRUC_TUYEN_NOP_GIAY") || co("QUA_DON_VI_LIEN_KET") || laDuThi) && cauHinh.dinhDanh !== "MA_SINH_VIEN" ? (
      tuHoSo ? (
        <p className="mb-4 rounded-lg bg-success/10 p-3 text-sm text-success">
          Thông tin đã được điền sẵn từ hồ sơ của bạn ({tuHoSo.maHocVien}) - vui lòng kiểm tra lại trước khi đăng ký.
        </p>
      ) : canTaiKhoan ? null : (
        <p className="mb-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          Đã từng học tại trung tâm?{" "}
          <Link href={`/dang-nhap?callbackUrl=${encodeURIComponent(`/khoa/${khoa.maKhoa}`)}`} className="font-medium underline">
            Đăng nhập
          </Link>{" "}
          để hệ thống tự điền thông tin từ hồ sơ của bạn.
        </p>
      )
    ) : null;
  const dsDonViLienKet = co("QUA_DON_VI_LIEN_KET") ? await dsDonViLienKetChoKhoa(khoa.id) : [];

  return (
    <main>
      <section className="bg-ued-blue-dam text-white">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <p className="text-sm font-medium tracking-wide text-ued-vang uppercase">
            {laDuThi ? "Đăng ký dự thi" : "Đăng ký khóa bồi dưỡng"}
          </p>
          <h1 className="mt-2 text-2xl leading-tight font-bold text-balance md:text-3xl">{khoa.tenKhoa ?? khoa.chuongTrinh.ten}</h1>
          {khoa.tenKhoa && <p className="mt-1 text-sm text-white/80">Chương trình: {khoa.chuongTrinh.ten}</p>}
          <p className="mt-1 text-sm text-white/80">
            Mã khóa: {khoa.maKhoa} ·{" "}
            <Link href={`/dang-ky/${khoa.chuongTrinh.maCT}`} className="text-white underline hover:text-ued-vang">
              Các {laDuThi ? "đợt thi" : "khóa"} khác của chương trình
            </Link>
          </p>
          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
            {laDuThi ? (
              <div>
                <dt className="text-white/70">Ngày thi</dt>
                <dd className="text-base font-bold">{dinhDangNgay(khoa.thoiGianKhaiGiang, "Thông báo sau")}</dd>
              </div>
            ) : (
              <>
                <div>
                  <dt className="text-white/70">Khai giảng</dt>
                  <dd className="text-base font-bold">{dinhDangNgay(khoa.thoiGianKhaiGiang)}</dd>
                </div>
                <div>
                  <dt className="text-white/70">Bế giảng</dt>
                  <dd className="text-base font-bold">{dinhDangNgay(khoa.thoiGianBeGiang)}</dd>
                </div>
              </>
            )}
            {khoa.hanDangKy && (
              <div>
                <dt className="text-white/70">Hạn đăng ký</dt>
                <dd className="text-base font-bold">{dinhDangNgay(khoa.hanDangKy)}</dd>
              </div>
            )}
            <div>
              <dt className="text-white/70">{laDuThi ? "Lệ phí thi" : "Mức học phí"}</dt>
              {dsThanhPhan.length > 0 ? (
                <dd className="text-sm font-bold">
                  {dsThanhPhan.map((t) => (
                    <span key={t.id} className="block">
                      {t.ten}
                      {!t.batBuoc && <span className="font-normal text-white/70"> (tùy chọn)</span>}: {dinhDangTien(t.mucSinhVien)}
                      {lePhiTheoDoiTuong && t.mucTuDo !== null && <span className="font-normal text-white/80"> · tự do {dinhDangTien(t.mucTuDo)}</span>}
                    </span>
                  ))}
                </dd>
              ) : lePhiTheoDoiTuong ? (
                <dd className="text-sm font-bold">
                  Sinh viên ĐHSP-ĐHĐN: {lePhiTheoDoiTuong.sinhVien}
                  <br />
                  Thí sinh tự do: {lePhiTheoDoiTuong.tuDo}
                </dd>
              ) : (
                <dd className="text-base font-bold">{dinhDangTien(khoa.mucHocPhi, "Liên hệ trực tiếp")}</dd>
              )}
            </div>
          </dl>
        </div>
      </section>

      <div className="mx-auto -mt-4 flex max-w-3xl flex-col gap-4 px-4 pb-12">
        <div className="rounded-lg border bg-card p-6 shadow-md">
          {goiYDangNhap}
          {chanTaiKhoan}
          {!chanTaiKhoan && !daDangKyRoi && (conMo || conMoXacNhanThamGia) && (
            <p className="mb-4 text-xs text-muted-foreground">
              Các mục có dấu <span className="text-destructive">*</span> là bắt buộc.
            </p>
          )}
          {!chanTaiKhoan && daCoTrongKhoa && (
            <div className="mb-4 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
              <p className="font-medium">{thongBaoDaTonTai(daCoTrongKhoa)}</p>
              {daDangKyRoi && (
                <Link href={`/khoa/${khoa.maKhoa}/don-dang-ky/${daCoTrongKhoa.id}`} className="mt-1 inline-block font-medium text-primary underline">
                  Xem hồ sơ/đơn đăng ký của bạn
                </Link>
              )}
            </div>
          )}
          {!chanTaiKhoan && !daDangKyRoi && (
            <>
          <CacCachDangKy
            mo={coTrongDanhSachCu ? "IMPORT_TU_XAC_NHAN" : undefined}
            ds={dsPhuongThuc.filter((m) => !coTrongDanhSachCu || m === "IMPORT_TU_XAC_NHAN").map((m) => ({
              ma: m,
              noiDung:
                m === "TRUC_TUYEN_NOP_GIAY" ? (
                  conMo ? (
                    <FormDangKy khoaId={khoa.id} maKhoa={khoa.maKhoa} form={form} />
                  ) : (
                    <p className="text-sm text-muted-foreground">Khóa hiện không còn mở đăng ký (đã đóng đăng ký hoặc đã đủ sĩ số).</p>
                  )
                ) : m === "IMPORT_TU_XAC_NHAN" ? (
                  conMoXacNhanThamGia ? (
                    <FormXacNhanThamGia
                      khoaId={khoa.id}
                      hocVienDangNhap={hocVien ? { hoTen: hocVien.hoTen, maHocVien: hocVien.maHocVien } : null}
                      form={form}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">Khóa hiện chưa/không còn mở xác nhận tham gia.</p>
                  )
                ) : m === "CHI_DU_THI" ? (
                  <div className="flex flex-col gap-4">
                    {conMo ? (
                      <FormDangKyDuThi khoaId={khoa.id} maKhoa={khoa.maKhoa} form={form} />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Đợt thi hiện không còn mở đăng ký (đã hết hạn, đã đóng đăng ký hoặc đã đủ sĩ số).
                      </p>
                    )}
                    <FormTimLaiDon khoaId={khoa.id} maKhoa={khoa.maKhoa} moSan={!conMo} theoMaSinhVien={form.dinhDanh === "MA_SINH_VIEN"} />
                  </div>
                ) : !conMo ? (
                  <p className="text-sm text-muted-foreground">Khóa hiện không còn mở đăng ký (đã đóng đăng ký hoặc đã đủ sĩ số).</p>
                ) : dsDonViLienKet.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Khóa chưa có đơn vị liên kết nào được phân công tiếp nhận hồ sơ. Vui lòng liên hệ trực tiếp trung tâm.
                  </p>
                ) : (
                  <FormDangKyQuaDVLK
                    khoaId={khoa.id}
                    maKhoa={khoa.maKhoa}
                    form={form}
                    dsDonViLienKet={dsDonViLienKet.map((hd) => ({ id: hd.donViLienKetId, ten: hd.donViLienKet.ten }))}
                  />
                ),
            }))}
          />
          {dsPhuongThuc.length === 0 && (
            <p className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
              Chương trình chưa thiết lập cách đăng ký trực tuyến. Vui lòng liên hệ trực tiếp trung tâm để biết chi tiết.
            </p>
          )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

/**
 * 1 phương thức: hiện thẳng form như trước. Nhiều phương thức: mỗi cách đăng ký 1 mục mở/đóng (chỉ mở
 * 1 mục một lúc), mở sẵn mục phù hợp (vd. học viên đã có tên trong danh sách được cử đi học).
 */
function CacCachDangKy({ ds, mo }: { ds: { ma: MaPhuongThuc; noiDung: ReactNode }[]; mo?: MaPhuongThuc }) {
  if (ds.length === 0) return null;
  if (ds.length === 1) return <>{ds[0].noiDung}</>;
  const moSan = mo && ds.some((d) => d.ma === mo) ? mo : ds[0].ma;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium">Khóa nhận đăng ký theo {ds.length} cách - chọn cách phù hợp với bạn:</p>
      {ds.map((d) => (
        <details key={d.ma} name="cach-dang-ky" open={d.ma === moSan} className="group rounded-lg border open:border-primary">
          <summary className="flex cursor-pointer items-center gap-2 p-3 text-sm font-semibold text-ued-blue-dam select-none">
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">{MA_NGAN_PHUONG_THUC[d.ma]}</span>
            {TIEU_DE_CACH_DANG_KY[d.ma]}
          </summary>
          <div className="border-t p-4">{d.noiDung}</div>
        </details>
      ))}
    </div>
  );
}
