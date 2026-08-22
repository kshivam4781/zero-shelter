import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";

import {
  BASELINE_PATH,
  baselineFrom,
  emptyBaseline,
  parseBaseline,
  serializeBaseline,
} from "./baseline.js";
import { judge } from "./judge.js";
import { parseNpmAudit } from "./ingest/npm-audit.js";
import { parseOsv } from "./ingest/osv.js";
import { collect, isWorkspaceRoot } from "./scan.js";
import { cwdFromPayload, hookContext, hookOutput, readStdin } from "./hook.js";
import { colorEnabled, renderExplain, renderHuman, renderJson } from "./report.js";
import { renderHtml } from "./html.js";
import { isLanguage } from "./messages.js";
import { renderSarif } from "./sarif.js";
import type { ScaFinding } from "./finding.js";
import { versionOutput } from "./version.js";

const USAGE = `zero-shelter judge — decide which dependency findings to fix now

  npx zero-shelter judge [options]

  --input <file>        read scanner output instead of running scanners.
                        Repeatable. Format is detected from the contents.
  --format <fmt>        text (default) | json | sarif | html
  --lang <code>         language for the html report: en (default) | ko
  --stamp <text>        a line of your choosing in the html footer. Left out
                        by default so the same judgement renders identically
  --json                shorthand for --format json
  --output <file>       write to a file instead of stdout
  --explain             show how each score was reached
  --top <n>             report at most n findings
  --update-baseline     record the current findings as accepted and exit 0
  --baseline <file>     baseline location (default ${BASELINE_PATH})
  --cwd <dir>           project directory (default .)
  --version             print the installed package version
  --help

Exit code is 1 when there is anything new to fix, so CI fails on regressions
rather than on the backlog it inherited.

  npx zero-shelter hook

  Prints the current findings as agent context, for editors that support a
  prompt hook. Never blocks a prompt and never fails: on any error it stays
  quiet and exits 0. See docs/AGENT-HOOK.md.
`;

export async function main(argv: readonly string[]): Promise<number> {
  let parsed;
  try {
    parsed = parseArgs({
      args: [...argv],
      allowPositionals: true,
      options: {
        input: { type: "string", multiple: true },
        format: { type: "string" },
        lang: { type: "string" },
        stamp: { type: "string" },
        output: { type: "string" },
        json: { type: "boolean" },
        explain: { type: "boolean" },
        top: { type: "string" },
        "update-baseline": { type: "boolean" },
        baseline: { type: "string" },
        cwd: { type: "string" },
        version: { type: "boolean" },
        help: { type: "boolean", short: "h" },
      },
    });
  } catch (error) {
    process.stderr.write(`${(error as Error).message}\n\n${USAGE}`);
    return 2;
  }

  const { values, positionals } = parsed;

  if (values.help === true || positionals[0] === "help") {
    process.stdout.write(USAGE);
    return 0;
  }

  if (values.version === true || positionals[0] === "version") {
    process.stdout.write(versionOutput());
    return 0;
  }

  const command = positionals[0] ?? "judge";
  if (command === "hook") return await hook(values.cwd, values.baseline);
  if (command !== "judge") {
    process.stderr.write(`unknown command: ${command}\n\n${USAGE}`);
    return 2;
  }

  const top = parseTop(values.top);
  if (top instanceof Error) {
    process.stderr.write(`${top.message}\n`);
    return 2;
  }

  const format = values.format ?? (values.json === true ? "json" : "text");
  if (format !== "text" && format !== "json" && format !== "sarif" && format !== "html") {
    process.stderr.write(`--format expects text, json, sarif or html, got ${format}\n`);
    return 2;
  }

  const language = values.lang ?? "en";
  if (!isLanguage(language)) {
    process.stderr.write(`--lang expects en or ko, got ${language}\n`);
    return 2;
  }

  const cwd = resolve(values.cwd ?? ".");
  const baselinePath = resolve(cwd, values.baseline ?? BASELINE_PATH);

  let findings: ScaFinding[];
  let skipped: string[];
  let sources: string[] | undefined;

  try {
    if (values.input !== undefined && values.input.length > 0) {
      findings = [];
      skipped = [];
      for (const file of values.input) {
        findings.push(...(await readInput(resolve(cwd, file))));
      }
      // With --input the files are the sources, and which tool wrote each one
      // is only knowable from what it contains.
      sources = [
        ...new Set(findings.flatMap((finding) => finding.sources.map((s) => s.tool))),
      ].sort();
    } else {
      const collected = await collect({ cwd });
      findings = collected.findings;
      skipped = collected.skipped;
      sources = collected.contributed;

      // Nothing was scanned. Reporting "nothing new to fix" here would be a
      // lie with a zero exit code attached, and in CI it turns a project the
      // tool never looked at green — worse than crashing, because nobody
      // investigates a passing build.
      if (collected.contributed.length === 0) {
        process.stderr.write(
          `cannot judge ${cwd}: no scanner produced a report\n` +
            collected.skipped.map((note) => `  ${note}\n`).join("") +
            "nothing was scanned, so this is not a pass\n",
        );
        return 2;
      }
    }
  } catch (error) {
    process.stderr.write(`${(error as Error).message}\n`);
    return 2;
  }

  let baseline;
  let baselineExists = true;
  try {
    const loaded = await loadBaseline(baselinePath);
    baseline = loaded.baseline;
    baselineExists = loaded.exists;
  } catch (error) {
    process.stderr.write(`${(error as Error).message}\n`);
    return 2;
  }

  const result = judge(findings, {
    baseline,
    baselineExists,
    skipped,
    workspaceRoot: isWorkspaceRoot(cwd),
    ...(sources === undefined ? {} : { sources }),
    ...(top === undefined ? {} : { top }),
  });

  if (values["update-baseline"] === true) {
    // Same treatment as --output: a failed write here is a permissions or path
    // problem, and a stack trace is a worse way to learn that.
    // Record everything currently present, not just what survived the ratchet,
    // so re-running immediately afterwards reports nothing new.
    const all = judge(findings, { baseline: emptyBaseline() });
    try {
      await mkdir(dirname(baselinePath), { recursive: true });
      await writeFile(
        baselinePath,
        serializeBaseline(baselineFrom(all.fixNow, sources)),
        "utf8",
      );
    } catch (error) {
      process.stderr.write(`cannot write ${baselinePath}: ${reasonFor(error)}\n`);
      return 2;
    }
    process.stdout.write(
      `recorded ${all.fixNow.length} finding(s) as accepted in ${values.baseline ?? BASELINE_PATH}\n`,
    );
    return 0;
  }

  let rendered: string;
  if (format === "json") {
    rendered = renderJson(result);
  } else if (format === "sarif") {
    rendered = renderSarif(result);
  } else if (format === "html") {
    rendered = renderHtml(result, {
      language,
      ...(values.stamp === undefined ? {} : { stamp: values.stamp }),
      command: `zero-shelter ${argv.join(" ")}`,
    });
  } else {
    // Colour is decided by where this is going. Writing to a file always means
    // no escape codes, whatever the terminal says.
    const color =
      values.output === undefined &&
      colorEnabled(process.env, process.stdout.isTTY === true);
    rendered =
      `${renderHuman(result, color)}\n` +
      (values.explain === true ? `\n${renderExplain(result)}\n` : "");
  }

  if (values.output === undefined) {
    process.stdout.write(rendered);
  } else {
    const target = resolve(cwd, values.output);
    try {
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, rendered, "utf8");
    } catch (error) {
      process.stderr.write(`cannot write ${target}: ${reasonFor(error)}\n`);
      return 2;
    }
  }

  return result.fixNow.length > 0 ? 1 : 0;
}

/**
 * The part of a filesystem error worth showing.
 *
 * Node's message repeats the syscall and the path we already printed; the code
 * is the part that says what to do about it.
 */
function reasonFor(error: unknown): string {
  const code = (error as NodeJS.ErrnoException).code;
  switch (code) {
    case "EACCES":
    case "EPERM":
      return "permission denied";
    case "ENOENT":
      return "a directory in that path does not exist";
    case "ENOSPC":
      return "no space left on device";
    case "EROFS":
      return "read-only filesystem";
    default:
      return code ?? (error as Error).message;
  }
}

function parseTop(raw: string | undefined): number | undefined | Error {
  if (raw === undefined) return undefined;

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    return new Error(`--top expects a positive integer, got ${raw}`);
  }
  return value;
}

/**
 * Detect the format from the contents rather than the filename.
 *
 * People name these files anything, and guessing from `.json` tells us nothing.
 * Both shapes have an unambiguous top-level key.
 */
async function readInput(path: string): Promise<ScaFinding[]> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    throw new Error(`cannot read ${path}`);
  }

  let probe: unknown;
  try {
    probe = JSON.parse(raw);
  } catch {
    throw new Error(`${path} is not valid JSON`);
  }

  if (typeof probe !== "object" || probe === null) {
    throw new Error(`${path} is not a scanner report`);
  }

  const record = probe as Record<string, unknown>;
  if ("vulnerabilities" in record || "advisories" in record) return parseNpmAudit(raw);
  if ("results" in record) return parseOsv(raw);

  // People reach for the file this tool just wrote. Saying "unrecognised" to
  // our own output format is a needlessly puzzling answer to a reasonable move.
  if ("runs" in record && typeof record["version"] === "string") {
    throw new Error(
      `${path} is SARIF, which is what this tool writes rather than reads. ` +
        "Pass the scanner report instead (npm audit --json, osv-scanner --format json).",
    );
  }

  throw new Error(
    `${path}: unrecognised report. Expected npm audit (vulnerabilities) or osv-scanner (results).`,
  );
}

/**
 * `zero-shelter hook` — hand the current judgement to a coding agent.
 *
 * Wrapped in a catch-everything because this runs inside someone's editor
 * session: see the note in hook.ts. Exit code is always 0.
 */
async function hook(
  cwdFlag: string | undefined,
  baselineFlag: string | undefined,
): Promise<number> {
  try {
    const cwd = resolve(
      cwdFlag ?? cwdFromPayload(await readStdin(process.stdin), process.cwd()),
    );
    const { findings, skipped } = await collect({ cwd });
    // A project that keeps its baseline somewhere else was being handed its
    // whole backlog as if none of it had been accepted, every prompt.
    const { baseline, exists } = await loadBaseline(
      resolve(cwd, baselineFlag ?? BASELINE_PATH),
    );
    const context = hookContext(
      judge(findings, { baseline, baselineExists: exists, skipped }),
    );
    if (context !== undefined) process.stdout.write(hookOutput(context));
  } catch {
    // Deliberately silent — see hook.ts.
  }
  return 0;
}

async function loadBaseline(path: string) {
  try {
    return { baseline: parseBaseline(await readFile(path, "utf8")), exists: true };
  } catch (error) {
    // JSON.parse says "Unexpected end of JSON input" and nothing about where.
    // The reader is left guessing which file the tool even means — and an
    // empty or truncated baseline is a normal outcome of an interrupted write.
    if (error instanceof SyntaxError) {
      throw new Error(`${path} is not valid JSON: ${error.message}`);
    }
    // A missing baseline is the normal first run, not a failure. A malformed
    // one is a failure: silently treating it as empty would report the whole
    // backlog as new and look like a regression nobody caused.
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { baseline: emptyBaseline(), exists: false };
    }
    throw error;
  }
}
