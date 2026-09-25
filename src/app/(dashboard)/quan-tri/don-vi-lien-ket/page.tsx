import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { danhSachDonViLienKet, danhSachTaiKhoanChuaGan } from "@/server/services/hv/lien-ket-ho-tro";
import { danhSachKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { FormTaoDonVi } from "./form-tao-don-vi";
import { KhoiDonVi } from "./khoi-don-vi";

export default async function DonViLienKetPage() {
  try {
    await requirePermission("QT-01");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <p className="p-6 text-destructive">{error.message}</p>;
    }
    throw error;
  }

  const [dsDonVi, dsTaiKhoanChuaGan, dsKhoaTatCa] = await Promise.all([
    danhSachDonViLienKet(),
    danhSachTaiKhoanChuaGan(),
    danhSachKhoa(),
  ]);

  return (
    <main className="flex flex-col gap-6 p-6">
      <h1 className="text-lg font-semibold">
        Thiết lập đơn vị liên kết (tối thiểu cho HV-11/HV-12)
      </h1>
      <p className="text-sm text-muted-foreground">
        Trang tối thiểu để đơn vị liên kết + hợp đồng liên kết tồn tại thật trong hệ thống, phục vụ
        HV-11/HV-12. Quản lý đầy đủ (sửa/xóa/trạng thái hợp tác, thanh lý hợp đồng...) sẽ hoàn
        thiện khi xây module DVLK (nhóm 11).
      </p>

      <FormTaoDonVi />

      <div className="flex flex-col gap-4">
        {dsDonVi.map((dv) => (
          <KhoiDonVi
            key={dv.id}
            donVi={{
              id: dv.id,
              ma: dv.ma,
              ten: dv.ten,
              taiKhoan: dv.taiKhoan
                ? { id: dv.taiKhoan.id, tenDangNhap: dv.taiKhoan.tenDangNhap, hoTen: dv.taiKhoan.hoTen }
                : null,
              hopDongs: dv.hopDongs.map((hd) => ({
                id: hd.id,
                maHopDong: hd.maHopDong,
                trangThai: hd.trangThai,
                khoa: { maKhoa: hd.khoa.maKhoa },
              })),
            }}
            dsTaiKhoanChuaGan={dsTaiKhoanChuaGan.map((tk) => ({
              id: tk.id,
              tenDangNhap: tk.tenDangNhap,
              hoTen: tk.hoTen,
            }))}
            dsKhoa={dsKhoaTatCa.map((k) => ({ id: k.id, maKhoa: k.maKhoa, ten: k.chuongTrinh.ten }))}
          />
        ))}
      </div>
    </main>
  );
}
