import { notFound, redirect } from "next/navigation";
import { coQuyen, requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma/client";
import { chuanHoaMauBienLai, chuanHoaMauDon } from "@/lib/mau-in";
import { bienMauXemTruoc } from "@/server/services/chung/mau-in";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { DauTrangChuongTrinh } from "@/components/chuong-trinh/dau-trang-chuong-trinh";
import { BienTapMauBienLai, BienTapMauDon } from "@/components/mau-in/bien-tap-mau-in";
import { luuMauBienLaiAction, luuMauDonChuongTrinhAction } from "./actions";

// (bổ sung 07/10/2026 - HV-01/HV-05/HP-04) mẫu in của chương trình: đơn đăng ký (khóa sửa riêng ở tab
// Tuyển sinh của khóa) và biên lai thu tiền mẫu C45-BB
export default async function MauInChuongTrinhPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("CT-05");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) return <KhongCoQuyen thongBao={error.message} />;
    throw error;
  }
  const { id } = await params;
  const ct = await prisma.chuongTrinh.findUnique({ where: { id } });
  if (!ct) notFound();
  const laDuThi = ct.phuongThucDangKy === "CHI_DU_THI";
  const conHieuLuc = ct.trangThai !== "NGUNG_HIEU_LUC";
  const [suaDon, suaBienLai, bien, soKhoaRieng] = await Promise.all([
    coQuyen("CT-07").then((c) => c && conHieuLuc),
    coQuyen("HP-04").then((c) => c && conHieuLuc),
    bienMauXemTruoc(ct),
    prisma.khoa.count({ where: { chuongTrinhId: id, NOT: { mauDonDangKy: { equals: Prisma.DbNull } } } }),
  ]);

  return (
    <main className="flex flex-col gap-8 p-4 md:p-6 lg:px-8">
      <DauTrangChuongTrinh chuongTrinh={ct} dangChon="mau-in" />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-ued-blue-dam">Mẫu đơn đăng ký {laDuThi ? "dự thi" : ""}</h2>
        <div className="text-sm text-muted-foreground">
          <p>
            Đơn thí sinh in sau khi đăng ký. Mục I lấy theo các trường của <b>Form đăng ký</b>; bảng số tiền theo lệ phí/thành phần thí sinh
            đã chọn. Đang dùng: <b className="text-foreground">{ct.mauDonDangKy ? "mẫu riêng của chương trình" : "mẫu mặc định"}</b>.
          </p>
          {soKhoaRieng > 0 && <p className="mt-1 text-warning">{soKhoaRieng} khóa đang dùng mẫu đơn riêng - thay đổi ở đây không áp cho các khóa đó.</p>}
          {!suaDon && <p className="mt-1">Chế độ chỉ xem.</p>}
        </div>
        <BienTapMauDon
          mauBanDau={chuanHoaMauDon(ct.mauDonDangKy, laDuThi)}
          laDuThi={laDuThi}
          bien={bien}
          onLuu={suaDon ? luuMauDonChuongTrinhAction.bind(null, id) : undefined}
        />
      </section>

      <section className="flex flex-col gap-3 border-t pt-6">
        <h2 className="text-lg font-bold text-ued-blue-dam">Mẫu biên lai thu tiền (C45-BB)</h2>
        <div className="text-sm text-muted-foreground">
          <p>
            Biên lai lập khi cán bộ tài chính xác nhận thí sinh đã nộp. Nộp nhiều nội dung trong cùng 1 lần (vd. đăng ký thi + ôn thi) thì lập
            chung 1 biên lai. Nội dung in được chốt lúc lập: sửa mẫu chỉ áp dụng cho biên lai lập sau đó. Đang dùng:{" "}
            <b className="text-foreground">{ct.mauBienLai ? "mẫu riêng của chương trình" : "mẫu mặc định"}</b>.
          </p>
          {!suaBienLai && <p className="mt-1">Chế độ chỉ xem (cán bộ tài chính chỉnh sửa).</p>}
        </div>
        <BienTapMauBienLai
          mauBanDau={chuanHoaMauBienLai(ct.mauBienLai)}
          bien={bien}
          onLuu={suaBienLai ? luuMauBienLaiAction.bind(null, id) : undefined}
        />
      </section>
    </main>
  );
}
