/**
 * (bổ sung 07/10/2026) Thao tác hàng loạt trên danh sách: chọn nhiều thí sinh/học viên rồi thực
 * hiện cùng 1 thao tác. Mỗi người xử lý riêng (từng giao dịch của service gốc, đủ các quy tắc
 * chặn như khi thao tác trên từng dòng); người bị chặn không làm hỏng người khác và được báo
 * lại kèm lý do. Riêng thao tác mà đặc tả quy định chặn cả lô (vd. xét duyệt chính thức HV-07)
 * thì gọi thẳng service theo lô.
 */
export type KetQuaLo = {
  thanhCong: number;
  loi: { ten: string; loi: string }[];
  // ghi chú thêm của người thành công (vd. số phiếu thu đã lập)
  ghiChu: string[];
};

// giới hạn 1 lần thao tác - đủ cho 1 khóa, tránh 1 yêu cầu chạy quá lâu
export const TOI_DA_LO = 500;

export class LoKhongHopLeError extends Error {
  constructor(msg: string) {
    super(msg);
  }
}

/** Kiểm tra danh sách id gửi lên: không rỗng, không vượt giới hạn; bỏ id trùng. */
export function chuanHoaDanhSachId(ids: string[]): string[] {
  const ds = [...new Set(ids.map((x) => String(x).trim()).filter(Boolean))];
  if (ds.length === 0) throw new LoKhongHopLeError("Chưa chọn dòng nào");
  if (ds.length > TOI_DA_LO) throw new LoKhongHopLeError(`Mỗi lần thao tác tối đa ${TOI_DA_LO} dòng`);
  return ds;
}

/**
 * Xử lý lần lượt từng đối tượng: `lam` ném lỗi = người đó bị chặn (ghi lý do), trả chuỗi = ghi chú.
 * `thieu` là các id gửi lên nhưng không thuộc phạm vi (khóa) - báo lỗi, không xử lý.
 */
export async function xuLyLo<T>(
  ds: T[],
  ten: (x: T) => string,
  lam: (x: T) => Promise<string | void | undefined>,
  thieu: number = 0,
): Promise<KetQuaLo> {
  const kq: KetQuaLo = { thanhCong: 0, loi: [], ghiChu: [] };
  if (thieu > 0) kq.loi.push({ ten: `${thieu} dòng`, loi: "không thuộc danh sách của khóa này" });
  for (const x of ds) {
    try {
      const ghiChu = await lam(x);
      kq.thanhCong++;
      if (ghiChu) kq.ghiChu.push(`${ten(x)}: ${ghiChu}`);
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      kq.loi.push({ ten: ten(x), loi: error.message });
    }
  }
  return kq;
}

/** Dùng ở server action: lỗi đầu vào của cả lô (chưa chọn, thiếu lý do...) trả về như kết quả để hiện cho người dùng. */
export async function bocLoiLo(fn: () => Promise<KetQuaLo>): Promise<KetQuaLo> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof LoKhongHopLeError) return { thanhCong: 0, loi: [{ ten: "Không thực hiện", loi: error.message }], ghiChu: [] };
    throw error;
  }
}
