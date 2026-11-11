import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/** HMAC-SHA256 of `value`, base64url encoded. */
export function sign(value: string, secret: string = env.orderSecret): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

/** Constant-time check that `signature` matches `value`. */
export function verify(
  value: string,
  signature: string,
  secret: string = env.orderSecret,
): boolean {
  const expected = Buffer.from(sign(value, secret));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Random URL-safe identifier, e.g. `ord_4fK2…`. */
export function randomId(prefix: string, bytes = 16): string {
  return `${prefix}_${randomBytes(bytes).toString("base64url")}`;
}
