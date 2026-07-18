/**
 * Keeps the user-facing conversation contract aligned across the three surfaces
 * that can steer a ledger session:
 *
 *   1. AGENTS.md scaffolded into every new ledger
 *   2. Claude Code's always-loaded SKILL.md
 *   3. Codex's always-loaded SKILL.md
 *
 * Natural Korean still needs human review. This check protects the non-negotiable
 * behaviors that are easy to lose during an edit: novice-first explanations,
 * backstage tools, plain Korean, truthful status, and a final proofreading pass.
 *
 * Run: pnpm --filter holiday-plugin check:voice
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../../..');
const CONTRACT = 'novice-first, tools-backstage, plain-korean, proofread';

interface VoiceSurface {
  readonly name: string;
  readonly file: string;
  readonly heading: string;
  readonly required: readonly string[];
}

const surfaces: readonly VoiceSurface[] = [
  {
    name: 'ledger AGENTS.md',
    file: resolve(ROOT, 'packages/cli/templates/ledger/AGENTS.md'),
    heading: '## 말투 — 사용자의 개인 비서',
    required: [
      '사용자는 회계와 개발을 모른다고 가정한다.',
      '도구 사용은 답변에 드러내지 않는다.',
      '쉬운 한국어로 바꿔 말한다.',
      '완료한 일과 할 일을 구분한다.',
      '보내기 전에 답변을 한 번 더 읽는다.',
    ],
  },
  {
    name: 'Claude Code SKILL.md',
    file: resolve(ROOT, 'plugins/claude-code/skills/holiday-cfo/SKILL.md'),
    heading: '## How you speak',
    required: [
      'Assume no accounting or developer knowledge.',
      'Keep tools backstage.',
      'Translate internals into plain Korean.',
      'Be truthful about status.',
      'Proofread the Korean before sending.',
    ],
  },
  {
    name: 'Codex SKILL.md',
    file: resolve(ROOT, 'plugins/codex/skills/holiday-cfo/SKILL.md'),
    heading: '## How you speak',
    required: [
      'Assume no accounting or developer knowledge.',
      'Keep tools backstage.',
      'Translate internals into plain Korean.',
      'Be truthful about status.',
      'Proofread the Korean before sending.',
    ],
  },
];

function section(source: string, heading: string): string | null {
  const start = source.indexOf(heading);
  if (start === -1) return null;
  const rest = source.slice(start + heading.length);
  const next = rest.search(/\n## /);
  return next === -1 ? rest : rest.slice(0, next);
}

function main(): void {
  const problems: string[] = [];
  const examples: Array<{ readonly name: string; readonly text: string }> = [];

  for (const surface of surfaces) {
    const source = readFileSync(surface.file, 'utf8');
    const voice = section(source, surface.heading);
    if (voice === null) {
      problems.push(`${surface.name}: missing ${surface.heading}`);
      continue;
    }

    const marker = /<!-- voice-contract: ([^>]+) -->/.exec(voice)?.[1]?.trim();
    if (marker !== CONTRACT) {
      problems.push(
        `${surface.name}: voice contract marker must be "${CONTRACT}" (found ${marker ?? 'none'})`,
      );
    }
    for (const phrase of surface.required) {
      if (!voice.includes(phrase)) {
        problems.push(`${surface.name}: missing required guidance "${phrase}"`);
      }
    }
    if (!voice.includes('Ezy')) {
      problems.push(`${surface.name}: missing the plain-language Ezy example`);
    }

    const example =
      /<!-- voice-example:ezy:start -->([\s\S]*?)<!-- voice-example:ezy:end -->/.exec(
        voice,
      )?.[1]?.trim();
    if (!example) {
      problems.push(`${surface.name}: missing the marked Ezy example`);
    } else {
      examples.push({ name: surface.name, text: example });
      for (const pattern of [
        /\b(?:npx|JSON|posting|stderr|parser)\b/i,
        /Liabilities:/,
        /(?:^|\n)\s*\|/,
        /(?:^|\n)#{1,6}\s/,
      ]) {
        if (pattern.test(example)) {
          problems.push(
            `${surface.name}: Ezy example exposes internal/report formatting (${pattern})`,
          );
        }
      }
    }
  }

  const canonicalExample = examples[0];
  if (canonicalExample) {
    for (const example of examples.slice(1)) {
      if (example.text !== canonicalExample.text) {
        problems.push(
          `${example.name}: Ezy example differs from ${canonicalExample.name}`,
        );
      }
    }
  }

  const retired = [
    'Show your work before you write.',
    '비자명한 전표는 쓰기 전에 말로 보인다.',
    'Commands, flags and account codes stay in code form.',
    '도구는 안쪽에서 쓴다.',
    '보내기 전에 한국어를 한 번 더 읽는다.',
  ];
  for (const surface of surfaces) {
    const source = readFileSync(surface.file, 'utf8');
    for (const phrase of retired) {
      if (source.includes(phrase)) {
        problems.push(`${surface.name}: retired voice guidance remains — "${phrase}"`);
      }
    }
  }

  if (problems.length > 0) {
    console.error(`✗ ${problems.length} problem(s) with the ledger voice contract:\n`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }

  console.log(
    '✓ ledger AGENTS.md and both skills share the novice-first, backstage-tools voice contract.',
  );
}

main();
