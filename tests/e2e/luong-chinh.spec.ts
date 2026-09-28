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

test.describe("Nghiệp vụ qua giao diện", () => {
  test("cán bộ đào tạo tạo chương trình (CT-01) - xuất hiện ở trạng thái Dự thảo", async ({ page }) => {
    const ten = `${TIEN_TO_CHUONG_TRINH} ${Date.now()}`;
    await dangNhap(page, TAI_KHOAN_E2E.daoTao.tenDangNhap, MAT_KHAU_E2E, "/chuong-trinh");
    await expect(page).toHaveURL(/\/chuong-trinh$/);

    await page.getByLabel("Tên chương trình").fill(ten);
    await page.getByLabel("Loại hình").selectOption({ label: LOAI_HINH_E2E.ten });
    await page.getByLabel("Tổng thời lượng (tiết)").fill("30");
    await page.getByRole("button", { name: "Tạo chương trình (Dự thảo)" }).click();

    const dong = page.getByRole("row", { name: new RegExp(ten) });
    await expect(dong).toBeVisible();
    await expect(dong).toContainText(/Dự thảo/i);
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
