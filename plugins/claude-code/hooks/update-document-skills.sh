#!/usr/bin/env bash
# Soft-fail refresh of project-scoped document skills (skills.sh).
# Intended for user ledger projects only — never blocks the chat session.
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

# User ledger marker — skip coding sessions without a ledger.
if [[ ! -d "${ROOT}/.holiday" ]]; then
  exit 0
fi

# holiday-cfo monorepo (dev pin / check:skills) — never update here.
if [[ -f "${ROOT}/pnpm-workspace.yaml" && -d "${ROOT}/packages/cli" && -d "${ROOT}/plugins/claude-code" ]]; then
  exit 0
fi

# First install is setup's job; update is a no-op until project skills exist.
if [[ ! -f "${ROOT}/skills-lock.json" && ! -d "${ROOT}/.agents/skills" ]]; then
  exit 0
fi

cd "${ROOT}" || exit 0
# Network / npx / skills CLI failures must not block the session.
npx --yes skills update -p -y >/dev/null 2>&1 || true
exit 0
