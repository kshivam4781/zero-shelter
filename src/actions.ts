/**
 * From a list of findings to the commands that clear them.
 *
 * Seven findings on one package are one upgrade, not seven tasks. A report that
 * only sorts by severity hides that, and the reader has to reconstruct it —
 * which is exactly the attention this tool exists to give back.
 */

import type { RankedFinding } from "./triage.js";
import { isHigher } from "./version-order.js";

export interface TransitiveFix {
  readonly packageName: string;
  readonly upgradeTo: string;
  readonly clears: number;
}

export interface UpgradeAction {
  readonly packageName: string;
  /** The highest fixed version among the findings this clears. */
  readonly upgradeTo: string;
  /** How many of the reported findings this one upgrade removes. */
  readonly clears: number;
  readonly command: string;
}

/**
 * Only direct dependencies with a published fix.
 *
 * A transitive package cannot be upgraded by installing it — that just adds a
 * top-level dependency the project did not ask for, and the vulnerable copy
 * stays where it was. Printing `npm i` for one would be advice that quietly
 * does not work.
 */
export function upgradeActions(findings: readonly RankedFinding[]): UpgradeAction[] {
  const byPackage = new Map<string, { version: string; clears: number }>();

  for (const { finding } of findings) {
    if (finding.transitive || finding.fixedIn === undefined) continue;

    const seen = byPackage.get(finding.packageName);
    if (seen === undefined) {
      byPackage.set(finding.packageName, { version: finding.fixedIn, clears: 1 });
      continue;
    }

    seen.clears += 1;
    if (isHigher(finding.fixedIn, seen.version)) seen.version = finding.fixedIn;
  }

  return [...byPackage.entries()]
    .map(([packageName, { version, clears }]) => ({
      packageName,
      upgradeTo: version,
      clears,
      command: `npm i ${packageName}@${version}`,
    }))
    .sort((a, b) => b.clears - a.clears || (a.packageName < b.packageName ? -1 : 1));
}

/**
 * Findings with a published fix that arrive through someone else's dependency.
 *
 * On real projects this is most of them — juice-shop has 36 fixable findings
 * and only one is a direct dependency. Saying nothing about the other 35 leaves
 * the report technically correct and practically useless, so we name the number
 * and the mechanism (`overrides`) without pretending it is free: forcing a
 * version under a parent that pinned it is exactly the kind of thing that
 * breaks a build.
 */
export function transitiveFixes(findings: readonly RankedFinding[]): TransitiveFix[] {
  const byPackage = new Map<string, { version: string; clears: number }>();

  for (const { finding } of findings) {
    if (!finding.transitive || finding.fixedIn === undefined) continue;

    const seen = byPackage.get(finding.packageName);
    if (seen === undefined) {
      byPackage.set(finding.packageName, { version: finding.fixedIn, clears: 1 });
      continue;
    }

    seen.clears += 1;
    if (isHigher(finding.fixedIn, seen.version)) seen.version = finding.fixedIn;
  }

  return [...byPackage.entries()]
    .map(([packageName, { version, clears }]) => ({
      packageName,
      upgradeTo: version,
      clears,
    }))
    .sort((a, b) => b.clears - a.clears || (a.packageName < b.packageName ? -1 : 1));
}
