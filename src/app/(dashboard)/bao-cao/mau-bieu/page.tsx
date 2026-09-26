import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { danhSachMauBieu, CHI_TIEU, NHAN_NHOM, type CotMauBieu } from "@/server/services/bc/bc-04-mau-bieu";
import { danhSachDotTuyenSinh } from "@/server/services/dm/dm-05-dot-tuyen-sinh";
import { Input } from "@/components/ui/input";
import { FormMauBieu, NutNgungMauBieu, NutTaoMauMacDinh } from "./cac-form";

// BC-04: quản lý mẫu biểu gửi cấp trên (theo phiên bản) và xuất báo cáo đúng mẫu
export default async function MauBieuPage() {
  try {
    await requirePermission("BC-04");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <p className="p-6 text-destructive">{error.message}</p>;
    }
    throw error;
  }

  const [dsMau, dsDot] = await Promise.all([danhSachMauBieu(), danhSachDotTuyenSinh()]);
  const theoMa = new Map<string, typeof dsMau>();
  for (const m of dsMau) theoMa.set(m.ma, [...(theoMa.get(m.ma) ?? []), m]);
  const dsChiTieu = Object.entries(CHI_TIEU).map(([ma, ct]) => ({ ma, nhan: ct.nhan }));
  const dsNhom = Object.entries(NHAN_NHOM).map(([ma, nhan]) => ({ ma, nhan }));

  return (
    <main className="flex flex-col gap-6 p-6">
      <h1 className="text-lg font-semibold">BC-04 · Xuất báo cáo theo mẫu gửi cấp trên</h1>
      <p className="text-sm text-muted-foreground">
        Mỗi mẫu biểu cấu hình cơ quan nhận, căn cứ, cách nhóm dòng và các cột chỉ tiêu (số liệu lấy từ BC-02/BC-03). Khi
        quy định thay đổi, cập nhật mẫu sẽ tạo phiên bản mới; phiên bản cũ vẫn xuất lại được cho kỳ trước.
      </p>
      <div className="flex flex-wrap items-start gap-3">
        <FormMauBieu dsChiTieu={dsChiTieu} dsNhom={dsNhom} />
        {!theoMa.has("BIEU-01") && <NutTaoMauMacDinh />}
      </div>

      {[...theoMa.entries()].map(([ma, dsPhienBan]) => {
        const hienHanh = dsPhienBan.find((m) => m.dangApDung);
        const moiNhat = dsPhienBan[0];
        return (
          <section key={ma} className="flex flex-col gap-3 rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">
                {ma} · {moiNhat.ten}
                <span className="ml-2 rounded border px-2 py-0.5 text-xs font-normal">
                  {hienHanh ? `Đang áp dụng phiên bản ${hienHanh.phienBan}` : "Đã ngừng áp dụng"}
                </span>
              </h2>
              {hienHanh && <NutNgungMauBieu ma={ma} />}
            </div>
            <p className="text-xs text-muted-foreground">
              {moiNhat.coQuanNhan ? `Kính gửi: ${moiNhat.coQuanNhan} · ` : ""}
              {moiNhat.canCu ? `Căn cứ: ${moiNhat.canCu} · ` : ""}
              {NHAN_NHOM[moiNhat.nhomTheo]} · Cột: {(moiNhat.cot as unknown as CotMauBieu[]).map((c) => c.tieuDe).join(", ")}
            </p>

            <form method="get" action="/api/bc/mau-bieu/xuat" className="flex flex-wrap items-end gap-2">
              <select name="mau" defaultValue={(hienHanh ?? moiNhat).id} className="h-8 rounded-lg border px-2 text-sm" aria-label="Phiên bản">
                {dsPhienBan.map((m) => (
                  <option key={m.id} value={m.id}>
                    Phiên bản {m.phienBan} ({m.createdAt.toLocaleDateString("vi-VN")}){m.dangApDung ? " - hiện hành" : ""}
                  </option>
                ))}
              </select>
              <label className="flex flex-col gap-1 text-sm">
                Từ ngày
                <Input name="tuNgay" type="date" className="w-40" />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Đến ngày
                <Input name="denNgay" type="date" className="w-40" />
              </label>
              <select name="dot" defaultValue="" className="h-8 rounded-lg border px-2 text-sm" aria-label="Đợt">
                <option value="">Mọi đợt</option>
                {dsDot.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.ten}
                  </option>
                ))}
              </select>
              <button type="submit" className="h-8 rounded-lg border px-3 text-sm hover:bg-muted">
                Xuất Excel
              </button>
            </form>
            {dsPhienBan.length > 1 && (
              <ul className="flex flex-col gap-1 text-xs">
                {dsPhienBan.map((m) => (
                  <li key={m.id}>
                    Phiên bản {m.phienBan} · {m.ten} · {m.nguoiCapNhat}, {m.createdAt.toLocaleDateString("vi-VN")}
                    {m.dangApDung ? " · hiện hành" : ""}
                  </li>
                ))}
              </ul>
            )}
            <FormMauBieu
              dsChiTieu={dsChiTieu}
              dsNhom={dsNhom}
              mau={{
                ma,
                ten: moiNhat.ten,
                coQuanNhan: moiNhat.coQuanNhan,
                canCu: moiNhat.canCu,
                nhomTheo: moiNhat.nhomTheo,
                cot: moiNhat.cot as unknown as CotMauBieu[],
              }}
            />
          </section>
        );
      })}
    </main>
  );
}
