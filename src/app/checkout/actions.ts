"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { getCartSlugs, saveCart } from "@/lib/cart";
import { createOrder, OrderError } from "@/lib/orders";

export interface CheckoutState {
  error?: string;
  email?: string;
}

const emailSchema = z.email().max(254);

/** Turn the cart into one order and show its payment page. */
export async function startCheckout(_previous: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const email = String(formData.get("email") ?? "").trim();

  // Hidden field that real buyers never fill in. Bots usually do.
  if (String(formData.get("company") ?? "") !== "") {
    return { error: "ส่งแบบฟอร์มไม่สำเร็จ กรุณาลองใหม่", email };
  }

  if (!emailSchema.safeParse(email).success) {
    return { error: "กรุณากรอกอีเมลให้ถูกต้อง เช่น name@example.com", email };
  }

  // The cart is read on the server. Nothing the browser sends can change what is bought or the price.
  const slugs = await getCartSlugs();
  if (slugs.length === 0) {
    return { error: "ตะกร้าว่างอยู่ กรุณาเลือกแพ็กก่อน", email };
  }

  let orderId: string;
  try {
    const user = await currentUser();
    const order = await createOrder({ productSlugs: slugs, email, userId: user?.id });
    orderId = order.id;
  } catch (error) {
    if (error instanceof OrderError) return { error: error.message, email };
    console.error("checkout failed", error);
    return { error: "สร้างคำสั่งซื้อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", email };
  }

  await saveCart([]);
  redirect(`/orders/${orderId}`);
}
