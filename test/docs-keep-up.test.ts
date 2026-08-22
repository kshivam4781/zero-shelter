/**
 * The docs have fallen behind the tool three times in two days: a test count
 * that drifted twice, a pnpm claim that was only true through --input, and two
 * skills that described a JSON shape the tool had stopped producing.
 *
 * Prose cannot be type-checked, but the surface it describes can be. This
 * checks the one thing that keeps going wrong: a command or flag exists and
 * nothing user-facing mentions it.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (path: string): string =>
  readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), "utf8");

const cli = read("src/cli.ts");
const docs = {
  "README.md": read("README.md"),
  "README.ko.md": read("README.ko.md"),
  "skills/setup/SKILL.md": read("skills/setup/SKILL.md"),
  "skills/explain/SKILL.md": read("skills/explain/SKILL.md"),
  "skills/fix/SKILL.md": read("skills/fix/SKILL.md"),
  "skills/ci/SKILL.md": read("skills/ci/SKILL.md"),
  "skills/baseline/SKILL.md": read("skills/baseline/SKILL.md"),
  "AGENTS.md": read("AGENTS.md"),
};

/** Flags a user types. Internal ones are not the reader's problem. */
const FLAGS = [
  "--input",
  "--format",
  "--lang",
  "--stamp",
  "--output",
  "--explain",
  "--top",
  "--record",
  "--update-baseline",
  "--baseline",
  "--cwd",
];

const COMMANDS = ["judge", "hook", "history", "version"];

describe("the docs describe the tool that exists", () => {
  it("documents every flag in the usage text", () => {
    // The usage block is what `--help` prints, so a flag missing from it is
    // invisible to anyone who does not read the source.
    const usage = cli.slice(cli.indexOf("const USAGE"), cli.indexOf("export async function main"));

    for (const flag of FLAGS) {
      expect(usage, `${flag} missing from --help`).toContain(flag);
    }
  });

  it("mentions every command somewhere a user will look", () => {
    for (const command of COMMANDS) {
      const mentioned = Object.entries(docs).filter(([, text]) =>
        text.includes(`zero-shelter ${command}`),
      );

      expect(mentioned.length, `no doc mentions "zero-shelter ${command}"`).toBeGreaterThan(0);
    }
  });

  it("keeps the two READMEs describing the same features", () => {
    // A translation that lags is a bug; this catches the loud half of it,
    // where one language gained a section the other never got.
    for (const feature of ["--format html", "--record", "--lang ko", "zero-shelter hook"]) {
      expect(docs["README.md"], `README.md lost ${feature}`).toContain(feature);
      expect(docs["README.ko.md"], `README.ko.md lost ${feature}`).toContain(feature);
    }
  });

  it("keeps the skills current with the output they read", () => {
    // The skills tell an agent what the JSON contains. When that drifts, the
    // agent describes fields that are no longer there.
    for (const field of ["upgrades", "transitiveFixes", "noLongerReported", "summary.shown"]) {
      expect(docs["skills/explain/SKILL.md"], `explain skill lost ${field}`).toContain(field);
    }
  });

  it("keeps every shipped skill described in both READMEs", () => {
    // A skill nobody is told about is a skill nobody invokes.
    for (const skill of ["setup", "explain", "fix", "baseline", "ci"]) {
      expect(docs["README.md"], `README.md never mentions ${skill}`).toContain(
        `zero-shelter:${skill}`,
      );
      expect(docs["README.ko.md"], `README.ko.md never mentions ${skill}`).toContain(
        `zero-shelter:${skill}`,
      );
    }
  });

  it("tells each skill to verify with this tool rather than npm audit", () => {
    // Left to itself an agent reaches for `npm audit`, which does not know the
    // baseline and will call a project clean while accepted findings stand.
    expect(docs["skills/fix/SKILL.md"]).toContain("not with `npm audit`");
    expect(docs["skills/ci/SKILL.md"]).toContain("Why not just `npm audit`");
  });

  it("keeps the agent brief saying the things agents get wrong", () => {
    // Every line here was written because an agent did the opposite in a real
    // session: rebuilt commands from fixedIn, verified with npm audit, or
    // treated a transitive package as installable.
    for (const rule of ["upgrades", "npm audit", "transitiveFixes", "--update-baseline"]) {
      expect(docs["AGENTS.md"], `AGENTS.md lost ${rule}`).toContain(rule);
    }
  });

  it("does not claim formats the CLI would reject", () => {
    const accepted = ["text", "json", "sarif", "html"];
    const claimed = [...docs["README.md"].matchAll(/--format (\w+)/g)].map((match) => match[1]!);

    for (const format of claimed) {
      expect(accepted, `README offers --format ${format}`).toContain(format);
    }
  });
});
