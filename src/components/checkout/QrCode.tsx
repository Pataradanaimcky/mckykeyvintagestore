import QRCode from "qrcode";

/** Renders `payload` as an inline SVG QR code on the server. */
export async function QrCode({ payload, label }: { payload: string; label: string }) {
  const svg = await QRCode.toString(payload, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#0b1220", light: "#ffffff" },
  });
  return (
    <div
      role="img"
      aria-label={label}
      className="w-full max-w-60 overflow-hidden rounded-2xl border border-line bg-white p-2 [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
