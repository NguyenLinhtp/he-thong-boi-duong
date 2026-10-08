import { cn } from "@/lib/utils";

type SacThai = "tot" | "dang-xu-ly" | "can-chu-y" | "loi" | "trung-tinh";

/**
 * Sắc thái màu theo mã trạng thái (enum Prisma) - dùng chung mọi module để cùng
 * 1 ý nghĩa luôn cùng 1 màu: xanh lá = hoàn tất/hợp lệ, xanh dương = đang diễn
 * ra, vàng = chờ xử lý/còn thiếu, đỏ = hủy/không hợp lệ, xám = nháp/đã đóng.
 */
const SAC_THAI: Record<string, SacThai> = {
  // chương trình / khóa
  DU_THAO: "trung-tinh",
  CHO_THAM_DINH: "can-chu-y",
  DA_BAN_HANH: "tot",
  NGUNG_HIEU_LUC: "trung-tinh",
  CHUAN_BI: "trung-tinh",
  DANG_TUYEN_SINH: "dang-xu-ly",
  DANG_DIEN_RA: "dang-xu-ly",
  DA_KET_THUC: "trung-tinh",
  HUY: "loi",
  // hồ sơ đăng ký
  CHO_NOP_GIAY: "can-chu-y",
  DA_NOP_GIAY: "dang-xu-ly",
  HUY_QUA_HAN_NOP_GIAY: "loi",
  CHO_TU_XAC_NHAN: "can-chu-y",
  DA_XAC_NHAN_THAM_GIA: "dang-xu-ly",
  CHO_DUYET: "can-chu-y",
  HOP_LE: "dang-xu-ly",
  KHONG_HOP_LE: "loi",
  CHINH_THUC: "tot",
  HOAN_THANH: "tot",
  THOI_HOC: "loi",
  // học phí
  CHUA_NOP: "can-chu-y",
  CON_NO: "can-chu-y",
  DA_NOP_DU: "tot",
  MIEN_GIAM: "tot",
  CHO_THANH_LY_HOP_DONG: "dang-xu-ly",
  DA_HOAN_TAT: "tot",
  // giao dịch ngân hàng (HP-02, bổ sung 08/10/2026)
  DA_GHI_NHAN: "tot",
  THUA_TIEN: "can-chu-y",
  CAN_XU_LY: "loi",
  DA_XU_LY: "trung-tinh",
  // hợp đồng / đơn vị liên kết
  DANG_TRIEN_KHAI: "dang-xu-ly",
  DA_THANH_LY: "tot",
  DANG_HOP_TAC: "tot",
  TAM_NGUNG: "trung-tinh",
  // văn bằng
  DE_NGHI: "can-chu-y",
  CHO_KY_DUYET: "can-chu-y",
  DA_KY_DUYET: "dang-xu-ly",
  DA_CAP: "tot",
  DA_HUY: "loi",
  // tài khoản / sao lưu / điểm danh
  HOAT_DONG: "tot",
  TAM_KHOA: "loi",
  DANG_CHAY: "dang-xu-ly",
  THANH_CONG: "tot",
  THAT_BAI: "loi",
  CO_MAT: "tot",
  VANG_CO_PHEP: "can-chu-y",
  VANG_KHONG_PHEP: "loi",
};

const LOP_MAU: Record<SacThai, string> = {
  tot: "bg-green-50 text-green-800 ring-green-600/25",
  "dang-xu-ly": "bg-blue-50 text-blue-800 ring-blue-600/25",
  "can-chu-y": "bg-amber-50 text-amber-800 ring-amber-600/30",
  loi: "bg-red-50 text-red-700 ring-red-600/25",
  "trung-tinh": "bg-slate-100 text-slate-700 ring-slate-500/25",
};

export function sacThaiTrangThai(ma: string): SacThai {
  return SAC_THAI[ma] ?? "trung-tinh";
}

export function NhanTrangThai({ ma, children, className }: { ma: string; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        LOP_MAU[sacThaiTrangThai(ma)],
        className,
      )}
    >
      {children}
    </span>
  );
}
