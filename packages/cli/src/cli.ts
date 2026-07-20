// Loaded dynamically by main.ts, AFTER env.ts has patched process.emitWarning.
// Do not make this the bin entry point — see the comment in main.ts.
import { existsSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';

import { Command } from 'commander';
import { z } from 'zod';

// Read the CLI version from package.json rather than hard-coding it. It is not
// cosmetic: `holiday dash init` pins the blocks packages to THIS version, so a
// stale literal here would scaffold a dashboard against an OLD catalog. Resolved
// at runtime relative to the built file (dist/main.js → ../package.json), which
// holds in the npm tarball too (package.json sits at its root).
const VERSION = (createRequire(import.meta.url)('../package.json') as { version: string }).version;

import {
  type Account,
  type AccountId,
  AmountFactory,
  CommodityRegistry,
  type CommodityCode,
  type Grain,
  type IsoDate,
  type LedgerUow,
  type Rule,
  Txn,
  buildInstallmentSchedule,
  projectCashflow,
  type CashflowAssumption,
  addMonthsIso,
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
  createUlidFactory,
  describeTxnError,
  displaySignOf,
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
  type AssertionCheck,
  type SnapshotBalance,
  type ExistingTxn,
  type ParsedTxn,
  convert,
  formatRate,
  resolveRate,
  checkAssertion,
  closeGate,
  monthBounds,
  revaluationLines,
  dedupeKey,
  findNearDuplicates,
  sha256,
  sha256Bytes,
  scheduleInterest,
  AppError,
  listAccounts,
  listPendingReviews,
  rejectReview,
  verifyLedger,
  assertIncomeRegime,
  buildSettlementLines,
  checkIncomeSettlement,
  describeRegime,
  describeLineKind,
  type IncomeRegime,
  type IncomeSource,
  type IncomeSettlementLine,
  TaxReturn,
  describeTaxError,
  defaultPeriodForForm,
  formAcceptsPeriod,
  isTaxForm,
  isTaxPeriod,
  taxLinesToColumns,
  type TaxForm,
  type TaxPeriod,
} from '@holiday-cfo/core';

import { bakeDatasets, scaffold } from './dash.js';
import { scaffoldLedgerDocs } from './ledger-docs.js';
import { scaffoldDeploy } from './deploy.js';
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
program.name('holiday').description('A double-entry CFO ledger for one person.').version(VERSION);

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
    // The project's AGENTS.md / CLAUDE.md — the skill's references never land in
    // the user's folder, so without these a plugin-less session in this folder
    // knows neither the voice nor the rules. Re-running init on an old ledger
    // adds them; existing files are never overwritten.
    const docs = scaffoldLedgerDocs(process.cwd(), VERSION);
    out({ workspace: ws, functionalCurrency: currency, closeGrain: o.closeGrain, docs });
    note(`장부를 만들었습니다: ${ws}`);
    if (docs.created.length > 0) {
      note(`에이전트 지침을 만들었습니다: ${docs.created.join(', ')} — 이 폴더에서 일하는 에이전트의 말투와 규칙입니다.`);
    }
    if (docs.created.some((p) => p.replaceAll('\\', '/').startsWith('.cursor/'))) {
      note(`Cursor 세션 훅을 만들었습니다 — 문서 스킬(xlsx/pdf)을 이 장부 폴더 기준으로 soft-fail 갱신합니다.`);
    }
    note(`ledger.db는 커밋해 두세요. 이 저장소는 반드시 비공개(private)여야 합니다 — 당신의 돈입니다.`);
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
      note(`${code}는 --cash 표시가 없어 현금흐름 계산에 들어가지 않습니다.`);
    }
  },
);

account
  .command('list')
  .description('list accounts')
  .action(async () => {
    const ws = requireWorkspace();
    const store = await openLedger(ws);
    const result = await listAccounts(store);
    await store.close();
    if (jsonMode()) return out(result.accounts);
    for (const a of result.accounts) {
      const tags = [a.cash ? 'cash' : null, a.placeholder ? 'placeholder' : null, a.monetary ? null : 'non-monetary']
        .filter(Boolean)
        .join(' ');
      note(`${a.code.padEnd(40)} ${(a.commodity ?? '(multi)').padEnd(8)} ${tags}`);
    }
  });

program
  .command('txn')
  .description('거래 기록')
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
      note(`오늘(${today()}) 결제분은 ${dates.closeDate}에 마감되어 ${dates.paymentDate}에 출금됩니다.`);
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
      note(`${''.padEnd(20)} 오늘(${now}) 결제분은 ${example.paymentDate} 출금`);
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
          note(`${liabilityCode} 계정을 만들었습니다 (할부 잔액은 일반 카드 사용액과 분리해 둡니다).`);
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
      note(`실제 명세서와 다르면 \`holiday installment revise ${result.id}\`로 맞춰 주세요.`);
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
    note(`월 합계: ${amounts.format({ minor: monthly, commodity: config.functionalCurrency })} ${config.functionalCurrency}`);
  });

const income = program
  .command('income')
  .description('정기수입·수입 정산 — 예측(recurring)과 대한민국 법정 공제(source/settle)');

income
  .command('add <label>')
  .description('register a recurring income')
  .requiredOption('--income <code>', 'Income account it credits')
  .requiredOption('--deposit <code>', 'asset account cash lands in (prefer --cash)')
  .requiredOption('--amount <amount>')
  .option('--day <n>', 'day of month. -1 = last day (말일)', Number, 1)
  .option('--yearly <month>', 'make it yearly, in this month (1-12)', Number)
  .option('--from <date>', 'active from', today())
  .option('--to <date>', 'active until (omit for open-ended)')
  .action(
    async (
      label: string,
      o: { income: string; deposit: string; amount: string; day: number; yearly?: number; from: string; to?: string },
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
      const depositCash = await store.unitOfWork(async (uow) => {
        const incomeAcct = await uow.getAccount(o.income);
        if (!incomeAcct) throw new UsageError(`no such account: ${o.income}`);
        const deposit = await uow.getAccount(o.deposit);
        if (!deposit) throw new UsageError(`no such account: ${o.deposit}`);

        await uow.upsertRecurringIncome({
          id,
          label,
          incomeAccountId: incomeAcct.id,
          depositAccountId: deposit.id,
          amountMinor: amount.minor,
          commodity: amount.commodity,
          cadence,
          activeFrom: assertIsoDate(o.from),
          activeTo: o.to ? assertIsoDate(o.to) : null,
        });
        return deposit.cash;
      });
      await store.close();

      out({ id, label, amountMinor: amount.minor.toString(), cadence });
      if (depositCash) {
        note(
          `${label}: ${amounts.format(amount)} ${config.functionalCurrency}, ${describeCadence(cadence)}, ` +
            `${o.deposit}에 입금 — 현금흐름에 반영됩니다.`,
        );
      } else {
        note(
          `${label}: ${amounts.format(amount)} ${config.functionalCurrency}, ${describeCadence(cadence)}, ` +
            `${o.deposit}에 입금. ⚠ 입금 계정이 --cash가 아니라 현금흐름 투영에는 잡히지 않습니다.`,
        );
      }
    },
  );

income
  .command('list')
  .description('active recurring incomes')
  .action(async () => {
    const ws = requireWorkspace();
    const config = readConfig(ws);
    const store = await openLedger(ws);
    const now = assertIsoDate(today());
    const result = await store.read(async (r) => {
      const items = await r.listRecurringIncome({ activeOn: now });
      const accounts = new Map((await r.listAccounts()).map((a) => [a.id, a]));
      return items.map((i) => ({
        item: i,
        deposit: accounts.get(i.depositAccountId)?.code ?? '?',
        cash: accounts.get(i.depositAccountId)?.cash ?? false,
      }));
    });
    await store.close();

    if (jsonMode()) {
      return out(result.map(({ item }) => ({ ...item, amountMinor: item.amountMinor.toString() })));
    }
    let monthly = 0n;
    for (const { item, deposit, cash } of result) {
      if (item.cadence.kind === 'monthly') monthly += item.amountMinor;
      note(
        `${item.label.padEnd(20)} ${amounts.format({ minor: item.amountMinor, commodity: item.commodity }).padStart(10)} ` +
          `${describeCadence(item.cadence).padEnd(14)} → ${deposit}${cash ? '' : '  ⚠ not --cash'}`,
      );
    }
    if (result.length === 0) return note('no active recurring incomes.');
    note('');
    note(`월 합계: ${amounts.format({ minor: monthly, commodity: config.functionalCurrency })} ${config.functionalCurrency}`);
  });

const incomeSourceCmd = income.command('source').description('수입 원천 — 업체·regime(법정 공제 종류)');

incomeSourceCmd
  .command('add <label>')
  .description('register an income source with a KR withholding regime')
  .requiredOption('--income <code>', 'Income account it credits')
  .requiredOption('--deposit <code>', 'asset account cash lands in')
  .requiredOption(
    '--regime <name>',
    'business_withholding | business_vat | salary | allowance',
  )
  .option('--from <date>', 'active from', today())
  .option('--to <date>', 'active until (omit for open-ended)')
  .action(
    async (
      label: string,
      o: { income: string; deposit: string; regime: string; from: string; to?: string },
    ) => {
      const ws = requireWorkspace();
      const config = readConfig(ws);
      const store = await openLedger(ws);
      const regime = assertIncomeRegime(o.regime);
      const id = nextUlid();

      await store.unitOfWork(async (uow) => {
        const incomeAcct = await uow.getAccount(o.income);
        if (!incomeAcct) throw new UsageError(`no such account: ${o.income}`);
        const deposit = await uow.getAccount(o.deposit);
        if (!deposit) throw new UsageError(`no such account: ${o.deposit}`);
        await uow.upsertIncomeSource({
          id,
          label,
          incomeAccountId: incomeAcct.id,
          depositAccountId: deposit.id,
          regime,
          commodity: config.functionalCurrency,
          activeFrom: assertIsoDate(o.from),
          activeTo: o.to ? assertIsoDate(o.to) : null,
        });
      });
      await store.close();

      out({ id, label, regime, income: o.income, deposit: o.deposit });
      note(`${label}: ${describeRegime(regime)} → ${o.income}, 입금 ${o.deposit}.`);
      note(`다음: holiday income settle ${JSON.stringify(label)} --gross <세전총액> --date <지급일>`);
    },
  );

incomeSourceCmd
  .command('list')
  .description('income sources and their regimes')
  .action(async () => {
    const ws = requireWorkspace();
    const store = await openLedger(ws);
    const now = assertIsoDate(today());
    const result = await store.read(async (r) => {
      const sources = await r.listIncomeSources({ activeOn: now });
      const accounts = new Map((await r.listAccounts()).map((a) => [a.id, a]));
      return sources.map((s) => ({
        source: s,
        income: accounts.get(s.incomeAccountId)?.code ?? '?',
        deposit: accounts.get(s.depositAccountId)?.code ?? '?',
      }));
    });
    await store.close();

    if (jsonMode()) {
      return out(result.map(({ source, income, deposit }) => ({ ...source, income, deposit })));
    }
    if (result.length === 0) return note('no income sources. Add one with `holiday income source add`.');
    for (const { source, income, deposit } of result) {
      note(
        `${source.label.padEnd(20)} ${describeRegime(source.regime).padEnd(28)} ${income} → ${deposit}`,
      );
    }
  });

income
  .command('settle <label>')
  .description('compute statutory deductions for a payday and store the settlement')
  .requiredOption('--gross <amount>', '세전 총액 (부가세 regime은 공급가액)')
  .requiredOption('--date <date>', '지급일')
  .option('--earned-tax <amount>', '갑근세(국세) — salary regime 필수')
  .option('--post', '전표까지 기표 (기본 계정 차트 필요)', false)
  .option('--narration <text>')
  .action(
    async (
      label: string,
      o: { gross: string; date: string; earnedTax?: string; post?: boolean; narration?: string },
    ) => {
      const ws = requireWorkspace();
      const config = readConfig(ws);
      const store = await openLedger(ws);
      const paidOn = assertIsoDate(o.date);
      const gross = amounts.parse(o.gross, config.functionalCurrency);

      const result = await store.unitOfWork(async (uow) => {
        const source = await uow.getIncomeSource(label);
        if (!source) {
          throw new UsageError(`no income source: ${label}. Add one with \`holiday income source add\`.`);
        }
        if (source.regime === 'salary' && o.earnedTax === undefined) {
          throw new UsageError(
            'salary regime needs --earned-tax <갑근세>. 간이세액표/명세서를 읽고 넣으세요 — 추측 금지.',
          );
        }
        const earned = o.earnedTax
          ? amounts.parse(o.earnedTax, source.commodity).minor
          : undefined;
        const built = buildSettlementLines({
          regime: source.regime,
          grossMinor: gross.minor,
          paidOn,
          ...(earned !== undefined ? { earnedIncomeTaxMinor: earned } : {}),
        });

        let txnId: string | null = null;
        if (o.post) {
          txnId = await postIncomeSettlement(uow, {
            source,
            paidOn,
            grossMinor: gross.minor,
            netMinor: built.netMinor,
            lines: built.lines,
            narration: o.narration ?? `${source.label} ${paidOn}`,
            currency: config.functionalCurrency,
          });
        }

        const id = nextUlid();
        await uow.upsertIncomeSettlement(
          {
            id,
            sourceId: source.id,
            paidOn,
            grossMinor: gross.minor,
            netMinor: built.netMinor,
            commodity: source.commodity,
            statuteAsOf: built.statuteAsOf,
            txnId,
            label: o.narration ?? null,
          },
          built.lines,
        );
        return { id, source, built, txnId };
      });
      await store.close();

      const money = (m: bigint) => amounts.format({ minor: m, commodity: result.source.commodity });
      out({
        id: result.id,
        label: result.source.label,
        regime: result.source.regime,
        grossMinor: gross.minor.toString(),
        netMinor: result.built.netMinor.toString(),
        statuteAsOf: result.built.statuteAsOf,
        txnId: result.txnId,
        lines: result.built.lines.map((l) => ({
          kind: l.kind,
          amountMinor: l.amountMinor.toString(),
        })),
      });
      note(
        `${result.source.label}: 총액 ${money(gross.minor)} → 실수령 ${money(result.built.netMinor)} ` +
          `(${describeRegime(result.source.regime)}, 법령 ${result.built.statuteAsOf})`,
      );
      for (const line of result.built.lines) {
        note(`  ${describeLineKind(line.kind).padEnd(16)} ${money(line.amountMinor)}`);
      }
      if (result.txnId) {
        note(`✓ 전표 ${result.txnId} — 잔액에 바로 반영됩니다.`);
      } else {
        note(`정산만 저장했습니다. 전표까지: 같은 명령에 --post`);
      }
    },
  );

income
  .command('check [label]')
  .description('stored settlements vs statutory KR rates')
  .action(async (label: string | undefined) => {
    const ws = requireWorkspace();
    const store = await openLedger(ws);
    const results = await store.read(async (r) => {
      const sources = await r.listIncomeSources();
      const wanted = label ? sources.filter((s) => s.label === label || s.id === label) : sources;
      if (label && wanted.length === 0) throw new UsageError(`no income source: ${label}`);
      const outCheck: {
        label: string;
        settlementId: string;
        paidOn: string;
        commodity: CommodityCode;
        result: ReturnType<typeof checkIncomeSettlement>;
      }[] = [];
      for (const source of wanted) {
        const settlements = await r.listIncomeSettlements({ sourceId: source.id });
        for (const s of settlements) {
          outCheck.push({
            label: source.label,
            settlementId: s.settlement.id,
            paidOn: s.settlement.paidOn,
            commodity: s.settlement.commodity,
            result: checkIncomeSettlement({
              regime: source.regime,
              settlement: s.settlement,
              lines: s.lines,
            }),
          });
        }
      }
      return outCheck;
    });
    await store.close();

    if (jsonMode()) {
      return out(
        results.map((r) => ({
          label: r.label,
          settlementId: r.settlementId,
          paidOn: r.paidOn,
          ok: r.result.ok,
          expectedNetMinor: r.result.expectedNetMinor.toString(),
          actualNetMinor: r.result.actualNetMinor.toString(),
          deltaMinor: r.result.deltaMinor.toString(),
          mismatched: r.result.mismatched.map((m) => ({
            kind: m.kind,
            expectedMinor: m.expectedMinor.toString(),
            actualMinor: m.actualMinor.toString(),
          })),
          explanation: r.result.explanation,
        })),
      );
    }
    if (results.length === 0) return note('no settlements to check.');

    let bad = 0;
    for (const r of results) {
      const money = (m: bigint) => amounts.format({ minor: m, commodity: r.commodity });
      note(`${r.label}  ${r.paidOn}`);
      if (r.result.ok) {
        note(`  ✓ ${r.result.explanation}`);
      } else {
        bad += 1;
        note(`  ⚠ ${r.result.explanation}`);
        note(`    기대 실수령 ${money(r.result.expectedNetMinor)} / 저장 ${money(r.result.actualNetMinor)}`);
        for (const m of r.result.mismatched) {
          note(
            `    ${describeLineKind(m.kind)}: 기대 ${money(m.expectedMinor)} ≠ ${money(m.actualMinor)}`,
          );
        }
      }
    }
    if (bad > 0) throw new LedgerError('income_drift', `${bad} settlement(s) disagree with statute`);
  });

income
  .command('settlements')
  .description('list stored income settlements')
  .option('--from <date>')
  .option('--to <date>')
  .action(async (o: { from?: string; to?: string }) => {
    const ws = requireWorkspace();
    const store = await openLedger(ws);
    const rows = await store.read(async (r) => {
      const sources = new Map((await r.listIncomeSources()).map((s) => [s.id, s]));
      const settlements = await r.listIncomeSettlements({
        ...(o.from ? { from: assertIsoDate(o.from) } : {}),
        ...(o.to ? { to: assertIsoDate(o.to) } : {}),
      });
      return settlements.map((s) => ({
        ...s,
        label: sources.get(s.settlement.sourceId)?.label ?? '?',
        regime: sources.get(s.settlement.sourceId)?.regime ?? null,
      }));
    });
    await store.close();

    if (jsonMode()) {
      return out(
        rows.map((r) => ({
          id: r.settlement.id,
          label: r.label,
          regime: r.regime,
          paidOn: r.settlement.paidOn,
          grossMinor: r.settlement.grossMinor.toString(),
          netMinor: r.settlement.netMinor.toString(),
          statuteAsOf: r.settlement.statuteAsOf,
          txnId: r.settlement.txnId,
          lines: r.lines.map((l) => ({ kind: l.kind, amountMinor: l.amountMinor.toString() })),
        })),
      );
    }
    if (rows.length === 0) return note('no settlements.');
    for (const r of rows) {
      const money = (m: bigint) => amounts.format({ minor: m, commodity: r.settlement.commodity });
      note(
        `${r.settlement.paidOn}  ${(r.label ?? '?').padEnd(16)} ` +
          `총 ${money(r.settlement.grossMinor)} → 실 ${money(r.settlement.netMinor)}` +
          (r.regime ? `  (${describeRegime(r.regime as IncomeRegime)})` : ''),
      );
    }
  });

const TAX_DATA_FILE = z.object({
  commodity: z.string().min(1),
  columns: z.record(z.string(), z.record(z.string(), z.string())),
});

function resolveTaxFormPeriod(
  formRaw: string | undefined,
  periodRaw: string | undefined,
): { form: TaxForm; period: TaxPeriod } {
  const form = formRaw ?? 'kr_global_income';
  if (!isTaxForm(form)) {
    throw new UsageError(`unknown --form ${JSON.stringify(form)}. Use kr_global_income or kr_vat.`);
  }
  let period: TaxPeriod;
  if (periodRaw === undefined || periodRaw === '') {
    const def = defaultPeriodForForm(form);
    if (!def) {
      throw new UsageError(
        `--period is required for --form ${form} (H1_provisional|H1_final|H2_provisional|H2_final).`,
      );
    }
    period = def;
  } else {
    if (!isTaxPeriod(periodRaw)) {
      throw new UsageError(`unknown --period ${JSON.stringify(periodRaw)}.`);
    }
    period = periodRaw;
  }
  if (!formAcceptsPeriod(form, period)) {
    throw new UsageError(`form ${form} does not accept period ${period}.`);
  }
  return { form, period };
}

function rejectJsonNumbersInColumns(columns: Record<string, Record<string, unknown>>): void {
  for (const [col, cells] of Object.entries(columns)) {
    for (const [line, v] of Object.entries(cells)) {
      if (typeof v === 'number') {
        throw new UsageError(`columns.${col}.${line} must be a decimal string, not a JSON number.`);
      }
    }
  }
}

const tax = program.command('tax').description('세금 신고서 SoR — 관측값만. 세액 공식 없음');
const taxReturn = tax.command('return').description('신고서 표지·세액표');

taxReturn
  .command('add')
  .description('관측된 세금 신고서 헤더·라인을 SoR에 append한다')
  .requiredOption('--year <yyyy>', '귀속연도')
  .requiredOption('--filed-on <date>', '신고일 YYYY-MM-DD')
  .requiredOption('--data-file <path>', '라인 JSON 파일')
  .option('--form <form>', 'kr_global_income | kr_vat', 'kr_global_income')
  .option('--period <period>', '과세기간. kr_vat 필수')
  .option('--amend', '수정신고 — 새 revision append', false)
  .option('--note <text>')
  .option('--source <path>', '원본 파일 경로 — sha256 출처 기록')
  .action(
    async (o: {
      year: string;
      filedOn: string;
      dataFile: string;
      form: string;
      period?: string;
      amend?: boolean;
      note?: string;
      source?: string;
    }) => {
      const year = Number(o.year);
      if (!Number.isInteger(year)) {
        throw new UsageError(`--year must be an integer YYYY, got ${JSON.stringify(o.year)}`);
      }
      const { form, period } = resolveTaxFormPeriod(o.form, o.period);
      const filedOn = assertIsoDate(o.filedOn);

      const { readFile } = await import('node:fs/promises');
      let raw: string;
      try {
        raw = await readFile(o.dataFile, 'utf8');
      } catch (e) {
        throw new UsageError(`cannot read --data-file: ${(e as Error).message}`);
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw) as unknown;
      } catch (e) {
        throw new UsageError(`--data-file is not valid JSON: ${(e as Error).message}`);
      }
      if (parsed && typeof parsed === 'object' && 'columns' in parsed) {
        rejectJsonNumbersInColumns(
          (parsed as { columns: Record<string, Record<string, unknown>> }).columns,
        );
      }
      const data = TAX_DATA_FILE.parse(parsed);

      let sourcePath: string | null = null;
      let sourceSha256: string | null = null;
      if (o.source) {
        sourcePath = o.source;
        sourceSha256 = await sha256Bytes(new Uint8Array(await readFile(o.source)));
      }

      const ws = requireWorkspace();
      const store = await openLedger(ws);
      try {
        const header = await store.unitOfWork(async (uow) => {
          const existing = await uow.getTaxReturn({ form, year, period });
          const validated = o.amend
            ? (() => {
                if (!existing) {
                  throw new LedgerError(
                    'not_found',
                    `no current ${form} ${year} ${period} to amend. Add the first filing without --amend.`,
                  );
                }
                return TaxReturn.amend({
                  id: nextUlid(),
                  previous: existing,
                  filedOn,
                  commodity: data.commodity as CommodityCode,
                  note: o.note ?? null,
                  sourcePath,
                  sourceSha256,
                  createdAt: new Date().toISOString(),
                  columns: data.columns,
                  amounts,
                });
              })()
            : TaxReturn.create({
                id: nextUlid(),
                form,
                taxYear: year,
                period,
                filedOn,
                commodity: data.commodity as CommodityCode,
                note: o.note ?? null,
                sourcePath,
                sourceSha256,
                createdAt: new Date().toISOString(),
                columns: data.columns,
                amounts,
              });
          if (!validated.ok) {
            throw new LedgerError(
              validated.error[0]?.code ?? 'invalid_tax_return',
              validated.error.map(describeTaxError).join('\n'),
            );
          }
          try {
            return await uow.addTaxReturn(validated.value);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            if (/UNIQUE|unique|constraint/i.test(msg)) {
              throw new LedgerError(
                'duplicate_tax_return',
                `a ${form} return for ${year} ${period} revision already exists. Use --amend for a new revision.`,
              );
            }
            throw e;
          }
        });
        if (jsonMode()) {
          return out({
            id: header.id,
            form: header.form,
            taxYear: header.taxYear,
            period: header.period,
            filedOn: header.filedOn,
            revision: header.revision,
            status: header.status,
            commodity: header.commodity,
          });
        }
        note(
          `✓ 신고서를 남겼습니다 — ${header.form} ${header.taxYear} ${header.period} ` +
            `(${header.revision}차). 다음: holiday tax return show ${header.taxYear}` +
            (header.form === 'kr_vat' ? ` --form kr_vat --period ${header.period}` : '') +
            ' --json',
        );
      } finally {
        await store.close();
      }
    },
  );

taxReturn
  .command('list')
  .description('저장된 세금 신고서 헤더를 나열한다')
  .option('--form <form>')
  .option('--year <yyyy>')
  .option('--period <period>')
  .option('--all', 'superseded revision 포함', false)
  .action(async (o: { form?: string; year?: string; period?: string; all?: boolean }) => {
    let form: TaxForm | undefined;
    let period: TaxPeriod | undefined;
    if (o.form !== undefined) {
      if (!isTaxForm(o.form)) throw new UsageError(`unknown --form ${JSON.stringify(o.form)}`);
      form = o.form;
    }
    if (o.period !== undefined) {
      if (!isTaxPeriod(o.period)) throw new UsageError(`unknown --period ${JSON.stringify(o.period)}`);
      period = o.period;
    }
    let year: number | undefined;
    if (o.year !== undefined) {
      year = Number(o.year);
      if (!Number.isInteger(year)) throw new UsageError(`--year must be an integer`);
    }

    const ws = requireWorkspace();
    const store = await openLedger(ws);
    const rows = await store.read((r) =>
      r.listTaxReturns({
        ...(form ? { form } : {}),
        ...(year !== undefined ? { year } : {}),
        ...(period ? { period } : {}),
        includeSuperseded: Boolean(o.all),
      }),
    );
    await store.close();

    if (jsonMode()) return out(rows);
    if (rows.length === 0) return note('신고서 기록이 없습니다.');
    for (const h of rows) {
      const mark = h.status === 'current' ? '✓' : '·';
      note(
        `${mark} ${h.taxYear}  ${h.form.padEnd(18)} ${h.period.padEnd(16)} ` +
          `r${h.revision}  ${h.filedOn}` +
          (h.status === 'superseded' ? '  (대체됨)' : ''),
      );
    }
  });

taxReturn
  .command('show <year>')
  .description('한 건의 신고서 헤더와 라인을 반환한다')
  .option('--form <form>', 'kr_global_income | kr_vat', 'kr_global_income')
  .option('--period <period>', 'kr_vat 필수')
  .option('--revision <n>', '생략 시 current')
  .action(async (yearArg: string, o: { form: string; period?: string; revision?: string }) => {
    const year = Number(yearArg);
    if (!Number.isInteger(year)) throw new UsageError(`year must be an integer YYYY`);
    const { form, period } = resolveTaxFormPeriod(o.form, o.period);
    let revision: number | undefined;
    if (o.revision !== undefined) {
      revision = Number(o.revision);
      if (!Number.isInteger(revision) || revision < 1) {
        throw new UsageError(`--revision must be an integer >= 1`);
      }
    }

    const ws = requireWorkspace();
    const store = await openLedger(ws);
    const detail = await store.read((r) =>
      r.getTaxReturn({
        form,
        year,
        period,
        ...(revision !== undefined ? { revision } : {}),
      }),
    );
    await store.close();

    if (!detail) {
      throw new LedgerError(
        'not_found',
        `no tax return for ${form} ${year} ${period}` +
          (revision !== undefined ? ` revision ${revision}` : ''),
      );
    }

    const columns = taxLinesToColumns(detail.lines);
    const payload = {
      id: detail.id,
      form: detail.form,
      taxYear: detail.taxYear,
      period: detail.period,
      filedOn: detail.filedOn,
      revision: detail.revision,
      status: detail.status,
      commodity: detail.commodity,
      note: detail.note,
      sourcePath: detail.sourcePath,
      sourceSha256: detail.sourceSha256,
      columns,
    };
    if (jsonMode()) return out(payload);

    note(
      `${detail.form} ${detail.taxYear} ${detail.period} — ${detail.revision}차` +
        (detail.status === 'superseded' ? ' (대체됨)' : ''),
    );
    note(`신고일 ${detail.filedOn} · ${detail.commodity}`);
    for (const [col, cells] of Object.entries(columns)) {
      note(`  [${col}]`);
      for (const [k, v] of Object.entries(cells)) note(`    ${k}: ${v}`);
    }
  });

program
  .command('assert <account> <amount>')
  .description('장부가 이 날짜에 정확히 이랬다고 단언한다 — 명세서를 보고')
  .option('--as-of <date>', 'ISO date', today())
  .option('--commodity <code>', '계정 통화')
  .option('--note <text>')
  .action(async (code: string, amountText: string, o: { asOf: string; commodity?: string; note?: string }) => {
    const ws = requireWorkspace();
    const config = readConfig(ws);
    const store = await openLedger(ws);
    const asOf = assertIsoDate(o.asOf);

    const result = await store.unitOfWork(async (uow) => {
      const acct = await uow.getAccount(code);
      if (!acct) throw new UsageError(`no such account: ${code}`);
      const commodity = o.commodity ?? acct.commodity ?? config.functionalCurrency;
      const expected = amounts.parse(amountText, commodity);

      await uow.putBalanceAssertion({
        id: nextUlid(),
        accountId: acct.id,
        asOf,
        commodity: expected.commodity,
        expectedMinor: expected.minor,
        note: o.note ?? null,
        createdAt: nowIso(),
      });

      const balances = await uow.getBalances({ asOf, accountIds: [acct.id] });
      const actual = balances
        .filter((b) => b.commodity === expected.commodity)
        .reduce((sum, b) => sum + b.unitsMinor, 0n);
      // Liability balances are stored as credits; a statement quotes what you owe.
      const signed = acct.type === 'liability' || acct.type === 'equity' || acct.type === 'income' ? -actual : actual;
      return { ...checkAssertion(expected.minor, signed), expected, actual: signed, code: acct.code };
    });
    await store.close();

    const money = (m: bigint) => amounts.formatWithCode({ minor: m, commodity: result.expected.commodity });
    out({ account: result.code, asOf, expectedMinor: result.expected.minor.toString(), actualMinor: result.actual.toString(), deltaMinor: result.deltaMinor.toString(), ok: result.ok });
    if (result.ok) {
      note(`✓ ${result.code} (${asOf}) = ${money(result.expected.minor)}`);
      return;
    }
    note(`⚠ ${result.code} (${asOf})`);
    note(`   명세서: ${money(result.expected.minor).padStart(18)}`);
    note(`   장부:   ${money(result.actual).padStart(18)}`);
    note(`   차이:   ${money(result.deltaMinor).padStart(18)}`);
    // This is the ONLY check that compares the ledger to the outside world.
    note(`   놓친 거래, 잘못 읽은 금액, 또는 중복입니다. 맞을 때까지 마감이 막힙니다.`);
    throw new LedgerError('assertion_failed', `${result.code} disagrees with the ledger by ${result.deltaMinor}`);
  });

program
  .command('close <month>')
  .description('월 마감 — FX 재평가, 스냅샷, 저널 잠금')
  .option('--dry-run', '무엇이 일어날지만 보여준다', false)
  .action(async (month: string, o: { dryRun: boolean }) => {
    const ws = requireWorkspace();
    const config = readConfig(ws);
    const store = await openLedger(ws);
    const bounds = monthBounds(month);

    const plan = await store.read(async (r) => {
      const book = await r.getBook();
      if (book.closeGrain !== 'month') {
        throw new UsageError(`this book hard-closes by ${book.closeGrain}, not month`);
      }
      const accounts = await r.listAccounts();
      const byId = new Map(accounts.map((a) => [a.id, a]));

      // Gate 1: drafts must be RESOLVED, not silently excluded.
      const drafts = await r.listTxns({ from: bounds.start, to: bounds.end, statuses: ['draft'] });

      // Gate 2: every assertion in the period must pass.
      const assertions = await r.listBalanceAssertions({ from: bounds.start, to: bounds.end });
      const checks: AssertionCheck[] = [];
      for (const a of assertions) {
        const acct = byId.get(a.accountId);
        if (!acct) continue;
        const bal = await r.getBalances({ asOf: a.asOf, accountIds: [a.accountId] });
        const raw = bal.filter((b) => b.commodity === a.commodity).reduce((s2, b) => s2 + b.unitsMinor, 0n);
        const signed = acct.type === 'liability' || acct.type === 'equity' || acct.type === 'income' ? -raw : raw;
        checks.push({
          accountCode: acct.code,
          asOf: a.asOf,
          commodity: a.commodity,
          expectedMinor: a.expectedMinor,
          actualMinor: signed,
          ...checkAssertion(a.expectedMinor, signed),
        });
      }

      // Revaluation: monetary accounts not in the functional currency.
      const balances = await r.getBalances({ asOf: bounds.end });
      const rates = await r.listFxRates({ to: bounds.end });
      const revalInputs = [];
      for (const b of balances) {
        const acct = byId.get(b.accountId);
        if (!acct || b.commodity === config.functionalCurrency) continue;
        // IAS 21: only monetary ASSETS and LIABILITIES are revalued — currency
        // held, and amounts to be received or paid in fixed currency units.
        //
        // An expense is not one. It was consumed at the transaction date and
        // measured there; its KRW cost does not change because the won moved
        // afterwards. Revaluing it inflates FX P&L by the whole foreign spend,
        // every close, forever. (Found by walking $1,000 bought at 1300 and spent
        // at 1350: the answer must be +50,000 and was +120,000.)
        if (acct.type !== 'asset' && acct.type !== 'liability') continue;
        if (!acct.monetary) continue;
        // Zero foreign units are worth zero KRW at any rate, so no rate is needed
        // to say so. This matters: a spent-out account still has to be revalued —
        // its leftover carrying IS the realised FX result — and demanding a rate
        // for it would block a close for no reason.
        if (b.unitsMinor === 0n) {
          if (b.weightMinor !== 0n) {
            revalInputs.push({
              accountId: b.accountId,
              accountCode: b.accountCode,
              commodity: b.commodity,
              unitsMinor: 0n,
              carryingMinor: b.weightMinor,
              targetMinor: 0n,
            });
          }
          continue;
        }
        const resolved = resolveRate(rates, {
          base: b.commodity,
          quote: config.functionalCurrency,
          asOf: bounds.end,
          maxStalenessDays: book.fxMaxStalenessDays,
          functional: config.functionalCurrency,
        });
        revalInputs.push({
          accountId: b.accountId,
          accountCode: b.accountCode,
          commodity: b.commodity,
          unitsMinor: b.unitsMinor,
          carryingMinor: b.weightMinor,
          targetMinor: convert(b.unitsMinor, resolved.rate, registry.exponentOf(b.commodity), registry.exponentOf(config.functionalCurrency)),
        });
      }
      return { gate: closeGate(drafts.length, checks), lines: revaluationLines(revalInputs), balances, assertionCount: assertions.length };
    });

    if (!plan.gate.ok) {
      await store.close();
      note(plan.gate.explanation);
      throw new LedgerError('close_blocked', `${month} cannot close`);
    }

    const money = (m: bigint) => amounts.format({ minor: m, commodity: config.functionalCurrency });
    if (o.dryRun) {
      await store.close();
      out({ month, wouldRevalue: plan.lines.length, assertions: plan.assertionCount, dryRun: true });
      note(`${month}은 마감할 수 있습니다. 잔액 대조 ${plan.assertionCount}건 통과.`);
      for (const l of plan.lines) note(`  재평가 ${l.accountCode.padEnd(30)} ${money(l.deltaMinor).padStart(14)} KRW`);
      if (plan.lines.length === 0) note('  재평가할 외화 계정 없음.');
      return;
    }

    const result = await store.unitOfWork(async (uow) => {
      // The revaluation is posted while the period is still OPEN, so the
      // closed-period guard never needs a bypass. Order matters.
      let txnId: string | null = null;
      if (plan.lines.length > 0) {
        const fxAccount = await uow.getAccount('Income:FX:Unrealized');
        if (!fxAccount) {
          throw new UsageError(
            `재평가에는 Income:FX:Unrealized 계정이 필요합니다. ` +
              `\`holiday account add Income:FX:Unrealized --commodity ${config.functionalCurrency}\``,
          );
        }
        const total = plan.lines.reduce((s2, l) => s2 + l.deltaMinor, 0n);
        const txn = Txn.create({
          id: nextUlid() as TxnId,
          date: bounds.end,
          bookingCommodity: config.functionalCurrency,
          narration: `${month} FX 재평가`,
          systemKind: 'fx_revaluation',
          postings: [
            // units = 0, weight ≠ 0. Changes the KRW carrying value without
            // touching the foreign balance — only expressible because weight is
            // stored rather than derived from units × rate.
            ...plan.lines.map((l) => ({
              accountId: l.accountId,
              units: amounts.fromMinor(0n, l.commodity),
              weightMinor: l.deltaMinor,
              weightSource: 'actual' as const,
              kind: 'fx_revaluation' as const,
            })),
            { accountId: fxAccount.id, units: amounts.fromMinor(-total, config.functionalCurrency) },
          ],
        });
        if (!txn.ok) throw new LedgerError('unbalanced', txn.error.map(describeTxnError).join('\n'));
        await uow.appendTxn(txn.value, { status: 'posted' });
        txnId = txn.value.id;
      }

      await uow.upsertPeriod({ id: bounds.id, grain: 'month', start: bounds.start, end: bounds.end, status: 'open' });

      // Snapshot AFTER revaluation, so it records what the period was actually worth.
      const closing = await uow.getBalances({ asOf: bounds.end });
      const opening = await uow.getBalances({ asOf: bounds.start, to: bounds.start });
      const openingBy = new Map(opening.map((b) => [`${b.accountId}|${b.commodity}`, b]));
      const balances: SnapshotBalance[] = closing.map((b) => {
        const o2 = openingBy.get(`${b.accountId}|${b.commodity}`);
        return {
          accountId: b.accountId,
          commodity: b.commodity,
          unitsMinor: b.unitsMinor,
          weightMinor: b.weightMinor,
          periodUnitsMinor: b.unitsMinor - (o2?.unitsMinor ?? 0n),
          periodWeightMinor: b.weightMinor - (o2?.weightMinor ?? 0n),
        };
      });
      await uow.writeSnapshot({
        id: nextUlid(),
        periodId: bounds.id,
        kind: 'close',
        asOf: bounds.end,
        createdAt: nowIso(),
        balances,
      });

      await uow.setPeriodStatus(bounds.id, 'closed', { reason: `close ${month}` });
      return { txnId, accounts: balances.length };
    });
    await store.close();

    out({ month, closed: true, revaluationTxnId: result.txnId, snapshotAccounts: result.accounts });
    note(`${month}을 마감했습니다. 계정 ${result.accounts}개를 스냅샷으로 남겼습니다.`);
    for (const l of plan.lines) note(`  재평가 ${l.accountCode.padEnd(30)} ${money(l.deltaMinor).padStart(14)} KRW`);
    if (plan.assertionCount === 0) {
      // Not a hard gate — a new ledger has none — but worth saying.
      note(`  ⚠ 이 기간에는 잔액 대조가 없었습니다. 명세서와 대조하지 않은 달은 얼린 것이지 마감한 것이 아닙니다.`);
    }
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
    note(`이미 확정된 금액은 바뀌지 않습니다. 환율은 앞으로의 계산과 재평가에만 쓰입니다.`);
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
  .description('record parsed transactions. Drafts for review by default; --post commits them directly. Never does OCR — you are the parser.')
  // NOT --json: that is the global machine-output flag, and commander resolves
  // one of them while silently ignoring the other. Made this mistake twice.
  .option('--data <submission>', 'submission JSON inline. See the schema in src/ingest.ts. Legs, not a flat amount.')
  // argv has a hard size limit (~1MB on macOS), which is exactly why the first
  // real-world import got chunked into nine batches — and chunking broke the
  // one-source-file-one-batch mapping that provenance depends on. A file has no
  // such limit: one bank export = one submission = one batch row.
  .option('--data-file <path>', 'read the submission JSON from a file — required for large imports')
  // Generalized from --image: ANY source file (bank HTML/CSV export, screenshot)
  // gets hashed into the batch record. Identical bytes are the same export, so a
  // re-import of the same file is BLOCKED by the ledger itself — provenance the
  // next session can rely on instead of hoping nobody imports twice.
  .option('--source <path>', 'the source file this submission was parsed from (hashed; re-import of identical bytes is refused)')
  .option('--image <path>', 'alias of --source, kept for screenshots')
  .option('--idem-key <key>', 'retry-safe. Same key + same request replays the stored result.')
  // The whole batch is one unit of work, so this is the fast path for a large
  // history import: thousands of rows post in one process (one node start, one
  // transaction) in seconds, instead of thousands of `txn add` calls each paying
  // ~30ms of process startup. Skips the review queue on purpose — for a trusted
  // bulk import the statement balance (`assert`) is the real check, not per-row
  // human review.
  .option('--post', 'commit directly as posted, skipping the review queue', false)
  .action(async (o: { data?: string; dataFile?: string; source?: string; image?: string; idemKey?: string; post: boolean }) => {
    const ws = requireWorkspace();
    const config = readConfig(ws);

    if (!o.data === !o.dataFile) {
      throw new UsageError('pass exactly one of --data (inline JSON) or --data-file (path to JSON).');
    }
    const rawData = o.dataFile ? await (await import('node:fs/promises')).readFile(o.dataFile, 'utf8') : o.data!;

    const store = await openLedger(ws);

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawData);
    } catch (e) {
      throw new UsageError(`the submission is not valid JSON: ${(e as Error).message}`);
    }
    const submission = INGEST_SUBMISSION.parse(parsed);

    // Hash the source file ourselves when we can see it. This is the one
    // duplicate check that can block without ever being wrong: identical bytes
    // are the same export. It is also the provenance record — the batch row keeps
    // the hash and the file name, so a later session can see exactly which
    // exports are already in (`holiday ingest list`) instead of re-deriving it.
    const sourcePath = o.source ?? o.image ?? null;
    let sourceSha = submission.sourceSha256 ?? null;
    if (sourcePath) {
      const { readFile } = await import('node:fs/promises');
      sourceSha = await sha256Bytes(new Uint8Array(await readFile(sourcePath)));
    }

    const requestSha = await sha256(rawData);
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
            'duplicate_source',
            `this exact file was already ingested on ${seen.submittedAt}` +
              `${seen.sourceName ? ` as "${seen.sourceName}"` : ''} (${seen.itemCount} item(s)). ` +
              `Importing the same export twice is always a mistake — run \`holiday ingest list\` to see what is in.`,
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
        sourceName: submission.sourceName ?? (sourcePath ? sourcePath.split('/').at(-1)! : null),
        submittedAt: nowIso(),
        itemCount: submission.items.length,
      });

      const out: {
        category: string | null;
        itemId: string;
        txnId: string;
        status: string;
        warnings: string[];
      }[] = [];

      // Rules load once per submission. Matching order comes from the store —
      // priority DESC then newest — so the same payee classifies the same way
      // every time.
      const rules = await uow.listRules();
      const ensureParking = async (code: string): Promise<void> => {
        if (byCode.has(code)) return;
        // Structural accounts, like Equity:Opening: created on first need.
        // Multi-commodity on purpose — a parking lot takes anything.
        const c = assertAccountCode(code);
        const acct: Account = {
          id: nextUlid() as AccountId,
          code: c,
          type: accountTypeOf(c),
          parentId: null,
          commodity: null,
          monetary: true,
          cash: false,
          placeholder: false,
          openedOn: assertIsoDate(today()),
          closedOn: null,
        };
        await uow.upsertAccount(acct);
        byCode.set(code, acct);
        byId.set(acct.id, acct);
      };

      for (const item of submission.items) {
        const ruleWarnings: string[] = [];
        // `legs` items are fully decided by the parser. `money` items are decided
        // by a rule — or not decided at all, in which case they park in
        // Uncategorized and stay DRAFT even under --post: --post means "post what
        // is decided", and an unclassified row is precisely an undecided one.
        let decided = true;
        let category: string | null = null;
        const effLegs: { account: string; amount: string; commodity: string; weight?: string | undefined }[] = item.legs
          ? [...item.legs]
          : [];
        if (effLegs.length === 0) {
          const m = item.money!;
          if (m.commodity !== (config.functionalCurrency as string)) {
            throw new UsageError(
              `money items are functional-currency only — a ${m.commodity} row needs a weight, so submit it as \`legs\` with @@.`,
            );
          }
          const rule = matchRule(rules, item.payee ?? null);
          let categoryCode: string;
          if (rule && byCode.has(rule.category)) {
            categoryCode = rule.category;
          } else {
            if (rule) {
              ruleWarnings.push(
                `rule ${rule.id} points at missing account ${rule.category} — treated as unmatched`,
              );
            }
            categoryCode = m.amount.startsWith('-') ? 'Expenses:Uncategorized' : 'Income:Uncategorized';
            await ensureParking(categoryCode);
            decided = false;
          }
          category = categoryCode;
          const counter = m.amount.startsWith('-') ? m.amount.slice(1) : `-${m.amount}`;
          effLegs.push(
            { account: m.account, amount: m.amount, commodity: m.commodity },
            { account: categoryCode, amount: counter, commodity: m.commodity },
          );
        }
        // An explicit Uncategorized leg is a declaration of "undecided", whoever
        // wrote it. A real import did exactly this — the parser hand-built
        // `legs` with Expenses:Uncategorized, which skipped rule matching AND
        // posted 10,191 rows as decided, so the classification pipeline never
        // ran and no queue ever appeared. Uncategorized is a queue, not a
        // category — so it drafts, in either item form.
        if (item.legs?.some((l) => l.account.endsWith(':Uncategorized'))) {
          decided = false;
          category = item.legs.find((l) => l.account.endsWith(':Uncategorized'))!.account;
          ruleWarnings.push(
            'legs에 Uncategorized를 직접 쓰면 분류 규칙이 아예 돌지 않습니다. ' +
              '카테고리를 모르는 행은 `money` 형식으로 내세요 — 규칙이 분류하고, 미매칭만 분류 대기로 남습니다.',
          );
        }
        const postings = effLegs.map((l) =>
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

        // --post commits straight to posted; the ingest item is 'accepted' up
        // front, mirroring exactly what `review accept` would do one row at a time.
        // Undecided (unclassified) items stay drafts regardless.
        const txnStatus = o.post && decided ? 'posted' : 'draft';
        const itemStatus = o.post && decided ? 'accepted' : 'pending';
        await uow.appendTxn(txn.value, { status: txnStatus });
        const itemId = nextUlid();
        await uow.recordIngestItem({
          id: itemId,
          batchId,
          dedupeKey: key,
          dedupeAuthority: authority,
          externalRef: item.externalRef ?? null,
          merchant: item.payee ?? null,
          txnId: txn.value.id,
          status: itemStatus,
          reason: null,
          // Verbatim, so a misread has an audit trail.
          parsedJson: JSON.stringify(item),
          createdAt: nowIso(),
        });
        out.push({ itemId, txnId: txn.value.id, status: itemStatus, category, warnings: [...ruleWarnings, ...warnings] });
      }
      // Counts ride in the JSON, not only in the stderr notes: with --json the
      // notes are suppressed (stderr is reserved for the error envelope there),
      // and the agent driving this CLI usually passes --json — so the "drafts
      // remain, open the categorize screen" signal must survive in the payload
      // it actually reads.
      const pendingCount = out.filter((i) => i.status === 'pending').length;
      return { batchId, postedCount: out.length - pendingCount, pendingCount, items: out };
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
    // Count what actually happened — a --post batch can still leave drafts (the
    // unclassified rows), and reporting the whole batch as POSTED would hide the
    // exact items that need a human.
    const posted = result.postedCount;
    const pending = result.pendingCount;
    if (posted > 0) note(`${posted}건을 확정했습니다 — 잔액에 바로 반영됩니다.`);
    if (pending > 0) {
      note(`${pending}건은 분류 규칙이 없어 분류 대기로 남았습니다 (잔액 제외).`);
      note(`다음: 대시보드의 분류 대기 카드에서 클릭으로 고르시거나(\`holiday dash init\` 후 \`pnpm dev\`),`);
      note(`      \`holiday rule add <패턴> <카테고리>\` 뒤 \`holiday review apply-rules --accept\`로 한꺼번에 승인할 수 있습니다.`);
    }
    for (const i of result.items) for (const w of i.warnings) note(`  ⚠ ${w}`);
  });

ingest
  .command('list')
  .description('every import that ever ran — which source files, when, how many rows')
  .action(async () => {
    const ws = requireWorkspace();
    const store = await openLedger(ws);
    const batches = await store.read((r) => r.listIngestBatches());
    await store.close();

    if (jsonMode()) return out(batches);
    if (batches.length === 0) {
      note('수집 이력이 없습니다.');
      return;
    }
    // The provenance record. A fresh session reads this BEFORE importing, so the
    // same export is never parsed and posted twice.
    for (const b of batches) {
      const src = b.sourceName ?? (b.sourceSha256.startsWith('no-image:') ? '(source not recorded)' : b.sourceSha256.slice(0, 12));
      note(`${b.submittedAt}  ${String(b.itemCount).padStart(6)}건  ${src}`);
    }
  });

const rule = program.command('rule').description('분류 규칙 — payee 패턴이 카테고리 계정을 고른다');

rule
  .command('add <pattern> <category>')
  .description('add a rule: payees matching <pattern> classify as <category>')
  .option('--regex', 'treat <pattern> as a regular expression (default: contains)', false)
  .option('--priority <n>', 'higher wins when several rules match', (v: string) => Number(v), 0)
  .action(async (pattern: string, category: string, o: { regex: boolean; priority: number }) => {
    const ws = requireWorkspace();
    const store = await openLedger(ws);

    if (o.regex) {
      try {
        new RegExp(pattern);
      } catch (e) {
        throw new UsageError(`not a valid regular expression: ${(e as Error).message}`);
      }
    }

    const id = nextUlid();
    await store.unitOfWork(async (uow) => {
      // The category must EXIST. A rule with a typo'd account would silently
      // no-match forever — the exact quiet failure rules exist to prevent.
      const acct = (await uow.listAccounts()).find((a) => (a.code as string) === category);
      if (!acct) {
        throw new UsageError(`no such account: ${category}. Create it first — rules never invent accounts.`);
      }
      if (acct.placeholder) throw new UsageError(`${category} is a placeholder and cannot be posted to.`);
      await uow.addRule({
        id,
        pattern,
        match: o.regex ? 'regex' : 'contains',
        category,
        priority: o.priority,
        createdAt: nowIso(),
      });
    });
    await store.close();
    out({ id, pattern, match: o.regex ? 'regex' : 'contains', category, priority: o.priority });
    note(`분류 규칙을 추가했습니다. 다음 수집부터 적용됩니다 — 이미 대기 중인 건은 \`holiday review apply-rules\`로.`);
  });

rule
  .command('list')
  .description('rules in matching order — first hit wins')
  .action(async () => {
    const ws = requireWorkspace();
    const store = await openLedger(ws);
    const rules = await store.read((r) => r.listRules());
    await store.close();
    if (jsonMode()) return out(rules);
    if (rules.length === 0) return note('분류 규칙이 없습니다. 예: `holiday rule add "스타벅스" Expenses:Food:Cafe`');
    for (const r of rules) {
      note(`${r.id}  [${String(r.priority).padStart(3)}] ${r.match === 'regex' ? '/' + r.pattern + '/' : JSON.stringify(r.pattern)}  →  ${r.category}`);
    }
  });

rule
  .command('rm <id>')
  .description('delete a rule. Config, not journal — nothing posted changes.')
  .action(async (id: string) => {
    const ws = requireWorkspace();
    const store = await openLedger(ws);
    await store.unitOfWork((uow) => uow.removeRule(id));
    await store.close();
    out({ removed: id });
  });

program
  .command('recategorize')
  .description('move POSTED amounts to another category, as correction entries — history stays')
  .requiredOption('--to <code>', 'the category to move to')
  .option('--payee <substring>', 'only transactions whose payee contains this')
  .option('--from <code>', 'only legs on this category (default: both Uncategorized accounts)')
  .option('--date <date>', 'correction date', today())
  .option('--dry-run', 'report what would move, write nothing', false)
  .action(async (o: { to: string; payee?: string; from?: string; date: string; dryRun: boolean }) => {
    const ws = requireWorkspace();
    const store = await openLedger(ws);
    const when = assertIsoDate(o.date);

    const result = await store.unitOfWork(async (uow) => {
      const accounts = await uow.listAccounts();
      const byCode2 = new Map(accounts.map((a) => [a.code as string, a]));
      const target = byCode2.get(o.to);
      if (!target) throw new UsageError(`no such account: ${o.to}`);
      if (target.placeholder) throw new UsageError(`${o.to} is a placeholder and cannot be posted to.`);
      const fromIds = new Set(
        (o.from
          ? [o.from]
          : ['Expenses:Uncategorized', 'Income:Uncategorized']
        )
          .map((c) => byCode2.get(c)?.id)
          .filter((id): id is AccountId => !!id),
      );
      if (fromIds.size === 0) throw new UsageError(`no such account: ${o.from}`);
      if (fromIds.has(target.id)) throw new UsageError('--from and --to are the same account.');

      const all = await uow.listTxns({ statuses: ['posted'] });
      // Run-twice safety: a transaction that already has a correction pointing at
      // it is skipped. Without this, re-running the same recategorize would move
      // the money twice — the classic correction-batch footgun.
      const alreadyCorrected = new Set(all.map((t) => t.txn.correctsTxnId).filter(Boolean));

      const hay = o.payee?.toLowerCase();
      const moved: { txnId: string; payee: string | null; minor: string }[] = [];
      let correctionCount = 0;
      for (const t of all) {
        if (hay && !(t.txn.payee ?? '').toLowerCase().includes(hay)) continue;
        if (alreadyCorrected.has(t.txn.id)) continue;
        // A correction is never itself recategorized. Without this, the batch's
        // own output matches the filter on the next run (same payee, a leg on the
        // from-account) and produces a correction OF the correction — which
        // exactly reverses it. Found by running it twice, not by review.
        if (t.txn.correctsTxnId) continue;
        const legs = t.txn.postings.filter((pLeg) => fromIds.has(pLeg.accountId));
        if (legs.length === 0) continue;
        for (const pLeg of legs) {
          if (target.commodity && pLeg.units.commodity !== target.commodity) {
            throw new UsageError(
              `${o.to} is ${target.commodity}-only but txn ${t.txn.id} has a ${pLeg.units.commodity} leg.`,
            );
          }
        }
        if (!o.dryRun) {
          const created = Txn.create({
            id: nextUlid() as TxnId,
            date: when,
            bookingCommodity: t.txn.bookingCommodity,
            payee: t.txn.payee,
            narration: `recategorize: ${legs.map((l) => byId2Code(accounts, l.accountId)).join(',')} → ${o.to}`,
            systemKind: null,
            correctsTxnId: t.txn.id,
            sourceItemId: null,
            tags: [],
            meta: { recategorize: true },
            postings: legs.flatMap((pLeg, i) => [
              {
                seq: i * 2,
                accountId: pLeg.accountId,
                units: amountsOf(pLeg).negated,
                weightMinor: -pLeg.weightMinor,
                // Mirror the original leg's provenance: identity stays identity,
                // an FX weight stays the observed weight it was.
                weightSource: pLeg.weightSource,
                fxRateText: null,
                fxRateId: null,
                lotId: null,
                kind: 'normal' as const,
                memo: null,
              },
              {
                seq: i * 2 + 1,
                accountId: target.id,
                units: amountsOf(pLeg).same,
                weightMinor: pLeg.weightMinor,
                weightSource: pLeg.weightSource,
                fxRateText: null,
                fxRateId: null,
                lotId: null,
                kind: 'normal' as const,
                memo: null,
              },
            ]),
          });
          if (!created.ok) throw new LedgerError('internal', created.error.map(describeTxnError).join('\n'));
          await uow.appendTxn(created.value, { status: 'posted' });
          correctionCount++;
        }
        for (const pLeg of legs) moved.push({ txnId: t.txn.id, payee: t.txn.payee, minor: pLeg.units.minor.toString() });
      }
      return { moved, correctionCount, dryRun: o.dryRun };
    });
    await store.close();

    out(result);
    if (result.dryRun) {
      note(`${result.moved.length}건이 이동 대상입니다 (아직 적용 전 — --dry-run 없이 다시 실행하세요).`);
    } else {
      note(`정정 ${result.correctionCount}건을 기록했습니다 — 원래 기록은 그대로 두고 잔액만 ${o.to}로 옮겼습니다.`);
    }
  });

const review = program.command('review').description('드래프트 검토 — 승인 전엔 장부가 아니다');

review
  .command('list')
  .description('drafts waiting for a human')
  .action(async () => {
    const ws = requireWorkspace();
    const store = await openLedger(ws);
    const listed = await listPendingReviews(store);
    const detail = await store.read(async (r) => {
      const accounts = new Map((await r.listAccounts()).map((a) => [a.id, a]));
      return Promise.all(
        listed.items.map(async (item) => ({
          item,
          txn: item.txnId ? await r.getTxn(item.txnId as TxnId) : null,
          accounts,
        })),
      );
    });
    await store.close();

    if (jsonMode()) return out(listed.items);
    if (detail.length === 0) return note('검토할 드래프트가 없습니다.');
    for (const { item, txn, accounts } of detail) {
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
    note(`${detail.length}건이 승인 대기 중입니다. \`holiday review accept <id>\` / \`reject <id> --reason\``);
  });

review
  .command('accept <id>')
  .description('promote a draft to posted. Cannot fail — it is already balanced.')
  .option('--idem-key <key>')
  // Accepting "as" a category completes the proposal: the Uncategorized leg was
  // never information, only a placeholder. Under the hood it is a supersede —
  // reject the old draft, append the completed one posted — so the journal stays
  // append-only and the audit chain never sees a mutation.
  .option('--category <code>', 'accept as this category (swaps the Uncategorized leg)')
  .action(async (id: string, o: { idemKey?: string; category?: string }) => {
    const ws = requireWorkspace();
    const store = await openLedger(ws);
    const result = await store.unitOfWork(async (uow) => {
      const items = await uow.listIngestItems();
      const item = items.find((i) => i.id === id);
      if (!item) throw new UsageError(`no such review item: ${id}`);
      if (item.status !== 'pending') throw new UsageError(`item ${id} is already ${item.status}`);
      if (!item.txnId) throw new UsageError(`item ${id} has no transaction`);
      if (o.category) {
        const accounts = await uow.listAccounts();
        const target = accounts.find((a) => (a.code as string) === o.category);
        if (!target) throw new UsageError(`no such account: ${o.category}`);
        if (target.placeholder) throw new UsageError(`${o.category} is a placeholder and cannot be posted to.`);
        const newId = await supersedeDraftAs(uow, item.id, item.txnId, target, accounts);
        return { id, txnId: newId };
      }
      await uow.promoteDraft(item.txnId);
      await uow.setIngestItemStatus(id, 'accepted', {});
      return { id, txnId: item.txnId };
    });
    await store.close();
    out({ ...result, status: 'accepted', ...(o.category ? { category: o.category } : {}) });
    note(`승인했습니다. 잔액과 현금흐름에 반영됩니다.`);
  });

review
  .command('reject <id>')
  .description('reject a draft. The row is KEPT — it is dedup memory.')
  .requiredOption('--reason <text>')
  .action(async (id: string, o: { reason: string }) => {
    const ws = requireWorkspace();
    const store = await openLedger(ws);
    const result = await rejectReview(store, id, o.reason);
    await store.close();
    out(result);
    // Deleting it would let the same screenshot be re-proposed forever.
    note(`반려했습니다. 기록은 남습니다 — 같은 캡쳐가 다시 올라오는 것을 막는 기억입니다.`);
  });

review
  .command('apply-rules')
  .description('run the rule table over pending drafts. Reports by default; --accept posts the matches.')
  .option('--accept', 'accept each matched draft as its rule category', false)
  .action(async (o: { accept: boolean }) => {
    const ws = requireWorkspace();
    const store = await openLedger(ws);

    // One unit of work for the whole sweep: either every matched draft posts, or
    // none do. A rule pass that half-applies leaves the queue in a state nobody
    // can reason about.
    const result = await store.unitOfWork(async (uow) => {
      const rules = await uow.listRules();
      const accounts = await uow.listAccounts();
      const byCode2 = new Map(accounts.map((a) => [a.code as string, a]));
      const pending = (await uow.listIngestItems({ status: 'pending' })).filter((i) => i.txnId);

      const matched: { itemId: string; payee: string | null; category: string; txnId?: string }[] = [];
      const unmatched: number[] = [];
      const warnings: string[] = [];
      for (const item of pending) {
        const rule = matchRule(rules, item.merchant);
        if (!rule) {
          unmatched.push(1);
          continue;
        }
        const target = byCode2.get(rule.category);
        if (!target || target.placeholder) {
          warnings.push(`rule ${rule.id} → ${rule.category}: account missing or placeholder — skipped`);
          continue;
        }
        if (o.accept) {
          const newId = await supersedeDraftAs(uow, item.id, item.txnId!, target, accounts);
          matched.push({ itemId: item.id, payee: item.merchant, category: rule.category, txnId: newId });
        } else {
          matched.push({ itemId: item.id, payee: item.merchant, category: rule.category });
        }
      }
      return { matched, unmatchedCount: unmatched.length, warnings, accepted: o.accept };
    });
    await store.close();

    out(result);
    if (result.accepted) {
      note(`${result.matched.length}건을 승인했습니다. ${result.unmatchedCount}건은 규칙이 없습니다 — 대시보드의 분류 대기 카드나 \`holiday rule add\`로.`);
    } else {
      note(`${result.matched.length}건이 규칙과 일치합니다 (아직 적용 전 — --accept로 승인), ${result.unmatchedCount}건은 규칙 없음.`);
    }
    for (const w of result.warnings) note(`  ⚠ ${w}`);
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
      note(`이 스케줄은 예측입니다. 실제와 어긋나는지는 \`holiday loan check\`로 확인하세요.`);
    },
  );

loan
  .command('list')
  .description('loans and where they stand')
  .action(async () => {
    const ws = requireWorkspace();
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
        note(`⚠ 실제 ${paid}, 스케줄 ${scheduled}. 차액은 원금에 반영했습니다 — 명세서와 대조해 주세요.`);
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

/**
 * Parse one `--spend`/`--receive` spec: "DATE AMOUNT LABEL".
 *
 * AMOUNT is a plain count of minor units in the book currency — 5000000 is
 * ₩5,000,000 in a KRW book — entered POSITIVE; the sign comes from which flag was
 * used, so the user never types a minus. Commas are allowed for readability.
 */
function parseAssume(spec: string, sign: bigint): CashflowAssumption {
  const m = /^\s*(\d{4}-\d{2}-\d{2})\s+([\d,]+)\s+(.+?)\s*$/.exec(spec);
  if (!m) {
    throw new UsageError(`--spend/--receive want "DATE AMOUNT LABEL", got ${JSON.stringify(spec)}`);
  }
  const [, date, amount, label] = m;
  const minor = BigInt(amount!.replace(/,/g, ''));
  if (minor <= 0n) throw new UsageError(`amount must be positive (the flag sets direction): ${JSON.stringify(spec)}`);
  return { date: assertIsoDate(date!), changeMinor: minor * sign, label: label! };
}

/** Commander collector for a repeatable option. */
function collectAssume(value: string, previous: string[]): string[] {
  return [...previous, value];
}

program
  .command('cashflow')
  .description('will the cash survive the card bills that are already coming')
  .option('--until <date>', 'projection horizon', addMonthsIso(today(), 3))
  // What-if, folded into the same runway. Nothing is written — a purchase you are
  // weighing, a bonus you expect. `--spend` leaves cash, `--receive` brings it in,
  // so the user never guesses a sign. Repeatable: stack several to see them all at
  // once. Format: "DATE AMOUNT LABEL", e.g. --spend "2026-09-01 5000000 새 노트북".
  .option('--spend <spec>', 'hypothetical outflow "DATE AMOUNT LABEL" (repeatable)', collectAssume, [])
  .option('--receive <spec>', 'hypothetical inflow "DATE AMOUNT LABEL" (repeatable)', collectAssume, [])
  .action(async (o: { until: string; spend: string[]; receive: string[] }) => {
    const ws = requireWorkspace();
    const store = await openLedger(ws);

    const now = assertIsoDate(today());
    const until = assertIsoDate(o.until);
    // spend is money leaving (negative change), receive is money arriving.
    const assume = [
      ...o.spend.map((s) => parseAssume(s, -1n)),
      ...o.receive.map((s) => parseAssume(s, 1n)),
    ];

    const proj = await store.read((r) => projectCashflow(r, { asOf: now, until, assume }));
    await store.close();

    const { runway } = proj;

    if (jsonMode()) {
      // i64 amounts serialise as decimal STRINGS: JSON has no i64, and
      // Number("9007199254740993") silently gives ...992. Whatever reads this —
      // the dashboard bake included — must not parse them back into numbers.
      return out({
        asOf: proj.asOf,
        until: proj.until,
        openingCashMinor: proj.openingCashMinor.toString(),
        commodity: proj.commodity,
        runway: runway.map((p) => ({
          date: p.date,
          outflowMinor: p.outflowMinor.toString(),
          balanceAfterMinor: p.balanceAfterMinor.toString(),
          items: p.items.map((b) => ({ kind: b.kind, label: b.label, amountMinor: b.amountMinor.toString() })),
        })),
        // Shipped in the JSON, not just printed: a projection that quietly omits
        // an outflow reads as reassurance when it should read as "I don't know",
        // and that is just as true on a dashboard as in a terminal.
        gaps: proj.gaps,
      });
    }

    const money = (m: bigint) => amounts.format({ minor: m, commodity: proj.commodity });
    for (const g of proj.gaps) note(`⚠ ${g.subject} ${g.detail}.`);
    note(`현재 현금 (${now}): ${money(proj.openingCashMinor)} ${proj.commodity}`);
    if (runway.length === 0) {
      note(`${until}까지 예정된 지출이 없습니다.`);
      return;
    }
    note('');
    for (const p of runway) {
      const short = p.balanceAfterMinor < 0n;
      // A day's net can be an inflow now that --receive exists: a negative outflow
      // is money arriving, so show it as +, not as a double-negative "- -3,000,000".
      const net = p.outflowMinor >= 0n ? `-${money(p.outflowMinor)}` : `+${money(-p.outflowMinor)}`;
      note(`${p.date}   ${net.padStart(13)}   →  ${money(p.balanceAfterMinor).padStart(12)}${short ? '   ⚠ 부족' : ''}`);
      for (const b of p.items) {
        const line = b.amountMinor >= 0n ? `-${money(b.amountMinor)}` : `+${money(-b.amountMinor)}`;
        note(`             ${b.label.padEnd(30)} ${line.padStart(13)}`);
      }
    }
    const worst = runway.reduce((a, b) => (b.balanceAfterMinor < a.balanceAfterMinor ? b : a));
    note('');
    if (worst.balanceAfterMinor < 0n) {
      note(`⚠ ${worst.date}에 ${money(-worst.balanceAfterMinor)} ${proj.commodity}가 부족합니다.`);
    } else {
      note(`최저점: ${worst.date}, ${money(worst.balanceAfterMinor)} ${proj.commodity}.`);
    }
  });

/**
 * Which leg identifies the transaction for duplicate detection.
 *
 * The card or the bank — not the category. Two people can categorise the same
 * purchase differently; the money side is what the issuer actually recorded.
 */
/**
 * Accept a draft AS a category: reject the old draft, append the completed
 * transaction posted, repoint the ingest item.
 *
 * A supersede rather than an in-place edit, deliberately. The audit chain
 * commits to a transaction's CONTENT at append; mutating a draft's leg would
 * either break verify or demand chain surgery, and the chain is the one thing
 * this system never bends. Rejected drafts are already kept as dedup memory, so
 * the leftover row costs nothing new.
 *
 * Only the Uncategorized leg is swappable — it is a placeholder, not
 * information. Amounts, dates, and the money leg stay immutable even in drafts:
 * a misread amount is a re-submission, because amount edits are where mistakes
 * and fraud hide.
 */
/** The same units, and their negation, as Amount objects for a correction pair. */
function amountsOf(pLeg: { units: { minor: bigint; commodity: CommodityCode } }): {
  same: { minor: bigint; commodity: CommodityCode };
  negated: { minor: bigint; commodity: CommodityCode };
} {
  return {
    same: { minor: pLeg.units.minor, commodity: pLeg.units.commodity },
    negated: { minor: -pLeg.units.minor, commodity: pLeg.units.commodity },
  };
}

function byId2Code(accounts: readonly Account[], id: AccountId): string {
  return (accounts.find((a) => a.id === id)?.code as string) ?? id;
}

async function supersedeDraftAs(
  uow: LedgerUow,
  itemId: string,
  oldTxnId: TxnId,
  target: Account,
  accounts: readonly Account[],
): Promise<TxnId> {
  const old = await uow.getTxn(oldTxnId);
  if (!old) throw new UsageError(`draft ${oldTxnId} not found`);
  if (old.status !== 'draft') throw new UsageError(`transaction ${oldTxnId} is ${old.status}, not a draft`);

  const uncatIds = new Set(
    accounts
      .filter((a) => (a.code as string) === 'Expenses:Uncategorized' || (a.code as string) === 'Income:Uncategorized')
      .map((a) => a.id),
  );
  const swappable = old.txn.postings.filter((p) => uncatIds.has(p.accountId));
  if (swappable.length === 0) {
    throw new UsageError(
      `draft ${oldTxnId} has no Uncategorized leg to swap — accept it without --category, or reject and resubmit.`,
    );
  }
  if (target.commodity) {
    for (const pLeg of swappable) {
      if (pLeg.units.commodity !== target.commodity) {
        throw new UsageError(
          `${target.code} is ${target.commodity}-only but the leg is ${pLeg.units.commodity}.`,
        );
      }
    }
  }

  const created = Txn.create({
    id: nextUlid() as TxnId,
    date: old.txn.date,
    bookingCommodity: old.txn.bookingCommodity,
    payee: old.txn.payee,
    narration: old.txn.narration,
    systemKind: old.txn.systemKind,
    correctsTxnId: null,
    sourceItemId: itemId,
    tags: [...old.txn.tags],
    meta: { ...old.txn.meta, supersedes: oldTxnId },
    postings: old.txn.postings.map((pLeg) => ({
      seq: pLeg.seq,
      accountId: uncatIds.has(pLeg.accountId) ? target.id : pLeg.accountId,
      units: pLeg.units,
      weightMinor: pLeg.weightMinor,
      weightSource: pLeg.weightSource,
      fxRateText: pLeg.fxRateText,
      fxRateId: pLeg.fxRateId,
      lotId: pLeg.lotId,
      kind: pLeg.kind,
      memo: pLeg.memo,
    })),
  });
  // Same amounts, same weights — only an account id changed. If this fails the
  // original draft was never balanced, which appendTxn would have refused.
  if (!created.ok) throw new LedgerError('internal', created.error.map(describeTxnError).join('\n'));

  await uow.appendTxn(created.value, { status: 'posted' });
  await uow.rejectDraft(oldTxnId, `recategorized → ${target.code as string}`);
  await uow.setIngestItemStatus(itemId, 'accepted', { txnId: created.value.id });
  return created.value.id;
}

/**
 * First rule that matches the payee, in the store's order (priority DESC, then
 * newest). Contains-match is case-insensitive; a broken regex simply never
 * matches — a rule must fail toward "unclassified", never toward a wrong class.
 */
function matchRule(rules: readonly Rule[], payee: string | null): Rule | null {
  if (!payee) return null;
  const hay = payee.toLowerCase();
  for (const r of rules) {
    if (r.match === 'regex') {
      try {
        if (new RegExp(r.pattern).test(payee)) return r;
      } catch {
        // validated at `rule add`; a legacy bad pattern must not crash an import
      }
    } else if (hay.includes(r.pattern.toLowerCase())) {
      return r;
    }
  }
  return null;
}

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


program
  .command('verify')
  .description('scan the whole ledger and the audit chain')
  .option('--head', 'print the audit chain head — anchor this outside the file', false)
  .action(async (o: { head: boolean }) => {
    const ws = requireWorkspace();
    const store = await openLedger(ws);
    const report = await verifyLedger(store, {
      chainHead: () => store.chainHead(),
      throwOnFailure: false,
    });
    await store.close();

    if (jsonMode()) return out(report);
    if (o.head) {
      const head = report.head ?? null;
      note(head ? `chain head: #${head.seq} ${head.hash}` : 'chain head: (empty ledger)');
    }
    if (report.ok) {
      note(`이상 없습니다 — 거래 ${report.checked}건 검사, 감사 체인 무결.`);
      return;
    }
    for (const p of report.problems) note(`${p.kind}  ${p.subject ?? ''}\n  ${p.detail}`);
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

const dash = program.command('dash').description('대시보드 — 원장의 스냅샷을 굽고, 에이전트가 화면을 고른다');

dash
  .command('init')
  .description('scaffold a vinext dashboard next to the ledger')
  .option('--dir <path>', 'where to write it', 'dash')
  .action(async (o: { dir: string }) => {
    const ws = requireWorkspace();
    const dest = resolve(process.cwd(), o.dir);
    // The blocks are pinned to THIS CLI's version — see scaffold(). A dashboard
    // and the vocabulary it is written in are one release.
    const { created, skipped } = scaffold(dest, VERSION);

    // Bake immediately. A scaffold whose first `pnpm dev` shows an empty page
    // teaches the agent that the dashboard is broken, and it starts inventing
    // fixes — usually by typing figures into spec.json, which is the one thing
    // this design exists to prevent.
    const store = await openLedger(ws);
    const data = await bakeDatasets(store, {
      asOf: assertIsoDate(today()),
      until: assertIsoDate(addMonthsIso(today(), 3)),
      now: () => new Date().toISOString(),
    });
    await store.close();
    writeFileSync(join(dest, 'src', 'data', 'ledger.json'), `${JSON.stringify(data, null, 2)}\n`);

    out({ dir: dest, created, skipped });
    note(`대시보드를 만들었습니다: ${dest}`);
    if (skipped.length > 0) note(`기존 파일은 그대로 두었습니다: ${skipped.join(', ')}`);
    note(`  cd ${o.dir} && pnpm install && pnpm dev`);
    note(`레이아웃은 src/data/spec.json에서 고르세요. ledger.json은 직접 수정하지 말고 \`holiday dash data\`로 다시 굽습니다.`);
  });

dash
  .command('data')
  .description('re-bake the snapshot the dashboard renders')
  .option('--dir <path>', 'the dashboard directory', 'dash')
  .option('--until <date>', 'projection horizon', addMonthsIso(today(), 3))
  .action(async (o: { dir: string; until: string }) => {
    const ws = requireWorkspace();
    const store = await openLedger(ws);
    const data = await bakeDatasets(store, {
      asOf: assertIsoDate(today()),
      until: assertIsoDate(o.until),
      now: () => new Date().toISOString(),
    });
    await store.close();

    const dest = resolve(process.cwd(), o.dir, 'src', 'data', 'ledger.json');
    if (!existsSync(dirname(dest))) {
      throw new UsageError(`no dashboard at ${resolve(process.cwd(), o.dir)} — run \`holiday dash init\` first`);
    }
    writeFileSync(dest, `${JSON.stringify(data, null, 2)}\n`);
    if (jsonMode()) return out(data);
    note(`스냅샷을 구웠습니다: ${dest}`);
    note(`스냅샷은 그 시점의 사진입니다. 기록·수집·마감 후에는 다시 구워 주세요.`);
  });

// No `dash catalog` command, on purpose. The catalog is a Zod object in
// @holiday-cfo/blocks, and it imports @json-render/react — printing it from here
// would drag React into a 423KB CLI bundle that has no business knowing what a
// component is. The block list lives in the template's AGENTS.md, which lands
// next to spec.json in the project where the agent is actually reading. A script
// keeps the two honest: pnpm --filter @holiday-cfo/cli check:catalog.

/**
 * Map a statutory settlement into a posted txn using the standard chart.
 *
 * - 사업소득 원천징수 → Assets:Receivable:Tax (기납부)
 * - 갑근세·지방(근로) → Expenses:Tax:Withholding
 * - 4대보험 근로자분 → Expenses:Insurance
 * - 부가세 → Liabilities:Payable:Tax
 */
async function postIncomeSettlement(
  uow: LedgerUow,
  opts: {
    source: IncomeSource;
    paidOn: IsoDate;
    grossMinor: bigint;
    netMinor: bigint;
    lines: readonly IncomeSettlementLine[];
    narration: string;
    currency: CommodityCode;
  },
): Promise<string> {
  const need = async (code: string) => {
    const a = await uow.getAccount(code);
    if (!a) {
      throw new UsageError(
        `missing account ${code} for --post. Create the standard tax chart (see AGENTS.md) first.`,
      );
    }
    return a.id;
  };

  const withholdingRecv = await need('Assets:Receivable:Tax');
  const withholdingExp = await need('Expenses:Tax:Withholding');
  const insuranceExp = await need('Expenses:Insurance');
  const vatPayable = await need('Liabilities:Payable:Tax');

  type Leg = { accountId: AccountId; minor: bigint };
  const legs: Leg[] = [];

  if (opts.source.regime === 'business_vat') {
    legs.push({ accountId: opts.source.incomeAccountId, minor: -opts.grossMinor });
    const vat = opts.lines.find((l) => l.kind === 'vat_10')?.amountMinor ?? 0n;
    if (vat > 0n) legs.push({ accountId: vatPayable, minor: -vat });
    legs.push({ accountId: opts.source.depositAccountId, minor: opts.netMinor });
  } else {
    legs.push({ accountId: opts.source.incomeAccountId, minor: -opts.grossMinor });
    legs.push({ accountId: opts.source.depositAccountId, minor: opts.netMinor });
    for (const line of opts.lines) {
      if (line.amountMinor === 0n) continue;
      legs.push({
        accountId: accountForSettlementLine(line.kind, {
          withholdingRecv,
          withholdingExp,
          insuranceExp,
          vatPayable,
        }),
        minor: line.amountMinor,
      });
    }
  }

  const collapsed = new Map<AccountId, bigint>();
  for (const leg of legs) {
    collapsed.set(leg.accountId, (collapsed.get(leg.accountId) ?? 0n) + leg.minor);
  }

  const txn = Txn.create({
    id: nextUlid() as TxnId,
    date: opts.paidOn,
    bookingCommodity: opts.currency,
    payee: opts.source.label,
    narration: opts.narration,
    postings: [...collapsed.entries()]
      .filter(([, m]) => m !== 0n)
      .map(([accountId, minor]) => ({
        accountId,
        units: amounts.fromMinor(minor, opts.source.commodity),
      })),
  });
  if (!txn.ok) throw new LedgerError('unbalanced', txn.error.map(describeTxnError).join('\n'));
  await uow.appendTxn(txn.value, { status: 'posted' });
  return txn.value.id;
}

function accountForSettlementLine(
  kind: IncomeSettlementLine['kind'],
  ids: {
    withholdingRecv: AccountId;
    withholdingExp: AccountId;
    insuranceExp: AccountId;
    vatPayable: AccountId;
  },
): AccountId {
  switch (kind) {
    case 'income_tax_3':
    case 'local_tax_0_3':
      return ids.withholdingRecv;
    case 'earned_income_tax':
    case 'local_income_tax':
      return ids.withholdingExp;
    case 'national_pension':
    case 'health_insurance':
    case 'long_term_care':
    case 'employment_insurance':
      return ids.insuranceExp;
    case 'vat_10':
      return ids.vatPayable;
    default: {
      const _e: never = kind;
      throw new UsageError(`unhandled settlement line: ${_e}`);
    }
  }
}

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
const deploy = program.command('deploy').description('BYOC 배포 — 사용자가 고른 타깃에 팩스 자동화 스택을 생성');

deploy
  .command('init')
  .description('scaffold a non-destructive deploy project (vercel-supabase | chatgpt-sites)')
  .requiredOption('--target <name>', 'vercel-supabase | chatgpt-sites')
  .option('--dir <path>', 'where to write it', '.')
  .option(
    '--mode <mode>',
    'chatgpt-sites only: inbox-export (default) | engine (requires D1 conformance)',
    'inbox-export',
  )
  .action(async (o: { target: string; dir: string; mode: string }) => {
    if (o.target !== 'vercel-supabase' && o.target !== 'chatgpt-sites') {
      throw new UsageError(`unknown deploy target: ${o.target}. Use vercel-supabase or chatgpt-sites.`);
    }
    if (o.mode !== 'inbox-export' && o.mode !== 'engine') {
      throw new UsageError(`unknown mode: ${o.mode}. Use inbox-export or engine.`);
    }
    const dest = resolve(process.cwd(), o.dir);
    const result = scaffoldDeploy({
      dest,
      target: o.target,
      version: program.version() ?? '0.1.0',
      mode: o.mode as 'inbox-export' | 'engine',
    });
    out({
      dir: dest,
      target: o.target,
      mode: result.mode,
      created: result.created,
      skipped: result.skipped,
      d1EngineEligible: result.d1EngineEligible,
    });
    note(`Deploy scaffold at ${dest} (target=${o.target}, mode=${result.mode})`);
    if (result.skipped.length > 0) note(`Kept existing: ${result.skipped.join(', ')}`);
    if (o.target === 'chatgpt-sites' && result.mode === 'inbox-export') {
      note('D1 is NOT an engine-tier ledger here. Sites mode is fax inbox + review/export only.');
    }
    note('Never copy .holiday/**, *.db, or .env* into the deploy project.');
    note('Next: follow holiday-deploy-* / holiday-fax skills; run synthetic fax tests before production.');
  });

deploy
  .command('check')
  .description('print deploy target capabilities and D1 engine gate status')
  .action(() => {
    out({
      targets: {
        'vercel-supabase': {
          ledger: 'postgres via @holiday-cfo/store-postgres (engine)',
          objects: 'Supabase Storage (private)',
          background: 'Vercel after() + durable fax_inbox recovery route',
        },
        'chatgpt-sites': {
          ledger: 'not claimed — D1 fails interactive unitOfWork conformance',
          objects: 'Sites-managed R2',
          background: 'none (Queues/Cron unsupported) — explicit retry via UI/MCP',
          mode: 'inbox-export',
        },
      },
      d1EngineEligible: false,
      managedWeb: false,
    });
  });

program.parseAsync().catch((e: unknown) => {
  const code =
    e instanceof UsageError ? 'usage' : e instanceof AppError ? e.code : e instanceof LedgerError ? e.code : 'internal';
  const message = e instanceof Error ? e.message : String(e);
  process.stderr.write(`${JSON.stringify({ error: { code, message } })}\n`);
  process.exit(code === 'usage' ? 2 : 1);
});
