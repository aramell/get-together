import { format, isToday } from 'date-fns';

// item_date comes back from the API as an ISO date/datetime string (the DATE
// column serialized by the pg driver). Take only the YYYY-MM-DD calendar
// date and build a local-midnight Date from those parts — comparing
// wall-clock date components, never a UTC instant, keeps "Today" correct
// regardless of the viewer's timezone (no timezone infra exists in this
// codebase — see spec Story 13.3).
export function parseLocalDate(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function isItemToday(item: { item_date: string | null }): boolean {
  return !!item.item_date && isToday(parseLocalDate(item.item_date));
}

// "MMM d" for the current year, "MMM d, yyyy" otherwise — unambiguous for a
// trip that spans a year boundary.
export function formatItemDateLabel(value: string): string {
  const date = parseLocalDate(value);
  const isCurrentYear = date.getFullYear() === new Date().getFullYear();
  return format(date, isCurrentYear ? 'MMM d' : 'MMM d, yyyy');
}

// Orders the general (non-Today) list so the soonest-dated item surfaces
// first; undated items sink to the bottom. Ties (same item_date, or both
// undated) fall back to created_at ascending for a stable order.
export function compareByItemDateThenCreatedAt(
  a: { item_date: string | null; created_at: string },
  b: { item_date: string | null; created_at: string }
): number {
  const aDate = a.item_date ? a.item_date.slice(0, 10) : null;
  const bDate = b.item_date ? b.item_date.slice(0, 10) : null;

  if (aDate && bDate && aDate !== bDate) return aDate < bDate ? -1 : 1;
  if (aDate && !bDate) return -1;
  if (!aDate && bDate) return 1;

  if (a.created_at === b.created_at) return 0;
  return a.created_at < b.created_at ? -1 : 1;
}
