import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { cauTrucKhoaHoc } from "@/server/services/gd/gd-04-hoc-tap";
import { KhongDuocXemTaiLieuError } from "@/server/services/gd/loi-giang-day";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { cn } from "@/lib/utils";
import { VongTienDo } from "../vong-tien-do";

// GD-04 (bổ sung 29/09/2026): "Quá trình học tập" - dòng thời gian các chuyên đề kèm % tiến độ
export default async function QuaTrinhHocTapPage({ params }: { params: Promise<{ khoaId: string }> }) {
  let phien;
  try {
    phien = await requirePermission("GD-04");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) return <KhongCoQuyen thongBao={error.message} />;
    throw error;
  }
  const { khoaId } = await params;
  let ct;
  try {
    ct = await cauTrucKhoaHoc(phien.userId, khoaId);
  } catch (error) {
    if (error instanceof KhongDuocXemTaiLieuError) notFound();
    throw error;
  }

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <nav aria-label="Đường dẫn" className="text-sm text-muted-foreground">
        <Link href="/hoc-tap">Khóa học của tôi</Link> <span className="mx-1.5">/</span> {ct.khoa.maKhoa}
      </nav>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ued-blue-dam">Quá trình học tập</h1>
          <p className="text-sm text-muted-foreground">
            {ct.khoa.maKhoa} · {ct.khoa.chuongTrinh.ten}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <VongTienDo phanTram={ct.phanTramKhoa} kichThuoc={56} />
          <Link href={`/hoc/${khoaId}`} className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
            {ct.soMucXong > 0 ? "Tiếp tục học" : "Vào học"}
          </Link>
        </div>
      </div>

      {ct.chuyenDe.length === 0 ? (
        <p className="text-muted-foreground">Chương trình chưa có học liệu.</p>
      ) : (
        <ol className="relative mx-auto flex w-full max-w-5xl flex-col gap-6 py-2 before:absolute before:top-0 before:bottom-0 before:left-8 before:w-1 before:rounded before:bg-primary md:before:left-1/2 md:before:-translate-x-1/2">
          {ct.chuyenDe.map((cd, i) => {
            const mucDau = cd.dsMuc.find((m) => !m.hoanThanh) ?? cd.dsMuc[0];
            const trai = i % 2 === 0;
            return (
              <li key={cd.id} className="relative grid grid-cols-[4rem_1fr] items-center gap-4 md:grid-cols-[1fr_4rem_1fr]">
                <div className={cn("order-2 md:order-none md:row-start-1", trai ? "md:col-start-1" : "md:col-start-3")}>
                  <Link
                    href={mucDau ? `/hoc/${khoaId}?muc=${mucDau.key}` : `/hoc/${khoaId}`}
                    className="block rounded-lg border border-primary/40 bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <span className="block font-bold text-foreground">
                      MD{i + 1}: {cd.ten}
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {cd.soTiet} tiết · {cd.soXong}/{cd.dsMuc.length} mục đã hoàn thành
                    </span>
                  </Link>
                </div>
                <div className="relative z-10 order-1 flex justify-center md:order-none md:col-start-2 md:row-start-1">
                  <VongTienDo phanTram={cd.phanTram} />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
