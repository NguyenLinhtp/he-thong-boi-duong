import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import {
  demTaiKhoanTheoNhom,
  trangTaiKhoan,
  type NhomTaiKhoan,
} from "@/server/services/qt/qt-01-quan-ly-tai-khoan";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { OTimKiem, PhanTrang, soDongTuUrl, thamSoDanhSach, thamSoPhang, viTriTrang, type ThamSoUrl } from "@/components/chung/phan-trang";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { DauTrangThemMoi } from "@/components/chung/dau-trang-them-moi";
import { cn } from "@/lib/utils";
import { FormTaoTaiKhoan } from "./form-tao-tai-khoan";
import { HangTaiKhoan } from "./hang-tai-khoan";

// (bổ sung 09/10/2026) 2 tab Giảng viên / Cán bộ và Học viên, tìm kiếm, phân trang (nhập được số dòng/trang)
const TAB: { ma: NhomTaiKhoan; nhan: string }[] = [
  { ma: "can-bo", nhan: "Giảng viên / Cán bộ" },
  { ma: "hoc-vien", nhan: "Học viên" },
];
const DUONG = "/quan-tri/tai-khoan";

export default async function TaiKhoanPage({ searchParams }: { searchParams: Promise<ThamSoUrl> }) {
  try {
    await requirePermission("QT-01");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <KhongCoQuyen thongBao={error.message} />;
    }
    throw error;
  }

  const ten = thamSoDanhSach("tk");
  const thamSo = thamSoPhang(await searchParams);
  const nhom: NhomTaiKhoan = thamSo.nhom === "hoc-vien" ? "hoc-vien" : "can-bo";
  const q = (thamSo[ten.q] ?? "").trim();
  const dem = await demTaiKhoanTheoNhom(q || undefined);
  const tong = dem[nhom];
  const vt = viTriTrang(tong, thamSo[ten.trang], soDongTuUrl(thamSo, ten.trang));
  const taiKhoans = await trangTaiKhoan(nhom, q || undefined, vt.tuDong, vt.soDong);

  /** Đổi tab: giữ từ khóa và số dòng/trang, về trang 1. */
  const lienKetTab = (ma: NhomTaiKhoan) => {
    const p = new URLSearchParams();
    if (ma !== "can-bo") p.set("nhom", ma);
    if (q) p.set(ten.q, q);
    if (thamSo[ten.so]) p.set(ten.so, thamSo[ten.so]!);
    const s = p.toString();
    return s ? `${DUONG}?${s}` : DUONG;
  };

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <DauTrangThemMoi
        tieuDe={<h1 className="text-xl font-bold text-ued-blue-dam">QT-01 · Quản lý tài khoản người dùng</h1>}
        nhanNut="Thêm tài khoản"
      >
        <FormTaoTaiKhoan />
      </DauTrangThemMoi>

      <nav aria-label="Nhóm tài khoản" className="border-b">
        <ul className="-mb-px flex overflow-x-auto">
          {TAB.map((tab) => (
            <li key={tab.ma}>
              <Link
                href={lienKetTab(tab.ma)}
                scroll={false}
                aria-current={tab.ma === nhom ? "page" : undefined}
                className={cn(
                  "block border-b-2 px-4 py-2 text-sm font-medium whitespace-nowrap",
                  tab.ma === nhom
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                {tab.nhan} ({dem[tab.ma]})
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <OTimKiem
        duong={DUONG}
        thamSo={thamSo}
        ma="tk"
        tuKhoa={q}
        ketQua={tong}
        goiY={nhom === "hoc-vien" ? "Tên đăng nhập / họ tên / CCCD / mã học viên / email" : "Tên đăng nhập / họ tên / email"}
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tên đăng nhập</TableHead>
            <TableHead>Họ tên</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Vai trò</TableHead>
            <TableHead>Hành động</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {taiKhoans.map((tk) => (
            <HangTaiKhoan
              key={tk.id}
              taiKhoan={{
                id: tk.id,
                tenDangNhap: tk.tenDangNhap,
                hoTen: tk.hoTen,
                trangThai: tk.trangThai,
                vaiTros: tk.vaiTros.map((v) => v.vaiTro.ma),
              }}
            />
          ))}
          {taiKhoans.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                {q ? "Không tìm thấy tài khoản phù hợp" : "Chưa có tài khoản"}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <PhanTrang duong={DUONG} thamSo={thamSo} ten={ten.trang} trang={vt.trang} tongTrang={vt.tongTrang} tongDong={tong} soDong={vt.soDong} />
    </main>
  );
}
