import { requireMotTrongCacQuyen, apiRoute } from "@/lib/auth/guard";
import { LOAI_DANH_SACH, xuatDanhSachTuyenSinh, type LoaiDanhSach } from "@/server/services/hv/xuat-danh-sach-tuyen-sinh";
import { KhongTimThayKhoaError } from "@/server/services/hv/loi-hoc-vien";

type Params = { params: Promise<{ khoaId: string }> };

// (bổ sung 12/10/2026) Excel các danh sách của tab Tuyển sinh: ?loai=nop-giay|tu-xac-nhan|thi-sinh|cho-duyet|
// khong-hop-le|chinh-thuc (&tp=<thành phần lệ phí> cho danh sách chính thức theo thành phần) - chỉ cán bộ
export const GET = apiRoute(async (req: Request, { params }: Params) => {
  await requireMotTrongCacQuyen(["KH-01", "HV-07", "HP-02"]);
  const { khoaId } = await params;
  const url = new URL(req.url);
  const loai = url.searchParams.get("loai") ?? "";
  if (!(loai in LOAI_DANH_SACH)) return Response.json({ loi: "Loại danh sách không hợp lệ" }, { status: 400 });
  try {
    const { tenFile, noiDung } = await xuatDanhSachTuyenSinh(khoaId, loai as LoaiDanhSach, url.searchParams.get("tp"));
    return new Response(new Uint8Array(noiDung), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${tenFile.replace(/[^\w.-]/g, "_")}"`,
      },
    });
  } catch (error) {
    if (error instanceof KhongTimThayKhoaError) return Response.json({ loi: error.message }, { status: 404 });
    throw error;
  }
});
