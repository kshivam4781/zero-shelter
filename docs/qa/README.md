# Beta QA Guide

This directory is the source of truth for beta-quality requirements in the `zero-shelter` repository. It complements the PR-oriented [QA checklist](../qa-checklist.md); it does not replace tests or CI.

## Use this guide

1. Read [Quality Gates](quality-gates.md) before accepting a beta change.
2. Select the relevant stable case IDs from [QA Cases](cases/README.md).
3. Follow [Execution Policy](execution-policy.md) to decide what runs in CI, at release time, or manually.
4. Copy [the short report template](reports/TEMPLATE.md) after a planned beta inspection.
5. Turn every confirmed, automatable defect into a regression test under `test/`.

## Document roles

| Document | Purpose | Update trigger |
| --- | --- | --- |
| [Quality Gates](quality-gates.md) | Release criteria and severity policy | A product promise or release decision changes |
| [Execution Policy](execution-policy.md) | When each type of evidence must be collected | CI, release, or benchmark process changes |
| [QA Cases](cases/README.md) | Reusable risks, expected behavior, and test evidence | A new reusable risk is found |
| [QA Reports](reports/README.md) | Dated summaries of a specific inspection | A planned QA pass is completed |
| [QA checklist](../qa-checklist.md) | Small checklist for a feature spec or pull request | A PR is prepared or reviewed |

## Scope

The beta scope is dependency-security judgment: scanner collection, input parsing, alias merging, integer ranking, baseline behavior, remediation guidance, and text, JSON, SARIF, HTML, and hook output. SAST, secret scanning, prompt-intent rules, and a statistical claim about ranking accuracy are outside this guide.

## Safe public records

Use synthetic or sanitized inputs in cases, tests, and reports. Do not record secrets, private repositories, undisclosed vulnerabilities, raw scanner output, or personal data.
