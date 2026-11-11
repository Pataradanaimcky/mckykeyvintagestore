const baht = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
});

/** Format an amount held in satang (1 baht = 100 satang) as "฿590". */
export function formatTHB(satang: number): string {
  return baht.format(satang / 100);
}

/** "me@example.com" -> "m•••@example.com" */
export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return "•••";
  return `${user.slice(0, 1)}•••@${domain}`;
}

const dateTime = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Bangkok",
});

export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}
