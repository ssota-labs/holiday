---
name: holiday-fax
description: Configure SOLAPI FAX-RECEIVE and Cursor Automation for holiday BYOC fax ingestion. Use when setting up KB bank/card fax auto-notify into holiday drafts.
---

# holiday-fax — SOLAPI + Cursor Automation

## SOLAPI

1. Create a virtual fax number (FAX-RECEIVE). Note monthly cost (~₩10,000/mo excl. VAT — confirm current pricing).
2. Webhook URL = deploy target `/api/fax/webhook` (Vercel or Sites).
3. Shared secret: SOLAPI sends `X-Solapi-Secret: SHA1(secret)` and `X-Solapi-Event-Name`.
4. Body is a **JSON array**. Each item has `fileId` (UNIQUE idempotency) and `url` (download; refresh via SOLAPI storage API if expired).
5. Acknowledge within ~5s. Retries up to 8. Durable `fax_inbox` + recover/retry routes cover lost background work.

## Cursor Automation

Cursor webhooks need `Authorization: Bearer crsr_…`. SOLAPI cannot send that header — the BYOC route is the proxy:

1. SOLAPI → holiday `/api/fax/webhook`
2. Route persists `fileId`, stores original, then optionally POSTs to Cursor Automation with the bearer token.
3. Automation uses limited holiday MCP (`holiday_ingest_submit`, `holiday_review_*`) — never auto-accept.

## Cost control

Prefer deterministic OCR/rules for clean pages; invoke Cursor only on parse failures.

## Related

- `holiday-deploy-vercel-supabase`
- `holiday-deploy-sites`
- `holiday deploy check`
