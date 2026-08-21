---
description: Read zero-shelter's output and explain what to fix first and why. Use when someone asks what a zero-shelter run means, why a finding is ranked where it is, which vulnerability to fix first, or what to do about the ones left over.
---

# Reading a run

```bash
npx --yes zero-shelter judge --json
```

Shape:

```json
{
  "summary": { "raw": 7, "merged": 7, "fixNow": 7, "accepted": 0 },
  "skipped": ["osv-scanner skipped: not on PATH (optional …)"],
  "fixNow": [
    {
      "fingerprint": "fff5bce689ef200b",
      "score": 145,
      "severity": "critical",
      "package": "lodash",
      "advisory": "GHSA-JF85-CPCP-J695",
      "title": "Prototype Pollution in lodash",
      "vulnerableRange": "<4.17.12",
      "fixedIn": "4.18.1",
      "direct": true,
      "tools": ["npm-audit"],
      "possibleDuplicates": []
    }
  ]
}
```

| Field | What it actually tells you |
|---|---|
| `summary.raw → merged` | How many reports collapsed into one finding. A big drop means the scanners were describing the same vulnerabilities under different names |
| `summary.accepted` | Recorded in the baseline, deliberately not shown |
| `score` | Why this is above that. Not a CVSS score, not a risk rating — our ranking, explainable with `--explain` |
| `fixedIn` | Present means there is a version to move to. Absent means awareness only, and it ranks lower for that reason |
| `direct` | A direct dependency is something this project can act on today |
| `tools` | Two entries means two scanners independently reported it |
| `possibleDuplicates` | Suspected same-as, **not merged**. Deliberate: hiding a real vulnerability is worse than showing a duplicate |

## How to present it

Lead with the top few and what to do about them — a package and a version to
move to is an action; a paragraph about prototype pollution is not.

```
lodash 4.17.11 → 4.18.1 fixes 4 of the 7, including both criticals.
The remaining 3 have no published fix; they are listed so you know they exist.
```

Group by package: one upgrade usually clears several findings, and a list
sorted by severity hides that.

When asked why something is ranked where it is, run:

```bash
npx --yes zero-shelter judge --explain
```

It prints every point awarded and the weights table it came from. Quote that
rather than reasoning about severity yourself — the numbers are reproducible
and your reconstruction is not.

## Boundaries that make this useful

- **Do not re-order, filter, or add findings.** If the ranking looks wrong, say
  which finding and why so the weights can be argued with. Silently fixing it in
  the presentation layer breaks the one property this tool sells: the same input
  produces the same, checkable answer.
- **Do not turn `possibleDuplicates` into merges.** Report them as unresolved.
- **Do not estimate exploitability.** Nothing here knows whether the vulnerable
  path is reachable in this project. Say that when asked.
- **Never call a run clean when it exited 2** — that means nothing was scanned.
  `summary` may look empty and it is not evidence of anything.
- Numbers come from the JSON. If you did not run it, do not describe a run.
