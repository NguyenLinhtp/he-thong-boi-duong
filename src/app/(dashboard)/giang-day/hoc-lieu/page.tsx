import { redirect } from "next/navigation";

// GD-04: học liệu phía học viên chuyển sang "Quá trình học tập" + màn hình học (bổ sung 29/09/2026)
export default function HocLieuHocVienPage() {
  redirect("/hoc-tap");
}
