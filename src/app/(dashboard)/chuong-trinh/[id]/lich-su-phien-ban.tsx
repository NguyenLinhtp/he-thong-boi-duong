import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";

type PhienBan = {
  id: string;
  phienBan: number;
  ten: string;
  tongThoiLuong: number | null;
  lyDoSua: string | null;
  luuLucAt: Date;
};

export function LichSuPhienBan({ danhSach }: { danhSach: PhienBan[] }) {
  if (danhSach.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-bold text-ued-blue-dam">Lịch sử phiên bản trước khi sửa</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Phiên bản</TableHead>
            <TableHead>Tên (lúc đó)</TableHead>
            <TableHead>Tổng thời lượng</TableHead>
            <TableHead>Lý do sửa</TableHead>
            <TableHead>Thời điểm lưu</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {danhSach.map((pb) => (
            <TableRow key={pb.id}>
              <TableCell>{pb.phienBan}</TableCell>
              <TableCell>{pb.ten}</TableCell>
              <TableCell>{pb.tongThoiLuong ?? "—"}</TableCell>
              <TableCell>{pb.lyDoSua ?? "—"}</TableCell>
              <TableCell>{new Date(pb.luuLucAt).toLocaleString("vi-VN")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
