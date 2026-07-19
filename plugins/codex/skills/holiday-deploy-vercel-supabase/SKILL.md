---
name: holiday-deploy-vercel-supabase
description: Orchestrate holiday BYOC deploy to Vercel + Supabase. Use when the user wants fax webhook hosting on Vercel with Supabase Postgres/Storage. Wraps upstream supabase + deploy-to-vercel skills — does not copy vendor skill bodies.
---

# holiday deploy — Vercel + Supabase

You are orchestrating a **BYOC** stack. The product does not run a managed multi-tenant web.

## Upstream skills (already pinned in this repo)

Load and follow — do not paste their contents here:

- `.agents/skills/supabase/SKILL.md`
- `.agents/skills/deploy-to-vercel/SKILL.md`

## Steps

1. Confirm workspace has no secrets staged: never copy `.holiday/**`, `*.db`, `.env*`.
2. Run `holiday deploy init --target vercel-supabase --dir <dir>` (non-destructive).
3. Using the **supabase** skill: create/link project, apply `supabase/migrations/001_fax_inbox.sql`, create private bucket `fax-originals`, run store-postgres migrations via DATABASE_URL (Supavisor, `prepare: false`).
4. Fill `env.example` → Vercel env / `.env.local` (`DATABASE_URL`, `SUPABASE_*`, `SOLAPI_WEBHOOK_SECRET`, optional Cursor Automation URL/token, `HOLIDAY_API_TOKEN`).
5. Using **deploy-to-vercel**: preview deploy first (never production until asked).
6. Run synthetic fax: `BASE_URL=… SOLAPI_WEBHOOK_SECRET=… pnpm test:synthetic-fax` — must pass duplicate `fileId` test.
7. Only then suggest production deploy. Configure SOLAPI FAX-RECEIVE URL to `/api/fax/webhook`.
8. Wire Cursor Automation to call limited MCP `/api/mcp` with bearer token after enqueue — OCR/rules first; Cursor on failures to control cost.

## holiday commands

- `holiday deploy init --target vercel-supabase`
- `holiday deploy check`
