"use client";

import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { GOI_Y_EMAIL, MAU_EMAIL_HTML } from "@/lib/email";

/**
 * (bổ sung 08/10/2026) Ô nhập email: trình duyệt chặn gửi và báo lỗi tiếng Việt ngay tại ô khi email
 * chưa đúng định dạng (máy chủ vẫn kiểm tra lại - src/lib/email.ts).
 */
export function OEmail(props: Omit<ComponentProps<typeof Input>, "type" | "pattern">) {
  return (
    <Input
      {...props}
      type="email"
      pattern={MAU_EMAIL_HTML}
      title={GOI_Y_EMAIL}
      inputMode="email"
      autoComplete={props.autoComplete ?? "email"}
      onInvalid={(e) => {
        const o = e.currentTarget;
        o.setCustomValidity(o.validity.valueMissing ? "Vui lòng nhập email" : GOI_Y_EMAIL);
        props.onInvalid?.(e);
      }}
      onInput={(e) => {
        e.currentTarget.setCustomValidity("");
        props.onInput?.(e);
      }}
      onBlur={(e) => {
        // báo ngay khi rời ô, không đợi bấm gửi
        const o = e.currentTarget;
        if (o.value && !o.checkValidity()) o.reportValidity();
        props.onBlur?.(e);
      }}
    />
  );
}
