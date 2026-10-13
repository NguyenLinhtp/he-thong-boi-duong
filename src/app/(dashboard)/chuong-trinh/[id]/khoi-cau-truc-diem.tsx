"use client";

import { BangCauTrucDiem, type CauHinhHienThi } from "@/components/ket-qua/bang-cau-truc-diem";
import { luuCauTrucDiemChuongTrinhAction } from "./dieu-kien-dat-actions";

// (bổ sung 13/10/2026 - KQ-06) chương trình chỉ thi: điểm thành phần, hệ số, điều kiện đạt (mọi khóa dùng, khóa sửa riêng được)
export function KhoiCauTrucDiem({ chuongTrinhId, giaTri, diemDatChung }: { chuongTrinhId: string; giaTri: CauHinhHienThi | null; diemDatChung: number }) {
  return (
    <section className="flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-sm">
      <h2 className="text-base font-bold text-ued-blue-dam">Điểm thành phần và điều kiện đạt</h2>
      <p className="text-sm text-muted-foreground">
        Khai báo các điểm thành phần (vd. Lý thuyết, Thực hành), hệ số và điều kiện đạt. Ví dụ: mỗi phần đạt 5/10; hoặc Lý thuyết × 0,4 + Thực hành × 0,6 với điểm
        đạt tổng 5. Không đặt điều kiện nào thì khóa chỉ ghi điểm; xóa hết điểm thành phần thì khóa chỉ lấy danh sách chính thức, không nhập điểm. Mọi khóa của
        chương trình dùng cấu hình này, từng khóa sửa riêng được ở tab Kết quả.
        {!giaTri && ` Hiện chưa cấu hình: mỗi thí sinh 1 điểm thi, đạt khi ≥ ${diemDatChung}.`}
      </p>
      <BangCauTrucDiem
        key={JSON.stringify(giaTri)}
        giaTri={giaTri}
        luu={luuCauTrucDiemChuongTrinhAction.bind(null, chuongTrinhId)}
        nhanBo="Bỏ cấu hình (về 1 điểm thi)"
        moTaBo="Bỏ cấu hình điểm thành phần? Các khóa theo chương trình quay về 1 điểm thi."
        duocSua
      />
    </section>
  );
}
