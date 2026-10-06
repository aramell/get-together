import fs from 'fs';
import path from 'path';

const sql = fs.readFileSync(
  path.join(process.cwd(), 'lib/db/migrations/037_create_item_comments_table.sql'),
  'utf8'
);

describe('migration 037 item_comments (text sanity, no DB)', () => {
  it('creates item_comments with FKs, CHECKs, indexes and RLS', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS item_comments');
    expect(sql).toMatch(/event_id UUID NOT NULL REFERENCES event_proposals\(id\) ON DELETE CASCADE/);
    expect(sql).toMatch(/group_id UUID NOT NULL REFERENCES groups\(id\) ON DELETE CASCADE/);
    expect(sql).toContain('created_by VARCHAR(128)');
    expect(sql).toContain('length(trim(content)) > 0');
    expect(sql).toContain('length(content) <= 2000');
    expect(sql).toMatch(/\(item_type, item_id, created_at\) WHERE deleted_at IS NULL/);
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
  });

  it('has no CHECK on item_type and no per-item FK', () => {
    expect(sql).not.toMatch(/item_type[^,\n]*CHECK/i);
    expect(sql).toMatch(/item_id UUID NOT NULL,/);
  });

  it('guards the copy and drop of 034/035 with to_regclass', () => {
    expect(sql).toContain("to_regclass('public.checklist_comments')");
    expect(sql).toContain("to_regclass('public.logistics_comments')");
    expect(sql).toContain('DROP TABLE checklist_comments');
    expect(sql).toContain('DROP TABLE logistics_comments');
    // copy happens before the drop, preserving ids/timestamps/deleted_at
    expect(sql.indexOf('INSERT INTO item_comments')).toBeLessThan(sql.indexOf('DROP TABLE checklist_comments'));
    expect(sql).toMatch(/cc\.deleted_at/);
    expect(sql).toMatch(/lc\.deleted_at/);
  });
});
