// Plain YYYY-MM-DD absolute date (not a day-N-of-trip offset — see spec
// Story 13.3). Rejects calendar-invalid dates like 2024-02-30, which
// Date.parse would otherwise silently roll over into March 1st.
export function isValidItemDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
