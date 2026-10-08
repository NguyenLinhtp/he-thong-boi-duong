import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { prisma } from "@/lib/db/prisma";
import { TOI_DA_LO } from "@/server/services/chung/xu-ly-lo";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { NutIn } from "../[id]/nut-in";
import { noiDungInPhieuThu } from "@/server/services/chung/mau-in";
import { BanInBienLai } from "@/components/mau-in/ban-in-bien-lai";

// (bổ sung 07/10/2026 - HP-04) in nhiều biên lai đã chọn trên danh sách (mẫu C45-BB), mỗi biên lai 1 trang in
export default async function InNhieuPhieuThuPage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  try {
    await requirePermission("HP-04");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) return <KhongCoQuyen thongBao={error.message} />;
    throw error;
  }

  const ids = [...new Set((await searchParams).ids?.split(",").map((x) => x.trim()).filter(Boolean) ?? [])].slice(0, TOI_DA_LO);
  const ds = await prisma.phieuThu.findMany({
    where: { id: { in: ids } },
    include: { hocPhi: { include: { hocVien: true, khoa: true } }, chiTiets: true },
    orderBy: { soPhieu: "asc" },
  });

  const dsNoiDung = await Promise.all(ds.map((pt) => noiDungInPhieuThu(pt)));

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 p-8 print:max-w-none print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <p className="text-sm text-muted-foreground">{ds.length} biên lai</p>
        <NutIn />
      </div>
      {ds.length === 0 && <p className="text-sm text-muted-foreground">Không có biên lai nào được chọn.</p>}
      {ds.map((pt, i) => (
        <section key={pt.id} className="break-after-page rounded-lg border print:border-0">
          <BanInBienLai
            nd={dsNoiDung[i]}
            soPhieu={pt.soPhieu}
            ngayLap={pt.ngayLap}
            soTien={Number(pt.soTien)}
            nguoiThuTen={pt.nguoiLapTen}
            thayChoSoPhieu={pt.thayChoSoPhieu}
            daHuy={pt.daHuy ? { luc: pt.huyLuc, lyDo: pt.lyDoHuy, nguoi: pt.nguoiHuyTen } : null}
          />
        </section>
      ))}
    </main>
  );
}
