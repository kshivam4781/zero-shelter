# Changelog

## 0.0.3

**A second scanner no longer deletes the advice.** npm audit names the version
it would install; osv-scanner names the release that patched the advisory. The
merge saw two answers, called it a disagreement and withheld both — so
installing the second source this project tells everyone to install removed
every upgrade command from the report. It now reports the highest claimed
version, which satisfies all of them, and `--explain` shows that they differed.

**The report says what to run.** Seven findings on one package are one upgrade,
and the report listed them seven times sorted by severity. Now:

```
npm i lodash@4.18.1   clears 7
35 finding(s) in 11 package(s) have a published fix but arrive through another
dependency — package.json "overrides" forces one, at the risk of breaking
whatever pinned it
```

Transitive packages are counted rather than commanded: `npm i` on one adds a
top-level entry and leaves the vulnerable copy alone. In a workspace the report
says the command needs a `-w`, because hoisting hides which workspace declared
the range.

**`--top` is a display limit again.** It was deciding what the report claimed:
`--top 3` on a project with 82 outstanding findings announced "3 to fix (98%
less noise)". The counts, the percentage and the advice are about the project;
`--top` decides how many rows are printed.

**pnpm projects work.** The lockfile decides which audit runs, so a
`pnpm-lock.yaml` no longer ends in "nothing was scanned". yarn works through
osv-scanner, which reads `yarn.lock`; without it, the run says so and points at
the shortest way out.

**Merging got fast.** Sibling detection compared every finding with every other
one: 7,500 findings took a second, and a large tree produces more than that.
One grouping pass instead — 30ms for the same input, 151ms for 37,400.

**Published from CI.** Releases go out through GitHub Actions with OIDC
trusted publishing — no token exists to leak, and every tarball carries
provenance tying it to the commit and the run that built it.

**Smaller things.** `zero-shelter hook` hands agents the commands, not just the
diagnosis, and honours `--baseline`. SARIF alerts carry the remedy into the
Security tab. `--explain` prints the weights as a table to argue with, and
names possible duplicates by advisory instead of by fingerprint. A broken
baseline, an unwritable `--output`, and this tool's own SARIF passed to
`--input` all get answers instead of stack traces or puzzlement.

## 0.0.2

**A project nobody scanned no longer reports clean.** In a directory with no
lockfile, `npm audit` fails, and the run used to continue with zero findings —
printing `✓ nothing new to fix` and exiting 0. In CI that turns a project the
scanners never opened green, which is worse than a crash because a passing
build gets no attention. It now exits 2 and repeats npm's own explanation
(`This command requires an existing lockfile. Try creating one first with: npm
i --package-lock-only`) instead of our parser's complaint about missing keys.
Scanned-and-found-nothing still exits 0.

**An old Node says so.** `engines` only makes npm warn at install time. Running
on Node 18 produced a stack trace pointing into our files, which reads as our
bug; it now names the version needed and the one running, and exits 2.

**`--version` and `version`.** Bug reports can name a version.

**Claude Code plugin.** `/plugin marketplace add zero-shelter/zero-shelter`
installs two skills: `setup` runs the first scan and offers the CI and hook
wiring, `explain` reads a run and says what to fix first. Both are presentation
only — they are instructed not to re-rank, filter, or merge anything the CLI
left flagged, because the judgement has to stay where the same input produces
the same checkable answer.

**Dropped yarn v1** from the report formats we claim to read. We parse the
`advisories` shape pnpm and npm 6 emit; yarn v1 writes NDJSON, which we do not
read.

## 0.0.1

First preview. `judge` runs npm audit and osv-scanner, reconciles what they
both found, ranks it, and reports only what is new since the recorded baseline.
Text, JSON and SARIF output. `hook` hands the current findings to a coding
agent.
