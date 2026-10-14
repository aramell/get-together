import fs from 'fs';
import path from 'path';

describe('Migration 042: create group_invitations', () => {
  const sql = fs.readFileSync(
    path.join(__dirname, '../../lib/db/migrations/042_create_group_invitations_table.sql'),
    'utf8'
  );

  it('creates the table idempotently', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS\s+group_invitations/i);
  });

  it('defines every column lib/db/queries/invitations.ts reads or writes', () => {
    for (const col of [
      'group_id',
      'invited_user_id',
      'invited_by_user_id',
      'status',
      'invited_at',
      'responded_at',
      'expires_at',
    ]) {
      expect(sql).toMatch(new RegExp(`\\b${col}\\b`));
    }
  });

  it('keys user columns as VARCHAR(128) Cognito subs, not UUIDs', () => {
    expect(sql).toMatch(/invited_user_id\s+VARCHAR\(128\)\s+NOT NULL/i);
    expect(sql).toMatch(/invited_by_user_id\s+VARCHAR\(128\)\s+NOT NULL/i);
  });

  it('constrains status and allows only one invite per status per user/group', () => {
    expect(sql).toMatch(/CHECK\s*\(\s*status\s+IN\s*\(\s*'pending'\s*,\s*'accepted'\s*,\s*'declined'\s*\)\s*\)/i);
    expect(sql).toMatch(/UNIQUE\s*\(\s*group_id\s*,\s*invited_user_id\s*,\s*status\s*\)/i);
  });

  it('enables RLS', () => {
    expect(sql).toMatch(/ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY/i);
  });
});
