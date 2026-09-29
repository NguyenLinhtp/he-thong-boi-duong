import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { layDonViLienKet } from "@/server/services/dvlk/dvlk-01-danh-muc";
import { KhongTimThayDonViLienKetError } from "@/server/services/dvlk/loi-dvlk";
import { danhSachTaiKhoanChuaGan } from "@/server/services/dvlk/dvlk-02-tai-khoan";
import { FormCapTaiKhoan, NutThuHoiTaiKhoan } from "./form-tai-khoan";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { NhanTrangThai } from "@/components/chung/nhan-trang-thai";
import { FormSuaDonViLienKet, NutTrangThaiHopTac, NutXoaDonViLienKet } from "../cac-form";
import { NHAN_TRANG_THAI_HOP_TAC, NHAN_TRANG_THAI_HOP_DONG } from "../nhan";

async function coQuyen(maCN: string): Promise<boolean> {
  try {
    await requirePermission(maCN);
    return true;
  } catch (error) {
    if (error instanceof KhongCoQuyenError) return false;
    throw error;
  }
}

const NHAN_TRANG_THAI_TAI_KHOAN: Record<string, string> = { HOAT_DONG: "Hoạt động", TAM_KHOA: "Tạm khóa" };

export default async function ChiTietDonViLienKetPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("DVLK-01");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <KhongCoQuyen thongBao={error.message} />;
    }
    throw error;
  }

  const { id } = await params;
  let dv;
  try {
    dv = await layDonViLienKet(id);
  } catch (error) {
    if (error instanceof KhongTimThayDonViLienKetError) return <KhongCoQuyen thongBao={error.message} />;
    throw error;
  }
  const choPhepDVLK02 = await coQuyen("DVLK-02");
  // Quản trị có DVLK-01 nhưng không có DVLK-03 -> không gắn link sang hợp đồng
  const xemHopDong = await coQuyen("DVLK-03");
  const dsTaiKhoanChuaGan = choPhepDVLK02 && !dv.taiKhoan ? await danhSachTaiKhoanChuaGan() : [];

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-ued-blue-dam">
          Đơn vị liên kết {dv.ma} · {dv.ten}
          <NhanTrangThai ma={dv.trangThaiHopTac} className="ml-2 align-middle">{NHAN_TRANG_THAI_HOP_TAC[dv.trangThaiHopTac] ?? dv.trangThaiHopTac}</NhanTrangThai>
        </h1>
        <Link href="/don-vi-lien-ket" className="text-sm underline">
          ← Danh mục đơn vị liên kết
        </Link>
      </div>

      <section className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-bold text-ued-blue-dam">DVLK-01 · Thông tin đơn vị</h2>
        <FormSuaDonViLienKet
          dv={{ id: dv.id, ma: dv.ma, ten: dv.ten, diaChi: dv.diaChi, nguoiDaiDien: dv.nguoiDaiDien, soDienThoai: dv.soDienThoai, email: dv.email }}
        />
        <div className="flex flex-wrap items-start gap-3">
          <NutTrangThaiHopTac id={dv.id} dangHopTac={dv.trangThaiHopTac === "DANG_HOP_TAC"} />
          <NutXoaDonViLienKet id={dv.id} ten={dv.ten} />
        </div>
        <p className="text-xs text-muted-foreground">
          Tạm ngừng hợp tác: không lập hợp đồng liên kết mới, hợp đồng đang có vẫn theo dõi và thanh lý
          bình thường. Không xóa được đơn vị đã có hợp đồng.
        </p>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-bold text-ued-blue-dam">DVLK-02 · Tài khoản đơn vị liên kết</h2>
        <p className="text-xs text-muted-foreground">
          Tài khoản chỉ đăng ký hộ và xem/xác nhận hồ sơ trên các khóa có hợp đồng với đơn vị này; không
          xem được học phí cá nhân của học viên hay dữ liệu khóa/đơn vị khác.
        </p>
        {dv.taiKhoan ? (
          <div className="flex flex-wrap items-start gap-4 text-sm">
            <p>
              <b>{dv.taiKhoan.tenDangNhap}</b> · {dv.taiKhoan.hoTen}
              {dv.taiKhoan.email ? ` · ${dv.taiKhoan.email}` : ""} ·{" "}
              <NhanTrangThai ma={dv.taiKhoan.trangThai}>{NHAN_TRANG_THAI_TAI_KHOAN[dv.taiKhoan.trangThai] ?? dv.taiKhoan.trangThai}</NhanTrangThai>
            </p>
            {choPhepDVLK02 && <NutThuHoiTaiKhoan donViId={dv.id} tenDangNhap={dv.taiKhoan.tenDangNhap} />}
          </div>
        ) : choPhepDVLK02 ? (
          <FormCapTaiKhoan
            donViId={dv.id}
            dsTaiKhoanChuaGan={dsTaiKhoanChuaGan.map((tk) => ({ id: tk.id, tenDangNhap: tk.tenDangNhap, hoTen: tk.hoTen }))}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Chưa có tài khoản (Quản trị hệ thống cấp).</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-ued-blue-dam">Hợp đồng liên kết (các khóa được phân công)</h2>
          {xemHopDong && (
            <Link href={`/don-vi-lien-ket/hop-dong?donVi=${dv.id}`} className="text-sm underline">
              Lập / quản lý hợp đồng (DVLK-03) →
            </Link>
          )}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã hợp đồng</TableHead>
              <TableHead>Khóa</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dv.hopDongs.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground">
                  Chưa có hợp đồng.
                </TableCell>
              </TableRow>
            )}
            {dv.hopDongs.map((hd) => (
              <TableRow key={hd.id}>
                <TableCell>
                  {xemHopDong ? (
                    <Link href={`/don-vi-lien-ket/hop-dong/${hd.id}`} className="underline">
                      {hd.maHopDong}
                    </Link>
                  ) : (
                    hd.maHopDong
                  )}
                </TableCell>
                <TableCell>
                  {hd.khoa.maKhoa} · {hd.khoa.chuongTrinh.ten}
                </TableCell>
                <TableCell><NhanTrangThai ma={hd.trangThai}>{NHAN_TRANG_THAI_HOP_DONG[hd.trangThai] ?? hd.trangThai}</NhanTrangThai></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </main>
  );
}
