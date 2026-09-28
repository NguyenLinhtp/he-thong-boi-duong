"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown, LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { mucDangChon, type NhomMenu } from "./menu";

type Props = {
  menu: NhomMenu[];
  hoTen: string;
  vaiTro: string;
  dangXuat: () => Promise<void>;
};

// avatar viết tắt theo tên (chữ cuối của họ tên tiếng Việt)
const chuCaiDau = (hoTen: string) =>
  (
    hoTen
      .split(/\s+/)
      .filter((tu) => /^\p{L}/u.test(tu))
      .at(-1)?.[0] ?? "?"
  ).toUpperCase();

/**
 * Top bar ngang (logo + module lớn + tài khoản) và dải tab con màu xanh đậm
 * của module đang chọn - bố cục tham khảo taphuan.csdl.edu.vn (đặc tả 3.5),
 * màu theo nhận diện Trường ĐHSP.
 */
export function ThanhDieuHuong({ menu, hoTen, vaiTro, dangXuat }: Props) {
  const duongDan = usePathname();
  const { nhom: nhomChon, muc: mucChon } = mucDangChon(menu, duongDan);
  const [moMenu, setMoMenu] = useState(false);
  const [moTaiKhoan, setMoTaiKhoan] = useState(false);

  return (
    <header className="sticky top-0 z-40 print:hidden">
      <div className="border-b bg-white">
        <div className="mx-auto flex h-16 max-w-screen-2xl items-center gap-4 px-4">
          <button
            type="button"
            className="rounded-md p-2 text-ued-blue-dam hover:bg-accent xl:hidden"
            aria-label={moMenu ? "Đóng menu" : "Mở menu"}
            aria-expanded={moMenu}
            onClick={() => setMoMenu((v) => !v)}
          >
            {moMenu ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>

          <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="Trang chủ">
            <Image src="/logo-ued.png" alt="Trường Đại học Sư phạm - ĐHĐN" width={193} height={40} priority />
            <span className="hidden border-l pl-3 text-xs leading-tight font-bold text-ued-blue-dam uppercase min-[1600px]:block">
              Hệ thống quản lý
              <br />
              bồi dưỡng
            </span>
          </Link>

          <nav aria-label="Module" className="hidden min-w-0 flex-1 xl:block">
            <ul className="flex items-center gap-0.5">
              {menu.map((nhom) => {
                const dangChon = nhom.ma === nhomChon?.ma;
                return (
                  <li key={nhom.ma}>
                    <Link
                      href={nhom.muc[0].href}
                      aria-current={dangChon ? "page" : undefined}
                      className={cn(
                        "block rounded-md px-2.5 py-2 text-[13px] font-medium whitespace-nowrap text-ued-blue-dam uppercase transition-colors hover:bg-accent",
                        dangChon && "bg-primary text-primary-foreground hover:bg-primary",
                      )}
                    >
                      {nhom.nhan}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="relative ml-auto shrink-0">
            <button
              type="button"
              className="flex items-center gap-2 rounded-full py-1 pr-2 pl-1 hover:bg-accent"
              aria-label={`Tài khoản: ${hoTen}`}
              aria-expanded={moTaiKhoan}
              aria-haspopup="menu"
              onClick={() => setMoTaiKhoan((v) => !v)}
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {chuCaiDau(hoTen)}
              </span>
              <span className="hidden max-w-40 truncate text-sm font-medium md:block xl:hidden 2xl:block">{hoTen}</span>
              <ChevronDown className="size-4 text-muted-foreground" />
            </button>
            {moTaiKhoan && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-64 rounded-lg border bg-popover p-2 shadow-lg"
                onKeyDown={(e) => e.key === "Escape" && setMoTaiKhoan(false)}
              >
                <div className="border-b px-2 pb-2">
                  <p className="truncate text-sm font-medium">{hoTen}</p>
                  <p className="text-xs text-muted-foreground">{vaiTro}</p>
                </div>
                <form action={dangXuat} className="pt-1">
                  <button
                    type="submit"
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="size-4" /> Đăng xuất
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {moMenu && (
          <nav aria-label="Module" className="border-t bg-white px-4 py-2 xl:hidden">
            <ul className="grid grid-cols-2 gap-1 sm:grid-cols-3">
              {menu.map((nhom) => (
                <li key={nhom.ma}>
                  <Link
                    href={nhom.muc[0].href}
                    onClick={() => setMoMenu(false)}
                    className={cn(
                      "block rounded-md px-3 py-2 text-sm font-medium text-ued-blue-dam",
                      nhom.ma === nhomChon?.ma ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                    )}
                  >
                    {nhom.nhan}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>

      {nhomChon && (
        <nav aria-label={nhomChon.nhan} className="bg-ued-blue-dam">
          <ul className="mx-auto flex max-w-screen-2xl overflow-x-auto px-4">
            {nhomChon.muc.map((muc) => {
              const dangChon = muc.href === mucChon?.href;
              return (
                <li key={muc.href}>
                  <Link
                    href={muc.href}
                    aria-current={dangChon ? "page" : undefined}
                    className={cn(
                      "block border-b-3 px-4 py-2.5 text-sm whitespace-nowrap transition-colors",
                      dangChon
                        ? "border-ued-vang font-medium text-ued-vang"
                        : "border-transparent text-white/85 hover:text-white",
                    )}
                  >
                    {muc.nhan}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </header>
  );
}
