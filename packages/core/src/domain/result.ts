/**
 * A Result type, because `Txn.create()` must be able to report *every* reason a
 * transaction is invalid at once — a caller fixing one error at a time through
 * thrown exceptions is a miserable review loop for both agents and humans.
 */

export type Result<T, E> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

export const Ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const Err = <E>(error: E): Result<never, E> => ({ ok: false, error });

export function unwrap<T, E>(r: Result<T, E>): T {
  if (r.ok) return r.value;
  throw new Error(`unwrap() on an Err: ${JSON.stringify(r.error)}`);
}
