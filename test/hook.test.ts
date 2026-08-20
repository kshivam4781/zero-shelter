import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { parseNpmAudit } from "../src/ingest/npm-audit.js";
import { judge } from "../src/judge.js";
import { emptyBaseline, baselineFrom } from "../src/baseline.js";
import { cwdFromPayload, hookContext, hookOutput } from "../src/hook.js";

const read = (name: string): string =>
  readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), "utf8");

const findings = parseNpmAudit(read("npm-audit.json"));
const result = judge(findings, { baseline: emptyBaseline() });

describe("agent hook", () => {
  it("names the findings an agent should avoid reintroducing", () => {
    const context = hookContext(result);

    expect(context).toBeDefined();
    expect(context).toContain(`${result.fixNow.length} unaddressed dependency`);
    expect(context).toContain(result.fixNow[0]!.finding.packageName);
    expect(context).toContain(result.fixNow[0]!.finding.advisoryId);
  });

  it("caps the list so the agent's context stays usable", () => {
    // The fixture is smaller than the cap, so double it rather than ship a
    // second fixture for one assertion.
    const many = { ...result, fixNow: [...result.fixNow, ...result.fixNow] };
    const context = hookContext(many) ?? "";

    expect(context.split("\n").filter((line) => line.startsWith("- "))).toHaveLength(5);
    expect(context).toContain(`${many.fixNow.length - 5} more not shown`);
  });

  it("stays quiet when the baseline has accepted everything", () => {
    const accepted = judge(findings, { baseline: baselineFrom(result.fixNow) });

    expect(hookContext(accepted)).toBeUndefined();
  });

  it("emits the additionalContext shape agents read", () => {
    const parsed = JSON.parse(hookOutput("hello"));

    expect(parsed.hookSpecificOutput.hookEventName).toBe("UserPromptSubmit");
    expect(parsed.hookSpecificOutput.additionalContext).toBe("hello");
  });

  it("prefers the session cwd from the payload, and survives a broken one", () => {
    expect(cwdFromPayload(JSON.stringify({ cwd: "/a/project" }), "/fallback")).toBe("/a/project");
    expect(cwdFromPayload("not json at all", "/fallback")).toBe("/fallback");
    expect(cwdFromPayload(JSON.stringify({ cwd: "" }), "/fallback")).toBe("/fallback");
  });
});
