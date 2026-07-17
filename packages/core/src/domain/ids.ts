/**
 * ULIDs: time-sortable, collision-free without coordination.
 *
 * Hand-rolled rather than pulled from npm for two reasons that both matter here:
 * the CLI ships as a single dependency-free bundle inside a plugin that gets no
 * install step, and the clock/entropy sources must be injectable so journal
 * round-trip property tests can generate deterministic ledgers.
 *
 * Sorting the journal by ULID — never by a user-supplied string — is what keeps
 * `export → rebuild → export` byte-identical across machines. See plan Risk 2.
 */

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // no I, L, O, U
const TIME_LEN = 10;
const RANDOM_LEN = 16;

export type Ulid = string & { readonly __ulid: unique symbol };

export interface UlidClock {
  now(): number;
  randomBytes(n: number): Uint8Array;
}

export const systemClock: UlidClock = {
  now: () => Date.now(),
  randomBytes: (n) => crypto.getRandomValues(new Uint8Array(n)),
};

function encodeTime(now: number): string {
  if (!Number.isInteger(now) || now < 0 || now > 0xffffffffffff) {
    throw new RangeError(`ULID timestamp out of range: ${now}`);
  }
  let out = '';
  let t = now;
  for (let i = 0; i < TIME_LEN; i++) {
    out = CROCKFORD[t % 32]! + out;
    t = Math.floor(t / 32);
  }
  return out;
}

function encodeRandom(clock: UlidClock): string {
  // One byte per character, modulo 32. Uniform enough: the low 5 bits of a
  // uniform byte are uniform.
  const bytes = clock.randomBytes(RANDOM_LEN);
  let out = '';
  for (let i = 0; i < RANDOM_LEN; i++) out += CROCKFORD[bytes[i]! % 32]!;
  return out;
}

/**
 * Monotonic within a millisecond: if called twice in the same tick, the random
 * component is incremented rather than redrawn. Without this, two transactions
 * created in the same millisecond sort non-deterministically, and the journal
 * export stops being byte-stable.
 */
export function createUlidFactory(clock: UlidClock = systemClock): () => Ulid {
  let lastTime = -1;
  let lastRandom = '';

  return () => {
    const now = clock.now();
    if (now === lastTime) {
      lastRandom = incrementBase32(lastRandom);
    } else {
      lastTime = now;
      lastRandom = encodeRandom(clock);
    }
    return (encodeTime(now) + lastRandom) as Ulid;
  };
}

function incrementBase32(s: string): string {
  const chars = [...s];
  for (let i = chars.length - 1; i >= 0; i--) {
    const idx = CROCKFORD.indexOf(chars[i]!);
    if (idx < 31) {
      chars[i] = CROCKFORD[idx + 1]!;
      return chars.join('');
    }
    chars[i] = CROCKFORD[0]!;
  }
  // 32^16 overflow within one millisecond is not a thing that happens.
  throw new Error('ULID random component overflowed within a single millisecond');
}

const ULID_RE = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/;

export function isUlid(s: string): s is Ulid {
  return ULID_RE.test(s);
}

export function assertUlid(s: string): Ulid {
  if (!isUlid(s)) throw new TypeError(`not a ULID: ${s}`);
  return s;
}
