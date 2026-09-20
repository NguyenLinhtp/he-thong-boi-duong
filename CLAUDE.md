@AGENTS.md

# Hệ thống nghiệp vụ quản lý đào tạo bồi dưỡng

Tin học hóa toàn bộ quy trình quản lý hoạt động bồi dưỡng của 1 trung tâm/phòng bồi dưỡng thuộc trường đại học sư phạm: xây dựng chương trình → mở khóa → tuyển sinh → giảng dạy → thu học phí → đánh giá kết quả → cấp chứng chỉ → báo cáo/lưu trữ.

**Đặc tả gốc — nguồn sự thật duy nhất, không tự diễn giải thêm:**
@docs/functions.json — 69 chức năng chi tiết (mã CN, actor, input, output, quy tắc nghiệp vụ, độ ưu tiên, giai đoạn triển khai). Luôn tra cứu file này trước khi code bất kỳ chức năng nào.
@docs/dac-ta-nghiep-vu.docx — đặc tả nghiệp vụ đầy đủ (quy trình, mô hình dữ liệu 13 thực thể, phân quyền 6 vai trò, mục 3.5 tham khảo bố cục/màu sắc giao diện).
@docs/progress.md — checklist tiến độ 69 chức năng theo Đợt 1/2/3, cập nhật sau mỗi lần hoàn thành 1 chức năng.

Kế hoạch triển khai tổng thể (giai đoạn 0-4, quy trình lặp) nằm ở plan đã duyệt trong phiên làm việc — nếu mất ngữ cảnh, đọc lại 2 file đặc tả trên trước khi tiếp tục.

## 11 module chức năng (mã tiền tố)

1. **DM** — Danh mục dùng chung (đơn vị, chức danh, loại hình bồi dưỡng, phòng học, đợt/kỳ)
2. **CT** — Chương trình bồi dưỡng (tạo, học phần, phê duyệt, phương thức đăng ký)
3. **KH** — Khóa bồi dưỡng (khởi tạo, phân công GV, thời khóa biểu, trạng thái/sĩ số)
4. **HV** — Tuyển sinh & quản lý học viên (4 phương thức đăng ký, xét duyệt, hồ sơ)
5. **GD** — Quản lý giảng dạy (điểm danh, nhật ký buổi học, học liệu, link online)
6. **KQ** — Điểm và kết quả học tập
7. **HP** — Quản lý học phí
8. **CC** — Quản lý chứng chỉ/chứng nhận
9. **BC** — Báo cáo – Thống kê – Dashboard
10. **QT** — Quản trị hệ thống (tài khoản, RBAC, audit log, sao lưu, cấu hình)
11. **DVLK** — Quản lý đơn vị liên kết (hợp đồng, đăng ký hộ, thanh lý)

## Ràng buộc nghiệp vụ cốt lõi (bắt buộc tuân thủ khi thiết kế/code)

- Mỗi chương trình bồi dưỡng gắn đúng 1 trong 4 phương thức đăng ký (CT-07); mọi khóa mở theo chương trình kế thừa phương thức đó.
- Học viên qua đơn vị liên kết (Phương thức 4) chỉ gắn với đúng 1 hợp đồng liên kết.
- Điều kiện cấp chứng chỉ rẽ nhánh: học phí cá nhân đã nộp đủ (thông thường) **hoặc** hợp đồng liên kết đã thanh lý (nếu qua đơn vị liên kết) — không áp cả hai cùng lúc.
- Học viên đã có điểm/chứng chỉ không được xóa khỏi khóa (HV-09); không sửa điểm sau khi đã phê duyệt trừ khi có quyết định phúc khảo (KQ-04).
- Cán bộ đơn vị liên kết không xem được học phí cá nhân học viên hay dữ liệu khóa/đơn vị khác.

## 6 vai trò (RBAC)

Quản trị hệ thống (Admin) · Cán bộ quản lý đào tạo · Cán bộ tài chính · Giảng viên · Học viên · Cán bộ đơn vị liên kết. Chi tiết quyền hạn: mục 3.3 `dac-ta-nghiep-vu.docx`. Middleware kiểm tra quyền phải tập trung 1 chỗ, áp dụng mọi route/API — không kiểm tra rải rác trong từng handler.

## Ngăn xếp công nghệ

TypeScript · Next.js App Router (FE+API chung repo) · Tailwind + shadcn/ui · PostgreSQL + Prisma · NextAuth.js (Auth.js) + RBAC tự viết · Vitest (unit) + Playwright (e2e).

## Cấu trúc thư mục theo module

```
src/app/(dashboard)/{danh-muc,chuong-trinh,khoa-hoc,tuyen-sinh,giang-day,
                      ket-qua,hoc-phi,chung-chi,bao-cao,quan-tri,don-vi-lien-ket}/
src/app/khoa/[maKhoa]/            # trang đăng ký công khai theo khóa (KH-06)
src/app/api/<module>/<resource>/route.ts
src/lib/auth/                     # NextAuth config + middleware RBAC tập trung
src/lib/db/                       # Prisma client singleton
src/server/services/<module>/     # business logic, đặt gần mã CN liên quan
src/components/{ui,<module>}/
tests/{unit,integration,e2e}/
prisma/{schema.prisma,seed.ts}
```

## Quy ước code

- Đặt tên theo mã chức năng khi có thể (tên file service/test gợi nhớ mã CN, vd. `hv-01-dang-ky-truc-tuyen.ts`).
- Mỗi chức năng đi kèm test bám đúng quy tắc nghiệp vụ trong `functions.json` — bắt buộc test cả trường hợp bị chặn, không chỉ happy path.
- 1 commit ứng 1 mã chức năng: `feat(<Mã CN>): <mô tả ngắn>`.
- Sau khi hoàn thành 1 chức năng (test pass + đã review diff): tick vào `docs/progress.md`.
- Mỗi phiên làm việc tập trung 1 module hoặc 1 nhóm chức năng liên quan — không trộn học phí với điểm danh trong cùng phiên.
- Chức năng liên quan học phí/phân quyền/chứng chỉ luôn cần review diff kỹ trước khi commit.
- Chức năng phức tạp, chặn chéo nhiều module (HP-06, CC-01, CC-04, DVLK-06...): làm thủ công từng bước, không tự động hoàn toàn.

## Lệnh thường dùng

- `npm run dev` — chạy dev server
- `npm run lint` — kiểm tra lint
- `npm run test` — chạy unit/integration test (Vitest)
- `npm run test:e2e` — chạy e2e (Playwright)
- `npx prisma migrate dev` — áp dụng migration schema
