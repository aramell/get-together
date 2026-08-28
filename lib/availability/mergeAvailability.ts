/**
 * Merge manually-marked availability with synced Google Calendar busy blocks (Story 3.6, AC2).
 *
 * Precedence per time period: Google busy > manual busy > manual free > unknown (no entry).
 * The two sources are never combined into one DB row (Architecture Decision 6c) -- this is
 * a pure, read-time computation over the raw rows from each source.
 */

export interface ManualAvailabilityEntry {
  start_time: string; // ISO 8601
  end_time: string; // ISO 8601
  status: 'free' | 'busy';
}

export interface GoogleBusyBlock {
  start_time: string; // ISO 8601
  end_time: string; // ISO 8601
}

export interface MergedAvailabilitySegment {
  start_time: string; // ISO 8601
  end_time: string; // ISO 8601
  status: 'free' | 'busy';
  source: 'google' | 'manual';
}

/**
 * Resolve a single user's manual entries + Google busy blocks into a list of
 * non-overlapping segments, each with one definitive status (AC2). Time not covered
 * by any source is simply omitted (unknown/no data).
 */
export function mergeAvailability(
  manualEntries: ManualAvailabilityEntry[],
  googleBusyBlocks: GoogleBusyBlock[]
): MergedAvailabilitySegment[] {
  const boundarySet = new Set<number>();
  for (const entry of manualEntries) {
    boundarySet.add(new Date(entry.start_time).getTime());
    boundarySet.add(new Date(entry.end_time).getTime());
  }
  for (const block of googleBusyBlocks) {
    boundarySet.add(new Date(block.start_time).getTime());
    boundarySet.add(new Date(block.end_time).getTime());
  }

  const boundaries = Array.from(boundarySet).sort((a, b) => a - b);
  const segments: MergedAvailabilitySegment[] = [];

  for (let i = 0; i < boundaries.length - 1; i++) {
    const segStart = boundaries[i];
    const segEnd = boundaries[i + 1];
    if (segStart >= segEnd) continue;

    // Use the segment's midpoint to test coverage -- safe because boundaries are all
    // distinct start/end timestamps, so no source's edge can land exactly on a midpoint.
    const midpoint = (segStart + segEnd) / 2;

    const coveredByGoogleBusy = googleBusyBlocks.some(
      (block) => new Date(block.start_time).getTime() <= midpoint && new Date(block.end_time).getTime() >= midpoint
    );
    if (coveredByGoogleBusy) {
      segments.push(buildSegment(segStart, segEnd, 'busy', 'google'));
      continue;
    }

    const coveringManualBusy = manualEntries.find(
      (entry) =>
        entry.status === 'busy' &&
        new Date(entry.start_time).getTime() <= midpoint &&
        new Date(entry.end_time).getTime() >= midpoint
    );
    if (coveringManualBusy) {
      segments.push(buildSegment(segStart, segEnd, 'busy', 'manual'));
      continue;
    }

    const coveringManualFree = manualEntries.find(
      (entry) =>
        entry.status === 'free' &&
        new Date(entry.start_time).getTime() <= midpoint &&
        new Date(entry.end_time).getTime() >= midpoint
    );
    if (coveringManualFree) {
      segments.push(buildSegment(segStart, segEnd, 'free', 'manual'));
      continue;
    }

    // No source covers this period -- unknown/no data, omit.
  }

  return mergeAdjacentSegments(segments);
}

function buildSegment(
  startMs: number,
  endMs: number,
  status: 'free' | 'busy',
  source: 'google' | 'manual'
): MergedAvailabilitySegment {
  return {
    start_time: new Date(startMs).toISOString(),
    end_time: new Date(endMs).toISOString(),
    status,
    source,
  };
}

function mergeAdjacentSegments(segments: MergedAvailabilitySegment[]): MergedAvailabilitySegment[] {
  const merged: MergedAvailabilitySegment[] = [];

  for (const segment of segments) {
    const last = merged[merged.length - 1];
    if (last && last.status === segment.status && last.source === segment.source && last.end_time === segment.start_time) {
      last.end_time = segment.end_time;
    } else {
      merged.push({ ...segment });
    }
  }

  return merged;
}
