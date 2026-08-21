# Changelog

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
