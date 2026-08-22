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

  it("does not claim formats the CLI would reject", () => {
    const accepted = ["text", "json", "sarif", "html"];
    const claimed = [...docs["README.md"].matchAll(/--format (\w+)/g)].map((match) => match[1]!);

    for (const format of claimed) {
      expect(accepted, `README offers --format ${format}`).toContain(format);
    }
  });
});
