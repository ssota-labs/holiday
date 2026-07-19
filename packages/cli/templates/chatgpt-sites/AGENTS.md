# holiday BYOC — ChatGPT Sites (vinext + D1 + R2)

## Hard limits

- Sites-managed D1/R2 + inbound POST are supported.
- Queues / Cron / background services are **not** officially supported — failed
  work stays in D1 and is retried explicitly via UI or MCP.
- D1 does **not** implement interactive `LedgerStore.unitOfWork`. Until
  `@holiday-cfo/store-d1` passes the full store-testkit suite, this template
  runs in **inbox-export** mode only. Do not pretend this is the engine ledger.

## Setup

1. `holiday deploy init --target chatgpt-sites`
2. Apply `migrations/001_fax_inbox.sql` to the Sites D1 binding.
3. Deploy with ChatGPT Sites / vinext; no separate Vercel/Supabase/CF account required.
4. Point SOLAPI at `/api/fax/webhook`.
5. Use `holiday-deploy-sites` + `holiday-fax` skills. Pass synthetic fax tests before production.
