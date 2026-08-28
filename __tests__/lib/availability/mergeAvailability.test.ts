import { describe, it, expect } from '@jest/globals';
import { mergeAvailability } from '@/lib/availability/mergeAvailability';

describe('mergeAvailability (Story 3.6, AC2)', () => {
  it('returns nothing when there is no data (unknown/no data case)', () => {
    const result = mergeAvailability([], []);
    expect(result).toEqual([]);
  });

  it('shows manual free when only a manual free entry exists', () => {
    const result = mergeAvailability(
      [{ start_time: '2026-04-01T09:00:00.000Z', end_time: '2026-04-01T17:00:00.000Z', status: 'free' }],
      []
    );

    expect(result).toEqual([
      { start_time: '2026-04-01T09:00:00.000Z', end_time: '2026-04-01T17:00:00.000Z', status: 'free', source: 'manual' },
    ]);
  });

  it('shows manual busy when only a manual busy entry exists', () => {
    const result = mergeAvailability(
      [{ start_time: '2026-04-01T09:00:00.000Z', end_time: '2026-04-01T17:00:00.000Z', status: 'busy' }],
      []
    );

    expect(result).toEqual([
      { start_time: '2026-04-01T09:00:00.000Z', end_time: '2026-04-01T17:00:00.000Z', status: 'busy', source: 'manual' },
    ]);
  });

  it('shows Google busy when only a Google busy block exists', () => {
    const result = mergeAvailability(
      [],
      [{ start_time: '2026-04-01T09:00:00.000Z', end_time: '2026-04-01T17:00:00.000Z' }]
    );

    expect(result).toEqual([
      { start_time: '2026-04-01T09:00:00.000Z', end_time: '2026-04-01T17:00:00.000Z', status: 'busy', source: 'google' },
    ]);
  });

  it('prefers Google busy over an overlapping manual free entry (precedence order 1)', () => {
    const result = mergeAvailability(
      [{ start_time: '2026-04-01T09:00:00.000Z', end_time: '2026-04-01T17:00:00.000Z', status: 'free' }],
      [{ start_time: '2026-04-01T12:00:00.000Z', end_time: '2026-04-01T13:00:00.000Z' }]
    );

    expect(result).toEqual([
      { start_time: '2026-04-01T09:00:00.000Z', end_time: '2026-04-01T12:00:00.000Z', status: 'free', source: 'manual' },
      { start_time: '2026-04-01T12:00:00.000Z', end_time: '2026-04-01T13:00:00.000Z', status: 'busy', source: 'google' },
      { start_time: '2026-04-01T13:00:00.000Z', end_time: '2026-04-01T17:00:00.000Z', status: 'free', source: 'manual' },
    ]);
  });

  it('prefers Google busy over an overlapping manual busy entry', () => {
    const result = mergeAvailability(
      [{ start_time: '2026-04-01T09:00:00.000Z', end_time: '2026-04-01T17:00:00.000Z', status: 'busy' }],
      [{ start_time: '2026-04-01T09:00:00.000Z', end_time: '2026-04-01T17:00:00.000Z' }]
    );

    expect(result).toEqual([
      { start_time: '2026-04-01T09:00:00.000Z', end_time: '2026-04-01T17:00:00.000Z', status: 'busy', source: 'google' },
    ]);
  });

  it('prefers manual busy over manual free when both are marked for the same window (data hygiene edge case)', () => {
    const result = mergeAvailability(
      [
        { start_time: '2026-04-01T09:00:00.000Z', end_time: '2026-04-01T17:00:00.000Z', status: 'free' },
        { start_time: '2026-04-01T12:00:00.000Z', end_time: '2026-04-01T13:00:00.000Z', status: 'busy' },
      ],
      []
    );

    expect(result).toEqual([
      { start_time: '2026-04-01T09:00:00.000Z', end_time: '2026-04-01T12:00:00.000Z', status: 'free', source: 'manual' },
      { start_time: '2026-04-01T12:00:00.000Z', end_time: '2026-04-01T13:00:00.000Z', status: 'busy', source: 'manual' },
      { start_time: '2026-04-01T13:00:00.000Z', end_time: '2026-04-01T17:00:00.000Z', status: 'free', source: 'manual' },
    ]);
  });

  it('omits periods with no coverage from any source (unknown/no data)', () => {
    const result = mergeAvailability(
      [{ start_time: '2026-04-01T09:00:00.000Z', end_time: '2026-04-01T10:00:00.000Z', status: 'free' }],
      [{ start_time: '2026-04-01T14:00:00.000Z', end_time: '2026-04-01T15:00:00.000Z' }]
    );

    expect(result).toEqual([
      { start_time: '2026-04-01T09:00:00.000Z', end_time: '2026-04-01T10:00:00.000Z', status: 'free', source: 'manual' },
      { start_time: '2026-04-01T14:00:00.000Z', end_time: '2026-04-01T15:00:00.000Z', status: 'busy', source: 'google' },
    ]);
  });

  it('merges adjacent Google busy blocks that touch into a single segment', () => {
    const result = mergeAvailability(
      [],
      [
        { start_time: '2026-04-01T09:00:00.000Z', end_time: '2026-04-01T10:00:00.000Z' },
        { start_time: '2026-04-01T10:00:00.000Z', end_time: '2026-04-01T11:00:00.000Z' },
      ]
    );

    expect(result).toEqual([
      { start_time: '2026-04-01T09:00:00.000Z', end_time: '2026-04-01T11:00:00.000Z', status: 'busy', source: 'google' },
    ]);
  });

  it('handles multiple users worth of independent data without cross-contamination (called per-user)', () => {
    const userA = mergeAvailability(
      [{ start_time: '2026-04-01T09:00:00.000Z', end_time: '2026-04-01T17:00:00.000Z', status: 'free' }],
      []
    );
    const userB = mergeAvailability(
      [],
      [{ start_time: '2026-04-01T09:00:00.000Z', end_time: '2026-04-01T17:00:00.000Z' }]
    );

    expect(userA[0].status).toBe('free');
    expect(userB[0].status).toBe('busy');
  });
});
