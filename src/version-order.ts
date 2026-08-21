/**
 * Ordering published version strings.
 *
 * Shared because two places need the same answer and a second implementation
 * is a second chance to get it backwards: string order puts 4.17.21 above
 * 4.18.1, which points people at an older release than the one they need.
 *
 * ponytail: not a semver implementation. It compares release numbers and
 * treats a prerelease as below the release it precedes, which is the whole
 * question when picking the highest published fix. Reach for a real semver
 * parser if ranges ever need solving here.
 */

export function isHigher(candidate: string, current: string): boolean {
  const a = segments(candidate);
  const b = segments(current);

  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const left = a[i] ?? 0;
    const right = b[i] ?? 0;
    if (left !== right) return left > right;
  }

  // Same release numbers: 2.0.0 outranks 2.0.0-rc.1.
  return isPrerelease(current) && !isPrerelease(candidate);
}

/** The highest of the given versions, or undefined when there are none. */
export function highest(versions: Iterable<string>): string | undefined {
  let best: string | undefined;
  for (const version of versions) {
    if (best === undefined || isHigher(version, best)) best = version;
  }
  return best;
}

function segments(version: string): number[] {
  return (version.split(/[-+]/)[0] ?? "")
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => Number.isInteger(part));
}

function isPrerelease(version: string): boolean {
  return /-/.test(version);
}
