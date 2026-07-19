import { type AccountId, type IsoDate, assertIsoDate } from './account.js';
import type { CommodityCode } from './commodity.js';
import { RATE_SCALE } from './rate.js';

/**
 * 대한민국 수입 정산 — 법정 원천징수·4대보험을 스케줄이 아니라 **강제 계산**한다.
 *
 * 할부수수료(카드사 비공개 공식)와 다르다. 여기 요율은 법령·고시로 공개되고,
 * 법이 바뀌면 이 파일의 `KR_STATUTE`와 스킬 `references/workflows/kr-income.md`를
 * 같이 올린다. 에이전트가 임의 비율을 쓰면 `income check`가 거부한다.
 *
 * 갑근세(근로소득 간이세액) 표는 부양가족·공제에 의존해 여기 넣지 않는다.
 * 급여 regime은 4대보험만 법정 계산하고, 갑근세·지방소득세는 `--earned-tax`로
 * 스킬/명세서가 넣는다(지방세 = 갑근세의 10%).
 */

/** 이 바이너리가 아는 법령 기준일. 정산 행에 박아 두면 요율 개정 후에도 과거 대사 가능. */
export const KR_STATUTE_AS_OF = '2026-01-01' as IsoDate;

export type IncomeRegime =
  /** 사업소득 등 원천징수 3.3% (소득세 3% + 지방소득세 0.3%). 부가세 없음. */
  | 'business_withholding'
  /** 과세사업자 세금계산서 — 공급가액 기준 부가세 10%. */
  | 'business_vat'
  /** 근로소득. 4대보험 근로자부담 법정 계산 + 갑근세(입력). */
  | 'salary'
  /** 수당 등 — 공제 라인 없음. 전액 입금. */
  | 'allowance';

export const INCOME_REGIMES: readonly IncomeRegime[] = [
  'business_withholding',
  'business_vat',
  'salary',
  'allowance',
] as const;

export type SettlementLineKind =
  | 'income_tax_3'
  | 'local_tax_0_3'
  | 'vat_10'
  | 'national_pension'
  | 'health_insurance'
  | 'long_term_care'
  | 'employment_insurance'
  | 'earned_income_tax'
  | 'local_income_tax';

export interface IncomeSource {
  readonly id: string;
  readonly label: string;
  readonly incomeAccountId: AccountId;
  readonly depositAccountId: AccountId;
  readonly regime: IncomeRegime;
  readonly commodity: CommodityCode;
  readonly activeFrom: IsoDate;
  readonly activeTo: IsoDate | null;
}

export interface IncomeSettlementLine {
  readonly seq: number;
  readonly kind: SettlementLineKind;
  readonly amountMinor: bigint;
}

export interface IncomeSettlement {
  readonly id: string;
  readonly sourceId: string;
  /** 지급일. */
  readonly paidOn: IsoDate;
  /**
   * 계산 기준 총액.
   * - business_withholding / salary / allowance: 지급 총액(세전)
   * - business_vat: 공급가액 (부가세 제외)
   */
  readonly grossMinor: bigint;
  /** 통장 실입금. */
  readonly netMinor: bigint;
  readonly commodity: CommodityCode;
  /** 계산에 쓴 법령 기준일. */
  readonly statuteAsOf: IsoDate;
  /** 연결 전표. 없으면 정산만 저장. */
  readonly txnId: string | null;
  readonly label: string | null;
}

export interface IncomeSettlementWithLines {
  readonly settlement: IncomeSettlement;
  readonly lines: readonly IncomeSettlementLine[];
}

export class KrIncomeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KrIncomeError';
  }
}

/** 법정 요율·상하한. 개정 시 이 객체와 스킬을 같이 갱신. */
export interface KrStatute {
  readonly asOf: IsoDate;
  /** 소득세 원천징수 3%. */
  readonly businessIncomeTaxRate: bigint;
  /** 지방소득세 = 소득세액의 10% (결과적으로 약 0.3%). */
  readonly localTaxOnIncomeTaxRate: bigint;
  /** 부가가치세 10%. */
  readonly vatRate: bigint;
  /** 국민연금 근로자 부담. */
  readonly pensionEmployeeRate: bigint;
  /** 건강보험 근로자 부담. */
  readonly healthEmployeeRate: bigint;
  /** 장기요양 = 건강보험료(근로자분) × 이 비율. */
  readonly longTermCareOnHealthRate: bigint;
  /** 고용보험(실업급여) 근로자 부담. */
  readonly employmentEmployeeRate: bigint;
  /** 국민연금 기준소득월액 하한·상한 (원, KRW minor). 적용 구간별. */
  readonly pensionBounds: readonly {
    readonly from: IsoDate;
    readonly to: IsoDate | null;
    readonly floorMinor: bigint;
    readonly ceilingMinor: bigint;
  }[];
}

/**
 * 2026년 고시 요율.
 *
 * - 국민연금 9.5% → 근로자 4.75% (2026-01~)
 * - 건강보험 7.19% → 근로자 3.595%
 * - 장기요양 건강보험료의 13.14%
 * - 고용보험 실업급여 근로자 0.9%
 * - 국민연금 기준소득월액: 2025-07~2026-06 상한 637만 / 2026-07~ 상한 659만
 */
export const KR_STATUTE_2026: KrStatute = {
  asOf: KR_STATUTE_AS_OF,
  businessIncomeTaxRate: RATE_SCALE * 3n / 100n,
  localTaxOnIncomeTaxRate: RATE_SCALE * 10n / 100n,
  vatRate: RATE_SCALE * 10n / 100n,
  pensionEmployeeRate: RATE_SCALE * 475n / 10000n,
  healthEmployeeRate: RATE_SCALE * 3595n / 100000n,
  longTermCareOnHealthRate: RATE_SCALE * 1314n / 10000n,
  employmentEmployeeRate: RATE_SCALE * 9n / 1000n,
  pensionBounds: [
    {
      from: '2025-07-01' as IsoDate,
      to: '2026-06-30' as IsoDate,
      floorMinor: 400_000n,
      ceilingMinor: 6_370_000n,
    },
    {
      from: '2026-07-01' as IsoDate,
      to: null,
      floorMinor: 410_000n,
      ceilingMinor: 6_590_000n,
    },
  ],
};

export function statuteFor(asOf: IsoDate = KR_STATUTE_AS_OF): KrStatute {
  assertIsoDate(asOf);
  // 단일 버전. 개정이 쌓이면 asOf로 고른다.
  return KR_STATUTE_2026;
}

export function assertIncomeRegime(raw: string): IncomeRegime {
  if ((INCOME_REGIMES as readonly string[]).includes(raw)) return raw as IncomeRegime;
  throw new KrIncomeError(
    `unknown income regime ${JSON.stringify(raw)}. Use ${INCOME_REGIMES.join(' | ')}.`,
  );
}

/** 원 미만 절사 (양수 금액 기준). 4대보험·원천징수 관행. */
export function truncApplyRate(amountMinor: bigint, rateScaled: bigint): bigint {
  if (amountMinor < 0n) throw new KrIncomeError('withholding base must be non-negative');
  if (rateScaled < 0n) throw new KrIncomeError('rate must be non-negative');
  return (amountMinor * rateScaled) / RATE_SCALE;
}

/** 국민연금 기준소득월액 — 천 원 미만 절사 후 상·하한. */
export function pensionContributionBase(grossMinor: bigint, paidOn: IsoDate, statute: KrStatute = statuteFor()): bigint {
  if (grossMinor <= 0n) throw new KrIncomeError(`gross must be positive, got ${grossMinor}`);
  const truncated = (grossMinor / 1000n) * 1000n;
  const bound = statute.pensionBounds.find((b) => paidOn >= b.from && (b.to === null || paidOn <= b.to));
  if (!bound) {
    throw new KrIncomeError(`no national-pension contribution bounds for ${paidOn} under statute ${statute.asOf}`);
  }
  if (truncated < bound.floorMinor) return bound.floorMinor;
  if (truncated > bound.ceilingMinor) return bound.ceilingMinor;
  return truncated;
}

export interface BuildSettlementLinesOpts {
  readonly regime: IncomeRegime;
  readonly grossMinor: bigint;
  readonly paidOn: IsoDate;
  /** 급여 regime 필수. 갑근세(국세) 원천징수액 — 간이세액표/명세서. */
  readonly earnedIncomeTaxMinor?: bigint;
  readonly statute?: KrStatute;
}

/**
 * regime에 따라 공제 라인을 법정 계산한다.
 *
 * 불변식: `net = gross - Σ(lines)` 단, `business_vat`는
 * `cashIn = gross + vat` 이고 netMinor는 그 입금액이다 (공제가 아니라 부가).
 */
export function buildSettlementLines(opts: BuildSettlementLinesOpts): {
  readonly lines: IncomeSettlementLine[];
  readonly netMinor: bigint;
  readonly statuteAsOf: IsoDate;
} {
  const statute = opts.statute ?? statuteFor(opts.paidOn);
  assertIsoDate(opts.paidOn);
  if (opts.grossMinor <= 0n) throw new KrIncomeError(`gross must be positive, got ${opts.grossMinor}`);

  switch (opts.regime) {
    case 'allowance':
      return { lines: [], netMinor: opts.grossMinor, statuteAsOf: statute.asOf };

    case 'business_withholding': {
      const incomeTax = truncApplyRate(opts.grossMinor, statute.businessIncomeTaxRate);
      const localTax = truncApplyRate(incomeTax, statute.localTaxOnIncomeTaxRate);
      const lines: IncomeSettlementLine[] = [
        { seq: 1, kind: 'income_tax_3', amountMinor: incomeTax },
        { seq: 2, kind: 'local_tax_0_3', amountMinor: localTax },
      ];
      return {
        lines,
        netMinor: opts.grossMinor - incomeTax - localTax,
        statuteAsOf: statute.asOf,
      };
    }

    case 'business_vat': {
      const vat = truncApplyRate(opts.grossMinor, statute.vatRate);
      const lines: IncomeSettlementLine[] = [{ seq: 1, kind: 'vat_10', amountMinor: vat }];
      // 입금 = 공급가 + 부가세 (원천징수 없는 세금계산서 수령).
      return { lines, netMinor: opts.grossMinor + vat, statuteAsOf: statute.asOf };
    }

    case 'salary': {
      if (opts.earnedIncomeTaxMinor === undefined) {
        throw new KrIncomeError(
          'salary regime requires earnedIncomeTaxMinor (갑근세). Read the payslip or 간이세액표 — do not invent it.',
        );
      }
      if (opts.earnedIncomeTaxMinor < 0n) {
        throw new KrIncomeError('earned income tax cannot be negative');
      }
      const base = pensionContributionBase(opts.grossMinor, opts.paidOn, statute);
      const pension = truncApplyRate(base, statute.pensionEmployeeRate);
      const health = truncApplyRate(opts.grossMinor, statute.healthEmployeeRate);
      const longTerm = truncApplyRate(health, statute.longTermCareOnHealthRate);
      const employment = truncApplyRate(opts.grossMinor, statute.employmentEmployeeRate);
      const earned = opts.earnedIncomeTaxMinor;
      const localOnEarned = truncApplyRate(earned, statute.localTaxOnIncomeTaxRate);
      const lines: IncomeSettlementLine[] = [
        { seq: 1, kind: 'national_pension', amountMinor: pension },
        { seq: 2, kind: 'health_insurance', amountMinor: health },
        { seq: 3, kind: 'long_term_care', amountMinor: longTerm },
        { seq: 4, kind: 'employment_insurance', amountMinor: employment },
        { seq: 5, kind: 'earned_income_tax', amountMinor: earned },
        { seq: 6, kind: 'local_income_tax', amountMinor: localOnEarned },
      ];
      const deducted = lines.reduce((s, l) => s + l.amountMinor, 0n);
      const net = opts.grossMinor - deducted;
      if (net < 0n) {
        throw new KrIncomeError(
          `deductions ${deducted} exceed gross ${opts.grossMinor} — check earned-tax and payslip`,
        );
      }
      return { lines, netMinor: net, statuteAsOf: statute.asOf };
    }

    default: {
      const _exhaustive: never = opts.regime;
      throw new KrIncomeError(`unhandled regime: ${_exhaustive}`);
    }
  }
}

export interface SettlementCheckResult {
  readonly ok: boolean;
  readonly expectedNetMinor: bigint;
  readonly actualNetMinor: bigint;
  readonly deltaMinor: bigint;
  readonly mismatched: readonly {
    readonly kind: SettlementLineKind;
    readonly expectedMinor: bigint;
    readonly actualMinor: bigint;
  }[];
  readonly explanation: string;
}

/**
 * 저장된 정산이 법정 계산과 같은지. 요율은 settlement.statuteAsOf 시점 것을 쓴다.
 */
export function checkIncomeSettlement(opts: {
  readonly regime: IncomeRegime;
  readonly settlement: IncomeSettlement;
  readonly lines: readonly IncomeSettlementLine[];
  /** 급여 정산에 저장된 갑근세. 없으면 earned_income_tax 라인에서 읽는다. */
  readonly earnedIncomeTaxMinor?: bigint;
  readonly statute?: KrStatute;
}): SettlementCheckResult {
  const earned =
    opts.earnedIncomeTaxMinor ??
    opts.lines.find((l) => l.kind === 'earned_income_tax')?.amountMinor;
  const built = buildSettlementLines({
    regime: opts.regime,
    grossMinor: opts.settlement.grossMinor,
    paidOn: opts.settlement.paidOn,
    ...(earned !== undefined ? { earnedIncomeTaxMinor: earned } : {}),
    statute: opts.statute ?? statuteFor(opts.settlement.statuteAsOf),
  });

  const byKind = new Map(opts.lines.map((l) => [l.kind, l.amountMinor]));
  const mismatched: {
    kind: SettlementLineKind;
    expectedMinor: bigint;
    actualMinor: bigint;
  }[] = [];
  for (const exp of built.lines) {
    const actual = byKind.get(exp.kind) ?? 0n;
    if (actual !== exp.amountMinor) {
      mismatched.push({ kind: exp.kind, expectedMinor: exp.amountMinor, actualMinor: actual });
    }
  }
  for (const [kind, actual] of byKind) {
    if (!built.lines.some((l) => l.kind === kind)) {
      mismatched.push({ kind, expectedMinor: 0n, actualMinor: actual });
    }
  }

  const delta = opts.settlement.netMinor - built.netMinor;
  const ok = mismatched.length === 0 && delta === 0n;
  return {
    ok,
    expectedNetMinor: built.netMinor,
    actualNetMinor: opts.settlement.netMinor,
    deltaMinor: delta,
    mismatched,
    explanation: ok
      ? `법정 요율(${built.statuteAsOf})과 일치합니다.`
      : mismatched.length > 0
        ? `${mismatched.length}개 공제 라인이 법정 계산과 다릅니다.`
        : `실수령 차이 ${delta} (기대 ${built.netMinor}).`,
  };
}

export function describeRegime(regime: IncomeRegime): string {
  switch (regime) {
    case 'business_withholding':
      return '사업소득 원천징수 3.3%';
    case 'business_vat':
      return '부가세 10%';
    case 'salary':
      return '근로소득(4대보험+갑근세)';
    case 'allowance':
      return '수당(공제 없음)';
  }
}

export function describeLineKind(kind: SettlementLineKind): string {
  switch (kind) {
    case 'income_tax_3':
      return '소득세 3%';
    case 'local_tax_0_3':
      return '지방소득세';
    case 'vat_10':
      return '부가세 10%';
    case 'national_pension':
      return '국민연금';
    case 'health_insurance':
      return '건강보험';
    case 'long_term_care':
      return '장기요양';
    case 'employment_insurance':
      return '고용보험';
    case 'earned_income_tax':
      return '갑근세';
    case 'local_income_tax':
      return '지방소득세(근로)';
  }
}
