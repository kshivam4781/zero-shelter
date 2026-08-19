# Agent hook

`zero-shelter hook` hands the project's current judgement to a coding agent
before it writes anything, so it does not add a dependency this project already
has an unfixed advisory for.

```console
$ echo '{"cwd":"/path/to/project"}' | npx zero-shelter hook
{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"zero-shelter: this project has 9 unaddressed dependency finding(s) (4 more not shown). Highest priority first:\n- critical minimist (GHSA-XVCH-5GV4-984H, fixed in 1.2.8)\n…"}}
```

## Claude Code

`.claude/settings.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      { "hooks": [{ "type": "command", "command": "npx zero-shelter hook" }] }
    ]
  }
}
```

The hook reads the session's `cwd` from the payload on stdin, so it judges the
project being edited rather than wherever the hook process happened to start.
`--cwd` overrides it.

## What it will not do

**It does not block prompts.** A dependency judge has no business deciding what
someone is allowed to ask. It also could not rewrite a prompt if it wanted to:
`UserPromptSubmit` adds context alongside the prompt, and Cursor's
`beforeSubmitPrompt` returns only continue/stop — neither platform lets a hook
replace what was typed. Tools that claim to "rewrite your prompt safely" are
describing something the hook API does not offer.

**It does not fail.** It runs inside someone's editor session, so every error
path ends in silence and exit 0: no scanners installed, no lockfile, malformed
payload, unreadable baseline. Interrupting a developer's session over a
security report they did not ask for is worse than saying nothing.

**It stays quiet when there is nothing new.** Findings recorded in the baseline
produce no output at all, so the agent's context only carries what is actually
outstanding.

## Scope

This ships the judgement into the agent's context. It is not intent detection —
it does not read the prompt, does not classify requests as risky, and has no
rule pack. Those were considered and left out: a hook that guesses at intent
fires on the wrong things, and this project's whole premise is that judgements
should be checkable.
