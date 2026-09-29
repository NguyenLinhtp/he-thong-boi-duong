"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChonTep } from "@/components/chung/chon-tep";
import { Input } from "@/components/ui/input";

type PhanCong = { giaTri: string; nhan: string };

/** GD-04: đăng tài liệu (tệp hoặc link) cho 1 học phần giảng viên phụ trách - gửi multipart tới API. */
export function FormDangTaiLieu({ dsPhanCong, toiDaMb }: { dsPhanCong: PhanCong[]; toiDaMb: number }) {
  const router = useRouter();
  const [kieu, setKieu] = useState<"tep" | "link">("tep");
  const [dangGui, setDangGui] = useState(false);
  const [thongBao, setThongBao] = useState<{ loi?: string; ok?: string }>({});

  async function gui(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const duLieu = new FormData(form);
    const [khoaId, hocPhanId, lopId] = String(duLieu.get("phanCong") ?? "").split("|");
    duLieu.set("khoaId", khoaId ?? "");
    duLieu.set("hocPhanId", hocPhanId ?? "");
    duLieu.set("lopId", lopId ?? "");
    duLieu.delete("phanCong");
    if (kieu === "tep") duLieu.delete("duongLink");
    else duLieu.delete("tep");
    const tep = duLieu.get("tep");
    if (tep instanceof File && tep.size > toiDaMb * 1024 * 1024) {
      setThongBao({ loi: `Tệp vượt ${toiDaMb}MB` });
      return;
    }
    setDangGui(true);
    setThongBao({});
    try {
      const res = await fetch("/api/gd/hoc-lieu", { method: "POST", body: duLieu });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setThongBao({ loi: json.message ?? "Không đăng được tài liệu" });
        return;
      }
      form.reset();
      setThongBao({ ok: `Đã đăng "${json.tieuDe}".` });
      router.refresh();
    } finally {
      setDangGui(false);
    }
  }

  if (dsPhanCong.length === 0) {
    return <p className="text-sm text-muted-foreground">Bạn chưa được phân công học phần nào có giảng dạy.</p>;
  }
  return (
    <form onSubmit={gui} className="flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-2">
        <select name="phanCong" required className="h-8 rounded-lg border px-2 text-sm" aria-label="Khóa / học phần / lớp">
          {dsPhanCong.map((pc) => (
            <option key={pc.giaTri} value={pc.giaTri}>
              {pc.nhan}
            </option>
          ))}
        </select>
        <Input name="tieuDe" required placeholder="Tiêu đề tài liệu" className="w-64" />
        <Input name="moTa" placeholder="Mô tả (không bắt buộc)" className="w-64" />
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-1">
          <input type="radio" checked={kieu === "tep"} onChange={() => setKieu("tep")} /> Tải tệp lên
        </label>
        <label className="flex items-center gap-1">
          <input type="radio" checked={kieu === "link"} onChange={() => setKieu("link")} /> Đường link (video, học liệu ngoài)
        </label>
        {kieu === "tep" ? (
          <ChonTep
            name="tep"
            required
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar,.7z,.jpg,.jpeg,.png,.mp3,.mp4"
          />
        ) : (
          <Input name="duongLink" type="url" required placeholder="https://..." className="w-80" />
        )}
        <Button type="submit" size="sm" disabled={dangGui}>
          {dangGui ? "Đang tải lên..." : "Đăng tài liệu"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Tối đa {toiDaMb}MB; tài liệu văn phòng, PDF, nén, ảnh, âm thanh/video.</p>
      {thongBao.ok && <p className="text-sm text-muted-foreground">{thongBao.ok}</p>}
      {thongBao.loi && <p className="text-sm text-destructive">{thongBao.loi}</p>}
    </form>
  );
}

export function NutXoaTaiLieu({ id, tieuDe }: { id: string; tieuDe: string }) {
  const router = useRouter();
  const [dangXoa, setDangXoa] = useState(false);
  return (
    <Button
      size="sm"
      variant="destructive"
      className="h-7 px-2 text-xs"
      disabled={dangXoa}
      onClick={async () => {
        if (!confirm(`Xóa tài liệu "${tieuDe}"?`)) return;
        setDangXoa(true);
        const res = await fetch(`/api/gd/hoc-lieu/${id}`, { method: "DELETE" });
        setDangXoa(false);
        if (!res.ok) alert((await res.json().catch(() => ({}))).message ?? "Không xóa được");
        else router.refresh();
      }}
    >
      Xóa
    </Button>
  );
}
