/**
 * Only allow redirects to pages on this site. Anything that could point to
 * another site ("//host", "https://…", backslashes) falls back to a safe page.
 */
export function safeNextPath(value: unknown, fallback = "/account"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}
