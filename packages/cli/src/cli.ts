// Loaded dynamically by main.ts, AFTER env.ts has patched process.emitWarning.
// Do not make this the bin entry point — see the comment in main.ts.
import { Command } from 'commander';

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
} from '@holiday/core';

import { UsageError, parseLeg } from './legs.js';
import { createWorkspace, openStore, readConfig, requireWorkspace } from './workspace.js';

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
    const store = openStore(ws);
    await store.init();
    await store.migrate();
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
  .option('--placeholder', 'a grouping node that cannot be posted to', false)
  .option('--opened <date>', 'ISO date', today())
  .action(async (code: string, o: { commodity?: string; nonMonetary: boolean; placeholder: boolean; opened: string }) => {
    const ws = requireWorkspace();
    const store = openStore(ws);
    await store.init();
    const c = assertAccountCode(code);
    const acct: Account = {
      id: nextUlid() as AccountId,
      code: c,
      type: accountTypeOf(c),
      parentId: null,
      commodity: o.commodity ? registry.get(o.commodity).code : null,
      monetary: !o.nonMonetary,
      placeholder: o.placeholder,
      openedOn: assertIsoDate(o.opened),
      closedOn: null,
    };
    await store.unitOfWork((uow) => uow.upsertAccount(acct));
    await store.close();
    out({ id: acct.id, code: acct.code, type: acct.type, commodity: acct.commodity });
  });

account
  .command('list')
  .description('list accounts')
  .action(async () => {
    const ws = requireWorkspace();
    const store = openStore(ws);
    await store.init();
    const accounts = await store.read((r) => r.listAccounts());
    await store.close();
    if (jsonMode()) return out(accounts);
    for (const a of accounts) {
      note(`${a.code.padEnd(40)} ${(a.commodity ?? '(multi)').padEnd(8)}${a.placeholder ? ' [placeholder]' : ''}`);
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
    const store = openStore(ws);
    await store.init();

    const byCode = new Map<string, Account>();
    for (const a of await store.read((r) => r.listAccounts())) byCode.set(a.code, a);
    const resolve = (code: string): Account => {
      const a = byCode.get(code);
      if (!a) throw new UsageError(`no such account: ${code}. Create it with \`holiday account add ${code}\`.`);
      return a;
    };

    const postings = o.leg.map((l) => parseLeg(l, amounts, config.functionalCurrency, resolve));
    const result = Txn.create({
      id: nextUlid() as TxnId,
      date: assertIsoDate(o.date),
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
    const store = openStore(ws);
    await store.init();
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
      const store = openStore(ws);
      await store.init();
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
    const store = openStore(ws);
    await store.init();
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
    }) => {
      const ws = requireWorkspace();
      const config = readConfig(ws);
      const store = openStore(ws);
      await store.init();

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
            placeholder: false,
            openedOn: purchasedOn,
            closedOn: null,
          });
          note(`created ${liabilityCode} (installment balances are kept apart from ordinary card charges)`);
        }

        const rows = buildInstallmentSchedule({
          purchasedOn,
          months: o.months,
          totalMinor: totalAmount.minor,
          cardRule: card.rule,
          remainderOn: o.remainderOn === 'last' ? 'last' : 'first',
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
            interestFree: true,
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
      note(
        `${o.months}개월 무이자 할부, ${amounts.format(totalAmount)} ${config.functionalCurrency}. ` +
          `First ${result.rows[0]!.paymentDate}, last ${result.rows.at(-1)!.paymentDate}.`,
      );
    },
  );

installment
  .command('list')
  .description('installments with money still to move')
  .action(async () => {
    const ws = requireWorkspace();
    const config = readConfig(ws);
    const store = openStore(ws);
    await store.init();
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
      const store = openStore(ws);
      await store.init();

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
    const store = openStore(ws);
    await store.init();
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

program
  .command('cashflow')
  .description('will the cash survive the card bills that are already coming')
  .option('--until <date>', 'projection horizon', addMonthsIso(today(), 3))
  .action(async (o: { until: string }) => {
    const ws = requireWorkspace();
    const config = readConfig(ws);
    const store = openStore(ws);
    await store.init();

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
      const balances = await r.getBalances({ asOf: now });
      const openingCash = balances
        .filter((b) => isCashAccount(b.accountCode) && b.commodity === config.functionalCurrency)
        .reduce((s, b) => s + b.weightMinor, 0n);

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
      return { cards, openingCash, postings, installments, recurring };
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
    const runway = cashRunway<ProjectedOutflow>(result.openingCash, [...bills, ...instRows, ...recRows]);

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

function describeOutflow(b: ProjectedOutflow): string {
  if (b.kind === 'installment') return `${b.label ?? '할부'} (${b.seq}/${b.months})`;
  if (b.kind === 'recurring') {
    // Show the charge date when a card sits in between, since "why is this here"
    // is otherwise unanswerable: the money is leaving weeks after the charge.
    return b.viaCardAccountId ? `${b.label} (${b.occurredOn} 결제분)` : b.label;
  }
  return `${b.cardLabel ?? b.cardCode}  ${b.cycleFrom}..${b.cycleTo}`;
}

/**
 * Which accounts hold spendable cash.
 *
 * A prefix rule rather than a flag on the account, for now. It is the one thing
 * here that is a convention instead of a fact, and it will want to become an
 * account flag the first time someone keeps cash somewhere these do not match.
 */
function isCashAccount(code: string): boolean {
  return code.startsWith('Assets:Bank') || code.startsWith('Assets:Cash');
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
    const store = openStore(ws);
    await store.init();
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
    const store = openStore(ws);
    await store.init();
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
