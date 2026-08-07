/**
 * Spec 010 FR-002: one shared pluralisation helper.
 *
 * Count-bearing strings were previously assembled ad hoc as a `{n}` expression
 * followed by a hard-coded plural text node ("1 cases", "1 overrides"). Every
 * such site now routes through this helper.
 */

/** Returns the correct noun form for `n` (defaults to the `-s` plural). */
export function plural(n: number, singular: string, pluralForm?: string): string {
  return n === 1 ? singular : (pluralForm ?? `${singular}s`);
}

/** Returns `n` and its correctly-inflected noun, e.g. `1 case` / `2 cases`. */
export function pluralize(n: number, singular: string, pluralForm?: string): string {
  return `${n} ${plural(n, singular, pluralForm)}`;
}
