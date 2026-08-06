/**
 * The single normalization gate.
 *
 * Everything that ends up in a fingerprint MUST pass through here first.
 * If two machines disagree about what a string is, they will disagree about
 * every fingerprint downstream — and a fingerprint that changes across
 * machines silently breaks dedup, baselines, and every number we report.
 */

/** Strip BOM, normalize to NFC, and collapse CRLF/CR to LF. */
export function normalizeText(input: string): string {
  return input
    .replace(/^﻿/, "")
    .normalize("NFC")
    .replace(/\r\n?/g, "\n");
}

/**
 * Normalize a file path to a repo-relative POSIX path.
 *
 * Scanners report paths in whatever the host OS uses, and some prefix them
 * with `./`, `file://`, or an absolute build path. All of those describe the
 * same file, so they must collapse to one string.
 */
export function normalizePath(input: string): string {
  let p = normalizeText(input).trim();

  if (p.startsWith("file://")) p = p.slice("file://".length);

  p = p.replace(/\\/g, "/");
  // ponytail: drive letters only appear on Windows scanner output; a regex
  // beats pulling in a path library for one case.
  p = p.replace(/^[A-Za-z]:\//, "/");
  p = p.replace(/\/{2,}/g, "/");

  while (p.startsWith("./")) p = p.slice(2);
  if (p.startsWith("/")) p = p.slice(1);

  return p;
}

/**
 * Deterministic JSON. `JSON.stringify` preserves insertion order, so two
 * objects with the same content but different key order serialize differently.
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value === null || typeof value !== "object") return value;

  const source = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(source).sort()) {
    sorted[key] = sortDeep(source[key]);
  }
  return sorted;
}
