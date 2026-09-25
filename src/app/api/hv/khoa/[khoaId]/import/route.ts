import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { importDanhSachHocVien, danhSachChoTuXacNhan } from "@/server/services/hv/hv-03-import-danh-sach";
import {
  KhongTimThayKhoaError,
  SaiPhuongThucDangKyError,
  KhoaKhongConNhanImportError,
  ImportVuotSiSoToiDaError,
  DuLieuImportLoiError,
  FileImportRongError,
} from "@/server/services/hv/loi-hoc-vien";

type Params = { params: Promise<{ khoaId: string }> };

export const GET = apiRoute(async (_req: Request, { params }: Params) => {
  await requirePermission("HV-03");
  const { khoaId } = await params;
  return NextResponse.json(await danhSachChoTuXacNhan(khoaId));
});

export const POST = apiRoute(async (req: Request, { params }: Params) => {
  await requirePermission("HV-03");
  const { khoaId } = await params;
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ message: "Thiếu file import" }, { status: 400 });

  try {
    const ketQua = await importDanhSachHocVien(khoaId, await file.text());
    return NextResponse.json({ soLuongDaTao: ketQua.length }, { status: 201 });
  } catch (error) {
    if (error instanceof DuLieuImportLoiError) {
      return NextResponse.json({ message: error.message, loi: error.cacDongLoi }, { status: 400 });
    }
    if (
      error instanceof SaiPhuongThucDangKyError ||
      error instanceof KhoaKhongConNhanImportError ||
      error instanceof ImportVuotSiSoToiDaError ||
      error instanceof FileImportRongError
    ) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error instanceof KhongTimThayKhoaError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    throw error;
  }
});
