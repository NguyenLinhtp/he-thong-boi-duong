import type { Metadata } from "next";
import { DanhMucChuongTrinh } from "@/components/cong-khai/danh-muc-chuong-trinh";

export const metadata: Metadata = { title: "Chương trình đang mở đăng ký" };

// (bổ sung 01/10/2026 - KH-06) danh mục chương trình - mở cho cả khách và học viên đã đăng nhập
export default function TrangDanhMucChuongTrinh() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-ued-blue-dam">Chương trình đang mở đăng ký</h1>
      <DanhMucChuongTrinh />
    </main>
  );
}
