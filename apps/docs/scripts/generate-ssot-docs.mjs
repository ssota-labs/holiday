#!/usr/bin/env node
/**
 * One-shot generator for holiday docs SSOT tree.
 * Run: node --experimental-strip-types apps/docs/scripts/generate-ssot-docs.mts
 * from repo root, or node this file from apps/docs.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', 'content', 'docs');

function w(rel, content) {
  const p = join(ROOT, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content);
  console.log('wrote', rel);
}

function meta(title, pages, extra = {}) {
  return JSON.stringify({ title, pages, ...extra }, null, 2) + '\n';
}

const DEFAULT_EXITS = [
  { code: 0, meaning: '성공' },
  { code: 1, meaning: '원장/도메인 거부 (LedgerError) 또는 내부 오류' },
  { code: 2, meaning: '사용법 오류 (UsageError)' },
];

/** @typedef {{ command: string; slug: string[]; mutates: boolean; summary: string; signature: string; flags: object[]; exits?: object[]; example?: string; feature?: string }} Cmd */

/** @type {Cmd[]} */
const COMMANDS = [
  {
    command: 'init',
    slug: ['init'],
    mutates: true,
    summary: '.holiday/ 워크스페이스와 SQLite 원장을 생성하고 기능통화·마감 grain·타임존을 기록한다.',
    signature: 'holiday init --currency <code> [--close-grain month] [--timezone Asia/Seoul]',
    flags: [
      { name: '--currency', type: 'string', required: true, description: '기능통화 (예: KRW)' },
      { name: '--close-grain', type: 'day|week|month|quarter|year', default: 'month' },
      { name: '--timezone', type: 'IANA tz', default: 'Asia/Seoul' },
    ],
    example: 'holiday init --currency KRW --json',
    feature: 'accounts',
  },
  {
    command: 'account add',
    slug: ['account', 'add'],
    mutates: true,
    summary: '계정 코드를 추가한다. 타입은 코드 prefix에서 유도한다.',
    signature: 'holiday account add <code> [--commodity <code>] [--cash] [--non-monetary] [--placeholder] [--opened YYYY-MM-DD]',
    flags: [
      { name: '<code>', kind: 'arg', type: 'string', required: true, description: 'Assets:Bank:KB:Checking 형태' },
      { name: '--commodity', type: 'string', description: '생략 시 multi-commodity' },
      { name: '--cash', type: 'boolean', default: 'false', description: '현금흐름 시작 잔액에 포함' },
      { name: '--non-monetary', type: 'boolean', default: 'false' },
      { name: '--placeholder', type: 'boolean', default: 'false' },
      { name: '--opened', type: 'YYYY-MM-DD', default: 'today' },
    ],
    example: 'holiday account add Assets:Bank:KB:Checking --commodity KRW --cash --json',
    feature: 'accounts',
  },
  {
    command: 'account list',
    slug: ['account', 'list'],
    mutates: false,
    summary: '계정 목록을 반환한다.',
    signature: 'holiday account list',
    flags: [],
    example: 'holiday account list --json',
    feature: 'accounts',
  },
  {
    command: 'txn add',
    slug: ['txn', 'add'],
    mutates: true,
    summary: '거래를 기록한다. 다리 weight 합이 정확히 0이 아니면 거부한다.',
    signature: 'holiday txn add --leg "ACCOUNT AMOUNT COMMODITY [@@ TOTAL]" [--leg ...] [--date] [--payee] [--narration] [--draft]',
    flags: [
      { name: '--leg', type: 'string', required: true, repeatable: true, description: 'ACCOUNT AMOUNT COMMODITY. 비기능통화는 @@TOTAL 또는 환율 유도' },
      { name: '--date', type: 'YYYY-MM-DD', default: 'today' },
      { name: '--payee', type: 'string' },
      { name: '--narration', type: 'string', default: '""' },
      { name: '--draft', type: 'boolean', default: 'false', description: '검토 대기. 잔액·리포트에서 제외' },
    ],
    exits: [
      ...DEFAULT_EXITS.slice(0, 1),
      { code: 1, meaning: 'unbalanced 등 LedgerError' },
      { code: 2, meaning: '없는 계정·다리 파싱 실패' },
    ],
    example: 'holiday txn add --payee "점심" --leg "Expenses:Food 12000 KRW" --leg "Assets:Bank:KB:Checking -12000 KRW" --json',
    feature: 'accounts',
  },
  {
    command: 'balance',
    slug: ['balance'],
    mutates: false,
    summary: '계정 잔액을 조회한다. 집계는 weight 기준이다.',
    signature: 'holiday balance [--as-of YYYY-MM-DD] [--account PREFIX]',
    flags: [
      { name: '--as-of', type: 'YYYY-MM-DD' },
      { name: '--account', type: 'string', description: '예: Assets' },
    ],
    example: 'holiday balance --account Assets --json',
    feature: 'accounts',
  },
  {
    command: 'card add',
    slug: ['card', 'add'],
    mutates: true,
    summary: '카드 부채 계정에 청구주기를 부착한다.',
    signature: 'holiday card add <code> --funding <code> --close-day <n> --payment-day <n> [--payment-month-offset 1] [--label]',
    flags: [
      { name: '<code>', kind: 'arg', type: 'string', required: true },
      { name: '--funding', type: 'string', required: true, description: '결제에 쓸 자산 계정' },
      { name: '--close-day', type: 'number', required: true, description: '31 = 말일' },
      { name: '--payment-day', type: 'number', required: true, description: '-1 = 말일' },
      { name: '--payment-month-offset', type: 'number', default: '1' },
      { name: '--label', type: 'string' },
    ],
    example: 'holiday card add Liabilities:Card:Shinhan --funding Assets:Bank:KB:Checking --close-day 14 --payment-day 1 --json',
    feature: 'cards',
  },
  {
    command: 'card list',
    slug: ['card', 'list'],
    mutates: false,
    summary: '카드와 청구 규칙을 나열한다.',
    signature: 'holiday card list',
    flags: [],
    example: 'holiday card list --json',
    feature: 'cards',
  },
  {
    command: 'installment add',
    slug: ['installment', 'add'],
    mutates: true,
    summary: '할부 구매를 기록하고 스케줄을 생성한다. 수수료는 관측값만(--fees).',
    signature: 'holiday installment add --card <code> --expense <code> --total <amount> --months <n> [--liability] [--fees] [--remainder-on first|last]',
    flags: [
      { name: '--card', type: 'string', required: true },
      { name: '--expense', type: 'string', required: true },
      { name: '--total', type: 'amount', required: true },
      { name: '--months', type: 'number', required: true },
      { name: '--liability', type: 'string', default: '<card>:Installment' },
      { name: '--date', type: 'YYYY-MM-DD', default: 'today' },
      { name: '--payee', type: 'string' },
      { name: '--label', type: 'string' },
      { name: '--remainder-on', type: 'first|last', default: 'first' },
      { name: '--fees', type: 'comma-minors', description: '관측 수수료. 생략=무이자' },
    ],
    example: 'holiday installment add --card Liabilities:Card:Shinhan --expense Expenses:Gear --total 300000 --months 3 --json',
    feature: 'installments',
  },
  {
    command: 'installment revise',
    slug: ['installment', 'revise'],
    mutates: true,
    summary: '명세서 값으로 할부 스케줄을 덮어쓴다. --data JSON (전역 --json과 별개).',
    signature: 'holiday installment revise <id> --data <json>',
    flags: [
      { name: '<id>', kind: 'arg', type: 'string', required: true },
      { name: '--data', type: 'json', required: true, description: '[{seq,paymentDate,principalMinor,feeMinor?}]' },
    ],
    example: 'holiday installment revise <id> --data \'[{"seq":1,"paymentDate":"2026-09-01","principalMinor":"100000"}]\' --json',
    feature: 'installments',
  },
  {
    command: 'installment list',
    slug: ['installment', 'list'],
    mutates: false,
    summary: '잔여 할부를 나열한다.',
    signature: 'holiday installment list',
    flags: [],
    example: 'holiday installment list --json',
    feature: 'installments',
  },
  {
    command: 'recurring add',
    slug: ['recurring', 'add'],
    mutates: true,
    summary: '정기지출을 등록한다. funding이 카드면 현금 유출일은 청구주기를 탄다.',
    signature: 'holiday recurring add <label> --expense <code> --funding <code> --amount <amount> [--day 1] [--yearly <month>] [--from] [--to]',
    flags: [
      { name: '<label>', kind: 'arg', type: 'string', required: true },
      { name: '--expense', type: 'string', required: true },
      { name: '--funding', type: 'string', required: true },
      { name: '--amount', type: 'amount', required: true },
      { name: '--day', type: 'number', default: '1', description: '-1 = 말일' },
      { name: '--yearly', type: '1-12', description: '있으면 yearly cadence' },
      { name: '--from', type: 'YYYY-MM-DD', default: 'today' },
      { name: '--to', type: 'YYYY-MM-DD' },
    ],
    example: 'holiday recurring add "월세" --expense Expenses:Rent --funding Assets:Bank:KB:Checking --amount 800000 --day 1 --json',
    feature: 'recurring',
  },
  {
    command: 'recurring list',
    slug: ['recurring', 'list'],
    mutates: false,
    summary: '활성 정기지출을 나열한다.',
    signature: 'holiday recurring list',
    flags: [],
    example: 'holiday recurring list --json',
    feature: 'recurring',
  },
  {
    command: 'loan add',
    slug: ['loan', 'add'],
    mutates: true,
    summary: '대출 부채 계정에 상환 스케줄을 부착한다. 원금 인출 기표는 별도.',
    signature: 'holiday loan add <code> --funding --interest --principal --rate --months --first-payment [--method annuity]',
    flags: [
      { name: '<code>', kind: 'arg', type: 'string', required: true },
      { name: '--funding', type: 'string', required: true },
      { name: '--interest', type: 'string', required: true },
      { name: '--principal', type: 'amount', required: true },
      { name: '--rate', type: 'percent', required: true, description: '예: 4.2' },
      { name: '--months', type: 'number', required: true },
      { name: '--first-payment', type: 'YYYY-MM-DD', required: true },
      { name: '--method', type: 'annuity|equal_principal|bullet|interest_only', default: 'annuity' },
      { name: '--payment-day', type: 'number' },
      { name: '--label', type: 'string' },
    ],
    example: 'holiday loan add Liabilities:Loans:KB --funding Assets:Bank:KB:Checking --interest Expenses:Interest:KB --principal 10000000 --rate 4.2 --months 36 --first-payment 2026-08-01 --json',
    feature: 'loans',
  },
  {
    command: 'loan list',
    slug: ['loan', 'list'],
    mutates: false,
    summary: '대출과 잔여 원금을 나열한다.',
    signature: 'holiday loan list',
    flags: [],
    example: 'holiday loan list --json',
    feature: 'loans',
  },
  {
    command: 'loan check',
    slug: ['loan', 'check'],
    mutates: false,
    summary: '스케줄 기대 잔액과 원장을 대사한다. 불일치 시 loan_drift(사람 모드).',
    signature: 'holiday loan check [code] [--as-of YYYY-MM-DD]',
    flags: [
      { name: '[code]', kind: 'arg', type: 'string' },
      { name: '--as-of', type: 'YYYY-MM-DD', default: 'today' },
    ],
    exits: [
      { code: 0, meaning: '대사 OK (또는 --json에서 drift를 데이터로 반환)' },
      { code: 1, meaning: 'loan_drift (비 JSON 모드)' },
      { code: 2, meaning: '없는 대출' },
    ],
    example: 'holiday loan check --json',
    feature: 'loans',
  },
  {
    command: 'loan pay',
    slug: ['loan', 'pay'],
    mutates: true,
    summary: '스케줄 기준 원리금 분할로 상환을 기표한다. 이자는 스케줄, 차액은 원금.',
    signature: 'holiday loan pay <code> --date <due> [--amount <actual>]',
    flags: [
      { name: '<code>', kind: 'arg', type: 'string', required: true },
      { name: '--date', type: 'YYYY-MM-DD', required: true, description: '납부하는 회차 일자' },
      { name: '--amount', type: 'amount', description: '실제 현금 유출. 이자 미만이면 거부' },
    ],
    example: 'holiday loan pay Liabilities:Loans:KB --date 2026-08-01 --json',
    feature: 'loans',
  },
  {
    command: 'fx add',
    slug: ['fx', 'add'],
    mutates: true,
    summary: '환율을 기록한다. 이미 기표된 weight는 바꾸지 않는다.',
    signature: 'holiday fx add <base> <quote> <rate> --as-of <date> [--source manual]',
    flags: [
      { name: '<base>', kind: 'arg', type: 'string', required: true },
      { name: '<quote>', kind: 'arg', type: 'string', required: true },
      { name: '<rate>', kind: 'arg', type: 'decimal', required: true },
      { name: '--as-of', type: 'YYYY-MM-DD', required: true },
      { name: '--source', type: 'string', default: 'manual' },
    ],
    example: 'holiday fx add USD KRW 1350.5 --as-of 2026-07-17 --json',
    feature: 'fx',
  },
  {
    command: 'fx list',
    slug: ['fx', 'list'],
    mutates: false,
    summary: '등록된 환율 목록.',
    signature: 'holiday fx list [--base] [--quote]',
    flags: [
      { name: '--base', type: 'string' },
      { name: '--quote', type: 'string' },
    ],
    example: 'holiday fx list --json',
    feature: 'fx',
  },
  {
    command: 'fx show',
    slug: ['fx', 'show'],
    mutates: false,
    summary: '해당 일자에 해석될 환율과 근거를 보여준다.',
    signature: 'holiday fx show <base> <quote> [--as-of]',
    flags: [
      { name: '<base>', kind: 'arg', type: 'string', required: true },
      { name: '<quote>', kind: 'arg', type: 'string', required: true },
      { name: '--as-of', type: 'YYYY-MM-DD', default: 'today' },
    ],
    example: 'holiday fx show USD KRW --json',
    feature: 'fx',
  },
  {
    command: 'assert',
    slug: ['assert'],
    mutates: true,
    summary: '잔액 대사를 기록·대조한다. 불일치 시 assertion_failed.',
    signature: 'holiday assert <account> <amount> [--as-of] [--commodity] [--note]',
    flags: [
      { name: '<account>', kind: 'arg', type: 'string', required: true },
      { name: '<amount>', kind: 'arg', type: 'amount', required: true },
      { name: '--as-of', type: 'YYYY-MM-DD', default: 'today' },
      { name: '--commodity', type: 'string' },
      { name: '--note', type: 'string' },
    ],
    exits: [
      { code: 0, meaning: '대사 OK' },
      { code: 1, meaning: 'assertion_failed' },
      { code: 2, meaning: '없는 계정' },
    ],
    example: 'holiday assert Assets:Bank:KB:Checking 1500000 --json',
    feature: 'close',
  },
  {
    command: 'close',
    slug: ['close'],
    mutates: true,
    summary: '월 마감: 게이트 → FX 재평가 → 스냅샷 → period=closed. --dry-run은 쓰기 없음.',
    signature: 'holiday close <month> [--dry-run]',
    flags: [
      { name: '<month>', kind: 'arg', type: 'YYYY-MM', required: true },
      { name: '--dry-run', type: 'boolean', default: 'false' },
    ],
    exits: [
      { code: 0, meaning: '마감(또는 dry-run 보고) 성공' },
      { code: 1, meaning: 'close_blocked / unbalanced' },
      { code: 2, meaning: 'closeGrain≠month, Income:FX:Unrealized 없음' },
    ],
    example: 'holiday close 2026-06 --dry-run --json',
    feature: 'close',
  },
  {
    command: 'ingest submit',
    slug: ['ingest', 'submit'],
    mutates: true,
    summary: '파싱된 거래를 draft로 적재한다. OCR 없음 — 호출자가 파서.',
    signature: 'holiday ingest submit --data <json> [--image <path>] [--idem-key <key>]',
    flags: [
      { name: '--data', type: 'json', required: true, description: '{items:[{date,legs:[...],...}]}' },
      { name: '--image', type: 'path', description: 'SHA-256으로 재수집 차단' },
      { name: '--idem-key', type: 'string', description: '동일 키+요청이면 저장된 응답 재생' },
    ],
    exits: [
      { code: 0, meaning: '배치 적재(또는 idempotent replay)' },
      { code: 1, meaning: 'duplicate_image / duplicate_external_ref / unbalanced' },
      { code: 2, meaning: 'JSON·계정·idem 오류' },
    ],
    example: 'holiday ingest submit --data \'{"items":[...]}\' --idem-key run-1 --json',
    feature: 'ingest',
  },
  {
    command: 'review list',
    slug: ['review', 'list'],
    mutates: false,
    summary: 'pending draft 목록.',
    signature: 'holiday review list',
    flags: [],
    example: 'holiday review list --json',
    feature: 'ingest',
  },
  {
    command: 'review accept',
    slug: ['review', 'accept'],
    mutates: true,
    summary: 'draft를 posted로 승격한다. 이미 균형이므로 균형 실패는 없다.',
    signature: 'holiday review accept <id>',
    flags: [{ name: '<id>', kind: 'arg', type: 'string', required: true }],
    example: 'holiday review accept <item-id> --json',
    feature: 'ingest',
  },
  {
    command: 'review reject',
    slug: ['review', 'reject'],
    mutates: true,
    summary: 'draft를 거부한다. ingest 행은 중복 기억용으로 유지한다.',
    signature: 'holiday review reject <id> --reason <text>',
    flags: [
      { name: '<id>', kind: 'arg', type: 'string', required: true },
      { name: '--reason', type: 'string', required: true },
    ],
    example: 'holiday review reject <item-id> --reason "중복" --json',
    feature: 'ingest',
  },
  {
    command: 'cashflow',
    slug: ['cashflow'],
    mutates: false,
    summary: '현금 계정에서 스케줄 지출을 투영한다. 잔액이 음수면 ⚠ SHORT.',
    signature: 'holiday cashflow [--until YYYY-MM-DD]',
    flags: [{ name: '--until', type: 'YYYY-MM-DD', default: 'today+3months' }],
    example: 'holiday cashflow --until 2026-12-31 --json',
    feature: 'cashflow',
  },
  {
    command: 'verify',
    slug: ['verify'],
    mutates: false,
    summary: '원장 불변식과 감사 해시 체인을 검사한다.',
    signature: 'holiday verify [--head]',
    flags: [{ name: '--head', type: 'boolean', default: 'false', description: '체인 head 출력' }],
    exits: [
      { code: 0, meaning: 'ok' },
      { code: 1, meaning: 'verify_failed' },
      { code: 2, meaning: '워크스페이스 없음' },
    ],
    example: 'holiday verify --json',
    feature: 'close',
  },
  {
    command: 'checkpoint',
    slug: ['checkpoint'],
    mutates: true,
    summary: 'SQLite WAL을 ledger.db로 fold한다. (스냅샷 checkpoint와 무관)',
    signature: 'holiday checkpoint',
    flags: [],
    example: 'holiday checkpoint --json',
  },
];

function flagsJsx(flags) {
  if (!flags.length) return '  flags={[]}';
  const lines = flags.map((f) => {
    const parts = [`name: '${f.name}'`, `type: '${f.type}'`];
    if (f.kind && f.kind !== 'flag') parts.push(`kind: '${f.kind}'`);
    if (f.required) parts.push('required: true');
    if (f.repeatable) parts.push('repeatable: true');
    if (f.default != null) parts.push(`default: '${f.default}'`);
    if (f.description) parts.push(`description: '${f.description.replace(/'/g, "\\'")}'`);
    return `    { ${parts.join(', ')} },`;
  });
  return `  flags={[\n${lines.join('\n')}\n  ]}`;
}

function exitsJsx(exits) {
  const e = exits ?? DEFAULT_EXITS;
  const lines = e.map((x) => `    { code: ${x.code}, meaning: '${x.meaning.replace(/'/g, "\\'")}' },`);
  return `  exits={[\n${lines.join('\n')}\n  ]}`;
}

function cmdPage(cmd, versionNote) {
  const title = cmd.command;
  const featureLink = cmd.feature
    ? `\n관련 기능: [${cmd.feature}](/docs/features/${cmd.feature})\n`
    : '';
  return `---
title: ${title}
description: holiday ${cmd.command} 명령 계약
type: reference
summary: "${cmd.summary.replace(/"/g, '\\"')}"
---

${versionNote}
${featureLink}
<CommandSpec
  command="${cmd.command}"
  mutates={${cmd.mutates}}
  summary="${cmd.summary.replace(/"/g, '\\"')}"
  signature={\`${cmd.signature.replace(/`/g, '\\`')}\`}
${flagsJsx(cmd.flags)}
${exitsJsx(cmd.exits)}
${cmd.example ? `  example={\`${cmd.example.replace(/`/g, '\\`')}\`}` : ''}
/>
`;
}

function buildCliTree(baseRel, versionBanner) {
  // index
  const rows = COMMANDS.map(
    (c) =>
      `| [\`${c.command}\`](/docs/${baseRel}/${c.slug.join('/')}) | ${c.mutates ? 'yes' : 'no'} | ${c.summary} |`,
  ).join('\n');

  w(
    `${baseRel}/index.mdx`,
    `---
title: CLI
description: 에이전트가 shell-out하는 명령 계약
type: reference
summary: "전역 --json, stderr 에러 봉투, exit code가 계약이다."
---

${versionBanner}

제품 진입점은 CLI다. 구현 기준은 \`packages/cli/src/cli.ts\`다.

<PackageInfo name="@holiday/cli" currentVersion="0.1.0">
  <PackageInfoHeader>
    <PackageInfoName />
    <PackageInfoVersion />
  </PackageInfoHeader>
  <PackageInfoDescription>Node ≥ 24. 저장소는 로컬 SQLite(.holiday/ledger.db)만.</PackageInfoDescription>
  <PackageInfoDependencies>
    <PackageInfoDependency name="@holiday/core" version="0.1.0" />
    <PackageInfoDependency name="@holiday/store-sql" version="0.1.0" />
    <PackageInfoDependency name="@holiday/store-sqlite" version="0.1.0" />
    <PackageInfoDependency name="commander" />
    <PackageInfoDependency name="zod" />
  </PackageInfoDependencies>
</PackageInfo>

## 전역 계약

| 항목 | 규약 |
|---|---|
| \`--json\` | stdout에 기계 가독 JSON. 사람용 안내는 stderr로만 (\`--json\`이면 생략) |
| 에러 봉투 | 실패 시 stderr: \`{"error":{"code":"...","message":"..."}}\` |
| exit 0 | 성공 |
| exit 1 | LedgerError 또는 internal |
| exit 2 | UsageError |

금액은 JSON 경계에서 **소수 문자열**로만 교차한다. 명령 전용 \`--data\`는 전역 \`--json\`과 이름이 겹치지 않는다.

버전 이력은 [versions](/docs/spec/cli/versions)를 본다.

## 명령 목록

| 명령 | mutates | 요약 |
|---|---|---|
${rows}
`,
  );

  // family metas + pages
  const families = new Map();
  for (const c of COMMANDS) {
    if (c.slug.length === 1) {
      w(`${baseRel}/${c.slug[0]}.mdx`, cmdPage(c, versionBanner));
    } else {
      const fam = c.slug[0];
      if (!families.has(fam)) families.set(fam, []);
      families.get(fam).push(c);
    }
  }
  for (const [fam, cmds] of families) {
    w(
      `${baseRel}/${fam}/meta.json`,
      meta(
        fam,
        cmds.map((c) => c.slug[1]),
        { collapsible: true, defaultOpen: false },
      ),
    );
    for (const c of cmds) {
      w(`${baseRel}/${fam}/${c.slug[1]}.mdx`, cmdPage(c, versionBanner));
    }
  }
}

// --- wipe leftover (ROOT already empty-ish) ---
mkdirSync(ROOT, { recursive: true });

// Root meta
w(
  'meta.json',
  meta('holiday', [
    'index',
    '---기획---',
    'planning',
    '---도메인---',
    'domain',
    '---기능---',
    'features',
    '---스펙---',
    'spec',
    '---설계---',
    'design',
    '---에이전트---',
    'agent',
  ]),
);

// Planning
w(
  'planning/meta.json',
  meta('기획', ['vision', 'personas', 'journeys', 'prds', 'stories'], {
    collapsible: true,
    defaultOpen: true,
  }),
);
w('planning/prds/meta.json', meta('PRDs', ['prd-0.1-foundation'], { collapsible: true, defaultOpen: true }));
w(
  'planning/stories/meta.json',
  meta(
    'User Stories',
    [
      'us-ledger-init',
      'us-accounts',
      'us-txn',
      'us-cards',
      'us-installments',
      'us-recurring',
      'us-loans',
      'us-ingest-review',
      'us-fx',
      'us-close-assert',
      'us-cashflow-short',
      'us-verify',
    ],
    { collapsible: true, defaultOpen: false },
  ),
);

// Domain
w('domain/meta.json', meta('도메인', ['glossary', 'policy'], { collapsible: true, defaultOpen: true }));

// Features
w(
  'features/meta.json',
  meta(
    '기능',
    ['accounts', 'cards', 'installments', 'recurring', 'loans', 'ingest', 'fx', 'close', 'cashflow'],
    { collapsible: true, defaultOpen: false },
  ),
);

// Spec
w('spec/meta.json', meta('스펙', ['cli', 'data-model'], { collapsible: true, defaultOpen: false }));
const cliPages = [
  'versions',
  'init',
  'account',
  'txn',
  'balance',
  'card',
  'installment',
  'recurring',
  'loan',
  'fx',
  'assert',
  'close',
  'ingest',
  'review',
  'cashflow',
  'verify',
  'checkpoint',
  '0.1.0',
];
w('spec/cli/meta.json', meta('CLI', cliPages, { collapsible: true, defaultOpen: false }));

const latestBanner = `<SpecVersion
  spec="CLI"
  version="0.1.0"
  source="packages/cli/src/cli.ts"
  history={[
    {
      version: '0.1.0',
      date: '2026-07-17',
      summary: 'foundation CLI — init through verify/checkpoint',
      ref: 'packages/cli/src/cli.ts',
    },
  ]}
/>

> 이 페이지는 **latest**다. 불변 스냅샷은 [\`/docs/spec/cli/0.1.0\`](/docs/spec/cli/0.1.0)이다.
`;

buildCliTree('spec/cli', latestBanner);

w(
  'spec/cli/versions.mdx',
  `---
title: CLI versions
description: CLI 스펙 버전 인덱스
type: reference
summary: "latest는 /docs/spec/cli. 스냅샷은 버전 폴더."
---

| 버전 | 상태 | 링크 |
|---|---|---|
| 0.1.0 | latest와 동일 (첫 스냅샷) | [/docs/spec/cli/0.1.0](/docs/spec/cli/0.1.0) |

동결 절차: \`spec/cli\`의 현재 트리를 \`spec/cli/<version>/\`로 복사한 뒤 latest만 수정한다.
`,
);

// Snapshot 0.1.0 — copy latest command pages
const snapBanner = `<SpecVersion
  spec="CLI"
  version="0.1.0"
  source="packages/cli/src/cli.ts"
  history={[
    {
      version: '0.1.0',
      date: '2026-07-17',
      summary: 'immutable snapshot of foundation CLI',
      ref: 'packages/cli/src/cli.ts',
    },
  ]}
/>

> **불변 스냅샷 0.1.0.** 현재 계약은 [latest](/docs/spec/cli)를 본다.
`;

const snapPages = cliPages.filter((p) => p !== '0.1.0' && p !== 'versions');
w('spec/cli/0.1.0/meta.json', meta('0.1.0', snapPages, { collapsible: true, defaultOpen: false }));
buildCliTree('spec/cli/0.1.0', snapBanner);

// Design + agent metas
w('design/meta.json', meta('설계', ['system', 'adr'], { collapsible: true, defaultOpen: false }));
w('agent/meta.json', meta('에이전트', ['skill'], { collapsible: true, defaultOpen: false }));

console.log('scaffold + CLI trees done');
