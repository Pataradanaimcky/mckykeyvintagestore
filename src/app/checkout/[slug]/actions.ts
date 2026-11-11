"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { createOrder, OrderError } from "@/lib/orders";

export interface CheckoutState {
  error?: string;
  email?: string;
}

const checkoutSchema = z.object({
  productSlug: z.string().min(1).max(100),
  email: z.email().max(254),
});

export async function startCheckout(
  _previous: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const email = String(formData.get("email") ?? "").trim();

  // Hidden field that real buyers never fill in. Bots usually do.
  if (String(formData.get("company") ?? "") !== "") {
    return { error: "ส่งแบบฟอร์มไม่สำเร็จ กรุณาลองใหม่", email };
  }

  const parsed = checkoutSchema.safeParse({
    productSlug: formData.get("productSlug"),
    email,
  });
  if (!parsed.success) {
    return { error: "กรุณากรอกอีเมลให้ถูกต้อง เช่น name@example.com", email };
  }

  let orderId: string;
  try {
    const user = await currentUser();
    const order = await createOrder({ ...parsed.data, userId: user?.id });
    orderId = order.id;
  } catch (error) {
    if (error instanceof OrderError) return { error: error.message, email };
    console.error("checkout failed", error);
    return { error: "สร้างคำสั่งซื้อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", email };
  }

  redirect(`/orders/${orderId}`);
}
