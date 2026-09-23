import fs from 'fs';
import path from 'path';

describe('Migration 030: add phone_encrypted to social_circle_contacts', () => {
  const sql = fs.readFileSync(
    path.join(__dirname, '../../lib/db/migrations/030_add_phone_encrypted_to_circle_contacts.sql'),
    'utf8'
  );

  it('adds a nullable phone_encrypted TEXT column (Story 10.4, AC4)', () => {
    expect(sql).toMatch(/ADD COLUMN\s+IF NOT EXISTS\s+phone_encrypted\s+TEXT/i);
    expect(sql).not.toMatch(/phone_encrypted\s+TEXT\s+NOT NULL/i);
  });
});
