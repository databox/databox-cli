# Common Output Format

Return **only** this block — no preamble, no restated rules, no quoted diff.

```
## [Agent Name] Review

### Summary
[1-2 sentences: what you examined, overall assessment]

### Findings

#### [BLOCKER|WARNING|SUGGESTION|PRAISE] - [Short title]
- **File**: `src/commands/dataset/list.ts:L42` (or `L42-L55`)
- **In diff**: yes | no   (is the flagged line inside a hunk this PR changes?)
- **Confidence**: HIGH | MEDIUM | LOW
- **Description**: [what the issue is]
- **Why it matters**: [impact — what goes wrong, who is affected]
- **Suggested fix**: [concrete recommendation; code only if it clarifies]

### No-Issue Confirmation
[≤ 5 one-line bullets: areas checked that were clean]
```

## Budget

- At most **8 findings**. If you have more, keep the highest severity / confidence and fold
  the rest into one SUGGESTION ("also: …").
- At most **2 PRAISE**, and only for something specific and non-obvious.
- Merge findings that share a root cause into one entry listing all locations.
- Only report what you verified by reading surrounding code — LOW confidence means you could
  not verify, not that you didn't look.
- Do **not** run `npm test` / `npm run build` — CI and the review lead handle that. Spend
  your budget reading code.
