/**
 * The ratchet.
 *
 * A repository with history lights up on the first run. Demanding all of it be
 * fixed is the same as being ignored, so the first run records what is already
 * there and afterwards only new findings are surfaced.
 */

import { SCHEMA_VERSION } from "./fingerprint.js";
import { stableStringify } from "./normalize.js";
import type { RankedFinding } from "./triage.js";

export const BASELINE_PATH = ".zero-shelter/baseline.json";

export interface Baseline {
  readonly schemaVersion: string;
  /** Sorted fingerprints. Readable on purpose — reviewers should be able to diff it. */
  readonly accepted: readonly string[];
  /**
   * Which scanners produced a report when this was recorded.
   *
   * Without it, a finding that disappears because a scanner stopped running is
   * indistinguishable from one that disappeared because someone fixed it.
   * Optional: baselines written before this existed simply do not know, and are
   * treated as such rather than assumed complete.
   */
  readonly sources?: readonly string[];
}

export interface AppliedBaseline {
  readonly fresh: RankedFinding[];
  readonly suppressed: RankedFinding[];
  /**
   * Accepted fingerprints that nothing reported this time.
   *
   * Deliberately not called "fixed" on its own: a finding also disappears when
   * the scanner that found it did not run. `missingSources` says whether that
   * doubt applies to this particular run.
   */
  readonly noLongerReported: string[];
  /**
   * Scanners that contributed when the baseline was recorded and did not this
   * time — the reason `noLongerReported` might not mean what it looks like.
   * Empty when every recorded source ran again, or when the baseline predates
   * source recording and there is nothing to compare.
   */
  readonly missingSources: string[];
  /**
   * Set when the baseline could not be honoured. The caller must show this:
   * silently ignoring a stale baseline turns every known finding into a new
   * one, which looks like a sudden regression nobody caused.
   */
  readonly warning?: string;
}

export function emptyBaseline(): Baseline {
  return { schemaVersion: SCHEMA_VERSION, accepted: [] };
}

export function parseBaseline(raw: string): Baseline {
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${BASELINE_PATH} is not a JSON object`);
  }

  const record = parsed as Record<string, unknown>;
  const schemaVersion = record["schemaVersion"];
  const accepted = record["accepted"];
  const sources = record["sources"];

  if (typeof schemaVersion !== "string") {
    throw new Error(`${BASELINE_PATH} has no schemaVersion`);
  }
  if (!Array.isArray(accepted) || accepted.some((v) => typeof v !== "string")) {
    throw new Error(`${BASELINE_PATH} accepted must be an array of strings`);
  }

  if (
    sources !== undefined &&
    (!Array.isArray(sources) || sources.some((v) => typeof v !== "string"))
  ) {
    throw new Error(`${BASELINE_PATH} sources must be an array of strings`);
  }

  return {
    schemaVersion,
    accepted: [...(accepted as string[])].sort(),
    ...(sources === undefined ? {} : { sources: [...(sources as string[])].sort() }),
  };
}

export function serializeBaseline(baseline: Baseline): string {
  return `${stableStringify({
    schemaVersion: baseline.schemaVersion,
    accepted: [...baseline.accepted].sort(),
    ...(baseline.sources === undefined ? {} : { sources: [...baseline.sources].sort() }),
  })}\n`;
}

export function baselineFrom(
  findings: readonly RankedFinding[],
  sources?: readonly string[],
): Baseline {
  return {
    schemaVersion: SCHEMA_VERSION,
    accepted: [...new Set(findings.map((f) => f.finding.fingerprint))].sort(),
    ...(sources === undefined ? {} : { sources: [...new Set(sources)].sort() }),
  };
}

/**
 * Split findings into new and already-accepted.
 *
 * A schema version mismatch means every fingerprint was computed by a different
 * recipe, so the recorded ones cannot match anything. Rather than suppress
 * nothing and let the reader assume the ratchet worked, we report the whole set
 * as new **and say why**.
 */
export function applyBaseline(
  findings: readonly RankedFinding[],
  baseline: Baseline,
  sources?: readonly string[],
): AppliedBaseline {
  if (baseline.schemaVersion !== SCHEMA_VERSION) {
    return {
      fresh: [...findings],
      suppressed: [],
      // Every fingerprint was computed by a different recipe, so "missing"
      // here would mean "renamed", not "gone".
      noLongerReported: [],
      missingSources: [],
      warning:
        `${BASELINE_PATH} was written for schema ${baseline.schemaVersion}, ` +
        `but fingerprints are now schema ${SCHEMA_VERSION}. Every finding is ` +
        `reported as new until you re-record it with --update-baseline.`,
    };
  }

  const accepted = new Set(baseline.accepted);
  const fresh: RankedFinding[] = [];
  const suppressed: RankedFinding[] = [];

  const present = new Set<string>();
  for (const finding of findings) {
    present.add(finding.finding.fingerprint);
    (accepted.has(finding.finding.fingerprint) ? suppressed : fresh).push(finding);
  }

  const noLongerReported = [...accepted].filter((f) => !present.has(f)).sort();

  // Only a source that contributed then and not now casts doubt. A scanner
  // that was absent both times explains nothing, and warning about it would
  // teach people to skip the line that matters.
  const ran = new Set(sources ?? []);
  const missingSources =
    baseline.sources === undefined || sources === undefined || noLongerReported.length === 0
      ? []
      : baseline.sources.filter((tool) => !ran.has(tool));

  return { fresh, suppressed, noLongerReported, missingSources };
}
