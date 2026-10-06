"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { luuCotBoSungAction } from "@/app/(dashboard)/hoc-vien/sinh-vien/actions";

type Cot = { ma: string | null; nhan: string; batBuoc: boolean };

/**
 * HV-03 (bổ sung 05/10/2026): file mẫu danh sách sinh viên thay đổi được - 4 cột
 * cố định + các cột bổ sung cán bộ đào tạo khai báo (tên cột, bắt buộc). Đổi tên
 * giữ dữ liệu đã nạp; bỏ cột thì dữ liệu cũ không hiển thị nữa.
 */
export function CauHinhCotSinhVien({ dsCot }: { dsCot: { ma: string; nhan: string; batBuoc: boolean }[] }) {
  const [ds, setDs] = useState<Cot[]>(dsCot);
  const [daSua, setDaSua] = useState(false);
  const [thongBao, setThongBao] = useState<{ ok?: string; loi?: string }>({});
  const [dangLuu, batDau] = useTransition();

  const sua = (fn: (cu: Cot[]) => Cot[]) => {
    setDs(fn);
    setDaSua(true);
    setThongBao({});
  };
  const doiCho = (i: number, j: number) =>
    sua((cu) => {
      if (j < 0 || j >= cu.length) return cu;
      const moi = [...cu];
      [moi[i], moi[j]] = [moi[j], moi[i]];
      return moi;
    });

  const luu = () =>
    batDau(async () => {
      const loi = await luuCotBoSungAction(JSON.stringify(ds));
      if (loi) setThongBao({ loi });
      else {
        setDaSua(false);
        setThongBao({ ok: "Đã lưu - tải lại tệp mẫu để dùng cột mới." });
      }
    });

  return (
    <details className="rounded-lg border bg-card p-4 text-sm shadow-sm">
      <summary className="cursor-pointer font-medium">
        Cột của file mẫu ({4 + ds.length} cột{ds.length ? `, ${ds.length} cột bổ sung` : ""})
      </summary>
      <div className="mt-3 flex flex-col gap-3">
        <p className="text-muted-foreground">
          Cột cố định: <b className="text-foreground">Mã sinh viên*</b>, <b className="text-foreground">Số CCCD*</b>,{" "}
          <b className="text-foreground">Họ tên*</b>, <b className="text-foreground">Lớp sinh hoạt</b>. Khai báo thêm cột khi
          cần lưu thêm dữ liệu (ngày sinh, khoa, ngành, khóa học...). Tên cột trong tệp phải đúng như khai báo.
        </p>
        {ds.length === 0 && <p className="text-muted-foreground italic">Chưa có cột bổ sung.</p>}
        {ds.map((c, i) => (
          <div key={c.ma ?? `moi-${i}`} className="flex flex-wrap items-center gap-2">
            <span className="w-6 text-right text-muted-foreground">{5 + i}.</span>
            <Input
              value={c.nhan}
              placeholder="Tên cột, vd. Ngày sinh"
              maxLength={50}
              className="h-8 w-64"
              onChange={(e) => sua((cu) => cu.map((x, j) => (j === i ? { ...x, nhan: e.target.value } : x)))}
            />
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={c.batBuoc}
                onChange={(e) => sua((cu) => cu.map((x, j) => (j === i ? { ...x, batBuoc: e.target.checked } : x)))}
              />
              Bắt buộc
            </label>
            <Button type="button" variant="ghost" size="icon" aria-label="Lên" onClick={() => doiCho(i, i - 1)}>
              <ArrowUp />
            </Button>
            <Button type="button" variant="ghost" size="icon" aria-label="Xuống" onClick={() => doiCho(i, i + 1)}>
              <ArrowDown />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Bỏ cột"
              onClick={() => sua((cu) => cu.filter((_, j) => j !== i))}
            >
              <Trash2 className="text-destructive" />
            </Button>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => sua((cu) => [...cu, { ma: null, nhan: "", batBuoc: false }])}>
            <Plus /> Thêm cột
          </Button>
          <Button type="button" disabled={!daSua || dangLuu} onClick={luu}>
            {dangLuu ? "Đang lưu..." : "Lưu cột"}
          </Button>
          {daSua && !thongBao.loi && <span className="text-warning">Có thay đổi chưa lưu</span>}
          {thongBao.loi && <span className="text-destructive">{thongBao.loi}</span>}
          {thongBao.ok && <span className="text-success">{thongBao.ok}</span>}
        </div>
      </div>
    </details>
  );
}
