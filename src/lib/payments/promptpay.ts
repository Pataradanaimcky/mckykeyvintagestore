/**
 * Builds the text inside a Thai PromptPay QR code (EMVCo merchant-presented format).
 * A real provider can use this to show a QR for a phone number or national ID.
 * Note: a bare PromptPay QR does not tell the store when it was paid. Automatic
 * confirmation needs a gateway that sends webhooks.
 */

function field(id: string, value: string): string {
  return `${id}${value.length.toString().padStart(2, "0")}${value}`;
}

/** CRC-16/CCITT-FALSE, as required by the EMVCo QR specification. */
export function crc16(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * @param target Thai mobile number (10 digits, starting with 0) or 13-digit national ID
 * @param amountSatang amount to lock into the QR; omit for an open-amount QR
 */
export function buildPromptPayPayload(target: string, amountSatang?: number): string {
  const digits = target.replace(/\D/g, "");
  let account: string;
  if (digits.length === 13) {
    account = field("02", digits);
  } else if (digits.length === 10 && digits.startsWith("0")) {
    account = field("01", `0066${digits.slice(1)}`);
  } else {
    throw new Error("PromptPay target must be a 10-digit mobile number or 13-digit national ID.");
  }

  const parts = [
    field("00", "01"),
    field("01", amountSatang === undefined ? "11" : "12"),
    field("29", field("00", "A000000677010111") + account),
    field("58", "TH"),
    field("53", "764"),
  ];
  if (amountSatang !== undefined) {
    parts.push(field("54", (amountSatang / 100).toFixed(2)));
  }
  const body = `${parts.join("")}6304`;
  return body + crc16(body);
}
