import { traCuuTheoSoHieu } from "@/server/services/cc/cc-05-xac-thuc";
import { KetQuaXacThucView } from "./ket-qua";

export const metadata = { title: "Tra cứu, xác thực văn bằng" };

// CC-05: trang công khai (không cần đăng nhập) cho học viên/bên thứ ba
export default async function TraCuuVanBangPage({
  searchParams,
}: {
  searchParams: Promise<{ soHieu?: string; hoTen?: string }>;
}) {
  const { soHieu, hoTen } = await searchParams;
  const daNhap = Boolean(soHieu?.trim() || hoTen?.trim());
  const ketQua = daNhap ? await traCuuTheoSoHieu(soHieu ?? "", hoTen ?? "") : null;

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-5 p-6">
      <h1 className="text-lg font-semibold">Tra cứu, xác thực chứng chỉ / giấy chứng nhận</h1>
      <p className="text-sm text-muted-foreground">
        Nhập số hiệu và họ tên người được cấp như ghi trên văn bằng, hoặc quét mã QR in trên văn bằng.
      </p>
      <form method="get" className="flex flex-col gap-3 rounded-lg border p-4">
        <label className="flex flex-col gap-1 text-sm">
          Số hiệu văn bằng
          <input name="soHieu" defaultValue={soHieu ?? ""} required placeholder="VD: CC2026-00001" className="h-9 rounded-lg border px-3" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Họ và tên người được cấp
          <input name="hoTen" defaultValue={hoTen ?? ""} required className="h-9 rounded-lg border px-3" />
        </label>
        <button type="submit" className="h-9 rounded-lg bg-primary px-4 text-sm text-primary-foreground">
          Tra cứu
        </button>
      </form>
      {ketQua && <KetQuaXacThucView ketQua={ketQua} />}
    </main>
  );
}
