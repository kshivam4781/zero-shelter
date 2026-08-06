import { createHash } from "node:crypto";
import { normalizeText } from "./normalize.js";

/**
 * Bump this whenever the fingerprint recipe changes.
 *
 * It is the first field of every fingerprint, so a bump changes every value.
 * That is the point: a silent recipe change would quietly re-classify old
 * findings as new ones, and a visible one forces the baseline to be rebuilt.
 */
export const SCHEMA_VERSION = "1";

/**
 * Length-prefixed hash of the given parts.
 *
 * Plain concatenation is ambiguous — ("ab", "c") and ("a", "bc") would produce
 * the same input string and therefore the same fingerprint. Prefixing each
 * part with its byte length makes the encoding injective.
 */
export function fingerprint(parts: readonly string[]): string {
  const hash = createHash("sha256");

  hash.update(encodePart(SCHEMA_VERSION));
  for (const part of parts) {
    hash.update(encodePart(normalizeText(part)));
  }

  return hash.digest("hex").slice(0, 16);
}

function encodePart(part: string): Buffer {
  const body = Buffer.from(part, "utf8");
  return Buffer.concat([Buffer.from(`${body.byteLength}:`, "utf8"), body]);
}

/**
 * Hash a secret value so the fingerprint can identify it without retaining it.
 * Callers must discard the original immediately after this returns.
 */
export function hashSecret(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
