import { describe, expect, it } from "vitest";

import { transitiveFixes, upgradeActions } from "../src/actions.js";
import type { RankedFinding } from "../src/triage.js";

const finding = (
  packageName: string,
  fixedIn: string | undefined,
  transitive = false,
): RankedFinding =>
  ({
    finding: { packageName, fixedIn, transitive },
    score: 100,
    reasons: [],
  }) as unknown as RankedFinding;

describe("upgrade actions", () => {
  it("turns several findings on one package into one command", () => {
    const actions = upgradeActions([
      finding("lodash", "4.17.21"),
      finding("lodash", "4.18.1"),
      finding("lodash", "4.17.12"),
    ]);

    expect(actions).toHaveLength(1);
    // The highest fix wins, and 4.18.1 > 4.17.21 only if the segments are
    // compared as numbers. String order gets this backwards.
    expect(actions[0]).toMatchObject({ command: "npm i lodash@4.18.1", clears: 3 });
  });

  it("leaves out findings with no published fix", () => {
    expect(upgradeActions([finding("jsonwebtoken", undefined)])).toEqual([]);
  });

  it("never suggests installing a transitive package", () => {
    // `npm i` on one of these adds a top-level dependency nobody asked for and
    // leaves the vulnerable copy where it was.
    expect(upgradeActions([finding("tar", "7.5.19", true)])).toEqual([]);
  });

  it("orders by how much each command clears", () => {
    const actions = upgradeActions([
      finding("a", "1.0.0"),
      finding("b", "2.0.0"),
      finding("b", "2.1.0"),
    ]);

    expect(actions.map((entry) => entry.packageName)).toEqual(["b", "a"]);
  });

  it("counts the fixable ones that arrive through another dependency", () => {
    const indirect = transitiveFixes([
      finding("tar", "7.5.19", true),
      finding("tar", "7.5.21", true),
      finding("minimist", "1.2.8", true),
      finding("lodash", "4.18.1"),
      finding("decompress", undefined, true),
    ]);

    expect(indirect).toEqual([
      { packageName: "tar", upgradeTo: "7.5.21", clears: 2 },
      { packageName: "minimist", upgradeTo: "1.2.8", clears: 1 },
    ]);
  });

  it("handles versions with prerelease tags without crashing", () => {
    const actions = upgradeActions([
      finding("pkg", "2.0.0-rc.1"),
      finding("pkg", "2.0.0"),
    ]);

    expect(actions[0]!.upgradeTo).toBe("2.0.0");
  });
});
