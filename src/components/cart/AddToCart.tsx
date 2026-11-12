import Link from "next/link";
import { addToCart } from "@/app/cart/actions";

/** Buttons on a pack page. Shows "in cart" once the pack has been added. */
export function AddToCart({ slug, inCart }: { slug: string; inCart: boolean }) {
  if (inCart) {
    return (
      <div className="pop-in flex flex-col gap-3 sm:flex-row">
        <Link href="/checkout" className="btn btn-dark flex-1 justify-center">
          ไปชำระเงิน <span aria-hidden="true" className="btn-arrow">→</span>
        </Link>
        <Link href="/cart" className="btn btn-light flex-1 justify-center">
          ✓ อยู่ในตะกร้าแล้ว
        </Link>
      </div>
    );
  }
  return (
    <form action={addToCart} className="flex flex-col gap-3 sm:flex-row">
      <input type="hidden" name="slug" value={slug} />
      <button type="submit" name="buyNow" value="1" className="btn btn-dark flex-1 justify-center">
        ซื้อเลย <span aria-hidden="true" className="btn-arrow">→</span>
      </button>
      <button type="submit" className="btn btn-light flex-1 justify-center">
        หยิบใส่ตะกร้า
      </button>
    </form>
  );
}
