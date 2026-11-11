"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-checks a pending order every few seconds so the page updates once the bank confirms. */
export function OrderStatusPoller({ intervalMs = 5000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(timer);
  }, [router, intervalMs]);
  return null;
}
