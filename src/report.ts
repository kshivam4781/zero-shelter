/**
 * Rendering. Three views of one dataset — never three datasets.
 */

import type { AppliedBaseline } from "./baseline.js";
import { transitiveFixes, upgradeActions } from "./actions.js";
import type { RankedFinding } from "./triage.js";
import { WEIGHTS } from "./triage.js";

export interface JudgeResult {
  readonly raw: number;
  readonly merged: number;
  readonly applied: AppliedBaseline;
  readonly fixNow: readonly RankedFinding[];
  readonly skipped: readonly string[];
  /** False on a first run, which changes what advice is worth giving. */
  readonly baselineExists: boolean;
}

const COLOR = {
  reset: "[0m",
  dim: "[2m",
  bold: "[1m",
  red: "[31m",
  yellow: "[33m",
  green: "[32m",
} as const;

/**
 * Colour is opt-out via NO_COLOR and off when not writing to a terminal, so
 * piping into a file or a CI log never produces escape soup.
 */
export function colorEnabled(env: NodeJS.ProcessEnv, isTTY: boolean): boolean {
  if (env["NO_COLOR"] !== undefined && env["NO_COLOR"] !== "") return false;
  if (env["FORCE_COLOR"] !== undefined && env["FORCE_COLOR"] !== "") return true;
  return isTTY;
}

export function renderHuman(result: JudgeResult, color: boolean): string {
  const paint = (text: string, code: string): string =>
    color ? `${code}${text}${COLOR.reset}` : text;

  const lines: string[] = [];

  for (const note of result.skipped) {
    lines.push(paint(`  ${note}`, COLOR.dim));
  }
  if (result.skipped.length > 0) lines.push("");

  if (result.applied.warning !== undefined) {
    lines.push(paint(`⚠ ${result.applied.warning}`, COLOR.yellow), "");
  }

  const { fixNow } = result;

  if (fixNow.length === 0) {
    lines.push(paint("✓ nothing new to fix", COLOR.green));
    lines.push(summary(result, paint));
    lines.push(...resolvedLines(result, paint));
    return lines.join("\n");
  }

  lines.push(paint(`fix these ${fixNow.length} now`, COLOR.bold), "");

  const rows = fixNow.map((entry) => ({
    severity: entry.finding.severity,
    name: `${entry.finding.packageName}`,
    advisory: entry.finding.advisoryId,
    fix: entry.finding.fixedIn ?? "—",
    score: String(entry.score),
  }));

  const width = (key: keyof (typeof rows)[number]): number =>
    Math.max(...rows.map((row) => row[key].length));

  for (const row of rows) {
    const severityColor =
      row.severity === "critical" || row.severity === "high"
        ? COLOR.red
        : row.severity === "moderate"
          ? COLOR.yellow
          : COLOR.dim;

    lines.push(
      [
        "  " + paint(row.severity.padEnd(width("severity")), severityColor),
        row.name.padEnd(width("name")),
        paint(row.advisory.padEnd(width("advisory")), COLOR.dim),
        `→ ${row.fix.padEnd(width("fix"))}`,
        paint(row.score.padStart(width("score")), COLOR.dim),
      ].join("  "),
    );
  }

  const actions = upgradeActions(fixNow);
  if (actions.length > 0) {
    lines.push("");
    for (const action of actions.slice(0, 3)) {
      lines.push(
        `  ${paint(action.command, COLOR.bold)}` +
          paint(
            action.clears === 1 ? "" : `   clears ${action.clears}`,
            COLOR.dim,
          ),
      );
    }
    if (actions.length > 3) {
      lines.push(paint(`  …and ${actions.length - 3} more package(s)`, COLOR.dim));
    }
  }

  const indirect = transitiveFixes(fixNow);
  if (indirect.length > 0) {
    const total = indirect.reduce((sum, entry) => sum + entry.clears, 0);
    if (actions.length === 0) lines.push("");
    lines.push(
      paint(
        `  ${total} finding(s) in ${indirect.length} package(s) have a published fix but ` +
          "arrive through another dependency",
        COLOR.dim,
      ),
      paint(
        `    package.json "overrides": { "${indirect[0]!.packageName}": "${indirect[0]!.upgradeTo}" }` +
          " forces one, at the risk of breaking whatever pinned it",
        COLOR.dim,
      ),
    );
  }

  lines.push("", summary(result, paint));

  lines.push(...resolvedLines(result, paint));

  // A first run on an existing project reports its whole backlog and reduces
  // nothing, which reads like the tool failing. Say what it is actually for.
  if (!result.baselineExists) {
    lines.push(
      paint(
        "  first run — record these as accepted with --update-baseline, " +
          "then only new findings are reported",
        COLOR.dim,
      ),
    );
  }

  const unjoined = fixNow.filter((entry) => entry.finding.relatedTo.length > 0);
  if (unjoined.length > 0) {
    lines.push(
      paint(
        `  ${unjoined.length} finding(s) may duplicate another for the same package; ` +
          `they share no advisory id, so they are listed separately. --explain shows which.`,
        COLOR.dim,
      ),
    );
  }

  return lines.join("\n");
}

/**
 * Credit for work that was actually done, and the caveat that comes with it.
 *
 * Someone who upgrades a package and re-runs this deserves to see that it
 * worked; without it the only feedback is a number quietly getting smaller.
 * But a finding also disappears when the scanner that found it did not run this
 * time, and from here those look identical — so this says what it can defend
 * ("no longer reported") and names the doubt when there is one.
 */
function resolvedLines(
  result: JudgeResult,
  paint: (text: string, code: string) => string,
): string[] {
  const gone = result.applied.noLongerReported.length;
  if (gone === 0) return [];

  const lines = [
    paint(
      `  ✓ ${gone} accepted finding(s) no longer reported — ` +
        "re-record with --update-baseline to drop them",
      COLOR.green,
    ),
  ];

  const { missingSources } = result.applied;
  if (missingSources.length > 0) {
    lines.push(
      paint(
        `    (${missingSources.join(", ")} contributed when the baseline was ` +
          "recorded and did not run this time, so some of those may simply not " +
          "have been looked for)",
        COLOR.dim,
      ),
    );
  }

  return lines;
}

function summary(
  result: JudgeResult,
  paint: (text: string, code: string) => string,
): string {
  const { raw, merged, applied, fixNow } = result;
  const removed = raw - fixNow.length;
  // Integer percentage: a float here would print differently across locales.
  const percent = raw === 0 ? 0 : Math.round((removed * 100) / raw);

  return paint(
    `  ${raw} reported → ${merged} after merge → ${fixNow.length} to fix` +
      (raw === 0 ? "" : `  (${percent}% less noise)`) +
      (applied.suppressed.length > 0
        ? `, ${applied.suppressed.length} already accepted`
        : ""),
    COLOR.dim,
  );
}

export function renderExplain(result: JudgeResult): string {
  const lines: string[] = [];

  for (const entry of result.fixNow) {
    const { finding } = entry;
    lines.push(`${finding.packageName}  ${finding.advisoryId}  score ${entry.score}`);
    lines.push(`  ${finding.title}`);

    for (const reason of entry.reasons) {
      lines.push(`  ${String(reason.points).padStart(5)}  ${reason.label}`);
    }

    lines.push(`  ${"".padStart(5)}  range ${finding.vulnerableRange}`);

    if (finding.aliases.length > 1) {
      lines.push(`  ${"".padStart(5)}  also known as ${finding.aliases.join(", ")}`);
    }

    if (finding.members.length > 1) {
      lines.push(
        `  ${"".padStart(5)}  merged ${finding.members.length} reports on a shared advisory id`,
      );
    }

    if (finding.relatedTo.length > 0) {
      lines.push(
        `  ${"".padStart(5)}  not merged with ${finding.relatedTo.join(", ")} ` +
          `— same package, no shared advisory id`,
      );
    }

    lines.push("");
  }

  lines.push(`weights: ${JSON.stringify(WEIGHTS)}`);
  return lines.join("\n");
}

/**
 * The machine-readable view, deliberately trimmed.
 *
 * An agent reading this pays for every token, so member findings and full alias
 * chains stay out. `--explain` is where the full picture lives.
 */
export function renderJson(result: JudgeResult): string {
  return `${JSON.stringify(
    {
      summary: {
        raw: result.raw,
        merged: result.merged,
        fixNow: result.fixNow.length,
        accepted: result.applied.suppressed.length,
        noLongerReported: result.applied.noLongerReported.length,
      },
      noLongerReported: result.applied.noLongerReported,
      warning: result.applied.warning,
      skipped: result.skipped,
      // The commands, so a caller does not have to re-derive them from the
      // findings and get the version comparison subtly wrong.
      upgrades: upgradeActions(result.fixNow),
      transitiveFixes: transitiveFixes(result.fixNow),
      fixNow: result.fixNow.map((entry) => ({
        fingerprint: entry.finding.fingerprint,
        score: entry.score,
        severity: entry.finding.severity,
        ecosystem: entry.finding.ecosystem,
        package: entry.finding.packageName,
        advisory: entry.finding.advisoryId,
        title: entry.finding.title,
        vulnerableRange: entry.finding.vulnerableRange,
        fixedIn: entry.finding.fixedIn,
        direct: !entry.finding.transitive,
        tools: entry.finding.tools,
        possibleDuplicates: entry.finding.relatedTo,
      })),
    },
    null,
    2,
  )}\n`;
}
