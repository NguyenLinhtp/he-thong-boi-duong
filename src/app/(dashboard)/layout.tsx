import { auth } from "@/lib/auth";
import { ThanhDieuHuong } from "@/components/layout/thanh-dieu-huong";
import { menuTheoQuyen } from "@/components/layout/menu";
import { dangXuat } from "@/components/layout/dang-xuat";

const TEN_VAI_TRO: Record<string, string> = {
  ADMIN: "Quản trị hệ thống",
  CAN_BO_QUAN_LY_DAO_TAO: "Cán bộ quản lý đào tạo",
  CAN_BO_TAI_CHINH: "Cán bộ tài chính",
  GIANG_VIEN: "Giảng viên",
  HOC_VIEN: "Học viên",
  CAN_BO_DON_VI_LIEN_KET: "Cán bộ đơn vị liên kết",
};

// Khung chung khu nghiệp vụ. Chưa đăng nhập thì chỉ hiện nội dung - từng
// trang tự chuyển về /dang-nhap qua requirePermission().
export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const phien = (await auth())?.phienDangNhap;

  return (
    <div className="flex min-h-screen flex-col">
      {phien && (
        <ThanhDieuHuong
          menu={menuTheoQuyen(phien)}
          hoTen={phien.hoTen}
          vaiTro={phien.vaiTros.map((v) => TEN_VAI_TRO[v] ?? v).join(", ")}
          dangXuat={dangXuat}
        />
      )}
      <div className="mx-auto w-full max-w-screen-2xl flex-1 print:max-w-none">{children}</div>
      <footer className="border-t bg-white py-3 text-center text-xs text-muted-foreground print:hidden">
        © Trường Đại học Sư phạm - Đại học Đà Nẵng · Hệ thống quản lý đào tạo bồi dưỡng
      </footer>
    </div>
  );
}
