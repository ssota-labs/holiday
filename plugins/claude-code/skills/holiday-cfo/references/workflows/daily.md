# Daily — record and look one day ahead

Fired each morning by the scheduler (`../automation.md`), or run on demand.

1. **Ask for yesterday.** "어제 쓴 거 있어요?" Take screenshots, a bank export, or
   just what they tell you.
2. **Record it,** straight in with `holiday txn add` — no review gate. If something
   is wrong, fix it after (see `../concepts/recipes.md`).
   A move between the user's own accounts is a transfer, not spending — two asset
   legs, net worth unchanged. See `../concepts/transfers.md`.
3. **Look ahead.** `holiday cashflow` — read the ⚠ line if there is one. That is
   the answer to "am I okay for tomorrow".
4. **Re-bake the dashboard** if they keep one: `holiday dash data`.
