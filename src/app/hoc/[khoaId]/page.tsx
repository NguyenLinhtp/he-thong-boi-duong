import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { cauTrucKhoaHoc, noiDungMuc, dsThaoLuan, layGhiChep } from "@/server/services/gd/gd-04-hoc-tap";
import { KhongDuocXemTaiLieuError } from "@/server/services/gd/loi-giang-day";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { dinhDangNgay } from "@/lib/dinh-dang";
import { ThanhTrai } from "./thanh-trai";
import { ThanhPhai } from "./thanh-phai";
import { LamTracNghiem, LienKetTaiVe, NopSanPham, NutDanhDau, TuDongHoanThanh, VideoTheoDoi } from "./noi-dung-muc";

export const metadata: Metadata = { title: "Học tập" };

const DUOI_XEM_PDF = [".pdf"];
const DUOI_ANH = [".png", ".jpg", ".jpeg"];
const DUOI_VIDEO = [".mp4", ".webm"];
const duoi = (ten: string | null) => (ten ? ten.slice(ten.lastIndexOf(".")).toLowerCase() : "");

/** Link YouTube / Google Drive -> địa chỉ nhúng; link khác -> null. */
function diaChiNhung(link: string): string | null {
  const yt = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/.exec(link);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const drive = /drive\.google\.com\/file\/d\/([\w-]+)/.exec(link);
  if (drive) return `https://drive.google.com/file/d/${drive[1]}/preview`;
  return null;
}

type NoiDung = Awaited<ReturnType<typeof noiDungMuc>>;

/** Hiển thị 1 tệp/link học liệu theo định dạng: PDF cuộn được, ảnh, video, nhúng YouTube/Drive, còn lại tải về. */
function XemTep({
  api,
  tenFile,
  duongLink,
  khoaId,
  mucKey,
  capNhat,
  hoanThanh,
}: {
  api: string;
  tenFile: string | null;
  duongLink: string | null;
  khoaId: string;
  mucKey: string;
  capNhat: boolean;
  hoanThanh: boolean;
}) {
  const tuDong = capNhat && !hoanThanh ? <TuDongHoanThanh khoaId={khoaId} mucKey={mucKey} /> : null;
  if (duongLink) {
    const nhung = diaChiNhung(duongLink);
    return (
      <div className="flex h-full flex-col gap-3">
        {nhung ? (
          <iframe src={nhung} title="Học liệu nhúng" className="aspect-video w-full rounded-lg border bg-black" allow="fullscreen; encrypted-media" allowFullScreen />
        ) : (
          <p className="rounded-lg border bg-white p-4 text-sm">
            Học liệu ở trang ngoài:{" "}
            <a href={duongLink} target="_blank" rel="noreferrer noopener" className="break-all">
              {duongLink}
            </a>
          </p>
        )}
        {capNhat && <NutDanhDau khoaId={khoaId} mucKey={mucKey} daXong={hoanThanh} />}
      </div>
    );
  }
  const d = duoi(tenFile);
  if (DUOI_XEM_PDF.includes(d)) {
    return (
      <>
        {tuDong}
        <iframe src={`${api}?xem=1#view=FitH`} title={tenFile ?? "Tài liệu"} className="h-full min-h-[70vh] w-full rounded-lg border bg-white" />
      </>
    );
  }
  if (DUOI_ANH.includes(d)) {
    return (
      <div className="overflow-auto">
        {tuDong}
        {/* eslint-disable-next-line @next/next/no-img-element -- ảnh phục vụ qua API có kiểm tra quyền */}
        <img src={`${api}?xem=1`} alt={tenFile ?? "Hình ảnh"} className="mx-auto max-w-full rounded-lg border" />
      </div>
    );
  }
  if (DUOI_VIDEO.includes(d)) return <VideoTheoDoi src={`${api}?xem=1`} khoaId={khoaId} mucKey={mucKey} capNhat={capNhat && !hoanThanh} />;
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border bg-white p-6">
      <p className="font-medium">{tenFile}</p>
      <p className="text-sm text-muted-foreground">
        Định dạng này không xem trực tiếp được trên trình duyệt - tải về để mở bằng Word/PowerPoint/Excel.
      </p>
      <LienKetTaiVe href={api} khoaId={khoaId} mucKey={mucKey} capNhat={capNhat && !hoanThanh}>
        Tải về
      </LienKetTaiVe>
    </div>
  );
}

function KhungGiua({ nd, khoaId, mucKey, capNhat, hoanThanh }: { nd: NoiDung; khoaId: string; mucKey: string; capNhat: boolean; hoanThanh: boolean }) {
  if (nd.loai === "HL") {
    const { hl } = nd;
    const coTep = Boolean(hl.khoaLuuTru || hl.duongLink);
    return (
      <div className="flex h-full flex-col gap-4">
        {hl.moTa && <p className="text-sm text-muted-foreground">{hl.moTa}</p>}
        {hl.noiDung && (
          <div className="rounded-lg border bg-white p-5 leading-relaxed whitespace-pre-line">
            {!coTep && capNhat && !hoanThanh && <TuDongHoanThanh khoaId={khoaId} mucKey={mucKey} />}
            {hl.noiDung}
          </div>
        )}
        {coTep && (
          <div className="min-h-0 flex-1">
            <XemTep api={`/api/ct/hoc-lieu/${hl.id}`} tenFile={hl.tenFile} duongLink={hl.duongLink} khoaId={khoaId} mucKey={mucKey} capNhat={capNhat} hoanThanh={hoanThanh} />
          </div>
        )}
      </div>
    );
  }
  if (nd.loai === "GV") {
    const { tl } = nd;
    return (
      <div className="flex h-full flex-col gap-4">
        <p className="text-sm text-muted-foreground">Tài liệu giảng viên {tl.nguoiDang} bổ sung cho khóa{tl.moTa ? ` - ${tl.moTa}` : ""}.</p>
        <div className="min-h-0 flex-1">
          <XemTep api={`/api/gd/hoc-lieu/${tl.id}`} tenFile={tl.tenFile} duongLink={tl.duongLink} khoaId={khoaId} mucKey={mucKey} capNhat={capNhat} hoanThanh={hoanThanh} />
        </div>
      </div>
    );
  }
  if (nd.loai === "TN") {
    const { bai, dsLan } = nd;
    const daNop = dsLan.filter((l) => l.nopLuc);
    const diemCaoNhat = daNop.length ? Math.max(...daNop.map((l) => Number(l.diem))) : null;
    const conLuot = !bai.soLanToiDa || dsLan.length < bai.soLanToiDa || dsLan.some((l) => !l.nopLuc);
    return (
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 rounded-lg border bg-white p-4 text-sm sm:grid-cols-4">
          <p>
            <span className="block text-muted-foreground">Số câu hỏi</span>
            <b>{bai._count.cauHois}</b>
          </p>
          <p>
            <span className="block text-muted-foreground">Thời gian</span>
            <b>{bai.thoiGianPhut ? `${bai.thoiGianPhut} phút` : "Không giới hạn"}</b>
          </p>
          <p>
            <span className="block text-muted-foreground">Lượt đã làm</span>
            <b>
              {dsLan.length}
              {bai.soLanToiDa ? `/${bai.soLanToiDa}` : ""}
            </b>
          </p>
          <p>
            <span className="block text-muted-foreground">Điểm cao nhất</span>
            <b>{diemCaoNhat == null ? "—" : diemCaoNhat.toLocaleString("vi-VN")}</b>
            <span className="block text-xs text-muted-foreground">{bai.tinhDiem ? `tính điểm, hệ số ${Number(bai.heSo)}` : "tự kiểm tra"}</span>
          </p>
        </div>
        {bai.moTa && <p className="text-sm whitespace-pre-line">{bai.moTa}</p>}
        <LamTracNghiem khoaId={khoaId} baiId={bai.id} duocLam={capNhat} conLuot={conLuot} />
      </div>
    );
  }
  const { yc, baiNop } = nd;
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border bg-white p-4">
        <p className="text-sm font-bold text-ued-blue-dam">Yêu cầu sản phẩm</p>
        <p className="mt-1 whitespace-pre-line">{yc.moTa ?? "Nộp sản phẩm theo hướng dẫn của giảng viên."}</p>
        <p className="mt-2 text-xs text-muted-foreground">{yc.tinhDiem ? `Tính điểm, hệ số ${Number(yc.heSo)}` : "Không tính điểm"}</p>
      </div>
      {baiNop && (
        <div className="rounded-lg border bg-white p-4 text-sm">
          <p>
            Đã nộp: <a href={`/api/gd/san-pham/${baiNop.id}`}>{baiNop.tenFile}</a> · {baiNop.nopLuc.toLocaleString("vi-VN")}
          </p>
          {baiNop.diem != null ? (
            <p className="mt-1 font-medium text-success">
              Điểm: {Number(baiNop.diem).toLocaleString("vi-VN")} {baiNop.nhanXet && <span className="font-normal text-foreground">· Nhận xét: {baiNop.nhanXet}</span>}
            </p>
          ) : (
            <p className="mt-1 text-muted-foreground">Chờ giảng viên chấm - có thể nộp lại để thay tệp.</p>
          )}
        </div>
      )}
      <NopSanPham khoaId={khoaId} yeuCauId={yc.id} duocNop={capNhat && baiNop?.diem == null} />
    </div>
  );
}

// GD-04 (bổ sung 29/09/2026): màn hình học 3 phần theo mẫu taphuan
export default async function ManHinhHocPage({
  params,
  searchParams,
}: {
  params: Promise<{ khoaId: string }>;
  searchParams: Promise<{ muc?: string }>;
}) {
  let phien;
  try {
    phien = await requirePermission("GD-04");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) return <KhongCoQuyen thongBao={error.message} />;
    throw error;
  }
  const { khoaId } = await params;
  const { muc } = await searchParams;

  let ct;
  try {
    ct = await cauTrucKhoaHoc(phien.userId, khoaId);
  } catch (error) {
    if (error instanceof KhongDuocXemTaiLieuError) notFound();
    throw error;
  }
  const dsMuc = ct.chuyenDe.flatMap((cd) => cd.dsMuc.map((m) => ({ ...m, chuyenDe: cd.ten })));
  const mucChon = dsMuc.find((m) => m.key === muc) ?? dsMuc.find((m) => !m.hoanThanh) ?? dsMuc[0] ?? null;
  const viTri = mucChon ? dsMuc.indexOf(mucChon) : -1;
  const truoc = viTri > 0 ? dsMuc[viTri - 1] : null;
  const sau = viTri >= 0 && viTri < dsMuc.length - 1 ? dsMuc[viTri + 1] : null;

  const [nd, thaoLuan, ghiChep] = mucChon
    ? await Promise.all([
        noiDungMuc(phien.userId, khoaId, mucChon.key),
        dsThaoLuan(phien.userId, khoaId, mucChon.key),
        layGhiChep(phien.userId, khoaId, mucChon.key),
      ])
    : [null, [], ""];

  const { khoa } = ct;
  const tongQuan = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div
          className="flex size-16 items-center justify-center rounded-full text-sm font-bold text-ued-blue-dam"
          style={{ background: `conic-gradient(var(--success) ${ct.phanTramKhoa * 3.6}deg, var(--muted) 0deg)` }}
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-white">{ct.phanTramKhoa}%</span>
        </div>
        <p>
          Đã hoàn thành <b>{ct.soMucXong}</b>/{ct.tongMuc} mục
        </p>
      </div>
      <p>
        <span className="text-muted-foreground">Chương trình:</span> {khoa.chuongTrinh.maCT} · {khoa.chuongTrinh.ten}
      </p>
      {khoa.chuongTrinh.mucTieu && (
        <p>
          <span className="text-muted-foreground">Mục tiêu:</span> {khoa.chuongTrinh.mucTieu}
        </p>
      )}
      {khoa.chuongTrinh.doiTuongApDung && (
        <p>
          <span className="text-muted-foreground">Đối tượng:</span> {khoa.chuongTrinh.doiTuongApDung}
        </p>
      )}
      <p>
        <span className="text-muted-foreground">Thời gian:</span> {dinhDangNgay(khoa.thoiGianKhaiGiang)} – {dinhDangNgay(khoa.thoiGianBeGiang)}
      </p>
      {ct.lop && (
        <p>
          <span className="text-muted-foreground">Lớp:</span> {ct.lop.maLop} · {ct.lop.ten}
        </p>
      )}
    </div>
  );

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-white px-3">
        <Link href={ct.laHocVien ? `/hoc-tap/${khoaId}` : "/giang-vien/buoi-hoc"} aria-label="Đóng màn hình học" className="text-muted-foreground hover:text-foreground">
          <X className="size-5" />
        </Link>
        <Image src="/logo-ued.png" alt="Trường ĐHSP - ĐHĐN" width={116} height={24} className="hidden sm:block" />
        <h1 className="min-w-0 truncate font-bold text-ued-blue-dam">
          {khoa.maKhoa}: {khoa.chuongTrinh.ten}
        </h1>
        {!ct.capNhatTienDo && ct.laHocVien && (
          <span className="shrink-0 rounded border border-destructive/40 bg-destructive/5 px-2 py-0.5 text-xs text-destructive">Chỉ xem lại</span>
        )}
        {!ct.laHocVien && <span className="shrink-0 rounded border px-2 py-0.5 text-xs text-muted-foreground">Xem với vai trò {ct.vaiTro.toLowerCase()}</span>}
      </header>
      {mucChon && (
        <nav aria-label="Đường dẫn" className="shrink-0 truncate border-b bg-white px-4 py-1.5 text-sm text-muted-foreground">
          {mucChon.chuyenDe} <span className="mx-1">›</span> <span className="font-medium text-foreground">{mucChon.tieuDe}</span>
        </nav>
      )}
      {ct.laHocVien && !ct.capNhatTienDo && (
        <p className="shrink-0 border-b bg-red-50 px-4 py-2 text-center text-sm text-red-800">
          {khoa.trangThai === "DANG_TUYEN_SINH" || khoa.trangThai === "CHUAN_BI"
            ? "Khóa học chưa bắt đầu. Bạn có thể xem trước học liệu nhưng tiến độ chưa được ghi nhận."
            : "Khóa học đã kết thúc hoặc kết quả đã được phê duyệt. Bạn có thể xem lại bài học nhưng tiến độ sẽ không được cập nhật."}
        </p>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)_auto]">
        <ThanhTrai khoaId={khoaId} dsChuyenDe={ct.chuyenDe} mucDangXem={mucChon?.key ?? null} tongQuan={tongQuan} />

        <main className="flex min-h-0 flex-col">
          {mucChon && nd ? (
            <>
              <div className="shrink-0 border-b bg-white px-4 py-2">
                <h2 className="font-medium">{mucChon.tieuDe}</h2>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <KhungGiua nd={nd} khoaId={khoaId} mucKey={mucChon.key} capNhat={ct.capNhatTienDo} hoanThanh={mucChon.hoanThanh} />
              </div>
              <div className="flex shrink-0 items-center justify-between gap-3 border-t bg-white px-4 py-2 text-sm">
                {truoc ? (
                  <Link href={`/hoc/${khoaId}?muc=${truoc.key}`} className="flex min-w-0 items-center gap-2">
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground">
                      <ArrowLeft className="size-4" /> Mục trước
                    </span>
                    <span className="hidden truncate text-muted-foreground md:inline">{truoc.tieuDe}</span>
                  </Link>
                ) : (
                  <span />
                )}
                {sau && (
                  <Link href={`/hoc/${khoaId}?muc=${sau.key}`} className="flex min-w-0 items-center gap-2">
                    <span className="hidden truncate text-muted-foreground md:inline">{sau.tieuDe}</span>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground">
                      Tiếp theo <ArrowRight className="size-4" />
                    </span>
                  </Link>
                )}
              </div>
            </>
          ) : (
            <p className="m-auto p-6 text-muted-foreground">Chương trình của khóa chưa có học liệu.</p>
          )}
        </main>

        {mucChon && (
          <div className="flex min-h-0">
            <ThanhPhai
              khoaId={khoaId}
              mucKey={mucChon.key}
              ghiChepBanDau={ghiChep}
              thaoLuanBanDau={thaoLuan.map((t) => ({
                id: t.id,
                hoTen: t.hoTen,
                vaiTro: t.vaiTro,
                noiDung: t.noiDung,
                thoiGian: t.createdAt.toISOString(),
                cuaToi: t.cuaToi,
                khoaKhac: t.khoaKhac,
              }))}
            />
          </div>
        )}
      </div>
    </div>
  );
}
