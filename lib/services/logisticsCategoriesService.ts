import { getClient } from '@/lib/db/client';
import { getUserGroupRole } from '@/lib/db/queries';
import {
  LogisticsCategoryDef,
  MAX_CATEGORY_LABEL_LENGTH,
  defaultLogisticsCategories,
  isLogisticsCategoryMode,
} from '@/lib/logistics/defaultCategories';

export interface LogisticsCategoriesData {
  categories: LogisticsCategoryDef[];
  customized: boolean;
}

export interface LogisticsCategoryInput {
  key?: string;
  label: string;
  mode: string;
}

interface ServiceResult<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errorCode?: string;
}

type Queryable = { query: (text: string, params?: any[]) => Promise<{ rows: any[] }> };

/**
 * Categories for a group: its stored rows in position order, else the
 * built-in defaults. Shared by the item service so one place resolves them.
 */
export async function loadGroupCategories(
  client: Queryable,
  groupId: string
): Promise<LogisticsCategoriesData> {
  const result = await client.query(
    `SELECT category_key, label, mode
     FROM logistics_categories
     WHERE group_id = $1
     ORDER BY position ASC`,
    [groupId]
  );
  if (!result?.rows?.length) {
    return { categories: defaultLogisticsCategories(), customized: false };
  }
  return {
    categories: result.rows.map((r) => ({ key: r.category_key, label: r.label, mode: r.mode })),
    customized: true,
  };
}

export function generateCategoryKey(label: string, taken: Set<string>): string {
  let base = label
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
  if (!base) base = 'category';
  let key = base;
  let n = 2;
  while (taken.has(key)) {
    key = `${base}-${n++}`;
  }
  return key;
}

export async function getLogisticsCategories(
  groupId: string,
  userId?: string
): Promise<ServiceResult<LogisticsCategoriesData>> {
  const client = await getClient();
  try {
    if (userId) {
      const role = await getUserGroupRole(groupId, userId);
      if (!role) {
        return {
          success: false,
          message: 'You must be a group member to view logistics categories',
          error: 'NOT_GROUP_MEMBER',
          errorCode: 'FORBIDDEN',
        };
      }
    }
    return { success: true, data: await loadGroupCategories(client, groupId) };
  } catch (error: any) {
    console.error('Error getting logistics categories:', error);
    return {
      success: false,
      message: 'Failed to get logistics categories',
      error: error.message,
      errorCode: 'INTERNAL_ERROR',
    };
  } finally {
    client.release();
  }
}

function validationFailure(message: string): ServiceResult<never> {
  return { success: false, message, error: message, errorCode: 'VALIDATION_ERROR' };
}

/**
 * Replace a group's full category list (admin only). Existing keys are kept
 * (never change on rename); entries without a key get one generated from the
 * label. Removing a category in use, or changing the mode of one in use, is
 * rejected.
 */
export async function updateLogisticsCategories(
  groupId: string,
  userId: string,
  list: LogisticsCategoryInput[]
): Promise<ServiceResult<LogisticsCategoriesData>> {
  const client = await getClient();
  let inTransaction = false;

  try {
    const role = await getUserGroupRole(groupId, userId);
    if (role !== 'admin') {
      return {
        success: false,
        message: 'Only group admins can edit logistics categories',
        error: 'Only group admins can edit logistics categories',
        errorCode: 'FORBIDDEN',
      };
    }

    if (!Array.isArray(list) || list.length === 0) {
      return validationFailure('At least one category is required');
    }

    const seenKeys = new Set<string>();
    for (const entry of list) {
      if (!entry || typeof entry !== 'object') {
        return validationFailure('Invalid category');
      }
      const label = typeof entry.label === 'string' ? entry.label.trim() : '';
      if (label.length < 1 || label.length > MAX_CATEGORY_LABEL_LENGTH) {
        return validationFailure(`Category labels must be 1 to ${MAX_CATEGORY_LABEL_LENGTH} characters`);
      }
      if (!isLogisticsCategoryMode(entry.mode)) {
        return validationFailure("Category mode must be 'single' or 'seats'");
      }
      if (entry.key !== undefined && entry.key !== null) {
        if (typeof entry.key !== 'string' || entry.key.length === 0 || entry.key.length > 50) {
          return validationFailure('Invalid category key');
        }
        if (seenKeys.has(entry.key)) {
          return validationFailure('Duplicate category key');
        }
        seenKeys.add(entry.key);
      }
    }

    await client.query('BEGIN');
    inTransaction = true;
    // Serialize concurrent saves for this group and hold the in-use reads
    // stable until COMMIT.
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [groupId]);

    const rollbackWith = async <T,>(result: ServiceResult<T>): Promise<ServiceResult<T>> => {
      await client.query('ROLLBACK');
      inTransaction = false;
      return result;
    };

    const current = await loadGroupCategories(client, groupId);
    const currentByKey = new Map(current.categories.map((c) => [c.key, c]));

    // Entries that supply a key must reference an existing category; new
    // ones are keyless and get a generated key.
    for (const entry of list) {
      if (entry.key && !currentByKey.has(entry.key)) {
        return rollbackWith(validationFailure(`Unknown category key '${entry.key}'`));
      }
    }

    const usedResult = await client.query(
      `SELECT DISTINCT category FROM event_logistics_items WHERE group_id = $1`,
      [groupId]
    );
    const usedKeys = new Set<string>(usedResult.rows.map((r) => r.category));

    for (const key of usedKeys) {
      if (!seenKeys.has(key)) {
        const label = currentByKey.get(key)?.label ?? key;
        return rollbackWith({
          success: false,
          message: `Can't delete "${label}" while it still has items`,
          error: `Can't delete "${label}" while it still has items`,
          errorCode: 'CATEGORY_IN_USE',
        });
      }
    }

    const taken = new Set<string>([...seenKeys, ...currentByKey.keys()]);
    const finalList: LogisticsCategoryDef[] = [];
    for (const entry of list) {
      const label = entry.label.trim();
      const mode = entry.mode as LogisticsCategoryDef['mode'];
      if (entry.key) {
        const existing = currentByKey.get(entry.key)!;
        if (existing.mode !== mode && usedKeys.has(entry.key)) {
          return rollbackWith({
            success: false,
            message: `Can't change the type of "${existing.label}" while it has items`,
            error: `Can't change the type of "${existing.label}" while it has items`,
            errorCode: 'MODE_LOCKED',
          });
        }
        finalList.push({ key: entry.key, label, mode });
      } else {
        const key = generateCategoryKey(label, taken);
        taken.add(key);
        finalList.push({ key, label, mode });
      }
    }

    await client.query('DELETE FROM logistics_categories WHERE group_id = $1', [groupId]);
    for (let i = 0; i < finalList.length; i++) {
      const c = finalList[i];
      await client.query(
        `INSERT INTO logistics_categories (group_id, category_key, label, mode, position)
         VALUES ($1, $2, $3, $4, $5)`,
        [groupId, c.key, c.label, c.mode, i + 1]
      );
    }
    await client.query('COMMIT');
    inTransaction = false;

    return {
      success: true,
      message: 'Logistics categories updated',
      data: { categories: finalList, customized: true },
    };
  } catch (error: any) {
    if (inTransaction) await client.query('ROLLBACK').catch(() => {});
    console.error('Error updating logistics categories:', error);
    return {
      success: false,
      message: 'Failed to update logistics categories',
      error: error.message,
      errorCode: 'INTERNAL_ERROR',
    };
  } finally {
    client.release();
  }
}
