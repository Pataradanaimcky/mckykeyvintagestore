import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPromptPayPayload, crc16 } from "../src/lib/payments/promptpay.ts";

test("crc16 matches the CRC-16/CCITT-FALSE check value", () => {
  assert.equal(crc16("123456789"), "29B1");
});

test("open-amount QR for a mobile number", () => {
  assert.equal(
    buildPromptPayPayload("000-000-0000"),
    "00020101021129370016A000000677010111011300660000000005802TH530376463048956",
  );
});

test("fixed-amount QR carries the amount and a valid checksum", () => {
  const payload = buildPromptPayPayload("0812345678", 59000);
  assert.match(payload, /^000201010212/);
  assert.ok(payload.includes("5406590.00"));
  assert.equal(payload.slice(-4), crc16(payload.slice(0, -4)));
});

test("national ID uses account type 02", () => {
  assert.ok(buildPromptPayPayload("1234567890123").includes("02131234567890123"));
});

test("rejects other lengths", () => {
  assert.throws(() => buildPromptPayPayload("12345"));
});
