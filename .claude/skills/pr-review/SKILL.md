---
name: pr-review
description: >
  Use when asked to review a pull request, branch, or set of changes in this `databox-cli`
  repository — "review PR", "review PR #N", "review my changes", "review branch X", a pasted
  GitHub PR URL, or "what do you think of this PR". Always use this instead of a single-pass review.
allowed-tools: Agent, Read, Grep, Glob, Bash
---

# Comprehensive PR Review

You are the **review lead**. You coordinate parallel specialist agents, validate their
findings, and synthesize one prioritized review for this TypeScript/oclif CLI project
(~80 commands, each self-contained: BaseCommand → ApiClient → output formatting).

## Token discipline (non-negotiable)

**Agents pull; you never push.** Never paste the diff, `.claude/rules/*`, `project-patterns.md`,
or agent instruction files into a prompt. Every agent has Bash/Read — send it the base SHA,
file paths, and the pointers below. You do not need to read the reference files or rules
yourself; you only read `git diff --stat`.

## Phase 1: Gather context

### 1. Identify the target and base

Input may be a PR number, branch, GitHub URL, or "my changes" (current branch vs `master`).

```bash
# PR number: make sure the head is checked out locally so agents can read source
gh pr checkout <n>            # skip if already on the branch
gh pr view <n> --json title,body,baseRefName,additions,deletions --jq '{title,body,baseRefName,additions,deletions}'

BASE=$(git merge-base HEAD master)       # or the PR's baseRefName
git diff $BASE...HEAD --stat
git log $BASE...HEAD --oneline
REVIEW_DIR=<your scratchpad dir>/pr-review && mkdir -p $REVIEW_DIR
```

Record `BASE` (full SHA) and `REVIEW_DIR` — every agent prompt uses both.

### 2. Review history (PRs only)

```bash
gh pr view <n> --json reviews --jq '.reviews[] | {author: .author.login, state, body}'
gh api repos/databox/databox-cli/pulls/<n>/comments --jq '.[] | {path, line, body}'
gh api repos/databox/databox-cli/issues/<n>/comments --jq '.[] | {author: .user.login, body}'
```

If prior reviews exist this is a **re-review (round N)**. Build a **prior-disposition ledger**:
`pattern/location · disposition (fixed | declined | backlogged) · sha/reason/link`. Used in Phase 4.

### 3. Size tier and rule selection (from `--stat` only)

| Tier | `src/` lines changed | Team |
|---|---|---|
| **Config-only** | no `.ts` files in `src/` or `test/` | No agents — you review the content directly |
| **Small** | < 100 | Correctness, Testing (+ Consistency if new command files added under `src/commands/`) |
| **Standard** | 100 – 800 | Correctness, Consistency, Testing (+ Security if `lib/`, `base-command.ts`, or `auth/` touched) |
| **Large** | > 800 | All 4 agents; if 15+ command files changed, split Consistency into 2 agents by command domain |

Rules to name in prompts (by touched path):

| Touched | Rule file |
|---|---|
| `src/commands/` | `commands.md` |
| `src/base-command.ts`, `src/lib/api-client.ts` | `api-client.md`, `security.md` |
| `src/lib/config.ts`, `src/lib/prompt.ts` | `security.md` |
| `src/lib/output.ts` | `commands.md` |
| `src/commands/auth/` | `security.md` |
| `test/` | `testing.md` |

All paths are relative to `.claude/rules/`. Every agent gets the same rule list — the
Testing agent always gets `testing.md` in addition.

## Phase 2: Spawn specialists (one message, parallel)

`subagent_type: "general-purpose"`. Model: **Correctness, Security, Validator inherit the session model**;
**Consistency, Testing use `model: "sonnet"`** (sufficient for checklist-style verification).
Prompt template — fill the braces, nothing else:

```
You are the {AGENT} reviewer for a PR in the databox-cli repo (cwd is the repo root).
Read, in order:
1. .claude/skills/pr-review/references/agents/{agent}.md   (your instructions)
2. .claude/skills/pr-review/references/agents/output-format.md
3. .claude/rules/{rule1}.md, .claude/rules/{rule2}.md ...
4. .claude/skills/pr-review/references/project-patterns.md  (only your row of the per-agent table matters)
Diff: `git diff {BASE}...HEAD -- {paths}`   (all changed files: {file list})
Investigate beyond the diff (callers, tests, base classes) before reporting.
Write your full report to {REVIEW_DIR}/{agent}.md and return the same text.
PR: "{title}" — {one-line summary of intent}. {Round N re-review | First review}. Tier: {tier}.
```

Diff scoping per agent (`{paths}`):

| Agent | `{paths}` |
|---|---|
| Correctness | `src/` |
| Consistency | `src/` |
| Security | `src/lib/ src/base-command.ts src/commands/auth/` |
| Testing | `test/ src/` |

Small tier: use `src/ test/` for everyone.

## Phase 3: Validate

Skip if no BLOCKER or WARNING was reported. Otherwise spawn **one** validator:

```
You are the validator for a PR review. Read .claude/skills/pr-review/references/agents/validator.md
and .claude/skills/pr-review/references/project-patterns.md.
Specialist reports are in {REVIEW_DIR}/*.md — validate only their BLOCKER and WARNING findings.
Diff: `git diff {BASE}...HEAD`. Return only the validation output block.
```

Apply verdicts: **CONFIRMED** keeps severity · **DOWNGRADED** drops one level ·
**DISMISSED** is removed.

## Phase 4: Synthesize

1. **Merge** findings that share a root cause (cite all agents). **Reconcile** against the
   ledger: `backlogged`/`declined` → drop silently; `fixed` → keep, annotate
   `(regression — previously fixed in <sha>)`.
2. **Severity**: BLOCKER (must fix before merge) · WARNING (should fix) · SUGGESTION · PRAISE.
3. **Action per WARNING** — *Fix in PR* only on a positive signal: finding's `In diff: yes`,
   or single-file fix under ~20 lines, or regression/test gap introduced by this PR.
   Otherwise **Backlog** (pre-existing code, 3+ files, needs a design decision, systemic).
4. **Report** using this shape (omit empty sections):

```markdown
# PR Review: {title}
_Round N — reconciled against M prior dispositions (K dropped as settled)._   ← re-reviews only

## Summary
{2-3 sentences: mergeable? strongest / weakest aspect}

## Verdict: APPROVE | REQUEST CHANGES | COMMENT
**Scope:** B{n} · W{fix}/{backlog} · S{n} · P{n} — {one-line justification}

## Blockers (N)
### B1: {title}
**File** `path:L42-L55` · **Found by** {agents} · **Confidence** HIGH
**Issue** … **Impact** … **Fix** … (code when useful)

## Warnings (N)
### W1: {title}
**File** … · **Found by** … · **Confidence** …
**Issue** … **Impact** … **Fix** …
**Action** Fix in PR | Backlog — {matched signal}

## Suggestions (N)      ← one line each: `S1 path:L — issue → fix`
## Praise (N)           ← max 3, one line each, specific

## Coverage
| Agent | Findings | Note |
|---|---|---|

## Codification candidates (N)   ← Phase 6
```

## Phase 5: Triage confirmation

If warnings exist, close with:

> Review the **Action** on each warning and reply with overrides or "confirm". I'll then fix
> the *Fix in PR* items (and blockers if you want) and list *Backlog* items for filing.

Offer, when relevant: fix blockers · write missing tests.

## Phase 6: Codification candidates

Run only when there is at least one BLOCKER or WARNING. A candidate is either
**(A) recurred** — 2+ findings share a root pattern across files/agents — or
**(B) known but ungraduated** — matches a `project-patterns.md` entry with no `.claude/rules/` link.
Draft the text in the target file's style (patterns: bold title + context + "Watch for";
rules: 2–3 lines + Good/Bad example) and ask which to accept.

## Finding quality bar

Specific (exact lines) · actionable (concrete fix) · justified (why) · proportional (severity =
impact). No style nits (linting owns formatting), no restating rules, no generic praise,
and frame uncertain intent as a question rather than a finding.
