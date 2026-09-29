import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowDown, ArrowUp, FileText, Info, Presentation, PlayCircle, Trash2 } from "lucide-react";
import { requirePermission, coQuyen } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { layChuongTrinh } from "@/server/services/ct/ct-01-tao-chuong-trinh";
import { hocLieuKhungChuongTrinh, NHAN_LOAI_HOC_LIEU } from "@/server/services/ct/ct-02-hoc-lieu";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { DauTrangChuongTrinh } from "@/components/chuong-trinh/dau-trang-chuong-trinh";
import {
  xoaHocLieuAction,
  doiThuTuHocLieuAction,
  taoBaiTracNghiemAction,
  xoaBaiTracNghiemAction,
  taoYeuCauSanPhamAction,
  xoaYeuCauSanPhamAction,
} from "./actions";
import { FormThemHocLieu, FormTaoBai, FormYeuCauSanPham, NutThaoTac } from "./cac-form";

const ICON = { TAI_LIEU: FileText, SLIDE: Presentation, THONG_TIN: Info, VIDEO: PlayCircle } as const;

const kichThuoc = (byte: number | null) =>
  byte == null ? "" : byte < 1024 * 1024 ? `${Math.ceil(byte / 1024)} KB` : `${(byte / 1024 / 1024).toFixed(1)} MB`;

function NhanDiem({ tinhDiem, heSo }: { tinhDiem: boolean; heSo: unknown }) {
  return tinhDiem ? (
    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800 ring-1 ring-blue-600/25 ring-inset">
      Tính điểm · hệ số {Number(heSo)}
    </span>
  ) : (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700 ring-1 ring-slate-500/25 ring-inset">Tự kiểm tra</span>
  );
}

// CT-02 (bổ sung 28/09/2026): học liệu khung + yêu cầu đánh giá theo từng học phần/chuyên đề
export default async function HocLieuChuongTrinhPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("CT-05");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) return <KhongCoQuyen thongBao={error.message} />;
    throw error;
  }
  const { id } = await params;
  const chuongTrinh = await layChuongTrinh(id);
  if (!chuongTrinh) notFound();
  const dsHocPhan = await hocLieuKhungChuongTrinh(id);
  const choSua = chuongTrinh.trangThai !== "NGUNG_HIEU_LUC" && (await coQuyen("CT-02"));

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <DauTrangChuongTrinh chuongTrinh={chuongTrinh} dangChon="hoc-lieu" />
      <p className="text-sm text-muted-foreground">
        Học liệu soạn theo từng chuyên đề/học phần, mọi khóa mở từ chương trình này dùng chung; giảng viên vẫn bổ sung
        được tài liệu riêng cho khóa/lớp mình dạy. Các mục đều không bắt buộc. Bài trắc nghiệm/sản phẩm chọn “Tính vào
        điểm đánh giá” sẽ được lấy trung bình theo hệ số làm điểm đánh giá trực tuyến của học phần.
      </p>

      {dsHocPhan.length === 0 && (
        <p className="rounded-lg border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">
          Chương trình chưa có học phần/chuyên đề. Thêm học phần ở tab “Khung chương trình” trước.
        </p>
      )}

      {dsHocPhan.map((hp, i) => (
        <details key={hp.id} open className="group rounded-lg border bg-card shadow-sm">
          <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-3">
            <span className="flex size-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {i + 1}
            </span>
            <span className="font-bold text-ued-blue-dam">{hp.ten}</span>
            <span className="text-sm text-muted-foreground">
              {hp.soTiet} tiết · {hp.hocLieus.length} học liệu · {hp.baiTracNghiems.length} bài trắc nghiệm · {hp.yeuCauSanPhams.length} sản phẩm
            </span>
          </summary>

          <div className="grid gap-4 p-4 xl:grid-cols-3">
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-bold text-ued-blue-dam">Học liệu</h3>
              {hp.hocLieus.length === 0 && <p className="text-sm text-muted-foreground">Chưa có học liệu.</p>}
              <ul className="flex flex-col divide-y rounded-lg border">
                {hp.hocLieus.map((hl, j) => {
                  const Icon = ICON[hl.loai];
                  return (
                    <li key={hl.id} className="flex items-start gap-2 p-2 text-sm">
                      <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-label={NHAN_LOAI_HOC_LIEU[hl.loai]} />
                      <div className="min-w-0 flex-1">
                        {hl.khoaLuuTru || hl.duongLink ? (
                          <a href={`/api/ct/hoc-lieu/${hl.id}?xem=1`} target="_blank" rel="noreferrer" className="font-medium">
                            {hl.tieuDe}
                          </a>
                        ) : (
                          <span className="font-medium">{hl.tieuDe}</span>
                        )}
                        <p className="truncate text-xs text-muted-foreground">
                          {NHAN_LOAI_HOC_LIEU[hl.loai]}
                          {hl.tenFile ? ` · ${hl.tenFile} · ${kichThuoc(hl.kichThuoc)}` : hl.duongLink ? ` · ${hl.duongLink}` : " · nội dung văn bản"}
                        </p>
                        {hl.moTa && <p className="text-xs text-muted-foreground">{hl.moTa}</p>}
                      </div>
                      {choSua && (
                        <span className="flex shrink-0">
                          {j > 0 && <NutThaoTac hanhDong={doiThuTuHocLieuAction.bind(null, id, hl.id, "len")} nhan={<ArrowUp />} tieuDe="Lên trên" />}
                          {j < hp.hocLieus.length - 1 && (
                            <NutThaoTac hanhDong={doiThuTuHocLieuAction.bind(null, id, hl.id, "xuong")} nhan={<ArrowDown />} tieuDe="Xuống dưới" />
                          )}
                          <NutThaoTac
                            hanhDong={xoaHocLieuAction.bind(null, id, hl.id)}
                            nhan={<Trash2 />}
                            tieuDe="Xóa"
                            bienThe="destructive"
                            xacNhan={`Xóa học liệu “${hl.tieuDe}”?`}
                          />
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
              {choSua && <FormThemHocLieu hocPhanId={hp.id} />}
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-bold text-ued-blue-dam">Bài tập trắc nghiệm</h3>
              {hp.baiTracNghiems.length === 0 && <p className="text-sm text-muted-foreground">Chưa có bài trắc nghiệm.</p>}
              <ul className="flex flex-col divide-y rounded-lg border">
                {hp.baiTracNghiems.map((bai) => (
                  <li key={bai.id} className="flex flex-col gap-1 p-2 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/chuong-trinh/${id}/hoc-lieu/trac-nghiem/${bai.id}`} className="font-medium">
                        {bai.tieuDe}
                      </Link>
                      <NhanDiem tinhDiem={bai.tinhDiem} heSo={bai.heSo} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {bai._count.cauHois} câu hỏi
                      {bai.thoiGianPhut ? ` · ${bai.thoiGianPhut} phút` : ""}
                      {bai.soLanToiDa ? ` · tối đa ${bai.soLanToiDa} lần` : " · không giới hạn lần làm"}
                      {bai._count.lanLams > 0 ? ` · ${bai._count.lanLams} lượt đã làm` : ""}
                    </p>
                    <div className="flex gap-2">
                      <Link href={`/chuong-trinh/${id}/hoc-lieu/trac-nghiem/${bai.id}`} className="text-xs">
                        {choSua ? "Soạn câu hỏi / cấu hình →" : "Xem câu hỏi →"}
                      </Link>
                      {choSua && bai._count.lanLams === 0 && (
                        <NutThaoTac
                          hanhDong={xoaBaiTracNghiemAction.bind(null, id, bai.id)}
                          nhan="Xóa"
                          bienThe="destructive"
                          xacNhan={`Xóa bài “${bai.tieuDe}” và toàn bộ câu hỏi?`}
                        />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {choSua && <FormTaoBai hanhDong={taoBaiTracNghiemAction.bind(null, id, hp.id)} />}
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-bold text-ued-blue-dam">Sản phẩm cuối khóa</h3>
              {hp.yeuCauSanPhams.length === 0 && <p className="text-sm text-muted-foreground">Chưa có yêu cầu sản phẩm.</p>}
              <ul className="flex flex-col divide-y rounded-lg border">
                {hp.yeuCauSanPhams.map((yc) => (
                  <li key={yc.id} className="flex flex-col gap-1 p-2 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium">{yc.tieuDe}</span>
                      <NhanDiem tinhDiem={yc.tinhDiem} heSo={yc.heSo} />
                    </div>
                    {yc.moTa && <p className="text-xs whitespace-pre-line text-muted-foreground">{yc.moTa}</p>}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {yc._count.baiNops} bài nộp
                      {choSua && yc._count.baiNops === 0 && (
                        <NutThaoTac
                          hanhDong={xoaYeuCauSanPhamAction.bind(null, id, yc.id)}
                          nhan="Xóa"
                          bienThe="destructive"
                          xacNhan={`Xóa yêu cầu “${yc.tieuDe}”?`}
                        />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {choSua && <FormYeuCauSanPham hanhDong={taoYeuCauSanPhamAction.bind(null, id, hp.id)} />}
            </section>
          </div>
        </details>
      ))}
    </main>
  );
}
