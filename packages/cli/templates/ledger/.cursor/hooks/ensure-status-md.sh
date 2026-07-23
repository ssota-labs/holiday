#!/usr/bin/env bash
# Soft-fail ensure of project-root status.md for user ledger sessions.
# Creates only when missing — never overwrites hand edits or an existing file.
# Keep in sync with plugins/claude-code/hooks/ensure-status-md.sh
set -u

ROOT="${CLAUDE_PROJECT_DIR:-}"
if [[ -z "${ROOT}" ]]; then
  ROOT="$(pwd)"
fi

raw=""
if [[ ! -t 0 ]]; then
  raw="$(cat || true)"
fi
if [[ -n "${raw}" ]]; then
  parsed="$(
    printf '%s' "${raw}" | node --input-type=module -e '
      let d = "";
      process.stdin.on("data", (c) => { d += c; });
      process.stdin.on("end", () => {
        try {
          const j = JSON.parse(d);
          if (j && typeof j.cwd === "string" && j.cwd.length > 0) process.stdout.write(j.cwd);
        } catch {
          /* ignore — soft-fail */
        }
      });
    ' 2>/dev/null || true
  )"
  if [[ -n "${parsed}" ]]; then
    ROOT="${parsed}"
  fi
fi

outcome="skipped"

# User ledger marker — skip coding sessions without a ledger.
if [[ ! -d "${ROOT}/.holiday" ]]; then
  exit 0
fi

# holiday-cfo monorepo (dev pin / check:skills) — never write status.md here.
if [[ -f "${ROOT}/pnpm-workspace.yaml" && -d "${ROOT}/packages/cli" && -d "${ROOT}/plugins/claude-code" ]]; then
  exit 0
fi

# Already present — leave hand edits and prior refreshes alone.
if [[ -e "${ROOT}/status.md" ]]; then
  outcome="exists"
  if [[ -n "${CLAUDE_PLUGIN_ROOT:-}" ]]; then
    printf '%s\n' "{\"hookSpecificOutput\":{\"hookEventName\":\"SessionStart\",\"additionalContext\":\"status.md: already present\"}}"
  fi
  exit 0
fi

cd "${ROOT}" || exit 0

run_status() {
  if [[ -n "${HOLIDAY_BIN:-}" ]]; then
    "${HOLIDAY_BIN}" status
  elif command -v holiday >/dev/null 2>&1; then
    holiday status
  else
    npx --yes @holiday-cfo/cli@latest status
  fi
}

# Network / npx / CLI failures must not block the session.
if run_status >/dev/null 2>&1; then
  if [[ -e "${ROOT}/status.md" ]]; then
    outcome="created"
  fi
fi

if [[ "${outcome}" == "created" && -n "${CLAUDE_PLUGIN_ROOT:-}" ]]; then
  printf '%s\n' "{\"hookSpecificOutput\":{\"hookEventName\":\"SessionStart\",\"additionalContext\":\"status.md: created\"}}"
fi

exit 0
