"use client";

import { startTransition, type FormEvent } from "react";

/**
 * Gửi form qua onSubmit thay vì <form action>: React 19 tự reset form sau khi
 * action chạy xong (kể cả khi trả lỗi) -> học viên mất hết dữ liệu đã nhập và
 * tệp đã chọn. Gọi action thủ công trong transition thì form giữ nguyên.
 */
export function guiGiuDuLieu(formAction: (fd: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => formAction(fd));
  };
}
