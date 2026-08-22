# Notes for coding agents

Read this if you are an agent working in a repository that uses zero-shelter,
or in this one. The plugin ships skills that say the same things in more
detail; this file is for when it is not installed.

## Running it

```bash
npx --yes zero-shelter judge --json
```

Exit codes are the answer, not decoration:

| Code | Meaning | What to do |
|---|---|---|
| 0 | Scanned, nothing new | Say so and stop |
| 1 | New findings | Work through them |
| 2 | **Could not judge** | Never report this as clean. The message says why — usually a missing lockfile |

## Use `upgrades`, do not rebuild it

The JSON carries `upgrades`: commands, already grouped by package and already
version-compared. Run those.

Deriving your own from `fixedIn` gets it wrong in a way that is easy to miss:
comparing versions as strings puts `4.17.21` above `4.18.1`, which sends someone
to an older release than the one they need.

`transitiveFixes` is a different list on purpose. Those packages arrive through
someone else's dependency, so `npm i` adds a top-level entry nobody asked for
and leaves the vulnerable copy in place. The mechanism that works is
`overrides`, and it can break the parent that pinned the old version — propose
it, name the risk, do not apply it silently.

## Verify with this tool, not with `npm audit`

They answer different questions. `npm audit` does not know the baseline, so it
calls a project clean while accepted findings are still outstanding, and it
reconciles nothing. Quoting its "0 vulnerabilities" as the result of your work
is quoting a different tool.

Say **no longer reported**, not fixed, unless a re-run confirms it: a finding
also disappears when it is accepted into the baseline, and when the scanner that
found it did not run. The CLI hedges for that reason; keep the hedge.

## Do not re-rank, re-score, or re-merge

The order comes from a weights table you can print with `--explain`. It is
reproducible; your reconstruction of it is not. If the ranking looks wrong, say
which finding and why so the weights can be argued with, rather than quietly
sorting the list differently on the way to the screen.

`possibleDuplicates` means "suspected same, not merged". Report them as
unresolved. Merging on a hunch is how a real vulnerability ends up hidden behind
an unrelated one.

## Things that are the human's decision

- `--update-baseline` — accepting a finding is a judgement about risk. Never run
  it to make output quiet, and never as a way to finish a task.
- `overrides` entries, for the reason above.
- Removing a dependency, or pinning to an older version.

## What this tool cannot tell you

Whether the vulnerable code path is reachable in this project. Nothing here
knows that. Say so when asked rather than estimating.
