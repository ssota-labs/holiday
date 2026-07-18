#!/usr/bin/env node
/**
 * Transfer matching over a normalized transaction list — the bank-agnostic half
 * of a multi-account import.
 *
 * You (the agent) still write the PARSER per bank; every export is shaped
 * differently and that is exactly what you are good at. But once rows are
 * normalized, the matching logic is identical everywhere, and re-deriving it per
 * session is how mistakes creep in. This is that logic, once. See
 * `../references/concepts/transfers.md` for why each tier exists.
 *
 * Input (JSON file, one array, every account together):
 *   [{ "account": "Assets:Bank:KB:Start",   // ledger account code
 *      "date": "2026-07-14",
 *      "amountMinor": "-1396800",            // signed decimal STRING, account's view
 *      "payee": "연주환",
 *      "time": "14:22:01" }, ...]            // optional, breaks same-day ties
 *
 * Usage:
 *   node match-transfers.mjs transactions.json --self "연주환,Toss연주환,토스_연주환"
 *
 * Output (stdout JSON):
 *   { transfers: [{out, in}],   // tier 1 — post each pair as ONE two-leg transfer
 *     flagged:   [{reason, out, candidates}],  // tier 2 — ask the user
 *     rows:      [...input with .role] }       // everything else — ordinary rows
 *   Orphans (self-named, no counter-leg) come back flagged with reason
 *   "no-counter-leg": park them, never expense them.
 */
import { readFileSync } from 'node:fs';

const [, , file, ...rest] = process.argv;
if (!file) {
  console.error('usage: match-transfers.mjs <transactions.json> --self "이름1,이름2,..."');
  process.exit(2);
}
const selfArg = rest[rest.indexOf('--self') + 1] ?? '';
const selfNames = selfArg
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
if (selfNames.length === 0) {
  console.error('--self is required: the owner\'s name variants are the only transfer signal the rows carry.');
  process.exit(2);
}

/** @type {{account:string,date:string,amountMinor:string,payee?:string,time?:string}[]} */
const rows = JSON.parse(readFileSync(file, 'utf8'));
rows.forEach((r, i) => (r.idx = i));

const isSelf = (p) => !!p && selfNames.some((n) => p.toLowerCase().includes(n));
const dayOf = (d) => Math.round(Date.parse(d + 'T00:00:00Z') / 86400000);

// Index deposits by absolute amount for the ±1-day window scan.
const deposits = new Map(); // amount(abs string) -> rows[]
for (const r of rows) {
  if (!r.amountMinor.startsWith('-')) {
    const k = r.amountMinor;
    if (!deposits.has(k)) deposits.set(k, []);
    deposits.get(k).push(r);
  }
}

const used = new Set();
const transfers = [];
const flagged = [];

for (const out of rows) {
  if (!out.amountMinor.startsWith('-')) continue;
  const abs = out.amountMinor.slice(1);
  const outSelf = isSelf(out.payee);

  // Candidates: same absolute amount, DIFFERENT account, within ±1 day, unused.
  const cands = (deposits.get(abs) ?? []).filter(
    (d) => d.account !== out.account && !used.has(d.idx) && Math.abs(dayOf(d.date) - dayOf(out.date)) <= 1,
  );

  if (outSelf && cands.length === 0) {
    // Tier 3: a self-named withdrawal with nothing to meet it — its other side is
    // an account not in this dataset. NEVER an expense; park and ask.
    flagged.push({ reason: 'no-counter-leg', out, candidates: [] });
    continue;
  }
  if (cands.length === 0) continue; // ordinary spending

  const strong = cands.filter((d) => isSelf(d.payee) && outSelf && d.date === out.date);
  if (strong.length === 1) {
    // Tier 1: same day, equal amount, the owner's name on BOTH legs, exactly one
    // way to pair it. On real data this is ~100% precision.
    used.add(strong[0].idx);
    used.add(out.idx);
    transfers.push({ out, in: strong[0] });
    continue;
  }

  if (outSelf || cands.some((d) => isSelf(d.payee))) {
    // Tier 2: something self-ish is involved but it is not clean — several
    // same-amount candidates, a ±1-day skew, or a wallet round-trip whose leg
    // name is not the owner's. The running balance or the user decides, not a
    // heuristic pretending to be sure.
    flagged.push({
      reason: strong.length > 1 ? 'ambiguous-same-day' : 'self-leg-uncertain-pair',
      out,
      candidates: cands,
    });
  }
  // Neither side self-named: a coincidental amount collision between strangers.
  // Say nothing — treating it as a transfer would be inventing one.
}

for (const t of transfers) {
  t.out.role = 'transfer-out';
  t.in.role = 'transfer-in';
}

process.stdout.write(
  JSON.stringify(
    {
      transfers,
      flagged,
      summary: {
        rows: rows.length,
        matchedPairs: transfers.length,
        flagged: flagged.length,
        selfNames,
      },
    },
    null,
    2,
  ) + '\n',
);
