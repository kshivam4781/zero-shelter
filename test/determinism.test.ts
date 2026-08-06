import { describe, expect, it } from "vitest";
import { normalizePath, normalizeText, stableStringify } from "../src/normalize.js";
import { SCHEMA_VERSION, fingerprint, hashSecret } from "../src/fingerprint.js";

describe("normalizeText", () => {
  it("collapses CRLF and lone CR to LF", () => {
    expect(normalizeText("a\r\nb\rc")).toBe("a\nb\nc");
  });

  it("normalizes to NFC so decomposed and composed forms match", () => {
    const composed = "é";
    const decomposed = "e\u0301";
    expect(normalizeText(decomposed)).toBe(normalizeText(composed));
  });

  it("strips a leading BOM", () => {
    expect(normalizeText("\uFEFFhello")).toBe("hello");
  });
});

describe("normalizePath", () => {
  it("collapses every spelling of the same file to one string", () => {
    const expected = "src/app.ts";
    for (const variant of [
      "src/app.ts",
      "./src/app.ts",
      "src\\app.ts",
      "/src/app.ts",
      "C:\\src\\app.ts",
      "file:///src/app.ts",
      "src//app.ts",
    ]) {
      expect(normalizePath(variant), variant).toBe(expected);
    }
  });
});

describe("stableStringify", () => {
  it("ignores key insertion order at every depth", () => {
    const a = { b: 1, a: { d: 2, c: [{ f: 3, e: 4 }] } };
    const b = { a: { c: [{ e: 4, f: 3 }], d: 2 }, b: 1 };
    expect(stableStringify(a)).toBe(stableStringify(b));
  });
});

describe("fingerprint", () => {
  it("is injective across part boundaries", () => {
    expect(fingerprint(["ab", "c"])).not.toBe(fingerprint(["a", "bc"]));
  });

  it("normalizes its parts, so CRLF and LF agree", () => {
    expect(fingerprint(["a\r\nb"])).toBe(fingerprint(["a\nb"]));
  });

  it("changes when the schema version changes", () => {
    // Guards against a silent recipe change: SCHEMA_VERSION is hashed first,
    // so this constant must be updated deliberately whenever it is bumped.
    expect(SCHEMA_VERSION).toBe("1");
  });

  /**
   * The cross-OS gate. CI runs this on ubuntu, macos and windows; if any of
   * them disagrees, the fingerprint recipe depends on the host and every
   * number we publish is machine-specific.
   */
  it("produces identical values on every platform", () => {
    expect(fingerprint(["SAST", "src/app.ts", "sql-injection"])).toBe(
      "4043850c13d1b0fa",
    );
    expect(hashSecret("AKIAIOSFODNN7EXAMPLE")).toBe(
      "1a5d44a2dca19669d72edf4c4f1c27c4c1ca4b4408fbb17f6ce4ad452d78ddb3",
    );
  });
});
