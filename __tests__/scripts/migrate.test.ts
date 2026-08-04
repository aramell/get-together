import { sortMigrationFiles, getPendingMigrations, runMigrations } from '../../scripts/migrate.js';

describe('sortMigrationFiles', () => {
  it('sorts zero-padded numeric-prefixed filenames in dependency-safe order', () => {
    const input = [
      '011_add_public_event_support.sql',
      '000_create_groups_schema.sql',
      '002_create_event_rsvps_table.sql',
      '001_create_availabilities_table.sql',
      '001_create_events_schema.sql',
      '002_add_recurring_to_availabilities.sql',
      '010_add_edit_support_to_comments.sql',
    ];

    expect(sortMigrationFiles(input)).toEqual([
      '000_create_groups_schema.sql',
      '001_create_availabilities_table.sql',
      '001_create_events_schema.sql',
      '002_add_recurring_to_availabilities.sql',
      '002_create_event_rsvps_table.sql',
      '010_add_edit_support_to_comments.sql',
      '011_add_public_event_support.sql',
    ]);
  });

  it('excludes non-.sql files', () => {
    const input = ['000_create_groups_schema.sql', 'README.md', '.gitkeep'];
    expect(sortMigrationFiles(input)).toEqual(['000_create_groups_schema.sql']);
  });

  it('matches the real migrations directory contents and order', () => {
    const files = require('fs').readdirSync(
      require('path').join(__dirname, '../../lib/db/migrations')
    );
    const sorted = sortMigrationFiles(files);
    expect(sorted[0]).toBe('000_create_groups_schema.sql');
    expect(sorted[sorted.length - 1]).toBe('018_create_event_logistics_claims_table.sql');
    expect(sorted).toHaveLength(21);
  });
});

describe('getPendingMigrations', () => {
  it('returns only files not already applied', () => {
    const all = ['000_a.sql', '001_b.sql', '002_c.sql'];
    const applied = ['000_a.sql'];
    expect(getPendingMigrations(all, applied)).toEqual(['001_b.sql', '002_c.sql']);
  });

  it('returns everything when nothing has been applied', () => {
    const all = ['000_a.sql', '001_b.sql'];
    expect(getPendingMigrations(all, [])).toEqual(all);
  });

  it('returns nothing when everything has already been applied', () => {
    const all = ['000_a.sql', '001_b.sql'];
    expect(getPendingMigrations(all, all)).toEqual([]);
  });

  it('is order-preserving relative to the sorted input', () => {
    const all = ['000_a.sql', '001_b.sql', '002_c.sql', '003_d.sql'];
    const applied = ['001_b.sql', '003_d.sql'];
    expect(getPendingMigrations(all, applied)).toEqual(['000_a.sql', '002_c.sql']);
  });
});

describe('runMigrations', () => {
  function makeMockPool(queryImpl) {
    const client = { query: queryImpl, release: jest.fn() };
    return { connect: jest.fn().mockResolvedValue(client), _client: client };
  }

  it('creates the schema_migrations tracking table before checking applied migrations', async () => {
    const calls: string[] = [];
    const pool = makeMockPool(async (sql: string) => {
      calls.push(sql.trim().split('\n')[0].trim());
      if (sql.includes('SELECT filename FROM schema_migrations')) {
        return { rows: [{ filename: '000_create_groups_schema.sql' }] };
      }
      return { rows: [] };
    });

    jest.spyOn(require('fs'), 'readdirSync').mockReturnValue(['001_create_availabilities_table.sql']);
    jest.spyOn(require('fs'), 'readFileSync').mockReturnValue('SELECT 1;');

    const result = await runMigrations(pool as any, '/fake/dir');

    expect(calls[0]).toContain('CREATE TABLE IF NOT EXISTS schema_migrations');
    expect(result.applied).toEqual(['001_create_availabilities_table.sql']);
    expect(result.skipped).toBe(0);

    jest.restoreAllMocks();
  });

  it('skips migrations already recorded in schema_migrations', async () => {
    const pool = makeMockPool(async (sql: string) => {
      if (sql.includes('SELECT filename FROM schema_migrations')) {
        return { rows: [{ filename: '000_create_groups_schema.sql' }] };
      }
      return { rows: [] };
    });

    jest.spyOn(require('fs'), 'readdirSync').mockReturnValue(['000_create_groups_schema.sql']);
    jest.spyOn(require('fs'), 'readFileSync').mockReturnValue('SELECT 1;');

    const result = await runMigrations(pool as any, '/fake/dir');

    expect(result.applied).toEqual([]);
    expect(result.skipped).toBe(1);

    jest.restoreAllMocks();
  });

  it('rolls back and throws when a migration fails, without recording it as applied', async () => {
    const queryLog: string[] = [];
    const pool = makeMockPool(async (sql: string, params?: unknown[]) => {
      queryLog.push(sql.trim());
      if (sql.includes('SELECT filename FROM schema_migrations')) return { rows: [] };
      if (sql.trim() === 'BAD SQL;') throw new Error('syntax error');
      return { rows: [] };
    });

    jest.spyOn(require('fs'), 'readdirSync').mockReturnValue(['000_broken.sql']);
    jest.spyOn(require('fs'), 'readFileSync').mockReturnValue('BAD SQL;');

    await expect(runMigrations(pool as any, '/fake/dir')).rejects.toThrow('000_broken.sql failed');
    expect(queryLog).toContain('ROLLBACK');
    expect(queryLog.some((q) => q.includes('INSERT INTO schema_migrations'))).toBe(false);

    jest.restoreAllMocks();
  });

  it('releases the client even when migrations fail', async () => {
    const pool = makeMockPool(async (sql: string) => {
      if (sql.includes('SELECT filename FROM schema_migrations')) return { rows: [] };
      if (sql.trim() === 'BAD SQL;') throw new Error('syntax error');
      return { rows: [] };
    });

    jest.spyOn(require('fs'), 'readdirSync').mockReturnValue(['000_broken.sql']);
    jest.spyOn(require('fs'), 'readFileSync').mockReturnValue('BAD SQL;');

    await expect(runMigrations(pool as any, '/fake/dir')).rejects.toThrow();
    expect(pool._client.release).toHaveBeenCalled();

    jest.restoreAllMocks();
  });
});
