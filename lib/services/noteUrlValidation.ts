// Story 14.9: only http/https URLs are accepted for note links.
export const MAX_NOTE_URL_LENGTH = 2000;

export function isValidNoteUrl(value: string): boolean {
  if (value.length > MAX_NOTE_URL_LENGTH) return false;
  try {
    const parsed = new URL(value);
    if (parsed.username || parsed.password) return false;
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname.length > 0;
  } catch {
    return false;
  }
}
