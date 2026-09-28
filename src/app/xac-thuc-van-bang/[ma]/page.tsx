import Link from "next/link";
import { xacThucTheoMa } from "@/server/services/cc/cc-05-xac-thuc";
import { KetQuaXacThucView } from "../ket-qua";

export const metadata = { title: "Xác thực văn bằng" };

// CC-05: đích của mã QR in trên văn bằng - công khai, không cần đăng nhập
export default async function XacThucQrPage({ params }: { params: Promise<{ ma: string }> }) {
  const { ma } = await params;
  const ketQua = await xacThucTheoMa(ma);
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-5 p-6">
      <h1 className="text-xl font-bold text-ued-blue-dam">Xác thực văn bằng</h1>
      <KetQuaXacThucView ketQua={ketQua} />
      <Link href="/xac-thuc-van-bang" className="text-sm underline">
        Tra cứu văn bằng khác theo số hiệu
      </Link>
    </main>
  );
}
