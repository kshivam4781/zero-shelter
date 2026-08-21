---
description: Run zero-shelter on this project for the first time and wire it in. Use when someone asks to check dependency vulnerabilities, set up a security gate in CI, cut down scanner noise, or install zero-shelter.
---

# First run

Nothing to install. From the project root:

```bash
npx --yes zero-shelter judge
```

Read the exit code — it is the answer, not decoration:

| Exit | Meaning | What to do |
|---|---|---|
| 0 | Scanned, nothing new to fix | Say so and stop |
| 1 | New findings | Walk through them (see `/zero-shelter:explain`) |
| 2 | **Could not judge** | Never report this as clean. The message says why — usually no lockfile, so `npm i --package-lock-only` first |

Requires Node 20+. If it prints a Node version message, that is the whole
problem; do not try to work around it.

`osv-scanner` is optional. When it is absent the run still works and says so
once. Installing it is what lets two sources be reconciled, which is where most
of the deduplication comes from — mention it once, do not nag.

## Recording the backlog

A project that has never run this has a backlog it inherited. Fixing all of it
today is not the goal, and failing CI on it teaches people to switch the gate
off.

```bash
npx --yes zero-shelter judge --update-baseline
```

From then on only new findings are reported and CI fails on the regression this
change introduced. Explain that trade before running it: **anything recorded is
no longer shown**, so run it when the current list has actually been looked at,
not to make output disappear.

## After someone fixes something

Re-run `judge`. Findings that were accepted and are no longer reported get their
own line, so the work that was just done is visible instead of showing up as a
number quietly getting smaller. If a scanner that contributed to the baseline
did not run this time, that line says so — do not upgrade "no longer reported"
into "fixed" when the CLI itself is hedging.

Prune the baseline afterwards with `--update-baseline` so it stops listing
fingerprints nothing produces.

## Wiring it in

Offer these; do not add them unasked.

**CI** — append to an existing workflow:

```yaml
- run: npx zero-shelter judge --format sarif --output zero-shelter.sarif
  continue-on-error: true

- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: zero-shelter.sarif
```

**Coding agent context** — `.claude/settings.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      { "hooks": [{ "type": "command", "command": "npx zero-shelter hook" }] }
    ]
  }
}
```

The hook puts the current findings into the session so an agent does not add a
dependency this project already has an unfixed advisory for. It never blocks a
prompt and never fails.

## What this skill must not do

- **Do not re-rank, re-judge, or filter the findings.** The ordering is
  computed by the CLI and is reproducible; anything you add on top is not, and
  the entire point of this tool is that its judgement can be checked.
- Do not run `--update-baseline` without saying what it hides.
- Do not describe a run that exited 2 as passing.
