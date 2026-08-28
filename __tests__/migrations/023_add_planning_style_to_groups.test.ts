import fs from 'fs';
import path from 'path';

describe('Migration 023: add planning_style to groups', () => {
  const sql = fs.readFileSync(
    path.join(__dirname, '../../lib/db/migrations/023_add_planning_style_to_groups.sql'),
    'utf8'
  );

  it('adds a planning_style column that is NOT NULL', () => {
    expect(sql).toMatch(/ADD COLUMN\s+planning_style\s+VARCHAR\(\d+\)\s+NOT NULL/i);
  });

  it("defaults new and existing rows to 'availability-first' (AC1, AC5 backfill)", () => {
    expect(sql).toMatch(/DEFAULT\s+'availability-first'/i);
  });

  it("constrains values to 'availability-first' or 'proposals-first'", () => {
    expect(sql).toMatch(
      /CHECK\s*\(\s*planning_style\s+IN\s*\(\s*'availability-first'\s*,\s*'proposals-first'\s*\)\s*\)/i
    );
  });
});
