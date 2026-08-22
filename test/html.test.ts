/**
 * The report is one static file someone opens, so the failures worth guarding
 * are the ones a browser will not tell you about: a package name that escapes
 * into markup, a page that only works with JavaScript, a clock that makes two
 * identical judgements produce two different files.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { emptyBaseline, baselineFrom } from "../src/baseline.js";
import { judge } from "../src/judge.js";
import { parseNpmAudit } from "../src/ingest/npm-audit.js";
import { renderHtml } from "../src/html.js";
import type { ScaFinding } from "../src/finding.js";

const findings = parseNpmAudit(
  readFileSync(fileURLToPath(new URL("./fixtures/npm-audit.json", import.meta.url)), "utf8"),
);
const result = judge(findings, { baseline: emptyBaseline() });
const page = renderHtml(result, { language: "en" });

describe("the html report", () => {
  it("is a complete document with its styles inside it", () => {
    expect(page.startsWith("<!doctype html>")).toBe(true);
    expect(page).toContain("<style>");
    // One file, opened from disk, possibly on a machine with no network.
    expect(page).not.toMatch(/<link[^>]+href=/);
    expect(page).not.toMatch(/<script[^>]+src=/);
  });

  it("leads with the command rather than the diagnosis", () => {
    const actionIndex = page.indexOf("npm i ");
    const ledgerIndex = page.indexOf('class="ledger"');

    expect(actionIndex).toBeGreaterThan(-1);
    expect(actionIndex).toBeLessThan(ledgerIndex);
  });

  it("says everything without JavaScript", () => {
    const withoutScript = page.replace(/<script[\s\S]*?<\/script>/g, "");

    expect(withoutScript).toContain("npm i ");
    expect(withoutScript).toContain(result.fixNow[0]!.finding.advisoryId);
    // Severity survives too: the meter is markup, and the word is next to it.
    expect(withoutScript).toContain(result.fixNow[0]!.finding.severity);
  });

  it("does not encode severity in colour alone", () => {
    // Rank as filled blocks, the word beside it, and a label for a screen
    // reader. Someone who cannot tell amber from grey loses nothing.
    expect(page).toMatch(/aria-label="Rank \d\/5"/);
    expect(page).toContain('class="sev-word"');
  });

  it("renders the same bytes for the same judgement", () => {
    expect(renderHtml(result, { language: "en" })).toBe(page);
    // No clock unless one is handed in.
    expect(page).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it("includes a stamp only when given one", () => {
    // The CSS rule for it is always there; the element is not.
    expect(page).not.toContain('<p class="stamp">');
    expect(renderHtml(result, { language: "en", stamp: "nightly build" })).toContain(
      "nightly build",
    );
  });

  it("translates without leaving English behind", () => {
    const korean = renderHtml(result, { language: "ko" });

    expect(korean).toContain('<html lang="ko">');
    expect(korean).toContain("이걸 실행하세요");
    // Identifiers stay as the scanners wrote them; only the chrome translates.
    expect(korean).toContain(result.fixNow[0]!.finding.advisoryId);
    expect(korean).not.toContain("Run this");
  });

  it("escapes what other people wrote", () => {
    const hostile = {
      ...findings[0]!,
      packageName: '</code><script>alert(1)</script>',
      title: 'Title with "quotes" & <b>markup</b>',
    } as ScaFinding;

    const rendered = renderHtml(judge([hostile], { baseline: emptyBaseline() }), {
      language: "en",
    });

    // A security tool that renders a scanner's strings raw has a scripting
    // hole in its own report.
    expect(rendered).not.toContain("<script>alert(1)</script>");
    expect(rendered).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(rendered).toContain("&quot;quotes&quot; &amp; &lt;b&gt;markup&lt;/b&gt;");
  });

  it("stays quiet when there is nothing outstanding", () => {
    const accepted = judge(findings, { baseline: baselineFrom(result.fixNow) });
    const rendered = renderHtml(accepted, { language: "en" });

    expect(rendered).toContain("Nothing new to fix.");
    expect(rendered).not.toContain("npm i ");
    // No celebration, no empty table headers.
    expect(rendered).not.toContain('class="ledger"');
  });

  it("does not call an unscanned project clean", () => {
    const nothing = judge([], {
      baseline: emptyBaseline(),
      skipped: ["npm audit skipped: no lockfile"],
    });

    expect(renderHtml(nothing, { language: "en" })).toContain("this is not a pass");
  });

  it("carries the weights so the ranking can be argued with", () => {
    expect(page).toContain("severity: critical");
    expect(page).toContain("direct dependency");
  });
});
