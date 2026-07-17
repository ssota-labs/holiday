// Loaded dynamically by main.ts, AFTER env.ts has patched process.emitWarning.
// Do not make this the bin entry point — see the comment in main.ts.
import { Command } from 'commander';
import { z } from 'zod';

import {
  type Account,
  type AccountCode,
  type AccountId,
  AmountFactory,
  CommodityRegistry,
  type CommodityCode,
  type Grain,
  type IsoDate,
  type ProjectedOutflow,
  type ProjectionPosting,
  Txn,
  buildInstallmentSchedule,
  projectInstallments,
  projectRecurring,
  assertCadence,
  describeCadence,
  type TxnId,
  WELL_KNOWN_COMMODITIES,
  accountTypeOf,
  assertAccountCode,
  assertAccountPrefix,
  assertCardCycleRule,
  assertIsoDate,
  billingDatesFor,
  cashRunway,
  createUlidFactory,
  describeTxnError,
  displaySignOf,
  projectCardBills,
  reviseSchedule,
  type AmortizationMethod,
  type LoanScheduleRow,
  buildLoanSchedule,
  describeMethod,
  formatAnnualPercent,
  loanCheck,
  monthlyFromAnnual,
  parseAnnualPercent,
  rowForDate,
  projectLoans,
  type ExistingTxn,
  type FxRate,
  type ParsedTxn,
  convert,
  formatRate,
  resolveRate,
  dedupeKey,
  findNearDuplicates,
  sha256,
  sha256Bytes,
  scheduleInterest,
} from '@holiday/core';

import { INGEST_SUBMISSION, type IngestItemInput } from './ingest.js';
import { type DeriveWeight, UsageError, parseLeg } from './legs.js';
import { createWorkspace, openLedger, readConfig, requireWorkspace } from './workspace.js';

/**
 * Amounts cross the JSON boundary as decimal STRINGS, never numbers.
 * JSON.stringify throws on a bigint, and a number silently loses precision past
 * 2^53 — the exact failure this ledger uses bigint everywhere to avoid.
 */
const REVISION_ROWS = z
  .array(
    z.object({
      seq: z.number().int().min(1),
      paymentDate: z.string(),
      principalMinor: z.string().regex(/^-?\d+$/),
      feeMinor: z.string().regex(/^\d+$/).optional(),
    }),
  )
  .min(1);

const nextUlid = createUlidFactory();
const registry = CommodityRegistry.from(WELL_KNOWN_COMMODITIES);
const amounts = new AmountFactory(registry);

const program = new Command();
program.name('holiday').description('A double-entry CFO ledger for one person.').version('0.1.0');

program
  .command('init')
  .description('create a .holiday/ ledger in the current directory')
  .requiredOption('--currency <code>', 'functional currency, e.g. KRW')
  .option('--close-grain <grain>', 'the one hard-close grain (day|week|month|quarter|year)', 'month')
  .option('--timezone <tz>', 'IANA timezone', 'Asia/Seoul')
  .action(async (o: { currency: string; closeGrain: string; timezone: string }) => {
    const currency = registry.get(o.currency).code;
    const ws = createWorkspace(process.cwd(), {
      functionalCurrency: currency,
      closeGrain: o.closeGrain as Grain,
      timezone: o.timezone,
      store: 'sqlite',
    });
    // openLedger already migrates — every command does, so an existing ledger
    // survives a plugin upgrade.
    const store = await openLedger(ws);
    await store.unitOfWork(async (uow) => {
      for (const c of registry.all()) await uow.upsertCommodity(c);
    });
    await store.close();
    out({ workspace: ws, functionalCurrency: currency, closeGrain: o.closeGrain });
    note(`Ledger created at ${ws}`);
    note(`Commit ledger.db. Keep this repository PRIVATE — it is your money.`);
  });

const account = program.command('account').description('manage accounts');

account
  .command('add <code>')
  .description('add an account, e.g. Assets:Bank:KB:Checking')
  .option('--commodity <code>', 'restrict to one commodity (recommended); omit for multi-commodity')
  .option('--non-monetary', 'exclude from FX revaluation (equipment, prepaid)', false)
  .option('--cash', 'spendable cash — `holiday cashflow` walks forward from these', false)
  .option('--placeholder', 'a grouping node that cannot be posted to', false)
  .option('--opened <date>', 'ISO date', today())
  .action(
    async (
      code: string,
      o: { commodity?: string; nonMonetary: boolean; cash: boolean; placeholder: boolean; opened: string },
    ) => {
    const ws = requireWorkspace();
    const store = await openLedger(ws);
    const c = assertAccountCode(code);
    const acct: Account = {
      id: nextUlid() as AccountId,
      code: c,
      type: accountTypeOf(c),
      parentId: null,
      commodity: o.commodity ? registry.get(o.commodity).code : null,
      monetary: !o.nonMonetary,
      cash: o.cash,
      placeholder: o.placeholder,
      openedOn: assertIsoDate(o.opened),
      closedOn: null,
    };
    await store.unitOfWork((uow) => uow.upsertAccount(acct));
    await store.close();
    out({ id: acct.id, code: acct.code, type: acct.type, commodity: acct.commodity, cash: acct.cash });
    if (acct.type === 'asset' && !o.cash) {
      // Silence here is how an account full of money vanishes from the projection.
      note(`${code} is not marked --cash, so it is NOT counted in \`holiday cashflow\`.`);
    }
  },
);

account
  .command('list')
  .description('list accounts')
  .action(async () => {
    const ws = requireWorkspace();
    const store = await openLedger(ws);
    const accounts = await store.read((r) => r.listAccounts());
    await store.close();
    if (jsonMode()) return out(accounts);
    for (const a of accounts) {
      const tags = [a.cash ? 'cash' : null, a.placeholder ? 'placeholder' : null, a.monetary ? null : 'non-monetary']
        .filter(Boolean)
        .join(' ');
      note(`${a.code.padEnd(40)} ${(a.commodity ?? '(multi)').padEnd(8)} ${tags}`);
    }
  });

program
  .command('txn')
  .command('add')
  .description('record a transaction')
  .option('--date <date>', 'ISO date', today())
  .option('--payee <name>')
  .option('--narration <text>', '', '')
  .requiredOption(
    '--leg <leg...>',
    'ACCOUNT AMOUNT COMMODITY [@@ TOTAL]. Repeatable. Must sum to zero in the functional currency.',
  )
  .option('--draft', 'record as a draft pending review', false)
  .action(async (o: { date: string; payee?: string; narration: string; leg: string[]; draft: boolean }) => {
    const ws = requireWorkspace();
    const config = readConfig(ws);
    const store = await openLedger(ws);

    const byCode = new Map<string, Account>();
    for (const a of await store.read((r) => r.listAccounts())) byCode.set(a.code, a);
    const resolve = (code: string): Account => {
      const a = byCode.get(code);
      if (!a) throw new UsageError(`no such account: ${code}. Create it with \`holiday account add ${code}\`.`);
      return a;
    };

    const date = assertIsoDate(o.date);
    const derive = await makeDeriveWeight(store, config.functionalCurrency, date);
    const postings = o.leg.map((l) => parseLeg(l, amounts, config.functionalCurrency, resolve, derive));
    const result = Txn.create({
      id: nextUlid() as TxnId,
      date,
      bookingCommodity: config.functionalCurrency,
      payee: o.payee ?? null,
      narration: o.narration,
      postings,
    });
    if (!result.ok) {
      await store.close();
      throw new LedgerError('unbalanced', result.error.map(describeTxnError).join('\n'));
    }
    await store.unitOfWork((uow) => uow.appendTxn(result.value, { status: o.draft ? 'draft' : 'posted' }));
    await store.close();
    out({ id: result.value.id, status: o.draft ? 'draft' : 'posted', fxEstimated: result.value.fxEstimated });
  });

program
  .command('balance')
  .description('show balances')
  .option('--as-of <date>', 'ISO date')
  .option('--account <prefix>', 'restrict to a subtree, e.g. Assets')
  .action(async (o: { asOf?: string; account?: string }) => {
    const ws = requireWorkspace();
    const config = readConfig(ws);
    const store = await openLedger(ws);
    const rows = await store.read((r) =>
      r.getBalances({
        ...(o.asOf ? { asOf: assertIsoDate(o.asOf) } : {}),
        ...(o.account ? { accountPrefix: assertAccountPrefix(o.account) } : {}),
      }),
    );
    await store.close();
    if (jsonMode()) {
      return out(
        rows.map((r) => ({ ...r, unitsMinor: r.unitsMinor.toString(), weightMinor: r.weightMinor.toString() })),
      );
    }
    for (const r of rows) {
      const sign = BigInt(displaySignOf(accountTypeOf(r.accountCode)));
      const units = amounts.formatWithCode({ minor: r.unitsMinor * sign, commodity: r.commodity });
      const carrying =
        r.commodity === config.functionalCurrency
          ? ''
          : `  (${amounts.formatWithCode({ minor: r.weightMinor * sign, commodity: config.functionalCurrency })})`;
      note(`${r.accountCode.padEnd(40)} ${units.padStart(20)}${carrying}`);
    }
  });

const card = program.command('card').description('credit card billing cycles');

card
  .command('add <code>')
  .description('attach a billing cycle to a card liability account')
  .requiredOption('--funding <code>', 'the asset account the bill is paid from')
  .requiredOption('--close-day <n>', 'day the cycle closes, inclusive. 31 = month end (clamps)', Number)
  .requiredOption('--payment-day <n>', 'day the bill is paid. -1 = last day of month', Number)
  .option('--payment-month-offset <n>', 'months from close to payment', Number, 1)
  .option('--label <text>')
  .action(
    async (
      code: string,
      o: { funding: string; closeDay: number; paymentDay: number; paymentMonthOffset: number; label?: string },
    ) => {
      const ws = requireWorkspace();
      const store = await openLedger(ws);
      await store.unitOfWork(async (uow) => {
        const acct = await uow.getAccount(code);
        if (!acct) throw new UsageError(`no such account: ${code}`);
        const funding = await uow.getAccount(o.funding);
        if (!funding) throw new UsageError(`no such account: ${o.funding}`);
        await uow.upsertCard({
          accountId: acct.id,
          fundingAccountId: funding.id,
          rule: assertCardCycleRule({
            cycleCloseDay: o.closeDay,
            paymentMonthOffset: o.paymentMonthOffset,
            paymentDay: o.paymentDay,
          }),
          label: o.label ?? null,
        });
      });
      await store.close();

      // Show the rule's consequence, not just that it saved. "closes on the 14th"
      // is abstract; "today's coffee leaves your account on September 1st" is not.
      const dates = billingDatesFor(assertIsoDate(today()), {
        cycleCloseDay: o.closeDay,
        paymentMonthOffset: o.paymentMonthOffset,
        paymentDay: o.paymentDay,
      });
      out({ card: code, funding: o.funding, example: { purchasedToday: today(), ...dates } });
      note(`A purchase today (${today()}) closes ${dates.closeDate} and takes cash on ${dates.paymentDate}.`);
    },
  );

card
  .command('list')
  .description('cards and their billing rules')
  .action(async () => {
    const ws = requireWorkspace();
    const store = await openLedger(ws);
    const now = assertIsoDate(today());
    const result = await store.read(async (r) => {
      const accounts = new Map((await r.listAccounts()).map((a) => [a.id, a]));
      return (await r.listCards()).map((c) => ({
        card: c,
        code: accounts.get(c.accountId)?.code ?? '?',
        funding: accounts.get(c.fundingAccountId)?.code ?? '?',
        example: billingDatesFor(now, c.rule),
      }));
    });
    await store.close();

    if (jsonMode()) return out(result.map(({ card: c, code, funding }) => ({ ...c, code, funding })));
    if (result.length === 0) return note('no cards. Add one with `holiday card add`.');
    for (const { card: c, code, funding, example } of result) {
      const close = c.rule.cycleCloseDay === 31 ? '말일' : `${c.rule.cycleCloseDay}일`;
      const pay = c.rule.paymentDay === -1 ? '말일' : `${c.rule.paymentDay}일`;
      const when = c.rule.paymentMonthOffset === 0 ? '당월' : c.rule.paymentMonthOffset === 1 ? '익월' : `${c.rule.paymentMonthOffset}개월 후`;
      note(`${(c.label ?? code).padEnd(20)} ${close} 마감 → ${when} ${pay} 결제   ← ${funding}`);
      // The rule in the abstract is unverifiable by a human; a worked date is not.
      note(`${''.padEnd(20)} a purchase today (${now}) takes cash on ${example.paymentDate}`);
    }
  });

const installment = program.command('installment').description('할부 — a purchase split across N bills');

installment
  .command('add')
  .description('record an installment purchase and build its schedule')
  .requiredOption('--card <code>', 'the card whose statement carries the rows')
  .requiredOption('--expense <code>', 'what you bought')
  .requiredOption('--total <amount>', 'the full purchase amount')
  .requiredOption('--months <n>', 'term', Number)
  .option('--liability <code>', 'installment balance account (default: <card>:Installment)')
  .option('--date <date>', 'purchase date', today())
  .option('--payee <name>')
  .option('--label <text>')
  .option('--remainder-on <first|last>', 'which row absorbs the odd won', 'first')
  .option(
    '--fees <list>',
    '할부수수료 per row, comma-separated, READ OFF THE STATEMENT. One per month. Omit if 무이자.',
  )
  .action(
    async (o: {
      card: string;
      expense: string;
      total: string;
      months: number;
      liability?: string;
      date: string;
      payee?: string;
      label?: string;
      remainderOn: string;
      fees?: string;
    }) => {
      const ws = requireWorkspace();
      const config = readConfig(ws);
      const store = await openLedger(ws);

      const purchasedOn = assertIsoDate(o.date);
      const totalAmount = amounts.parse(o.total, config.functionalCurrency);

      const result = await store.unitOfWork(async (uow) => {
        const cardAccount = await uow.getAccount(o.card);
        if (!cardAccount) throw new UsageError(`no such account: ${o.card}`);
        const card = await uow.getCard(cardAccount.id);
        if (!card) {
          throw new UsageError(
            `${o.card} has no billing cycle, so an installment's payment dates cannot be computed. ` +
              `Run \`holiday card add ${o.card} --funding <bank> --close-day <n> --payment-day <n>\` first.`,
          );
        }
        const expense = await uow.getAccount(o.expense);
        if (!expense) throw new UsageError(`no such account: ${o.expense}`);

        // The installment balance MUST NOT share the card's ordinary account, or
        // ordinary billing would put the whole purchase on the first bill.
        const liabilityCode = o.liability ?? `${cardAccount.code}:Installment`;
        let liability = await uow.getAccount(liabilityCode);
        if (!liability) {
          liability = await uow.upsertAccount({
            id: nextUlid() as AccountId,
            code: assertAccountCode(liabilityCode),
            type: accountTypeOf(assertAccountCode(liabilityCode)),
            parentId: cardAccount.id,
            commodity: cardAccount.commodity,
            monetary: true,
            cash: false, // a liability is never cash on hand
            placeholder: false,
            openedOn: purchasedOn,
            closedOn: null,
          });
          note(`created ${liabilityCode} (installment balances are kept apart from ordinary card charges)`);
        }

        // Observed fees only. We will not compute 할부수수료 — see POLICY-006.
        const fees = o.fees
          ? o.fees.split(',').map((f: string) => amounts.parse(f.trim(), config.functionalCurrency).minor)
          : undefined;

        const rows = buildInstallmentSchedule({
          purchasedOn,
          months: o.months,
          totalMinor: totalAmount.minor,
          cardRule: card.rule,
          remainderOn: o.remainderOn === 'last' ? 'last' : 'first',
          ...(fees ? { fees } : {}),
        });

        // The debt is real the moment you walk out with the thing: the full amount
        // posts on the purchase date. Only the *cash* is spread out.
        const txn = Txn.create({
          id: nextUlid() as TxnId,
          date: purchasedOn,
          bookingCommodity: config.functionalCurrency,
          payee: o.payee ?? null,
          narration: o.label ?? `${o.months}개월 할부`,
          postings: [
            { accountId: expense.id, units: totalAmount },
            { accountId: liability.id, units: { minor: -totalAmount.minor, commodity: totalAmount.commodity } },
          ],
        });
        if (!txn.ok) throw new LedgerError('unbalanced', txn.error.map(describeTxnError).join('\n'));
        await uow.appendTxn(txn.value, { status: 'posted' });

        const id = nextUlid();
        await uow.upsertInstallment(
          {
            id,
            cardAccountId: cardAccount.id,
            liabilityAccountId: liability.id,
            txnId: txn.value.id,
            purchasedOn,
            months: o.months,
            totalMinor: totalAmount.minor,
            commodity: totalAmount.commodity,
            interestFree: !fees,
            label: o.label ?? null,
          },
          rows,
        );
        return { id, txnId: txn.value.id, rows };
      });
      await store.close();

      out({
        id: result.id,
        txnId: result.txnId,
        rows: result.rows.map((r) => ({
          seq: r.seq,
          paymentDate: r.paymentDate,
          amountMinor: (r.principalMinor + r.feeMinor).toString(),
        })),
      });
      const feeTotal = result.rows.reduce((s2, r) => s2 + r.feeMinor, 0n);
      note(
        `${o.months}개월 ${feeTotal === 0n ? '무이자' : '유이자'} 할부, ` +
          `${amounts.format(totalAmount)} ${config.functionalCurrency}. ` +
          `First ${result.rows[0]!.paymentDate}, last ${result.rows.at(-1)!.paymentDate}.`,
      );
      if (feeTotal > 0n) {
        note(`할부수수료 합계 ${amounts.format({ minor: feeTotal, commodity: totalAmount.commodity })} — 명세서에서 읽은 값 그대로. 계산하지 않음.`);
      }
      note(`실제 명세서와 다르면 \`holiday installment revise ${result.id}\`로 덮어쓰세요.`);
    },
  );

installment
  .command('revise <id>')
  .description('overwrite a schedule with what the statement actually says')
  // NOT --json: that is the global flag for machine-readable output, and reusing
  // the name makes commander resolve one of them and silently ignore the other.
  .requiredOption(
    '--data <json>',
    'JSON array: [{"seq":1,"paymentDate":"2026-09-01","principalMinor":"100000","feeMinor":"5000"}, …]. ' +
      'Read off the statement — this always wins over anything computed.',
  )
  .action(async (id: string, o: { data: string }) => {
    const ws = requireWorkspace();
    const store = await openLedger(ws);

    let parsed: unknown;
    try {
      parsed = JSON.parse(o.data);
    } catch (e) {
      throw new UsageError(`--data is not valid JSON: ${(e as Error).message}`);
    }
    const rows = REVISION_ROWS.parse(parsed).map((r) => ({
      seq: r.seq,
      paymentDate: assertIsoDate(r.paymentDate),
      principalMinor: BigInt(r.principalMinor),
      feeMinor: BigInt(r.feeMinor ?? '0'),
    }));

    const result = await store.unitOfWork(async (uow) => {
      const existing = await uow.getInstallment(id);
      if (!existing) throw new UsageError(`no such installment: ${id}`);

      // The issuer is the authority on its own numbers. The only thing checked is
      // that the principal still sums to the purchase — that is already posted as
      // debt, so a mismatch means one of us is looking at the wrong plan.
      const revised = reviseSchedule(rows, existing.plan.totalMinor);
      const feeTotal = revised.reduce((s2, r) => s2 + r.feeMinor, 0n);
      await uow.upsertInstallment(
        { ...existing.plan, months: revised.length, interestFree: feeTotal === 0n },
        revised,
      );
      return { revised, feeTotal, commodity: existing.plan.commodity };
    });
    await store.close();

    out({
      id,
      rows: result.revised.map((r) => ({
        seq: r.seq,
        paymentDate: r.paymentDate,
        principalMinor: r.principalMinor.toString(),
        feeMinor: r.feeMinor.toString(),
      })),
    });
    note(
      `${result.revised.length}회차로 덮어썼습니다. ` +
        `할부수수료 합계 ${amounts.format({ minor: result.feeTotal, commodity: result.commodity })}.`,
    );
  });

installment
  .command('list')
  .description('installments with money still to move')
  .action(async () => {
    const ws = requireWorkspace();
    const config = readConfig(ws);
    const store = await openLedger(ws);
    const now = assertIsoDate(today());
    const plans = await store.read((r) => r.listInstallments({ activeOn: now }));
    await store.close();

    if (jsonMode()) {
      return out(
        plans.map((p) => ({
          ...p.plan,
          totalMinor: p.plan.totalMinor.toString(),
          rows: p.rows.map((r) => ({ ...r, principalMinor: r.principalMinor.toString(), feeMinor: r.feeMinor.toString() })),
        })),
      );
    }
    for (const { plan, rows } of plans) {
      const remaining = rows.filter((r) => r.paymentDate > now);
      const left = remaining.reduce((s, r) => s + r.principalMinor + r.feeMinor, 0n);
      note(
        `${(plan.label ?? plan.id).padEnd(24)} ${amounts.format({ minor: plan.totalMinor, commodity: plan.commodity }).padStart(12)} ` +
          `/ ${plan.months}개월   남은 ${remaining.length}회 ${amounts.format({ minor: left, commodity: plan.commodity })}`,
      );
    }
    if (plans.length === 0) note('no active installments.');
  });

const recurring = program.command('recurring').description('정기지출 — rent, subscriptions, insurance');

recurring
  .command('add <label>')
  .description('register a recurring expense')
  .requiredOption('--expense <code>', 'what it pays for')
  .requiredOption('--funding <code>', 'a bank account (debits on the day) or a card (rides its cycle)')
  .requiredOption('--amount <amount>')
  .option('--day <n>', 'day of month. -1 = last day (말일)', Number, 1)
  .option('--yearly <month>', 'make it yearly, in this month (1-12)', Number)
  .option('--from <date>', 'active from', today())
  .option('--to <date>', 'active until (omit for open-ended)')
  .action(
    async (
      label: string,
      o: { expense: string; funding: string; amount: string; day: number; yearly?: number; from: string; to?: string },
    ) => {
      const ws = requireWorkspace();
      const config = readConfig(ws);
      const store = await openLedger(ws);

      const amount = amounts.parse(o.amount, config.functionalCurrency);
      const cadence = assertCadence(
        o.yearly === undefined
          ? { kind: 'monthly', dayOfMonth: o.day }
          : { kind: 'yearly', month: o.yearly, dayOfMonth: o.day },
      );

      const id = nextUlid();
      const viaCard = await store.unitOfWork(async (uow) => {
        const expense = await uow.getAccount(o.expense);
        if (!expense) throw new UsageError(`no such account: ${o.expense}`);
        const funding = await uow.getAccount(o.funding);
        if (!funding) throw new UsageError(`no such account: ${o.funding}`);

        await uow.upsertRecurring({
          id,
          label,
          expenseAccountId: expense.id,
          fundingAccountId: funding.id,
          amountMinor: amount.minor,
          commodity: amount.commodity,
          cadence,
          activeFrom: assertIsoDate(o.from),
          activeTo: o.to ? assertIsoDate(o.to) : null,
        });
        return funding.type === 'liability' ? await uow.getCard(funding.id) : null;
      });
      await store.close();

      out({ id, label, amountMinor: amount.minor.toString(), cadence });
      // Spell out the consequence: "funded from a card" is abstract, "the cash
      // does not move until the 1st" is the thing being asked about.
      if (viaCard) {
        const dates = billingDatesFor(assertIsoDate(today()), viaCard.rule);
        note(
          `${label}: ${amounts.format(amount)} ${config.functionalCurrency}, ${describeCadence(cadence)}, on ${o.funding}. ` +
            `Charged to the card — cash follows its cycle (a charge today would settle ${dates.paymentDate}).`,
        );
      } else {
        note(
          `${label}: ${amounts.format(amount)} ${config.functionalCurrency}, ${describeCadence(cadence)}, ` +
            `debited directly from ${o.funding} on the day.`,
        );
      }
    },
  );

recurring
  .command('list')
  .description('active recurring expenses')
  .action(async () => {
    const ws = requireWorkspace();
    const config = readConfig(ws);
    const store = await openLedger(ws);
    const now = assertIsoDate(today());
    const result = await store.read(async (r) => {
      const items = await r.listRecurring({ activeOn: now });
      const accounts = new Map((await r.listAccounts()).map((a) => [a.id, a]));
      return items.map((i) => ({ item: i, funding: accounts.get(i.fundingAccountId)?.code ?? '?' }));
    });
    await store.close();

    if (jsonMode()) {
      return out(result.map(({ item }) => ({ ...item, amountMinor: item.amountMinor.toString() })));
    }
    let monthly = 0n;
    for (const { item, funding } of result) {
      if (item.cadence.kind === 'monthly') monthly += item.amountMinor;
      note(
        `${item.label.padEnd(20)} ${amounts.format({ minor: item.amountMinor, commodity: item.commodity }).padStart(10)} ` +
          `${describeCadence(item.cadence).padEnd(14)} ${funding}`,
      );
    }
    if (result.length === 0) return note('no active recurring expenses.');
    note('');
    note(`monthly total: ${amounts.format({ minor: monthly, commodity: config.functionalCurrency })} ${config.functionalCurrency}`);
  });

const fx = program.command('fx').description('환율 — 절대 과거를 바꾸지 않는다');

fx
  .command('add <base> <quote> <rate>')
  .description('record a rate. 1 <base> = <rate> <quote>.')
  .requiredOption('--as-of <date>', 'the date this rate is for')
  .option('--source <name>', 'where it came from', 'manual')
  .action(async (base: string, quote: string, rateText: string, o: { asOf: string; source: string }) => {
    const ws = requireWorkspace();
    const store = await openLedger(ws);
    const asOf = assertIsoDate(o.asOf);
    const b = registry.get(base).code;
    const qc = registry.get(quote).code;

    const written = await store.unitOfWork((uow) =>
      uow.putFxRates([
        { id: nextUlid(), asOf, base: b, quote: qc, rate: rateText, source: o.source, fetchedAt: nowIso() },
      ]),
    );
    await store.close();
    out({ base: b, quote: qc, rate: rateText, asOf, source: o.source, written });
    note(`1 ${b} = ${rateText} ${qc} (${asOf}, ${o.source})`);
    // The property that makes rates safe to correct.
    note(`이미 기표된 weight는 바뀌지 않습니다. 환율은 앞으로의 유도와 재평가에만 쓰입니다.`);
  });

fx
  .command('list')
  .description('rates on file')
  .option('--base <code>')
  .option('--quote <code>')
  .action(async (o: { base?: string; quote?: string }) => {
    const ws = requireWorkspace();
    const store = await openLedger(ws);
    const rates = await store.read((r) =>
      r.listFxRates({
        ...(o.base ? { base: registry.get(o.base).code } : {}),
        ...(o.quote ? { quote: registry.get(o.quote).code } : {}),
      }),
    );
    await store.close();
    if (jsonMode()) return out(rates);
    if (rates.length === 0) return note('환율이 없습니다. `holiday fx add USD KRW 1333.33 --as-of <date>`');
    for (const r of rates) note(`${r.asOf}  1 ${r.base} = ${r.rate.padStart(12)} ${r.quote}   ${r.source}`);
  });

fx
  .command('show <base> <quote>')
  .description('which rate would be used, and why')
  .option('--as-of <date>', 'ISO date', today())
  .action(async (base: string, quote: string, o: { asOf: string }) => {
    const ws = requireWorkspace();
    const config = readConfig(ws);
    const store = await openLedger(ws);
    const asOf = assertIsoDate(o.asOf);
    const result = await store.read(async (r) => {
      const book = await r.getBook();
      const rates = await r.listFxRates({ to: asOf });
      return resolveRate(rates, {
        base: registry.get(base).code,
        quote: registry.get(quote).code,
        asOf,
        maxStalenessDays: book.fxMaxStalenessDays,
        functional: config.functionalCurrency,
      });
    });
    await store.close();
    out({ kind: result.kind, rate: formatRate(result.rate), asOf: result.asOf, rateIds: result.rateIds });
    // Resolution has a strict order, each step worse than the last. Saying which
    // one fired is how a user knows whether to trust the number.
    note(`1 ${base} = ${formatRate(result.rate)} ${quote}`);
    note(`  ${result.kind} — ${result.explanation}`);
  });

const ingest = program.command('ingest').description('캡쳐에서 읽은 거래를 원장에 넣기');

ingest
  .command('submit')
  .description('record parsed transactions as DRAFTS for review. Never does OCR — you are the parser.')
  // NOT --json: that is the global machine-output flag, and commander resolves
  // one of them while silently ignoring the other. Made this mistake twice.
  .requiredOption('--data <submission>', 'see the schema in src/ingest.ts. Legs, not a flat amount.')
  .option('--image <path>', 'the screenshot, so the same file cannot be ingested twice')
  .option('--idem-key <key>', 'retry-safe. Same key + same request replays the stored result.')
  .action(async (o: { data: string; image?: string; idemKey?: string }) => {
    const ws = requireWorkspace();
    const config = readConfig(ws);
    const store = await openLedger(ws);

    let parsed: unknown;
    try {
      parsed = JSON.parse(o.data);
    } catch (e) {
      throw new UsageError(`--data is not valid JSON: ${(e as Error).message}`);
    }
    const submission = INGEST_SUBMISSION.parse(parsed);

    // Hash the image ourselves when we can see it. This is the one duplicate
    // check that can block without ever being wrong: identical bytes are the
    // same screenshot.
    let sourceSha = submission.sourceSha256 ?? null;
    if (o.image) {
      const { readFile } = await import('node:fs/promises');
      sourceSha = await sha256Bytes(new Uint8Array(await readFile(o.image)));
    }

    const requestSha = await sha256(o.data);
    const replay = o.idemKey ? await store.read((r) => r.getCommandResult(o.idemKey!)) : null;
    if (replay) {
      // An agent shelling out to a CLI WILL retry on timeout. Double-posting is
      // the one failure mode that destroys trust in a ledger.
      await store.close();
      if (replay.requestSha256 !== requestSha) {
        throw new UsageError(
          `idem-key ${o.idemKey} was already used for a DIFFERENT request. Keys are per operation.`,
        );
      }
      note('(replayed — this exact submission already ran)');
      process.stdout.write(`${replay.responseJson}\n`);
      return;
    }

    const result = await store.unitOfWork(async (uow) => {
      if (sourceSha) {
        const seen = await uow.findIngestBatchBySha(sourceSha);
        if (seen) {
          throw new LedgerError(
            'duplicate_image',
            `this exact image was already ingested on ${seen.submittedAt} (${seen.itemCount} item(s)). ` +
              `Dropping the same file twice is always a mistake.`,
          );
        }
      }

      const accounts = await uow.listAccounts();
      const byCode = new Map(accounts.map((a) => [a.code as string, a]));
      const byId = new Map(accounts.map((a) => [a.id, a]));
      const resolve = (code: string): Account => {
        const a = byCode.get(code);
        if (!a) throw new UsageError(`no such account: ${code}. Create it before ingesting.`);
        return a;
      };

      // Everything already in the ledger that a near-duplicate could match.
      const existing: ExistingTxn[] = [];
      for await (const p of uow.streamPostings({ from: addMonthsIso(today(), -2) as IsoDate })) {
        const t = await uow.getTxn(p.txnId);
        existing.push({
          txnId: p.txnId,
          accountId: p.accountId,
          date: p.txnDate,
          unitsMinor: p.unitsMinor,
          commodity: p.commodity,
          merchant: t?.txn.payee ?? null,
        });
      }

      const batchId = nextUlid();
      await uow.recordIngestBatch({
        id: batchId,
        sourceSha256: sourceSha ?? `no-image:${batchId}`,
        sourceName: submission.sourceName ?? (o.image ? o.image.split('/').at(-1)! : null),
        submittedAt: nowIso(),
        itemCount: submission.items.length,
      });

      const out: {
        itemId: string;
        txnId: string;
        status: string;
        warnings: string[];
      }[] = [];

      for (const item of submission.items) {
        const postings = item.legs.map((l) =>
          parseLeg(
            `${l.account} ${l.amount} ${l.commodity}${l.weight ? ` @@ ${l.weight}` : ''}`,
            amounts,
            config.functionalCurrency,
            resolve,
          ),
        );
        // The balance rule runs HERE, on the draft. An unbalanced draft cannot be
        // created, which is what makes accepting one later a status flip that
        // cannot fail.
        const txn = Txn.create({
          id: nextUlid() as TxnId,
          date: assertIsoDate(item.date),
          bookingCommodity: config.functionalCurrency,
          payee: item.payee ?? null,
          narration: item.narration ?? '',
          sourceItemId: batchId,
          postings,
        });
        if (!txn.ok) throw new LedgerError('unbalanced', txn.error.map(describeTxnError).join('\n'));

        const moneyLeg = pickMoneyLeg(txn.value.postings, byId, item);
        const candidate: ParsedTxn = {
          accountId: moneyLeg.accountId,
          date: assertIsoDate(item.date),
          unitsMinor: moneyLeg.units.minor,
          commodity: moneyLeg.units.commodity,
          merchant: item.payee ?? null,
          externalRef: item.externalRef ?? null,
        };
        const { key, authority } = await dedupeKey(candidate);

        const priorItems = await uow.findIngestItemsByDedupeKey(key);
        if (authority === 'external_ref' && priorItems.length > 0) {
          // The issuer's own id. Nothing is more authoritative about their record.
          throw new LedgerError(
            'duplicate_external_ref',
            `transaction ${item.externalRef} is already ingested (item ${priorItems[0]!.id}, ` +
              `${priorItems[0]!.status}). The issuer's id says this is the same transaction.`,
          );
        }

        const near = findNearDuplicates(candidate, existing);
        const warnings = near.map(
          (n) => `possible duplicate of ${n.txnId} (${n.date}, ${n.merchant ?? '?'}): ${n.reason}`,
        );
        if (authority === 'natural' && priorItems.length > 0) {
          warnings.push(
            `an earlier ingest had the same account, date, amount and merchant (item ${priorItems[0]!.id}) — ` +
              `but two identical purchases in a day are real, so this is only a warning`,
          );
        }

        await uow.appendTxn(txn.value, { status: 'draft' });
        const itemId = nextUlid();
        await uow.recordIngestItem({
          id: itemId,
          batchId,
          dedupeKey: key,
          dedupeAuthority: authority,
          externalRef: item.externalRef ?? null,
          merchant: item.payee ?? null,
          txnId: txn.value.id,
          status: 'pending',
          reason: null,
          // Verbatim, so a misread has an audit trail.
          parsedJson: JSON.stringify(item),
          createdAt: nowIso(),
        });
        out.push({ itemId, txnId: txn.value.id, status: 'pending', warnings });
      }
      return { batchId, items: out };
    });

    const response = JSON.stringify(result);
    if (o.idemKey) {
      await store.unitOfWork((uow) =>
        uow.recordCommandResult({
          idemKey: o.idemKey!,
          requestSha256: requestSha,
          responseJson: response,
          createdAt: nowIso(),
        }),
      );
    }
    await store.close();

    out(result);
    note(`${result.items.length}건을 DRAFT로 기록했습니다. 잔액·리포트에서 제외됩니다.`);
    for (const i of result.items) for (const w of i.warnings) note(`  ⚠ ${w}`);
    note(`검토: \`holiday review list\` → \`holiday review accept <id>\``);
  });

const review = program.command('review').description('드래프트 검토 — 승인 전엔 장부가 아니다');

review
  .command('list')
  .description('drafts waiting for a human')
  .action(async () => {
    const ws = requireWorkspace();
    const config = readConfig(ws);
    const store = await openLedger(ws);
    const result = await store.read(async (r) => {
      const items = await r.listIngestItems({ status: 'pending' });
      const accounts = new Map((await r.listAccounts()).map((a) => [a.id, a]));
      return Promise.all(
        items.map(async (i) => ({ item: i, txn: i.txnId ? await r.getTxn(i.txnId) : null, accounts })),
      );
    });
    await store.close();

    if (jsonMode()) {
      return out(
        result.map(({ item, txn }) => ({
          id: item.id,
          txnId: item.txnId,
          date: txn?.txn.date,
          payee: txn?.txn.payee,
          merchant: item.merchant,
        })),
      );
    }
    if (result.length === 0) return note('검토할 드래프트가 없습니다.');
    for (const { item, txn, accounts } of result) {
      if (!txn) continue;
      note(`${item.id}  ${txn.txn.date}  ${txn.txn.payee ?? txn.txn.narration}`);
      for (const p of txn.txn.postings) {
        note(
          `    ${(accounts.get(p.accountId)?.code ?? '?').padEnd(36)} ` +
            `${amounts.formatWithCode(p.units).padStart(16)}`,
        );
      }
    }
    note('');
    note(`${result.length}건 대기. \`holiday review accept <id>\` / \`reject <id> --reason\``);
  });

review
  .command('accept <id>')
  .description('promote a draft to posted. Cannot fail — it is already balanced.')
  .option('--idem-key <key>')
  .action(async (id: string, o: { idemKey?: string }) => {
    const ws = requireWorkspace();
    const store = await openLedger(ws);
    const result = await store.unitOfWork(async (uow) => {
      const items = await uow.listIngestItems();
      const item = items.find((i) => i.id === id);
      if (!item) throw new UsageError(`no such review item: ${id}`);
      if (item.status !== 'pending') throw new UsageError(`item ${id} is already ${item.status}`);
      if (!item.txnId) throw new UsageError(`item ${id} has no transaction`);
      await uow.promoteDraft(item.txnId);
      await uow.setIngestItemStatus(id, 'accepted', {});
      return { id, txnId: item.txnId };
    });
    await store.close();
    out({ ...result, status: 'accepted' });
    note(`승인됨. 이제 잔액과 현금흐름에 들어갑니다.`);
  });

review
  .command('reject <id>')
  .description('reject a draft. The row is KEPT — it is dedup memory.')
  .requiredOption('--reason <text>')
  .action(async (id: string, o: { reason: string }) => {
    const ws = requireWorkspace();
    const store = await openLedger(ws);
    await store.unitOfWork(async (uow) => {
      const items = await uow.listIngestItems();
      const item = items.find((i) => i.id === id);
      if (!item) throw new UsageError(`no such review item: ${id}`);
      if (item.status !== 'pending') throw new UsageError(`item ${id} is already ${item.status}`);
      if (item.txnId) await uow.rejectDraft(item.txnId, o.reason);
      await uow.setIngestItemStatus(id, 'rejected', { reason: o.reason });
    });
    await store.close();
    out({ id, status: 'rejected', reason: o.reason });
    // Deleting it would let the same screenshot be re-proposed forever.
    note(`거부됨. 기록은 남습니다 — 같은 캡쳐가 다시 제안되는 걸 막는 기억입니다.`);
  });

const loan = program.command('loan').description('대출 — 상환 스케줄과 대사');

loan
  .command('add <code>')
  .description('attach an amortization schedule to a loan liability account')
  .requiredOption('--funding <code>', 'the asset account payments come from')
  .requiredOption('--interest <code>', 'the expense account interest is booked to')
  .requiredOption('--principal <amount>', 'the loan amount')
  .requiredOption('--rate <percent>', 'annual rate as the contract writes it, e.g. 4.2')
  .requiredOption('--months <n>', 'term', Number)
  .requiredOption('--first-payment <date>', 'due date of the first payment')
  .option('--method <m>', 'annuity | equal_principal | bullet | interest_only', 'annuity')
  .option('--payment-day <n>', 'day of month payments land. -1 = 말일', Number)
  .option('--label <text>')
  .action(
    async (
      code: string,
      o: {
        funding: string;
        interest: string;
        principal: string;
        rate: string;
        months: number;
        firstPayment: string;
        method: string;
        paymentDay?: number;
        label?: string;
      },
    ) => {
      const ws = requireWorkspace();
      const config = readConfig(ws);
      const store = await openLedger(ws);

      const firstPaymentDate = assertIsoDate(o.firstPayment);
      const principal = amounts.parse(o.principal, config.functionalCurrency);
      const annual = parseAnnualPercent(o.rate);
      const method = o.method as AmortizationMethod;
      const paymentDay = o.paymentDay ?? Number(firstPaymentDate.slice(8, 10));

      const rows = buildLoanSchedule({
        principalMinor: principal.minor,
        monthlyRate: monthlyFromAnnual(annual),
        method,
        termMonths: o.months,
        firstPaymentDate,
        paymentDay,
      });

      await store.unitOfWork(async (uow) => {
        const acct = await uow.getAccount(code);
        if (!acct) throw new UsageError(`no such account: ${code}`);
        const funding = await uow.getAccount(o.funding);
        if (!funding) throw new UsageError(`no such account: ${o.funding}`);
        const interest = await uow.getAccount(o.interest);
        if (!interest) throw new UsageError(`no such account: ${o.interest}`);
        await uow.upsertLoan(
          {
            accountId: acct.id,
            fundingAccountId: funding.id,
            interestAccountId: interest.id,
            principalMinor: principal.minor,
            commodity: principal.commodity,
            annualRateText: o.rate,
            method,
            termMonths: o.months,
            firstPaymentDate,
            paymentDay,
            label: o.label ?? null,
          },
          rows,
        );
      });
      await store.close();

      const money = (m: bigint) => amounts.format({ minor: m, commodity: principal.commodity });
      out({
        loan: code,
        method,
        rows: rows.length,
        firstPayment: rows[0]!.dueDate,
        lastPayment: rows.at(-1)!.dueDate,
        totalInterestMinor: scheduleInterest(rows).toString(),
      });
      note(
        `${describeMethod(method)} ${money(principal.minor)} @ ${formatAnnualPercent(annual)}% × ${o.months}개월. ` +
          `${rows[0]!.dueDate} ~ ${rows.at(-1)!.dueDate}.`,
      );
      // The number a borrower actually wants and never gets told: what it costs.
      note(`1회차 ${money(rows[0]!.principalMinor + rows[0]!.interestMinor)} (원금 ${money(rows[0]!.principalMinor)} + 이자 ${money(rows[0]!.interestMinor)})`);
      note(`총 이자 ${money(scheduleInterest(rows))}`);
      note(`이건 예측입니다. 실제 잔액과 어긋나는지는 \`holiday loan check\`.`);
    },
  );

loan
  .command('list')
  .description('loans and where they stand')
  .action(async () => {
    const ws = requireWorkspace();
    const config = readConfig(ws);
    const store = await openLedger(ws);
    const now = assertIsoDate(today());
    const result = await store.read(async (r) => {
      const accounts = new Map((await r.listAccounts()).map((a) => [a.id, a]));
      const loans = await r.listLoans();
      const balances = await r.getBalances({ asOf: now });
      return loans.map((l) => ({
        ...l,
        code: accounts.get(l.loan.accountId)?.code ?? '?',
        balance: balances
          .filter((b) => b.accountId === l.loan.accountId)
          .reduce((s, b) => s + b.weightMinor, 0n),
      }));
    });
    await store.close();

    if (jsonMode()) {
      return out(
        result.map((l) => ({
          ...l.loan,
          code: l.code,
          principalMinor: l.loan.principalMinor.toString(),
          outstandingMinor: (-l.balance).toString(),
        })),
      );
    }
    if (result.length === 0) return note('no loans.');
    for (const l of result) {
      const money = (m: bigint) => amounts.format({ minor: m, commodity: l.loan.commodity });
      note(
        `${(l.loan.label ?? l.code).padEnd(24)} ${describeMethod(l.loan.method).padEnd(14)} ` +
          `${l.loan.annualRateText}% × ${l.loan.termMonths}개월   잔액 ${money(-l.balance)}`,
      );
    }
  });

loan
  .command('check [code]')
  .description('does the ledger agree with the schedule')
  .option('--as-of <date>', 'ISO date', today())
  .action(async (code: string | undefined, o: { asOf: string }) => {
    const ws = requireWorkspace();
    const config = readConfig(ws);
    const store = await openLedger(ws);
    const asOf = assertIsoDate(o.asOf);

    const results = await store.read(async (r) => {
      const accounts = new Map((await r.listAccounts()).map((a) => [a.id, a]));
      const all = await r.listLoans();
      const wanted = code ? all.filter((l) => accounts.get(l.loan.accountId)?.code === code) : all;
      if (code && wanted.length === 0) throw new UsageError(`no loan on account: ${code}`);

      const balances = await r.getBalances({ asOf });
      return wanted.map((l) => {
        const ledgerBalanceMinor = balances
          .filter((b) => b.accountId === l.loan.accountId)
          .reduce((s, b) => s + b.weightMinor, 0n);
        return {
          code: accounts.get(l.loan.accountId)?.code ?? '?',
          label: l.loan.label,
          commodity: l.loan.commodity,
          result: loanCheck({
            rows: l.rows,
            ledgerBalanceMinor,
            asOf,
            principalMinor: l.loan.principalMinor,
          }),
        };
      });
    });
    await store.close();

    if (jsonMode()) {
      return out(
        results.map((r) => ({
          code: r.code,
          ok: r.result.ok,
          expectedMinor: r.result.expectedMinor.toString(),
          actualMinor: r.result.actualMinor.toString(),
          deltaMinor: r.result.deltaMinor.toString(),
          explanation: r.result.explanation,
        })),
      );
    }
    if (results.length === 0) return note('no loans to check.');

    let bad = 0;
    for (const r of results) {
      const money = (m: bigint) => amounts.format({ minor: m, commodity: r.commodity });
      note(`${r.label ?? r.code}  (${asOf})`);
      note(`  스케줄:  ${money(r.result.expectedMinor).padStart(16)}`);
      note(`  원장:    ${money(r.result.actualMinor).padStart(16)}`);
      if (r.result.ok) {
        note(`  ✓ ${r.result.explanation}`);
      } else {
        bad += 1;
        note(`  ⚠ 차이 ${money(r.result.deltaMinor)}`);
        note(`    ${r.result.explanation}`);
      }
      note('');
    }
    if (bad > 0) throw new LedgerError('loan_drift', `${bad} loan(s) disagree with their schedule`);
  });

loan
  .command('pay <code>')
  .description('record a loan payment, split into principal and interest by the schedule')
  .requiredOption('--date <date>', 'the due date being paid')
  .option('--amount <amount>', 'what actually left the account, if it differs from the schedule')
  .action(async (code: string, o: { date: string; amount?: string }) => {
    const ws = requireWorkspace();
    const config = readConfig(ws);
    const store = await openLedger(ws);
    const date = assertIsoDate(o.date);

    const result = await store.unitOfWork(async (uow) => {
      const acct = await uow.getAccount(code);
      if (!acct) throw new UsageError(`no such account: ${code}`);
      const l = await uow.getLoan(acct.id);
      if (!l) throw new UsageError(`${code} has no loan schedule. Add one with \`holiday loan add\`.`);

      const row: LoanScheduleRow | null = rowForDate(l.rows, date);
      if (!row) {
        throw new UsageError(
          `the schedule has no payment due on ${date}. Due dates are ` +
            `${l.rows[0]!.dueDate}, ${l.rows[1]?.dueDate ?? '…'}, … — check the date, or record it with \`holiday txn add\`.`,
        );
      }

      // The whole point of the loan module. A statement says "₩1,247,300 paid to
      // KB" and nothing else; neither the user nor a vision model can split that
      // without the schedule.
      const scheduled = row.principalMinor + row.interestMinor;
      const paid = o.amount ? amounts.parse(o.amount, l.loan.commodity).minor : scheduled;
      if (paid !== scheduled) {
        // Do NOT silently reallocate. Interest is what the lender charged; the
        // difference is principal, and if that is wrong the user needs to see it
        // rather than have us quietly rebalance the entry.
        note(`⚠ 실제 ${paid}, 스케줄 ${scheduled}. 차액을 원금에 반영합니다 — 명세서와 대조하세요.`);
      }
      const interest = row.interestMinor;
      const principal = paid - interest;
      if (principal < 0n) {
        throw new UsageError(
          `${paid} does not even cover the scheduled interest (${interest}). ` +
            `Record this by hand with \`holiday txn add\` — this is not an ordinary payment.`,
        );
      }

      const txn = Txn.create({
        id: nextUlid() as TxnId,
        date,
        bookingCommodity: config.functionalCurrency,
        payee: l.loan.label ?? code,
        narration: `${row.seq}/${l.loan.termMonths} 상환`,
        postings: [
          { accountId: acct.id, units: amounts.fromMinor(principal, l.loan.commodity) },
          { accountId: l.loan.interestAccountId, units: amounts.fromMinor(interest, l.loan.commodity) },
          { accountId: l.loan.fundingAccountId, units: amounts.fromMinor(-paid, l.loan.commodity) },
        ],
      });
      if (!txn.ok) throw new LedgerError('unbalanced', txn.error.map(describeTxnError).join('\n'));
      await uow.appendTxn(txn.value, { status: 'posted' });
      return { txnId: txn.value.id, seq: row.seq, principal, interest, paid, commodity: l.loan.commodity };
    });
    await store.close();

    const money = (m: bigint) => amounts.format({ minor: m, commodity: result.commodity });
    out({
      id: result.txnId,
      seq: result.seq,
      principalMinor: result.principal.toString(),
      interestMinor: result.interest.toString(),
    });
    note(`${result.seq}회차 ${money(result.paid)} = 원금 ${money(result.principal)} + 이자 ${money(result.interest)}`);
  });

program
  .command('cashflow')
  .description('will the cash survive the card bills that are already coming')
  .option('--until <date>', 'projection horizon', addMonthsIso(today(), 3))
  .action(async (o: { until: string }) => {
    const ws = requireWorkspace();
    const config = readConfig(ws);
    const store = await openLedger(ws);

    const now = assertIsoDate(today());
    const until = assertIsoDate(o.until);

    const result = await store.read(async (r) => {
      const accounts = await r.listAccounts();
      const byId = new Map(accounts.map((a) => [a.id, a]));
      const cards = (await r.listCards()).map((c) => ({
        accountId: c.accountId,
        accountCode: byId.get(c.accountId)!.code,
        fundingAccountId: c.fundingAccountId,
        rule: c.rule,
        label: c.label,
      }));

      // The historical half of a cash flow statement is a QUERY, never a
      // maintained table — that is what stops it drifting from the ledger.
      const cashIds = new Set(accounts.filter((a) => a.cash).map((a) => a.id));
      const balances = await r.getBalances({ asOf: now });
      const openingCash = balances
        .filter((b) => cashIds.has(b.accountId))
        .reduce((s, b) => s + b.weightMinor, 0n);
      // An asset account nobody marked as cash is either deliberate or an
      // oversight, and only the user knows which. Saying nothing makes the
      // oversight invisible.
      const unmarked = accounts.filter((a) => a.type === 'asset' && !a.cash && !a.placeholder && !a.closedOn);

      const postings: ProjectionPosting[] = [];
      for await (const p of r.streamPostings({ from: addMonthsIso(today(), -4) as IsoDate })) {
        postings.push({
          txnId: p.txnId,
          txnDate: p.txnDate,
          accountId: p.accountId,
          weightMinor: p.weightMinor,
          commodity: p.commodity,
        });
      }

      // Installments are NOT derived from postings: their postings all sit on the
      // purchase date, and only the schedule knows a twelfth moves each month.
      const installments = (await r.listInstallments({ activeOn: now })).map((i) => ({
        id: i.plan.id,
        cardAccountId: i.plan.cardAccountId,
        liabilityAccountId: i.plan.liabilityAccountId,
        label: i.plan.label,
        months: i.plan.months,
        rows: i.rows,
      }));
      const recurring = await r.listRecurring({ activeOn: now });
      const loans = (await r.listLoans()).map((l) => ({
        accountId: l.loan.accountId,
        fundingAccountId: l.loan.fundingAccountId,
        label: l.loan.label,
        termMonths: l.loan.termMonths,
        rows: l.rows,
      }));
      return { cards, openingCash, postings, installments, recurring, unmarked, loans };
    });
    await store.close();

    const fundingByCard = new Map(result.cards.map((c) => [c.accountId, c.fundingAccountId]));
    const cardRules = new Map(
      result.cards.map((c) => [c.accountId, { rule: c.rule, fundingAccountId: c.fundingAccountId }]),
    );
    const orphaned = result.installments.filter((i) => !fundingByCard.has(i.cardAccountId));

    const bills = projectCardBills({ cards: result.cards, postings: result.postings, today: now, until });
    const instRows = projectInstallments({ installments: result.installments, fundingByCard, today: now, until });
    const recRows = projectRecurring({ recurring: result.recurring, cardRules, today: now, until });
    const loanRows = projectLoans({ loans: result.loans, today: now, until });
    const runway = cashRunway<ProjectedOutflow>(result.openingCash, [
      ...bills,
      ...instRows,
      ...recRows,
      ...loanRows,
    ]);

    if (jsonMode()) {
      return out({
        openingCashMinor: result.openingCash.toString(),
        commodity: config.functionalCurrency,
        runway: runway.map((p) => ({
          date: p.date,
          outflowMinor: p.outflowMinor.toString(),
          balanceAfterMinor: p.balanceAfterMinor.toString(),
          items: p.items.map((b) => ({
            kind: b.kind ?? 'card',
            label: describeOutflow(b),
            amountMinor: b.amountMinor.toString(),
          })),
        })),
      });
    }

    const money = (m: bigint) => amounts.format({ minor: m, commodity: config.functionalCurrency });
    // Never let coverage shrink silently: a projection that quietly omits an
    // outflow reads as reassurance when it should read as "I don't know".
    for (const o of orphaned) {
      note(`⚠ installment "${o.label ?? o.id}" is on a card with no billing cycle and is NOT in this projection.`);
    }
    for (const a of result.unmarked) {
      note(`⚠ ${a.code} is not marked --cash and is NOT counted as cash on hand.`);
    }
    note(`cash on hand (${now}):  ${money(result.openingCash)} ${config.functionalCurrency}`);
    if (runway.length === 0) {
      note(`no card bills projected through ${until}.`);
      return;
    }
    note('');
    for (const p of runway) {
      const short = p.balanceAfterMinor < 0n;
      note(`${p.date}   -${money(p.outflowMinor).padStart(12)}   →  ${money(p.balanceAfterMinor).padStart(12)}${short ? '   ⚠ SHORT' : ''}`);
      for (const b of p.items) {
        note(`             ${describeOutflow(b).padEnd(30)} ${money(b.amountMinor).padStart(12)}`);
      }
    }
    const worst = runway.reduce((a, b) => (b.balanceAfterMinor < a.balanceAfterMinor ? b : a));
    note('');
    if (worst.balanceAfterMinor < 0n) {
      note(`⚠ Short by ${money(-worst.balanceAfterMinor)} ${config.functionalCurrency} on ${worst.date}.`);
    } else {
      note(`Lowest point: ${money(worst.balanceAfterMinor)} ${config.functionalCurrency} on ${worst.date}.`);
    }
  });

/**
 * Which leg identifies the transaction for duplicate detection.
 *
 * The card or the bank — not the category. Two people can categorise the same
 * purchase differently; the money side is what the issuer actually recorded.
 */
function pickMoneyLeg(
  postings: readonly { accountId: AccountId; units: { minor: bigint; commodity: CommodityCode } }[],
  byId: ReadonlyMap<AccountId, Account>,
  item: IngestItemInput,
): { accountId: AccountId; units: { minor: bigint; commodity: CommodityCode } } {
  if (item.dedupeOn) {
    const wanted = postings.find((p) => byId.get(p.accountId)?.code === item.dedupeOn);
    if (!wanted) throw new UsageError(`dedupeOn names ${item.dedupeOn}, which is not one of the legs`);
    return wanted;
  }
  const money = postings.find((p) => {
    const t = byId.get(p.accountId)?.type;
    return t === 'liability' || t === 'asset';
  });
  if (!money) {
    throw new UsageError(
      'no liability or asset leg to identify this transaction by. Add "dedupeOn" naming the card or bank account.',
    );
  }
  return money;
}

/**
 * Build a rate-deriving closure for ONE transaction date.
 *
 * Resolves each commodity's rate at most once and caches it, so every leg in the
 * transaction sees the identical rate. That is what makes a same-currency foreign
 * charge cancel to exactly zero — two legs of ±$12.50 through one rate sum to 0
 * no matter what the rate is, while two independent lookups could differ by a won
 * and break the balance rule.
 */
async function makeDeriveWeight(
  store: Awaited<ReturnType<typeof openLedger>>,
  functional: CommodityCode,
  date: IsoDate,
): Promise<DeriveWeight | undefined> {
  const { rates, staleness } = await store.read(async (r) => ({
    rates: await r.listFxRates({ to: date }),
    staleness: (await r.getBook()).fxMaxStalenessDays,
  }));
  if (rates.length === 0) return undefined;

  const cache = new Map<string, { rate: bigint; text: string; id: string | null }>();
  return (units) => {
    let hit = cache.get(units.commodity);
    if (!hit) {
      const resolved = resolveRate(rates, {
        base: units.commodity,
        quote: functional,
        asOf: date,
        maxStalenessDays: staleness,
        functional,
      });
      hit = { rate: resolved.rate, text: formatRate(resolved.rate), id: resolved.rateIds[0] ?? null };
      cache.set(units.commodity, hit);
    }
    return {
      weightMinor: convert(units.minor, hit.rate, registry.exponentOf(units.commodity), registry.exponentOf(functional)),
      fxRateText: hit.text,
      fxRateId: hit.id,
    };
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

function describeOutflow(b: ProjectedOutflow): string {
  if (b.kind === 'loan') return `${b.label ?? '대출'} (${b.seq}/${b.termMonths})`;
  if (b.kind === 'installment') return `${b.label ?? '할부'} (${b.seq}/${b.months})`;
  if (b.kind === 'recurring') {
    // Show the charge date when a card sits in between, since "why is this here"
    // is otherwise unanswerable: the money is leaving weeks after the charge.
    return b.viaCardAccountId ? `${b.label} (${b.occurredOn} 결제분)` : b.label;
  }
  return `${b.cardLabel ?? b.cardCode}  ${b.cycleFrom}..${b.cycleTo}`;
}

function addMonthsIso(date: string, delta: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const zero = m - 1 + delta;
  const ny = y + Math.floor(zero / 12);
  const nm = (((zero % 12) + 12) % 12) + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${String(ny).padStart(4, '0')}-${String(nm).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
}

program
  .command('verify')
  .description('scan the whole ledger and the audit chain')
  .option('--head', 'print the audit chain head — anchor this outside the file', false)
  .action(async (o: { head: boolean }) => {
    const ws = requireWorkspace();
    const store = await openLedger(ws);
    const report = await store.unitOfWork((uow) => uow.verify());
    const head = await store.chainHead();
    await store.close();

    if (jsonMode()) return out({ ...report, head });
    if (o.head) note(head ? `chain head: #${head.seq} ${head.hash}` : 'chain head: (empty ledger)');
    if (report.ok) {
      note(`OK — ${report.checked} transaction(s) checked, audit chain intact.`);
      return;
    }
    for (const p of report.problems) note(`${p.kind}  ${p.subject}\n  ${p.detail}`);
    throw new LedgerError('verify_failed', `${report.problems.length} problem(s) found`);
  });

program
  .command('checkpoint')
  .description('fold the WAL back into ledger.db — run before committing')
  .action(async () => {
    const ws = requireWorkspace();
    const store = await openLedger(ws);
    await store.checkpoint();
    await store.close();
    note('WAL checkpointed. ledger.db is safe to commit.');
  });

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function jsonMode(): boolean {
  return process.argv.includes('--json');
}

function out(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, jsonMode() ? 2 : 0)}\n`);
}

function note(s: string): void {
  if (!jsonMode()) process.stderr.write(`${s}\n`);
}

class LedgerError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

program.option('--json', 'machine-readable output on stdout');

/**
 * Errors leave as a single JSON envelope on stderr, always.
 *
 * The primary caller is an agent, not a person: a stack trace is unparseable and
 * a bare message is ambiguous. Exit 2 means "you asked for something impossible",
 * exit 1 means "the ledger says no".
 */
program.parseAsync().catch((e: unknown) => {
  const code = e instanceof UsageError ? 'usage' : e instanceof LedgerError ? e.code : 'internal';
  const message = e instanceof Error ? e.message : String(e);
  process.stderr.write(`${JSON.stringify({ error: { code, message } })}\n`);
  process.exit(code === 'usage' ? 2 : 1);
});
