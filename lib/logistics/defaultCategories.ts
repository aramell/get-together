/**
 * Logistics categories (Story 14.6). `mode` picks the behavior:
 * - 'single': one person claims the item (assigned_to), today's "bring".
 * - 'seats': a driver offers N seats others claim, today's "carpool".
 */
export type LogisticsCategoryMode = 'single' | 'seats';

export interface LogisticsCategoryDef {
  key: string;
  label: string;
  mode: LogisticsCategoryMode;
}

export const DEFAULT_LOGISTICS_CATEGORIES: LogisticsCategoryDef[] = [
  { key: 'bring', label: 'Bring List', mode: 'single' },
  { key: 'carpool', label: 'Carpool', mode: 'seats' },
];

export const MAX_CATEGORY_LABEL_LENGTH = 50;

export function defaultLogisticsCategories(): LogisticsCategoryDef[] {
  return DEFAULT_LOGISTICS_CATEGORIES.map((c) => ({ ...c }));
}

export function isLogisticsCategoryMode(value: unknown): value is LogisticsCategoryMode {
  return value === 'single' || value === 'seats';
}
