# Automation — running the workflows on a schedule

The daily, weekly and monthly workflows are worth nothing if the user has to
remember to ask. `holiday` has no scheduler of its own and never will — that is
the host's job. This file is how you register a workflow with whichever agent is
running you.

**Always ask first.** Registering an automation is a standing change to the user's
setup; propose it, name what it will do and when, and register only on a clear yes.
The setup workflow is where this offer belongs — once the ledger exists, ask.

## Which host are you in

You know which agent you are. Pick the matching row.

| Host | How to register a recurring run |
|---|---|
| **Claude Code** | The `/schedule` skill — cron-based routines. Describe the task and cadence in plain language; it writes the routine. |
| **Cursor** | The `/automate` skill — describe the recurring task and it configures a cron trigger. |
| **Codex** | Desktop app **Automations** (a cron/RRULE trigger), or `codex exec "<prompt>"` driven by the OS cron / a GitHub Action. |

If you cannot tell or the host has no scheduler, say so and hand the user the exact
command to run manually. A workflow they run by hand still works; a workflow that
silently never runs is worse than none.

## What to register

Register a PROMPT that re-enters this skill and names the workflow, not a raw CLI
line — the workflow decides which commands to run, and it changes as the ledger
grows. The cadences that match the workflows:

| Workflow | Cadence | Prompt to schedule |
|---|---|---|
| Daily | every morning | `holiday: run the daily workflow — ask me for yesterday's transactions, record them, then show tomorrow's cash flow` |
| Weekly | Sunday | `holiday: run the weekly review — assets and liabilities by account, next week's cash flow, and this week's spending` |
| Monthly | 1st of the month | `holiday: run the monthly close for last month` |

Adjust the wording to how the user speaks. The point is that the fired prompt
lands back in this skill and triggers the right workflow — see `workflows/` (daily.md, weekly.md, monthly.md).

## The shape of the offer

At the end of setup, once there is a ledger with real accounts:

> "이제 자동화를 걸어둘까요? 매일 아침 어제 거래를 물어보고 내일 현금흐름을 보여주고,
> 일요일마다 주간 점검, 매월 1일에 지난달 마감을 제안하도록 등록할 수 있어요."

Register only the cadences they accept. One is fine — daily alone is most of the
value. Do not register all three by default.
