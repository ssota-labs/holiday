# holiday BYOC — Vercel + Supabase

This project is **your** deployment. holiday does not host a managed multi-tenant web.

## Boundaries

- Business logic lives in `@holiday-cfo/core` usecases + `@holiday-cfo/contracts`.
- Route handlers only translate HTTP ↔ usecases (`@holiday-cfo/adapters`).
- Supabase / Vercel SDKs stay in **this** package.json, never in the holiday monorepo runtime.

## Setup

1. Create a Supabase project. Apply `supabase/migrations/001_fax_inbox.sql`.
2. Create private Storage bucket `fax-originals`.
3. Copy `env.example` → `.env.local` and fill secrets.
4. `pnpm install && pnpm dev`
5. Point SOLAPI FAX-RECEIVE at `https://<host>/api/fax/webhook` with `X-Solapi-Secret`.
6. Run `pnpm test:synthetic-fax` against a preview URL before production.
7. Use the `holiday-deploy-vercel-supabase` and `holiday-fax` agent skills to orchestrate login, secrets, and preview→prod.

## Never ship

- `.holiday/**`, `*.db`, `.env*`
