import { notFound, redirect } from "next/navigation";
import { Check } from "lucide-react";
import { requirePermission, coQuyen } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { layBaiTracNghiem } from "@/server/services/ct/ct-02-hoc-lieu";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { DauTrangChuongTrinh } from "@/components/chuong-trinh/dau-trang-chuong-trinh";
import { capNhatBaiTracNghiemAction, themCauHoiAction, nhapExcelAction, xoaCauHoiAction } from "../../actions";
import { NutThaoTac } from "../../cac-form";
import { FormCauHinhBai, FormThemCauHoi, FormNhapExcel } from "./cac-form";

const CHU = ["A", "B", "C", "D", "E", "F"];

// CT-02 (bổ sung 28/09/2026): soạn câu hỏi + cấu hình 1 bài trắc nghiệm của chuyên đề
export default async function SoanTracNghiemPage({ params }: { params: Promise<{ id: string; baiId: string }> }) {
  try {
    await requirePermission("CT-05");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) return <KhongCoQuyen thongBao={error.message} />;
    throw error;
  }
  const { id, baiId } = await params;
  const bai = await layBaiTracNghiem(baiId);
  if (!bai || bai.hocPhan.chuongTrinhId !== id) notFound();
  const chuongTrinh = bai.hocPhan.chuongTrinh;
  const choSua = chuongTrinh.trangThai !== "NGUNG_HIEU_LUC" && (await coQuyen("CT-02"));
  const daCoNguoiLam = bai._count.lanLams > 0;

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <DauTrangChuongTrinh chuongTrinh={chuongTrinh} dangChon="hoc-lieu" />
      <div>
        <p className="text-sm text-muted-foreground">Chuyên đề: {bai.hocPhan.ten}</p>
        <h2 className="text-lg font-bold text-ued-blue-dam">Bài trắc nghiệm: {bai.tieuDe}</h2>
      </div>

      {choSua && (
        <FormCauHinhBai
          hanhDong={capNhatBaiTracNghiemAction.bind(null, id, baiId)}
          bai={{
            tieuDe: bai.tieuDe,
            moTa: bai.moTa,
            thoiGianPhut: bai.thoiGianPhut,
            soLanToiDa: bai.soLanToiDa,
            tinhDiem: bai.tinhDiem,
            heSo: Number(bai.heSo),
          }}
        />
      )}
      {daCoNguoiLam && (
        <p className="rounded-lg border border-amber-600/30 bg-amber-50 p-3 text-sm text-amber-900">
          Đã có {bai._count.lanLams} lượt học viên làm bài - không thêm/xóa câu hỏi được nữa (vẫn đổi được cấu hình tính điểm).
        </p>
      )}

      <section className="flex flex-col gap-3">
        <h3 className="text-base font-bold text-ued-blue-dam">Câu hỏi ({bai.cauHois.length})</h3>
        {bai.cauHois.length === 0 && <p className="text-sm text-muted-foreground">Chưa có câu hỏi.</p>}
        <ol className="flex flex-col gap-3">
          {bai.cauHois.map((c, i) => (
            <li key={c.id} className="rounded-lg border bg-card p-3 text-sm shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium whitespace-pre-line">
                  Câu {i + 1}. {c.noiDung}
                  {c.dapAnDung.length > 1 && <span className="ml-2 text-xs font-normal text-muted-foreground">(nhiều đáp án)</span>}
                </p>
                {choSua && !daCoNguoiLam && (
                  <NutThaoTac hanhDong={xoaCauHoiAction.bind(null, id, baiId, c.id)} nhan="Xóa" bienThe="destructive" xacNhan={`Xóa câu ${i + 1}?`} />
                )}
              </div>
              <ul className="mt-1 grid gap-1 sm:grid-cols-2">
                {c.phuongAn.map((pa, j) => (
                  <li key={j} className={c.dapAnDung.includes(j) ? "flex items-center gap-1 font-medium text-success" : "flex items-center gap-1"}>
                    <span className="w-5">{CHU[j]}.</span> {pa} {c.dapAnDung.includes(j) && <Check className="size-4" aria-label="đúng" />}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      {choSua && !daCoNguoiLam && (
        <div className="grid gap-4 xl:grid-cols-2">
          <FormThemCauHoi hanhDong={themCauHoiAction.bind(null, id, baiId)} />
          <FormNhapExcel hanhDong={nhapExcelAction.bind(null, id, baiId)} />
        </div>
      )}
    </main>
  );
}
