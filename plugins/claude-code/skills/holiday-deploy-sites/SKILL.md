---
name: holiday-deploy-sites
description: Orchestrate holiday BYOC deploy to ChatGPT Sites (vinext + D1 + R2). Use for Sites fax inbox without separate Vercel/Supabase accounts. Wraps migrate-to-vinext; does not claim D1 is an engine ledger.
---

# holiday deploy — ChatGPT Sites

## Upstream

- `.agents/skills/migrate-to-vinext/SKILL.md`

## Hard gate

`@holiday-cfo/store-d1` does **not** pass store-testkit. Sites mode is **inbox-export** only:

- fax webhook → D1 `fax_inbox` + R2 originals
- explicit retry via UI/MCP (no Queue/Cron)
- export drafts to a real engine ledger (local CLI or Vercel+Supabase)

Refuse `--mode engine` until the D1 package passes conformance.

## Steps

1. `holiday deploy init --target chatgpt-sites --dir <dir>`
2. Apply `migrations/001_fax_inbox.sql` to Sites D1.
3. Follow vinext / Sites deploy flow (preview/saved version).
4. `pnpm test:synthetic-fax` against preview URL — require duplicate fileId idempotency.
5. Point SOLAPI at `/api/fax/webhook`. Suggest production only after synthetic pass.
6. Document that this is **not** a remote holiday SoR.

## holiday commands

- `holiday deploy init --target chatgpt-sites`
- `holiday deploy check`
