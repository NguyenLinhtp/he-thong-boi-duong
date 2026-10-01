import { ChanTrangCongKhai, DauTrangCongKhai } from "@/components/layout/dau-trang-cong-khai";

// Khu công khai (không cần đăng nhập): đầu/chân trang nhận diện UED
export default function LayoutCongKhai({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <DauTrangCongKhai />
      <div className="flex-1">{children}</div>
      <ChanTrangCongKhai />
    </div>
  );
}
