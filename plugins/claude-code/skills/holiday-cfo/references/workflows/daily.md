# Daily — record and look one day ahead

Fired each morning by the scheduler (`../automation.md`), or run on demand.

1. **Ask for yesterday.** "어제 쓴 거 있어요?" Take screenshots, a bank export, or
   just what they tell you.
2. **Record it,** straight in with `holiday txn add` — no review gate. If something
   is wrong, fix it after with a correcting entry (recipes are in the ledger
   `AGENTS.md`). A move between the user's own accounts is a transfer, not
   spending — two asset legs, net worth unchanged.
3. **If anything landed as an unmatched draft**, open the dash preview for them
   (start the dev server; don't just suggest it) so the 분류 대기 card is one
   click away — or add the obvious rule and `review apply-rules --accept`.
4. **Look ahead.** `holiday cashflow` — read the ⚠ line if there is one. That is
   the answer to "am I okay for tomorrow".
5. **Re-bake the dashboard** if they keep one: `holiday dash data`.
