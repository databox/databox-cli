---
name: databox-analyze
description: Use when the user wants to analyze datasets with Genie AI, ask questions about their data, get insights or summaries from datasets, or have a conversation about dataset contents in Databox. Triggers on mentions of data analysis, asking questions about data, Genie, AI insights, or dataset exploration.
---

# Databox Dataset Analysis with Genie AI

Ask natural-language questions about datasets via the `databox` CLI. Genie AI analyzes the data and streams back answers.

## Prerequisites

Must be authenticated. If not, use the `databox-auth` skill first.

## Quick Reference

| Task | Command |
|------|---------|
| Ask a question | `databox analyze ask-genie DATASET_ID "Your question"` |
| Continue a thread | `databox analyze ask-genie DATASET_ID "Follow-up" --thread-id THREAD_ID` |
| Get JSON output | `databox analyze ask-genie DATASET_ID "Question" --json` |

## Flags

| Flag | Required | Description |
|------|----------|-------------|
| `--thread-id` | No | Continue an existing conversation thread |
| `--service-url` | No | Override agentic service URL (env: `DATABOX_AGENTIC_SERVICE_URL`) |
| `--json` | No | Output structured JSON instead of streaming text |

## Streaming vs JSON

**Default (streaming):** Answer streams to stdout in real-time. After completion, the `thread_id` is printed to stderr.

**JSON mode (`--json`):** Collects the full response and outputs:
```json
{
  "success": true,
  "answer": "The full answer text...",
  "thread_id": "tid-abc-123",
  "dataset_id": "ds-abc-123"
}
```

## Common Workflow: Analyze a Dataset

```bash
# 1. Find the dataset ID
databox account datasets ACCOUNT_ID

# 2. Ask an initial question
databox analyze ask-genie ds-abc-123 "What are the top performing metrics this month?"
# Streams answer... then prints: thread_id: tid-xyz-789

# 3. Ask a follow-up using the thread
databox analyze ask-genie ds-abc-123 "Break that down by week" --thread-id tid-xyz-789
```

## Programmatic Usage

Use `--json` to capture structured output for scripts or agent workflows:

```bash
databox analyze ask-genie ds-abc-123 "Summarize trends" --json
```

## Notes

- Dataset IDs are UUIDs (e.g. `a1b2c3d4-...`)
- Thread IDs enable multi-turn conversations about the same dataset
- The `thread_id` is returned in the final SSE chunk and printed to stderr (or in JSON output)
- More `analyze` commands will be added in the future
