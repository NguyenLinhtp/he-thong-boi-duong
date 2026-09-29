import { expect, test, type Page } from "@playwright/test";
import { MAT_KHAU_E2E, TAI_KHOAN_E2E, LOAI_HINH_E2E, TIEN_TO_CHUONG_TRINH } from "./du-lieu-e2e";

/**
 * Giai đoạn 3 (kế hoạch): e2e luồng người dùng chính trên trình duyệt thật -
 * đăng nhập, chặn truy cập theo vai trò (RBAC), thao tác nghiệp vụ qua giao
 * diện, trang công khai.
 */

async function dangNhap(page: Page, tenDangNhap: string, matKhau = MAT_KHAU_E2E, dich = "/bao-cao") {
  await page.goto(`/dang-nhap?callbackUrl=${encodeURIComponent(dich)}`);
  await page.getByLabel("Tên đăng nhập / CCCD / Mã số").fill(tenDangNhap);
  await page.getByLabel("Mật khẩu").fill(matKhau);
  await page.getByRole("button", { name: /đăng nhập/i }).click();
}

test.describe("Xác thực và phân quyền", () => {
  test("chưa đăng nhập vào trang nghiệp vụ bị chuyển về đăng nhập, giữ lại trang đích", async ({ page }) => {
    await page.goto("/khoa-hoc");
    await expect(page).toHaveURL(/\/dang-nhap\?callbackUrl=%2Fkhoa-hoc/);
  });

  test("đăng nhập sai mật khẩu bị từ chối", async ({ page }) => {
    await dangNhap(page, TAI_KHOAN_E2E.daoTao.tenDangNhap, "SaiMatKhau123");
    await expect(page.getByText("Sai tên đăng nhập/CCCD/mã số hoặc mật khẩu.")).toBeVisible();
    await expect(page).toHaveURL(/\/dang-nhap/);
  });

  test("cán bộ đào tạo: vào được dashboard BC-01, bị chặn quản trị tài khoản (QT-01)", async ({ page }) => {
    await dangNhap(page, TAI_KHOAN_E2E.daoTao.tenDangNhap);
    await expect(page).toHaveURL(/\/bao-cao$/);
    await expect(page.getByRole("heading", { name: /BC-01/ })).toBeVisible();

    await page.goto("/quan-tri/tai-khoan");
    await expect(page.getByText("Không có quyền thực hiện chức năng QT-01")).toBeVisible();
  });

  test("cán bộ tài chính: xem được báo cáo tài chính BC-03, bị chặn phân quyền (QT-02)", async ({ page }) => {
    await dangNhap(page, TAI_KHOAN_E2E.taiChinh.tenDangNhap, MAT_KHAU_E2E, "/bao-cao/tai-chinh");
    await expect(page.getByRole("heading", { name: /BC-03/ })).toBeVisible();

    await page.goto("/quan-tri/phan-quyen");
    await expect(page.getByText("Không có quyền thực hiện chức năng QT-02")).toBeVisible();
  });
});

test.describe("Khung giao diện", () => {
  test("menu chỉ hiện module theo quyền, chuyển tab con, đăng xuất về trang đăng nhập", async ({ page }) => {
    await dangNhap(page, TAI_KHOAN_E2E.taiChinh.tenDangNhap, MAT_KHAU_E2E, "/bao-cao/tai-chinh");
    const menu = page.getByRole("navigation", { name: "Module" });
    await expect(menu.getByRole("link", { name: "Báo cáo" })).toHaveAttribute("aria-current", "page");
    // cán bộ tài chính không có module Quản trị / Danh mục
    await expect(menu.getByRole("link", { name: "Quản trị" })).toHaveCount(0);
    await expect(menu.getByRole("link", { name: "Danh mục" })).toHaveCount(0);

    await menu.getByRole("link", { name: "Học phí" }).click();
    // mục đầu của module Học phí: danh sách học phí theo khóa (lối vào HP-01..04 không cần KH-01)
    await expect(page).toHaveURL(/\/hoc-phi$/);
    await expect(page.getByRole("heading", { name: "Học phí theo khóa" })).toBeVisible();
    await page.getByRole("navigation", { name: "Học phí" }).getByRole("link", { name: "Doanh thu & công nợ" }).click();
    await expect(page).toHaveURL(/\/hoc-phi\/bao-cao$/);

    await page.getByRole("button", { name: /E2E Cán bộ tài chính/ }).click();
    await page.getByRole("menuitem", { name: "Đăng xuất" }).click();
    await expect(page).toHaveURL(/\/dang-nhap/);
    await page.goto("/bao-cao/tai-chinh");
    await expect(page).toHaveURL(/\/dang-nhap/);
  });
});

test.describe("Nghiệp vụ qua giao diện", () => {
  test("cán bộ đào tạo tạo chương trình (CT-01) - xuất hiện ở trạng thái Dự thảo", async ({ page }) => {
    const ten = `${TIEN_TO_CHUONG_TRINH} ${Date.now()}`;
    await dangNhap(page, TAI_KHOAN_E2E.daoTao.tenDangNhap, MAT_KHAU_E2E, "/chuong-trinh");
    await expect(page).toHaveURL(/\/chuong-trinh$/);

    await page.getByRole("button", { name: "Thêm chương trình" }).click();
    await page.getByLabel("Tên chương trình").fill(ten);
    await page.getByLabel("Loại hình").selectOption({ label: LOAI_HINH_E2E.ten });
    await page.getByLabel("Tổng thời lượng (tiết)").fill("30");
    await page.getByRole("button", { name: "Tạo chương trình (Dự thảo)" }).click();

    const the = page.getByRole("listitem").filter({ hasText: ten });
    await expect(the).toBeVisible();
    await expect(the).toContainText(/Dự thảo/i);

    // CT-07: sau khi lưu, ô chọn giữ phương thức vừa lưu (không bị form reset về "Chưa thiết lập")
    await the.getByRole("link").click();
    const phuongThuc = page.locator('select[name="phuongThucDangKy"]');
    await phuongThuc.selectOption("CHI_DU_THI");
    await page.getByRole("button", { name: "Lưu phương thức" }).click();
    await expect(page.getByRole("button", { name: "Lưu phương thức" })).toBeEnabled();
    await expect(phuongThuc).toHaveValue("CHI_DU_THI");
    await page.reload();
    await expect(phuongThuc).toHaveValue("CHI_DU_THI");
  });
});

test.describe("Trang công khai", () => {
  test("tra cứu văn bằng (CC-05) với số hiệu không tồn tại báo không tìm thấy, không cần đăng nhập", async ({ page }) => {
    await page.goto("/xac-thuc-van-bang");
    await page.locator('input[name="soHieu"]').fill("KHONG-TON-TAI-00000");
    await page.locator('input[name="hoTen"]').fill("Nguyễn Văn A");
    await page.getByRole("button", { name: /tra cứu/i }).click();
    await expect(page.getByText("Không tìm thấy văn bằng")).toBeVisible();
  });
});
