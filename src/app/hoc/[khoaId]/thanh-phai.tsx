"use client";

import { useEffect, useState, useTransition } from "react";
import { ChevronsLeft, ChevronsRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { luuGhiChepAction, taiThaoLuanAction, themThaoLuanAction, xoaThaoLuanAction } from "./actions";

type ThaoLuan = { id: string; hoTen: string; vaiTro: string; noiDung: string; thoiGian: string; cuaToi: boolean; khoaKhac: string | null };

/** Thanh phải màn hình học: Thảo luận theo mục + Ghi chép cá nhân; thu gọn được. */
export function ThanhPhai({
  khoaId,
  mucKey,
  thaoLuanBanDau,
  ghiChepBanDau,
}: {
  khoaId: string;
  mucKey: string;
  thaoLuanBanDau: ThaoLuan[];
  ghiChepBanDau: string;
}) {
  const [mo, setMo] = useState(true);
  const [tab, setTab] = useState<"thao-luan" | "ghi-chep">("thao-luan");

  if (!mo) {
    return (
      <aside className="hidden border-l bg-white lg:flex">
        <button type="button" onClick={() => setMo(true)} className="p-2 text-muted-foreground hover:text-foreground" aria-label="Mở thảo luận/ghi chép">
          <ChevronsLeft className="size-5" />
        </button>
      </aside>
    );
  }
  return (
    <aside className="flex min-h-0 w-full flex-col border-l bg-white max-lg:border-t lg:w-80">
      <div className="flex items-center border-b px-2">
        <button type="button" onClick={() => setMo(false)} className="p-1 text-muted-foreground hover:text-foreground max-lg:hidden" aria-label="Thu gọn">
          <ChevronsRight className="size-5" />
        </button>
        {(
          [
            ["thao-luan", "Thảo luận"],
            ["ghi-chep", "Ghi chép"],
          ] as const
        ).map(([ma, nhan]) => (
          <button
            key={ma}
            role="tab"
            aria-selected={tab === ma}
            onClick={() => setTab(ma)}
            className={cn(
              "border-b-2 px-3 py-2.5 text-sm",
              tab === ma ? "border-primary font-medium text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {nhan}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {tab === "thao-luan" ? (
          <KhungThaoLuan key={mucKey} khoaId={khoaId} mucKey={mucKey} banDau={thaoLuanBanDau} />
        ) : (
          <KhungGhiChep key={mucKey} khoaId={khoaId} mucKey={mucKey} banDau={ghiChepBanDau} />
        )}
      </div>
    </aside>
  );
}

function KhungThaoLuan({ khoaId, mucKey, banDau }: { khoaId: string; mucKey: string; banDau: ThaoLuan[] }) {
  const [ds, setDs] = useState(banDau);
  const [moiKhoa, setMoiKhoa] = useState(false);
  const [noiDung, setNoiDung] = useState("");
  const [loi, setLoi] = useState<string>();
  const [dangGui, startTransition] = useTransition();

  const taiLai = (tatCa = moiKhoa) =>
    startTransition(async () => {
      const kq = await taiThaoLuanAction(khoaId, mucKey, tatCa);
      if (kq.duLieu) setDs(kq.duLieu);
      setLoi(kq.loi);
    });

  return (
    <div className="flex flex-col gap-3 text-sm">
      <label className="flex items-start gap-2 text-muted-foreground">
        <input
          type="checkbox"
          checked={moiKhoa}
          onChange={(e) => {
            setMoiKhoa(e.target.checked);
            taiLai(e.target.checked);
          }}
          className="mt-1"
        />
        Hiển thị thảo luận của các khóa học khác cùng bài giảng
      </label>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!noiDung.trim()) return;
          startTransition(async () => {
            const kq = await themThaoLuanAction(khoaId, mucKey, noiDung);
            if (kq.loi) return setLoi(kq.loi);
            setNoiDung("");
            const moi = await taiThaoLuanAction(khoaId, mucKey, moiKhoa);
            if (moi.duLieu) setDs(moi.duLieu);
          });
        }}
        className="flex flex-col gap-2"
      >
        <textarea
          value={noiDung}
          onChange={(e) => setNoiDung(e.target.value)}
          rows={3}
          placeholder="Nhập vào bình luận"
          className="rounded-lg border p-2"
          aria-label="Nội dung thảo luận"
        />
        <Button type="submit" size="sm" disabled={dangGui || !noiDung.trim()} className="self-end">
          Gửi
        </Button>
      </form>
      {loi && <p className="text-destructive">{loi}</p>}
      {ds.length === 0 ? (
        <p className="text-center text-muted-foreground">Chưa có thảo luận nào cho mục này.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {[...ds].reverse().map((t) => (
            <li key={t.id} className="rounded-lg bg-muted/60 p-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs">
                  <b>{t.hoTen}</b> <span className="text-muted-foreground">· {t.vaiTro}</span>
                  {t.khoaKhac && <span className="text-muted-foreground"> · khóa {t.khoaKhac}</span>}
                </p>
                {t.cuaToi && (
                  <button
                    type="button"
                    aria-label="Xóa bình luận"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      confirm("Xóa bình luận này?") &&
                      startTransition(async () => {
                        await xoaThaoLuanAction(t.id);
                        setDs((cu) => cu.filter((x) => x.id !== t.id));
                      })
                    }
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
              <p className="mt-1 whitespace-pre-line">{t.noiDung}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{new Date(t.thoiGian).toLocaleString("vi-VN")}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function KhungGhiChep({ khoaId, mucKey, banDau }: { khoaId: string; mucKey: string; banDau: string }) {
  const [noiDung, setNoiDung] = useState(banDau);
  const [trangThai, setTrangThai] = useState<string>("");
  const [, startTransition] = useTransition();

  // tự lưu sau 1,5 giây ngừng gõ
  useEffect(() => {
    if (noiDung === banDau) return;
    const hen = setTimeout(
      () =>
        startTransition(async () => {
          setTrangThai("Đang lưu...");
          const kq = await luuGhiChepAction(khoaId, mucKey, noiDung);
          setTrangThai(kq.loi ?? `Đã lưu lúc ${new Date(kq.duLieu!).toLocaleTimeString("vi-VN")}`);
        }),
      1500,
    );
    return () => clearTimeout(hen);
  }, [noiDung, banDau, khoaId, mucKey]);

  return (
    <div className="flex h-full flex-col gap-2 text-sm">
      <p className="text-xs text-muted-foreground">Ghi chép riêng của bạn cho mục này - chỉ bạn xem được, tự động lưu.</p>
      <textarea
        value={noiDung}
        onChange={(e) => setNoiDung(e.target.value)}
        className="min-h-64 flex-1 rounded-lg border p-2"
        placeholder="Ghi chép..."
        aria-label="Ghi chép"
      />
      <p className="text-xs text-muted-foreground">{trangThai}</p>
    </div>
  );
}
