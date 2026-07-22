import {
  type AccountCode,
  type AccountId,
  type IsoDate,
  assertIsoDate,
} from './account.js';

/**
 * 부채 유동·비유동 구분 — 기준일 잔액을 스케줄 원금으로 12개월 창에 나눈다.
 *
 * 계정 트리·전표를 건드리지 않는 읽기 전용 보고다. 장부 \|잔액\|이 진실이고,
 * 할부·대출 스케줄은 창을 가르는 데만 쓴다 (SPEC-liability-maturity).
 */

export interface LiabilityBalanceForMaturity {
  readonly accountId: AccountId;
  readonly accountCode: AccountCode;
  /**
   * 기능통화 weight. 부채 대변 잔액은 보통 음수 — 구분 금액은 절댓값(빚의 크기)로
   * 보고한다.
   */
  readonly weightMinor: bigint;
}

/** 할부 `paymentDate` / 대출 `dueDate` + 원금. 이자는 넣지 않는다. */
export interface MaturityScheduleRow {
  readonly accountId: AccountId;
  readonly dueDate: IsoDate;
  readonly principalMinor: bigint;
}

export interface LiabilityMaturityAccount {
  readonly accountId: AccountId;
  readonly accountCode: AccountCode;
  readonly currentMinor: bigint;
  readonly nonCurrentMinor: bigint;
  readonly totalMinor: bigint;
}

export interface LiabilityMaturitySummary {
  readonly asOf: IsoDate;
  readonly currentMinor: bigint;
  readonly nonCurrentMinor: bigint;
  readonly totalMinor: bigint;
  readonly byAccount: readonly LiabilityMaturityAccount[];
}

/**
 * 창: `(asOf, asOf + 12 calendar months]` — 기준일 다음날부터 12개월이 끝나는
 * 날까지 만기가 오는 원금을 유동으로 본다.
 */
export function maturityWindowEnd(asOf: IsoDate): IsoDate {
  return addCalendarMonths(asOf, 12);
}

export function classifyLiabilityMaturity(input: {
  readonly asOf: IsoDate;
  readonly balances: readonly LiabilityBalanceForMaturity[];
  readonly scheduleRows: readonly MaturityScheduleRow[];
}): LiabilityMaturitySummary {
  const asOf = assertIsoDate(input.asOf);
  const windowEnd = maturityWindowEnd(asOf);

  const balanceByAccount = new Map<
    AccountId,
    { accountCode: AccountCode; weightMinor: bigint }
  >();
  for (const row of input.balances) {
    const prev = balanceByAccount.get(row.accountId);
    if (prev) {
      balanceByAccount.set(row.accountId, {
        accountCode: prev.accountCode,
        weightMinor: prev.weightMinor + row.weightMinor,
      });
    } else {
      balanceByAccount.set(row.accountId, {
        accountCode: row.accountCode,
        weightMinor: row.weightMinor,
      });
    }
  }

  const scheduleByAccount = new Map<AccountId, MaturityScheduleRow[]>();
  for (const row of input.scheduleRows) {
    const list = scheduleByAccount.get(row.accountId);
    if (list) list.push(row);
    else scheduleByAccount.set(row.accountId, [row]);
  }

  const byAccount: LiabilityMaturityAccount[] = [];
  let currentMinor = 0n;
  let nonCurrentMinor = 0n;

  for (const [accountId, bal] of balanceByAccount) {
    // 대변(음수)만 빚. 과납으로 weight가 양수면 구분 대상이 아니다.
    const total = bal.weightMinor < 0n ? -bal.weightMinor : 0n;
    if (total === 0n) continue;

    const split = splitAgainstBalance(
      scheduleByAccount.get(accountId) ?? [],
      asOf,
      windowEnd,
      total,
    );
    byAccount.push({
      accountId,
      accountCode: bal.accountCode,
      currentMinor: split.currentMinor,
      nonCurrentMinor: split.nonCurrentMinor,
      totalMinor: total,
    });
    currentMinor += split.currentMinor;
    nonCurrentMinor += split.nonCurrentMinor;
  }

  byAccount.sort((a, b) => (a.accountCode < b.accountCode ? -1 : a.accountCode > b.accountCode ? 1 : 0));

  return {
    asOf,
    currentMinor,
    nonCurrentMinor,
    totalMinor: currentMinor + nonCurrentMinor,
    byAccount,
  };
}

function splitAgainstBalance(
  rows: readonly MaturityScheduleRow[],
  asOf: IsoDate,
  windowEnd: IsoDate,
  balanceMinor: bigint,
): { currentMinor: bigint; nonCurrentMinor: bigint } {
  let scheduledCurrent = 0n;
  let scheduledNonCurrent = 0n;
  for (const row of rows) {
    if (row.principalMinor <= 0n) continue;
    if (row.dueDate <= asOf) continue;
    if (row.dueDate <= windowEnd) scheduledCurrent += row.principalMinor;
    else scheduledNonCurrent += row.principalMinor;
  }

  const scheduled = scheduledCurrent + scheduledNonCurrent;
  if (scheduled === 0n) {
    return { currentMinor: balanceMinor, nonCurrentMinor: 0n };
  }
  if (scheduled === balanceMinor) {
    return { currentMinor: scheduledCurrent, nonCurrentMinor: scheduledNonCurrent };
  }
  if (scheduled < balanceMinor) {
    // 부족분은 유동에 붙인다 — 단기 압박을 과소평가하지 않으려고.
    return {
      currentMinor: scheduledCurrent + (balanceMinor - scheduled),
      nonCurrentMinor: scheduledNonCurrent,
    };
  }

  // scheduled > balance: B/S 비율로 줄이고, 합이 정확히 B가 되도록 유동을 마지막에 맞춘다.
  const nonCurrentScaled = (scheduledNonCurrent * balanceMinor) / scheduled;
  return {
    currentMinor: balanceMinor - nonCurrentScaled,
    nonCurrentMinor: nonCurrentScaled,
  };
}

/** `usecases/dates.addMonthsIso`와 같은 말일 클램프. 도메인은 usecase를 import하지 않는다. */
function addCalendarMonths(date: IsoDate, delta: number): IsoDate {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const zero = m - 1 + delta;
  const ny = y + Math.floor(zero / 12);
  const nm = (((zero % 12) + 12) % 12) + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return assertIsoDate(
    `${String(ny).padStart(4, '0')}-${String(nm).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`,
  );
}
