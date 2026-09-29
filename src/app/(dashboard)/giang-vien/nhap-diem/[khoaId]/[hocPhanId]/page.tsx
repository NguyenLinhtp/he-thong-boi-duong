import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { giangVienCuaTaiKhoan } from "@/server/services/gd/dung-chung";
import { bangDiemHocPhan } from "@/server/services/kq/kq-01-nhap-diem";
import { diemDanhGiaTrucTuyen } from "@/server/services/kq/kq-01-danh-gia-truc-tuyen";
import { LoiKetQua } from "@/server/services/kq/loi-ket-qua";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { FormNhapDiem } from "./form-nhap-diem";

export default async function NhapDiemHocPhanPage({
  params,
}: {
  params: Promise<{ khoaId: string; hocPhanId: string }>;
}) {
  let phien;
  try {
    phien = await requirePermission("KQ-01");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <KhongCoQuyen thongBao={error.message} />;
    }
    throw error;
  }

  const giangVien = await giangVienCuaTaiKhoan(phien.userId);
  if (!giangVien) {
    return (
      <p className="p-6 text-destructive">Tài khoản đăng nhập chưa gắn với hồ sơ giảng viên nào.</p>
    );
  }

  const { khoaId, hocPhanId } = await params;
  let bang;
  try {
    bang = await bangDiemHocPhan(giangVien.id, khoaId, hocPhanId);
  } catch (error) {
    if (error instanceof LoiKetQua) return <KhongCoQuyen thongBao={error.message} />;
    throw error;
  }

  // KQ-01 (bổ sung 28/09/2026): điểm đánh giá trực tuyến (trắc nghiệm/sản phẩm tính điểm) để giảng viên dùng làm điểm thành phần
  const dsTrucTuyen = await diemDanhGiaTrucTuyen(khoaId, hocPhanId);
  const coTrucTuyen = dsTrucTuyen.some((d) => d.chiTiet.length > 0);
  const theoHocVien = new Map(dsTrucTuyen.map((d) => [d.hocVienId, d]));
  const dsDong = bang.dong.map((d) => {
    const tt = theoHocVien.get(d.hocVienId);
    return {
      ...d,
      trucTuyen: tt
        ? {
            diem: tt.diem,
            chuaDu: tt.chuaDu,
            chiTiet: tt.chiTiet.map((c) => `${c.tieuDe} (hệ số ${c.heSo}): ${c.diem ?? "chưa chấm"}`).join("\n"),
          }
        : null,
    };
  });

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <h1 className="text-xl font-bold text-ued-blue-dam">
        KQ-01 · {bang.hocPhan.ten} · khóa {bang.khoa.maKhoa}
      </h1>
      <p className="text-sm text-muted-foreground">
        Điểm trong khoảng 0–10. Điểm học phần tự tính theo tỷ lệ thành phần/kết thúc cấu hình ở
        tham số hệ thống (mặc định 30%/70%). Điểm đã phê duyệt (KQ-04) không sửa được.
      </p>
      <FormNhapDiem khoaId={khoaId} hocPhanId={hocPhanId} dsDong={dsDong} coTrucTuyen={coTrucTuyen} />
    </main>
  );
}
