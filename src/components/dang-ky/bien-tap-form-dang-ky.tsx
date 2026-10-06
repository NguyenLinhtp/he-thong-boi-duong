"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Eye, EyeOff, Lock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CacTruongDangKy, TruongDinhDanh } from "@/components/dang-ky/cac-truong-dang-ky";
import { ChonDoiTuongDuThi, TruongMaSinhVien } from "@/components/dang-ky/truong-ma-sinh-vien";
import {
  NHAN_KIEU_TRUONG,
  apDungSoDienThoaiXacThuc,
  chuanHoaCauHinh,
  sinhMaTruong,
  type CauHinhForm,
  type DinhDanh,
  type KieuTruong,
  type TruongForm,
} from "@/lib/form-dang-ky";
import { cn } from "@/lib/utils";

const KIEU_THEM: KieuTruong[] = ["VAN_BAN", "SO", "NGAY", "LUA_CHON", "TEP"];

/**
 * Trình biên tập form đăng ký (bổ sung 30/09/2026): bật/tắt, bắt buộc trường có
 * sẵn; thêm/xóa/sắp xếp trường tùy chỉnh; danh sách chọn, giá trị mặc định/cố
 * định; xem trước form học viên sẽ thấy. Lưu cả cấu hình 1 lần (máy chủ kiểm tra lại).
 */
export function BienTapFormDangKy({
  cauHinh,
  dsChucDanh,
  onLuu,
  chiXem = false,
  choPhepMaSinhVien = false,
}: {
  cauHinh: CauHinhForm;
  dsChucDanh: { id: string; ten: string }[];
  onLuu?: (json: string) => Promise<string | undefined>;
  chiXem?: boolean;
  // (bổ sung 01/10/2026) chương trình Phương thức 3: cho chọn định danh bằng mã sinh viên
  choPhepMaSinhVien?: boolean;
}) {
  const [ds, setDs] = useState<TruongForm[]>(cauHinh.truong);
  const [dinhDanh, setDinhDanh] = useState<DinhDanh>(cauHinh.dinhDanh ?? "CCCD");
  const [daSua, setDaSua] = useState(false);
  const [thongBao, setThongBao] = useState<{ loi?: string; ok?: string }>({});
  const [dangLuu, batDau] = useTransition();

  const sua = (i: number, thayDoi: Partial<TruongForm>) => {
    setDs((cu) => cu.map((t, j) => (j === i ? { ...t, ...thayDoi } : t)));
    setDaSua(true);
    setThongBao({});
  };
  const doiCho = (i: number, j: number) => {
    if (j < 0 || j >= ds.length) return;
    setDs((cu) => {
      const moi = [...cu];
      [moi[i], moi[j]] = [moi[j], moi[i]];
      return moi;
    });
    setDaSua(true);
  };
  const them = (kieu: KieuTruong) => {
    setDs((cu) => [
      ...cu,
      {
        ma: sinhMaTruong(),
        nhan: "",
        kieu,
        coSan: false,
        hien: true,
        batBuoc: false,
        luaChon: kieu === "LUA_CHON" ? [""] : [],
        macDinh: null,
        coDinh: false,
        goiY: null,
      },
    ]);
    setDaSua(true);
  };

  // xem trước theo đúng quy tắc chuẩn hóa (trường chưa đặt tên vẫn hiện để thấy vị trí)
  // (sửa 05/10/2026) form dự thi: số điện thoại xác thực luôn bắt buộc, đứng đầu
  const xemTruoc = useMemo(() => {
    const truong = ds.map((t) => ({ ...t, nhan: t.nhan || "(chưa đặt tên)", luaChon: t.luaChon.filter(Boolean) }));
    return choPhepMaSinhVien ? apDungSoDienThoaiXacThuc({ dinhDanh, truong }).truong : truong;
  }, [ds, dinhDanh, choPhepMaSinhVien]);

  const luu = () => {
    const kq = chuanHoaCauHinh({ dinhDanh, truong: ds });
    if ("loi" in kq) return setThongBao({ loi: kq.loi });
    batDau(async () => {
      const loi = await onLuu?.(JSON.stringify(kq.cauHinh));
      if (loi) setThongBao({ loi });
      else {
        setDs(kq.cauHinh.truong);
        setDaSua(false);
        setThongBao({ ok: "Đã lưu form đăng ký." });
      }
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex flex-col gap-3">
        {(choPhepMaSinhVien || dinhDanh === "MA_SINH_VIEN") && (
          <fieldset disabled={chiXem} className="flex flex-col gap-2 rounded-lg border bg-card p-3 text-sm shadow-sm">
            <legend className="px-1 font-medium">Thí sinh định danh bằng</legend>
            <label className="flex items-start gap-2">
              <input
                type="radio"
                name="dinhDanh"
                checked={dinhDanh === "CCCD"}
                onChange={() => {
                  setDinhDanh("CCCD");
                  setDaSua(true);
                }}
                className="mt-1"
              />
              <span>Họ tên + số CCCD (thí sinh tự nhập)</span>
            </label>
            <label className="flex items-start gap-2">
              <input
                type="radio"
                name="dinhDanh"
                checked={dinhDanh === "MA_SINH_VIEN"}
                onChange={() => {
                  setDinhDanh("MA_SINH_VIEN");
                  setDaSua(true);
                }}
                className="mt-1"
              />
              <span>
                Mã sinh viên - hệ thống tự điền họ tên, CCCD, lớp sinh hoạt từ{" "}
                <Link href="/hoc-vien/sinh-vien" className="underline">
                  danh sách sinh viên đã import
                </Link>
                ; thí sinh xác thực bằng số điện thoại. Đầu form có lựa chọn <i>Thí sinh tự do</i> cho người không phải
                sinh viên của trường (nhập họ tên + CCCD, không cần mã sinh viên)
              </span>
            </label>
          </fieldset>
        )}
        <div className="rounded-lg border border-dashed bg-muted/40 p-3 text-sm text-muted-foreground">
          {dinhDanh === "MA_SINH_VIEN" ? (
            <>
              <b className="text-foreground">Mã sinh viên</b> và <b className="text-foreground">Số điện thoại</b> luôn có và bắt buộc;
              họ tên, CCCD, lớp lấy theo danh sách sinh viên.
            </>
          ) : (
            <>
              <b className="text-foreground">Họ tên</b> và <b className="text-foreground">Số CCCD</b> luôn có và bắt buộc (dùng để định danh
              học viên, tránh trùng hồ sơ).
              {choPhepMaSinhVien && (
                <>
                  {" "}
                  <b className="text-foreground">Số điện thoại</b> luôn bắt buộc (xác thực khi thí sinh xem lại đơn).
                </>
              )}
            </>
          )}
        </div>
        {ds.map((t, i) => (
          <fieldset
            key={t.ma}
            disabled={chiXem}
            className={cn("flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-sm", !t.hien && "opacity-60")}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                {t.coSan ? "Có sẵn" : "Tùy chỉnh"} · {NHAN_KIEU_TRUONG[t.kieu]}
              </span>
              <Input
                value={t.nhan}
                onChange={(e) => sua(i, { nhan: e.target.value })}
                placeholder="Tên trường, vd. Môn giảng dạy"
                aria-label="Tên trường"
                className="h-8 min-w-48 flex-1 font-medium"
              />
              {!t.coSan && (
                <select
                  value={t.kieu}
                  onChange={(e) => {
                    const kieu = e.target.value as KieuTruong;
                    sua(i, { kieu, luaChon: kieu === "LUA_CHON" ? (t.luaChon.length ? t.luaChon : [""]) : [], macDinh: null, coDinh: false });
                  }}
                  aria-label="Kiểu trường"
                  className="h-8 rounded-lg border px-2 text-sm"
                >
                  {KIEU_THEM.map((k) => (
                    <option key={k} value={k}>
                      {NHAN_KIEU_TRUONG[k]}
                    </option>
                  ))}
                </select>
              )}
              <div className="ml-auto flex items-center gap-1">
                <Button type="button" size="icon-sm" variant="ghost" aria-label="Lên" onClick={() => doiCho(i, i - 1)} disabled={i === 0}>
                  <ArrowUp />
                </Button>
                <Button type="button" size="icon-sm" variant="ghost" aria-label="Xuống" onClick={() => doiCho(i, i + 1)} disabled={i === ds.length - 1}>
                  <ArrowDown />
                </Button>
                {!t.coSan && (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Xóa trường"
                    className="text-destructive"
                    onClick={() => {
                      setDs((cu) => cu.filter((_, j) => j !== i));
                      setDaSua(true);
                    }}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              {t.coSan && (
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={t.hien} onChange={(e) => sua(i, { hien: e.target.checked, ...(e.target.checked ? {} : { batBuoc: false, coDinh: false }) })} />
                  {t.hien ? <Eye className="size-4" /> : <EyeOff className="size-4" />} Hiện trên form
                </label>
              )}
              <label className={cn("flex items-center gap-1.5", !t.hien && "pointer-events-none")}>
                <input type="checkbox" checked={t.batBuoc} disabled={!t.hien} onChange={(e) => sua(i, { batBuoc: e.target.checked })} /> Bắt buộc
              </label>
              {t.kieu !== "TEP" && t.ma !== "chucDanhHocViId" && (
                <label className={cn("flex items-center gap-1.5", !t.hien && "pointer-events-none")}>
                  <input type="checkbox" checked={t.coDinh} disabled={!t.hien} onChange={(e) => sua(i, { coDinh: e.target.checked })} />
                  <Lock className="size-3.5" /> Cố định (học viên không sửa)
                </label>
              )}
            </div>

            {t.hien && (t.kieu === "LUA_CHON" && !t.coSan ? true : t.ma === "donViCongTac") && (
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">
                  Danh sách chọn sẵn - mỗi dòng 1 lựa chọn{t.ma === "donViCongTac" && " (để trống: học viên gõ tự do)"}
                </span>
                <textarea
                  rows={Math.min(8, Math.max(3, t.luaChon.length + 1))}
                  value={t.luaChon.join("\n")}
                  onChange={(e) => sua(i, { luaChon: e.target.value.split("\n") })}
                  className="rounded-lg border p-2 text-sm"
                  placeholder={"THCS Lê Lợi\nTHCS Kim Đồng"}
                />
              </label>
            )}

            {t.hien && t.kieu !== "TEP" && (
              <div className="flex flex-wrap gap-3">
                <label className="flex min-w-56 flex-1 flex-col gap-1 text-sm">
                  <span className="text-muted-foreground">{t.coDinh ? "Giá trị cố định" : "Giá trị điền sẵn (không bắt buộc)"}</span>
                  {t.ma === "chucDanhHocViId" || t.luaChon.filter(Boolean).length > 0 ? (
                    <select value={t.macDinh ?? ""} onChange={(e) => sua(i, { macDinh: e.target.value || null })} className="h-8 rounded-lg border px-2 text-sm">
                      <option value="">— Không —</option>
                      {(t.ma === "chucDanhHocViId" ? dsChucDanh.map((c) => ({ v: c.id, n: c.ten })) : t.luaChon.filter(Boolean).map((l) => ({ v: l, n: l }))).map((o) => (
                        <option key={o.v} value={o.v}>
                          {o.n}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      type={t.kieu === "NGAY" ? "date" : t.kieu === "SO" ? "number" : "text"}
                      value={t.macDinh ?? ""}
                      onChange={(e) => sua(i, { macDinh: e.target.value || null })}
                      className="h-8"
                    />
                  )}
                </label>
                <label className="flex min-w-56 flex-1 flex-col gap-1 text-sm">
                  <span className="text-muted-foreground">Hướng dẫn dưới ô nhập (không bắt buộc)</span>
                  <Input value={t.goiY ?? ""} onChange={(e) => sua(i, { goiY: e.target.value || null })} className="h-8" />
                </label>
              </div>
            )}
            {t.hien && t.kieu === "TEP" && (
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Hướng dẫn (vd. &quot;Bản scan có công chứng, rõ nét&quot;)</span>
                <Input value={t.goiY ?? ""} onChange={(e) => sua(i, { goiY: e.target.value || null })} className="h-8" />
              </label>
            )}
          </fieldset>
        ))}

        {!chiXem && (
          <>
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-3">
              <span className="text-sm font-medium">
                <Plus className="mr-1 inline size-4" />
                Thêm trường:
              </span>
              {KIEU_THEM.map((k) => (
                <Button key={k} type="button" size="sm" variant="outline" onClick={() => them(k)}>
                  {NHAN_KIEU_TRUONG[k]}
                </Button>
              ))}
            </div>
            <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t bg-background/95 py-3 backdrop-blur">
              <Button type="button" onClick={luu} disabled={dangLuu || !daSua}>
                {dangLuu ? "Đang lưu..." : "Lưu form đăng ký"}
              </Button>
              {daSua && !thongBao.loi && <span className="text-sm text-warning">Có thay đổi chưa lưu</span>}
              {thongBao.loi && <span className="text-sm text-destructive">{thongBao.loi}</span>}
              {thongBao.ok && <span className="text-sm text-success">{thongBao.ok}</span>}
            </div>
          </>
        )}
      </div>

      <aside className="flex flex-col gap-2 lg:sticky lg:top-4 lg:self-start">
        <h3 className="text-sm font-bold text-ued-blue-dam">Xem trước form học viên sẽ thấy</h3>
        <fieldset disabled className="grid gap-3 rounded-lg border bg-card p-4 shadow-sm">
          {dinhDanh === "MA_SINH_VIEN" ? (
            <>
              <ChonDoiTuongDuThi giaTri="SINH_VIEN" className="sm:col-span-2" />
              <TruongMaSinhVien />
            </>
          ) : (
            <TruongDinhDanh />
          )}
          <CacTruongDangKy truong={xemTruoc} dsChucDanh={dsChucDanh} />
        </fieldset>
      </aside>
    </div>
  );
}
