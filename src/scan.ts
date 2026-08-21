/**
 * Collecting scanner output.
 *
 * `npm audit` always runs, because a project with a lockfile already has npm
 * and demanding an install before the first result is how a tool loses its only
 * chance. Everything else is used when it happens to be present and skipped
 * with a note when it is not.
 */

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import type { ScaFinding } from "./finding.js";
import { parseNpmAudit } from "./ingest/npm-audit.js";
import { parseOsv } from "./ingest/osv.js";

const run = promisify(execFile);

export interface Collected {
  readonly findings: ScaFinding[];
  /** Human-readable notes about sources that did not contribute. */
  readonly skipped: string[];
  /**
   * Tools that produced a report we could read.
   *
   * Empty means nothing was scanned — which is not the same as finding
   * nothing, and the caller has to be able to tell those apart.
   */
  readonly contributed: string[];
}

/**
 * Runs a command and resolves to its stdout, or `undefined` when the command
 * does not exist.
 *
 * Injectable so the failure modes — absent tool, non-zero exit, empty output —
 * can be driven in tests without installing scanners or depending on what a CI
 * image happens to have. These paths are the ones most likely to differ between
 * platforms and least likely to be exercised by accident.
 */
export type Capture = (
  command: string,
  args: readonly string[],
  options: ScanOptions,
) => Promise<string | undefined>;

export interface ScanOptions {
  readonly cwd: string;
  readonly timeoutMs?: number;
  readonly capture?: Capture;
}

const DEFAULT_TIMEOUT_MS = 120_000;
// Scanner output on a large monorepo is big; the default 1MB buffer truncates
// it into a JSON parse error that looks like a parser bug.
const MAX_OUTPUT_BYTES = 64 * 1024 * 1024;

export async function collect(options: ScanOptions): Promise<Collected> {
  const findings: ScaFinding[] = [];
  const skipped: string[] = [];
  const contributed: string[] = [];

  // Which audit to run is decided by the lockfile in front of us. `npm audit`
  // needs a package-lock.json and fails with ENOLOCK in a pnpm project, which
  // used to leave a pnpm user with "nothing was scanned" and a tool that claims
  // in its README to read their reports.
  const audit = existsSync(join(options.cwd, "pnpm-lock.yaml"))
    ? await runPnpmAudit(options)
    : await runNpmAudit(options);
  if (audit.ok) {
    // A scanner that produced output we cannot read is worth saying out loud.
    // Swallowing it would silently drop a whole source and still look like a
    // clean run.
    try {
      findings.push(...parseNpmAudit(audit.stdout));
      contributed.push(audit.tool ?? "npm audit");
    } catch (error) {
      skipped.push(`${audit.tool ?? "npm audit"} output unreadable: ${(error as Error).message}`);
    }
  } else {
    skipped.push(`${audit.tool ?? "npm audit"} skipped: ${audit.reason}`);
  }

  // yarn v1 writes NDJSON, which nothing here reads. Saying so beats letting
  // the run end in "nothing was scanned" with no hint about why.
  if (
    contributed.length === 0 &&
    existsSync(join(options.cwd, "yarn.lock")) &&
    !existsSync(join(options.cwd, "package-lock.json"))
  ) {
    skipped.push(
      "yarn.lock found: yarn's audit output is not read yet. " +
        "Run `yarn npm audit --json > audit.json` (yarn 2+) and pass it with --input, " +
        "or generate a package-lock.json with `npm i --package-lock-only`",
    );
  }

  const osv = await runOsvScanner(options);
  if (osv.ok) {
    try {
      findings.push(...parseOsv(osv.stdout, osv.version));
      contributed.push("osv-scanner");
    } catch (error) {
      skipped.push(`osv-scanner output unreadable: ${(error as Error).message}`);
    }
  } else {
    skipped.push(`osv-scanner skipped: ${osv.reason}`);
  }

  return { findings, skipped, contributed };
}

type Attempt =
  | { ok: true; stdout: string; version?: string; tool?: string }
  | { ok: false; reason: string; tool?: string };

/**
 * `npm audit` exits non-zero whenever it finds anything, which is the normal
 * case. Only a missing or unreadable report is a failure.
 */
async function runNpmAudit(options: ScanOptions): Promise<Attempt> {
  const run = options.capture ?? capture;
  const stdout = await run("npm", ["audit", "--json"], options);
  if (stdout === undefined) return { ok: false, reason: "npm is not available" };
  if (stdout.trim() === "") return { ok: false, reason: "npm produced no report" };

  // npm reports its own failures as JSON with an `error` envelope — no
  // lockfile, a private registry it cannot reach, a workspace it cannot
  // resolve. Passing that to the parser turns npm's clear explanation into
  // "output has neither vulnerabilities nor advisories", which sends people
  // looking for a bug in us.
  const explained = npmError(stdout);
  if (explained !== undefined) return { ok: false, reason: explained };

  return { ok: true, stdout };
}

function npmError(stdout: string): string | undefined {
  let report: unknown;
  try {
    report = JSON.parse(stdout);
  } catch {
    return undefined;
  }

  if (typeof report !== "object" || report === null || !("error" in report)) return undefined;

  const { error } = report as { error?: unknown };
  if (typeof error !== "object" || error === null) return undefined;

  const { summary, detail, code } = error as Record<string, unknown>;
  const said = [summary, detail]
    .filter((part): part is string => typeof part === "string" && part.trim() !== "")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (said !== "") return said;
  return typeof code === "string" ? `npm reported ${code}` : "npm reported an error";
}

/**
 * pnpm reports in the older `advisories` shape, which the npm parser already
 * reads — so this is a different process to spawn, not a different format to
 * support.
 */
async function runPnpmAudit(options: ScanOptions): Promise<Attempt> {
  const run = options.capture ?? capture;
  const stdout = await run("pnpm", ["audit", "--json"], options);

  if (stdout === undefined) {
    return {
      ok: false,
      tool: "pnpm audit",
      reason: "pnpm-lock.yaml is here but pnpm is not on PATH",
    };
  }
  if (stdout.trim() === "") {
    return { ok: false, tool: "pnpm audit", reason: "pnpm produced no report" };
  }

  const explained = npmError(stdout);
  if (explained !== undefined) return { ok: false, tool: "pnpm audit", reason: explained };

  return { ok: true, stdout, tool: "pnpm audit" };
}

async function runOsvScanner(options: ScanOptions): Promise<Attempt> {
  const run = options.capture ?? capture;
  const stdout = await run(
    "osv-scanner",
    ["--format", "json", "--recursive", options.cwd],
    options,
  );

  if (stdout === undefined) {
    // Cross-source reconciliation is where most of the noise reduction comes
    // from, so "optional" undersells it — but telling someone to go install
    // something without saying how is how a suggestion becomes a chore.
    return {
      ok: false,
      reason:
        "not on PATH — a second source is where most of the deduplication comes " +
        "from. brew install osv-scanner, or " +
        "https://github.com/google/osv-scanner/releases",
    };
  }
  if (stdout.trim() === "") return { ok: false, reason: "produced no report" };

  const version = await run("osv-scanner", ["--version"], options);
  const parsed = version?.match(/\d+\.\d+\.\d+/)?.[0];

  return parsed === undefined
    ? { ok: true, stdout }
    : { ok: true, stdout, version: parsed };
}

/**
 * Run a command and return stdout, or undefined when the tool is absent.
 *
 * A non-zero exit is not treated as absence: scanners report findings that way.
 * Only ENOENT — and on Windows a shell that cannot resolve the name — means the
 * tool is not installed.
 */
export async function capture(
  command: string,
  args: readonly string[],
  options: ScanOptions,
): Promise<string | undefined> {
  try {
    const { stdout } = await run(command, [...args], {
      cwd: options.cwd,
      timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      maxBuffer: MAX_OUTPUT_BYTES,
      // npm and osv-scanner ship as .cmd shims on Windows, which execFile
      // cannot invoke without a shell.
      shell: process.platform === "win32",
    });
    return stdout;
  } catch (error) {
    const failure = error as NodeJS.ErrnoException & { stdout?: string };

    if (failure.code === "ENOENT") return undefined;
    // A shell reports a missing command through the exit code instead.
    if (process.platform === "win32" && failure.stdout === undefined) return undefined;

    // Findings were reported and the process exited non-zero. That is success.
    return failure.stdout ?? undefined;
  }
}
