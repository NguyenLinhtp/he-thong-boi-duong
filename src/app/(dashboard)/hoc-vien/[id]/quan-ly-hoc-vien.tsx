"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OEmail } from "@/components/chung/o-email";
import { doiMatKhauAction, matKhauHocVienAction, themHocVienAction, xoaHocVienAction } from "./actions";

// (bổ sung 08/10/2026 - HV-08) cán bộ quản lý đào tạo thêm/xóa học viên, cấp tài khoản, đặt lại mật khẩu;
// học viên tự đổi mật khẩu

const GOI_Y_MAT_KHAU = "Ít nhất 8 ký tự, gồm cả chữ và số";

export function FormThemHocVien({ dsChucDanhHocVi }: { dsChucDanhHocVi: { id: string; ten: string }[] }) {
  const [loi, action, dangLuu] = useActionState(themHocVienAction, undefined);
  const [capTaiKhoan, setCapTaiKhoan] = useState(true);
  return (
    <form action={action} className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="them-hoTen">
            Họ và tên <span className="text-destructive">*</span>
          </Label>
          <Input id="them-hoTen" name="hoTen" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="them-soCCCD">
            Số CCCD/hộ chiếu <span className="text-destructive">*</span>
          </Label>
          <Input id="them-soCCCD" name="soCCCD" required maxLength={30} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="them-ngaySinh">Ngày sinh</Label>
          <Input id="them-ngaySinh" name="ngaySinh" type="date" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="them-soDienThoai">Số điện thoại</Label>
          <Input id="them-soDienThoai" name="soDienThoai" type="tel" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="them-email">Email</Label>
          <OEmail id="them-email" name="email" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="them-donViCongTac">Đơn vị công tác</Label>
          <Input id="them-donViCongTac" name="donViCongTac" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="them-chucDanh">Chức danh, học hàm/học vị</Label>
          <select id="them-chucDanh" name="chucDanhHocViId" className="h-8 rounded-lg border bg-background px-2 text-sm">
            <option value="">—</option>
            {dsChucDanhHocVi.map((cd) => (
              <option key={cd.id} value={cd.id}>
                {cd.ten}
              </option>
            ))}
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="capTaiKhoan" checked={capTaiKhoan} onChange={(e) => setCapTaiKhoan(e.target.checked)} />
        Cấp tài khoản đăng nhập (tên đăng nhập là số CCCD/hộ chiếu)
      </label>
      {capTaiKhoan && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="them-matKhau">
            Mật khẩu ban đầu <span className="text-destructive">*</span>
          </Label>
          <Input id="them-matKhau" name="matKhau" type="password" required minLength={8} autoComplete="new-password" className="max-w-xs" />
          <span className="text-xs text-muted-foreground">{GOI_Y_MAT_KHAU}. Học viên đổi lại sau khi đăng nhập.</span>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={dangLuu}>
          {dangLuu ? "Đang lưu..." : "Thêm học viên"}
        </Button>
        {loi && <p className="text-sm text-destructive">{loi}</p>}
      </div>
    </form>
  );
}

export function KhoiTaiKhoan({
  hocVienId,
  taiKhoan,
  coCccd,
}: {
  hocVienId: string;
  taiKhoan: { tenDangNhap: string; trangThai: string; laCanBo: boolean } | null;
  coCccd: boolean;
}) {
  const [kq, action, dangLuu] = useActionState(matKhauHocVienAction, undefined);
  const cap = !taiKhoan;
  return (
    <section className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
      <h2 className="text-base font-bold text-ued-blue-dam">Tài khoản đăng nhập</h2>
      {taiKhoan ? (
        <p className="text-sm">
          Tên đăng nhập: <b className="font-mono">{taiKhoan.tenDangNhap}</b> · {taiKhoan.trangThai === "HOAT_DONG" ? "Đang hoạt động" : "Tạm khóa"}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">Học viên chưa có tài khoản đăng nhập.</p>
      )}
      {taiKhoan?.laCanBo ? (
        <p className="text-sm text-muted-foreground">Tài khoản có vai trò cán bộ - đặt lại mật khẩu ở Quản trị tài khoản.</p>
      ) : cap && !coCccd ? (
        <p className="text-sm text-muted-foreground">Cập nhật số CCCD/hộ chiếu trước khi cấp tài khoản.</p>
      ) : (
        <form key={taiKhoan?.tenDangNhap ?? "moi"} action={action} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="id" value={hocVienId} />
          <input type="hidden" name="cheDo" value={cap ? "cap" : "dat-lai"} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mk-moi">{cap ? "Mật khẩu ban đầu" : "Mật khẩu mới"}</Label>
            <Input id="mk-moi" name="matKhau" type="password" required minLength={8} autoComplete="new-password" className="w-52" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mk-nhap-lai">Nhập lại</Label>
            <Input id="mk-nhap-lai" name="nhapLai" type="password" required minLength={8} autoComplete="new-password" className="w-52" />
          </div>
          <Button type="submit" disabled={dangLuu} variant={cap ? "default" : "outline"}>
            {dangLuu ? "Đang lưu..." : cap ? "Cấp tài khoản" : "Đặt lại mật khẩu"}
          </Button>
          <span className="w-full text-xs text-muted-foreground">{GOI_Y_MAT_KHAU}.</span>
          {kq?.loi && <p className="w-full text-sm text-destructive">{kq.loi}</p>}
          {kq?.ok && <p className="w-full text-sm text-success">{kq.ok}</p>}
        </form>
      )}
    </section>
  );
}

export function NutXoaHocVien({ id, ten, lyDoChan }: { id: string; ten: string; lyDoChan: string[] }) {
  const [loi, setLoi] = useState<string>();
  const [dangXoa, batDau] = useTransition();
  if (lyDoChan.length > 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Không xóa được hồ sơ: học viên đã có {lyDoChan.join(", ")}.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={dangXoa}
        onClick={() => {
          if (!confirm(`Xóa hồ sơ học viên ${ten}? Tài khoản đăng nhập của học viên (nếu có) cũng bị xóa. Không hoàn tác được.`)) return;
          batDau(async () => setLoi(await xoaHocVienAction(id)));
        }}
      >
        {dangXoa ? "Đang xóa..." : "Xóa học viên"}
      </Button>
      {loi && <span className="text-sm text-destructive">{loi}</span>}
    </div>
  );
}

export function FormDoiMatKhau() {
  const [kq, action, dangLuu] = useActionState(doiMatKhauAction, undefined);
  return (
    <section className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
      <h2 className="text-base font-bold text-ued-blue-dam">Đổi mật khẩu</h2>
      <form key={kq?.ok ?? ""} action={action} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mk-cu">Mật khẩu hiện tại</Label>
          <Input id="mk-cu" name="matKhauCu" type="password" required autoComplete="current-password" className="w-52" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mk-moi-hv">Mật khẩu mới</Label>
          <Input id="mk-moi-hv" name="matKhauMoi" type="password" required minLength={8} autoComplete="new-password" className="w-52" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mk-lai-hv">Nhập lại mật khẩu mới</Label>
          <Input id="mk-lai-hv" name="nhapLai" type="password" required minLength={8} autoComplete="new-password" className="w-52" />
        </div>
        <Button type="submit" disabled={dangLuu}>
          {dangLuu ? "Đang lưu..." : "Đổi mật khẩu"}
        </Button>
        <span className="w-full text-xs text-muted-foreground">{GOI_Y_MAT_KHAU}.</span>
        {kq?.loi && <p className="w-full text-sm text-destructive">{kq.loi}</p>}
        {kq?.ok && <p className="w-full text-sm text-success">{kq.ok}</p>}
      </form>
    </section>
  );
}
