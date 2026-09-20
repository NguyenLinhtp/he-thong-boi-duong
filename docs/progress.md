# Tiến độ triển khai 69 chức năng

Nguồn: `docs/functions.json`. Đánh dấu `[x]` khi đã code + test pass + review diff + commit `feat(<Mã CN>): ...` (bước 6 trong quy trình 6 bước, xem CLAUDE.md).

## Đợt 1 (29 chức năng)

### 1. Quản trị danh mục dùng chung

- [ ] **DM-01** — Quản lý danh mục đơn vị/phòng ban
- [ ] **DM-02** — Quản lý danh mục chức danh, học hàm/học vị
- [ ] **DM-03** — Quản lý danh mục loại hình bồi dưỡng
- [ ] **DM-04** — Quản lý danh mục phòng học/địa điểm
- [ ] **DM-05** — Quản lý danh mục đợt/kỳ tuyển sinh

### 2. Quản lý chương trình bồi dưỡng

- [ ] **CT-01** — Tạo mới chương trình bồi dưỡng
- [ ] **CT-02** — Quản lý học phần/chuyên đề trong chương trình
- [ ] **CT-03** — Trình duyệt và phê duyệt chương trình
- [ ] **CT-04** — Cập nhật/chỉnh sửa chương trình đã ban hành
- [ ] **CT-05** — Tra cứu, tìm kiếm chương trình
- [ ] **CT-07** — Thiết lập phương thức tiếp cận đăng ký học viên

### 3. Quản lý khóa bồi dưỡng

- [ ] **KH-01** — Khởi tạo khóa bồi dưỡng
- [ ] **KH-02** — Phân công giảng viên phụ trách học phần
- [ ] **KH-03** — Thiết lập thời khóa biểu
- [ ] **KH-04** — Thiết lập hình thức giảng dạy
- [ ] **KH-05** — Quản lý trạng thái và sĩ số khóa
- [ ] **KH-06** — Thông báo tuyển sinh/mở khóa

### 4. Tuyển sinh & Quản lý học viên

- [ ] **HV-01** — Đăng ký khóa học trực tuyến kèm in đơn đăng ký (Phương thức 1)
- [ ] **HV-02** — Xác nhận đã nhận hồ sơ giấy (Phương thức 1)
- [ ] **HV-03** — Import danh sách học viên có sẵn (Phương thức 2)
- [ ] **HV-04** — Học viên tự xác nhận tham gia bằng CCCD/mã số/tài khoản (Phương thức 2)
- [ ] **HV-05** — Đăng ký dự thi, không qua học (Phương thức 3)
- [ ] **HV-06** — Kiểm tra, thẩm định hồ sơ đăng ký
- [ ] **HV-07** — Xét duyệt danh sách chính thức
- [ ] **HV-08** — Quản lý hồ sơ học viên
- [ ] **HV-09** — Quản lý danh sách học viên theo khóa

### 10. Quản trị hệ thống

- [ ] **QT-01** — Quản lý tài khoản người dùng
- [ ] **QT-02** — Phân quyền theo vai trò (RBAC)
- [ ] **QT-04** — Sao lưu và phục hồi dữ liệu

## Đợt 2 (34 chức năng)

### 2. Quản lý chương trình bồi dưỡng

- [ ] **CT-06** — Ngừng hiệu lực/lưu trữ chương trình

### 4. Tuyển sinh & Quản lý học viên

- [ ] **HV-10** — Gửi thông báo tự động cho học viên
- [ ] **HV-11** — Đăng ký học viên thay mặt đơn vị liên kết (Phương thức 4a)
- [ ] **HV-12** — Học viên tự đăng ký và chọn đơn vị liên kết thu hồ sơ (Phương thức 4b)

### 5. Quản lý giảng dạy

- [ ] **GD-01** — Điểm danh học viên theo buổi học
- [ ] **GD-02** — Ghi nhật ký buổi học
- [ ] **GD-03** — Xử lý nghỉ học, đổi lịch, học bù
- [ ] **GD-05** — Tạo và quản lý link phòng học trực tuyến

### 6. Quản lý điểm và kết quả học tập

- [ ] **KQ-01** — Nhập điểm thành phần/điểm kết thúc học phần
- [ ] **KQ-02** — Tổng hợp kết quả toàn khóa
- [ ] **KQ-03** — Xét điều kiện hoàn thành khóa
- [ ] **KQ-04** — Phê duyệt kết quả cuối cùng
- [ ] **KQ-05** — Tra cứu điểm
- [ ] **KQ-06** — Nhập kết quả thi trực tiếp (Phương thức 3)

### 7. Quản lý học phí

- [ ] **HP-01** — Thiết lập mức học phí theo khóa
- [ ] **HP-02** — Ghi nhận và xác nhận thanh toán học phí
- [ ] **HP-03** — Theo dõi công nợ học viên
- [ ] **HP-04** — Lập phiếu thu, xuất chứng từ
- [ ] **HP-05** — Báo cáo doanh thu và công nợ học phí
- [ ] **HP-06** — Liên kết điều kiện học phí với kết quả/chứng chỉ

### 8. Quản lý chứng chỉ/chứng nhận

- [ ] **CC-01** — Lập danh sách đề nghị cấp chứng chỉ
- [ ] **CC-02** — Sinh số hiệu và in ấn chứng chỉ
- [ ] **CC-03** — Ký duyệt và cập nhật trạng thái
- [ ] **CC-04** — Vào sổ cấp chứng chỉ, lưu hồ sơ

### 9. Báo cáo – Thống kê – Dashboard

- [ ] **BC-02** — Báo cáo định kỳ hoạt động đào tạo
- [ ] **BC-03** — Báo cáo tài chính học phí

### 10. Quản trị hệ thống

- [ ] **QT-03** — Nhật ký thao tác (audit log)
- [ ] **QT-05** — Cấu hình tham số hệ thống

### 11. Quản lý đơn vị liên kết

- [ ] **DVLK-01** — Quản lý danh mục đơn vị liên kết
- [ ] **DVLK-02** — Cấp và quản lý tài khoản đơn vị liên kết
- [ ] **DVLK-03** — Quản lý hợp đồng liên kết tuyển sinh theo khóa
- [ ] **DVLK-04** — Đăng ký và tiếp nhận hồ sơ học viên qua đơn vị liên kết
- [ ] **DVLK-05** — Xác nhận đơn vị liên kết đã thu hồ sơ và tổng hợp gửi trường
- [ ] **DVLK-06** — Thanh lý hợp đồng liên kết tuyển sinh cuối khóa

## Đợt 3 (6 chức năng)

### 5. Quản lý giảng dạy

- [ ] **GD-04** — Quản lý tài liệu học tập/học liệu số

### 8. Quản lý chứng chỉ/chứng nhận

- [ ] **CC-05** — Tra cứu, xác thực chứng chỉ

### 9. Báo cáo – Thống kê – Dashboard

- [ ] **BC-01** — Dashboard tổng quan thời gian thực
- [ ] **BC-04** — Xuất báo cáo theo mẫu gửi cấp trên
- [ ] **BC-05** — Tra cứu hồ sơ lưu trữ điện tử

### 11. Quản lý đơn vị liên kết

- [ ] **DVLK-07** — Báo cáo công nợ và doanh thu theo đơn vị liên kết


Tổng cộng: 69 chức năng.
