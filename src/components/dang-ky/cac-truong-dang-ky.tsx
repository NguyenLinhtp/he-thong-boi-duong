"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChonTep } from "@/components/chung/chon-tep";
import { DUOI_MINH_CHUNG, tenInput, type TruongForm } from "@/lib/form-dang-ky";
import { cn } from "@/lib/utils";

export type GiaTriBanDau = Record<string, string>;

const Sao = () => (
  <span className="text-destructive" aria-hidden>
    *
  </span>
);

/**
 * Họ tên + CCCD (định danh) - luôn có trong mọi form đăng ký. khoa=true khi
 * điền từ tài khoản đang đăng nhập (học viên không đổi được danh tính ở đây).
 */
export function TruongDinhDanh({ giaTri, khoa }: { giaTri?: GiaTriBanDau; khoa?: boolean }) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="hoTen">
          Họ tên <Sao />
        </Label>
        <Input id="hoTen" name="hoTen" required defaultValue={giaTri?.hoTen} readOnly={khoa} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="soCCCD">
          Số CCCD <Sao />
        </Label>
        <Input id="soCCCD" name="soCCCD" required defaultValue={giaTri?.soCCCD} readOnly={khoa} inputMode="numeric" />
      </div>
    </>
  );
}

/**
 * Các trường của form đăng ký theo cấu hình chương trình/khóa (bổ sung 30/09/2026).
 * Thứ tự ưu tiên giá trị điền sẵn: giá trị cố định -> hồ sơ của học viên đang
 * đăng nhập -> giá trị mặc định cấu hình. Máy chủ kiểm tra lại toàn bộ.
 */
export function CacTruongDangKy({
  truong,
  dsChucDanh,
  giaTri,
  chiThieu,
}: {
  truong: TruongForm[];
  dsChucDanh: { id: string; ten: string }[];
  giaTri?: GiaTriBanDau;
  // PT2 xác nhận tham gia: ghi chú "(nếu chưa có)" cho trường có sẵn
  chiThieu?: boolean;
}) {
  return (
    <>
      {truong
        .filter((t) => t.hien)
        .map((t) => {
          const ten = tenInput(t);
          const id = `f_${ten}`;
          const banDau = t.coDinh ? (t.macDinh ?? "") : giaTri?.[ten] || t.macDinh || "";
          const rong = t.kieu === "TEP" || (!t.coSan && t.kieu === "VAN_BAN" && (t.goiY?.length ?? 0) > 60);
          const nhan = (
            <Label htmlFor={t.kieu === "TEP" ? undefined : id}>
              {t.nhan}
              {chiThieu && t.coSan && !t.batBuoc && <span className="font-normal text-muted-foreground"> (nếu chưa có)</span>}{" "}
              {t.batBuoc && <Sao />}
              {t.coDinh && <span className="ml-1 text-xs font-normal text-muted-foreground">(cố định)</span>}
            </Label>
          );
          const luaChon =
            t.ma === "chucDanhHocViId"
              ? dsChucDanh.map((c) => ({ giaTri: c.id, nhan: c.ten }))
              : t.luaChon.map((l) => ({ giaTri: l, nhan: l }));
          let o: React.ReactNode;
          if (t.kieu === "TEP") {
            o = <ChonTep name={ten} required={t.batBuoc} accept={DUOI_MINH_CHUNG.join(",")} nhan="Chọn tệp" goiY="PDF, ảnh (JPG/PNG) hoặc Word" />;
          } else if (luaChon.length > 0 || t.kieu === "LUA_CHON") {
            o = (
              <select
                id={id}
                name={ten}
                required={t.batBuoc}
                defaultValue={banDau}
                // select không có readOnly: khóa bằng pointer-events; máy chủ vẫn ghi giá trị cố định
                aria-readonly={t.coDinh || undefined}
                tabIndex={t.coDinh ? -1 : undefined}
                className={cn("h-9 rounded-lg border px-3 text-sm", t.coDinh && "pointer-events-none bg-muted text-muted-foreground")}
              >
                <option value="">— Chọn —</option>
                {luaChon.map((l) => (
                  <option key={l.giaTri} value={l.giaTri}>
                    {l.nhan}
                  </option>
                ))}
              </select>
            );
          } else {
            o = (
              <Input
                id={id}
                name={ten}
                type={t.kieu === "NGAY" ? "date" : t.kieu === "SO" ? "number" : t.ma === "email" ? "email" : t.ma === "soDienThoai" ? "tel" : "text"}
                step={t.kieu === "SO" ? "any" : undefined}
                required={t.batBuoc}
                readOnly={t.coDinh}
                defaultValue={banDau}
              />
            );
          }
          return (
            <div key={t.ma} className={cn("flex flex-col gap-1.5", rong && "sm:col-span-2")}>
              {nhan}
              {o}
              {t.goiY && <p className="text-xs text-muted-foreground">{t.goiY}</p>}
            </div>
          );
        })}
    </>
  );
}
