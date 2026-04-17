const FALLBACK_PREFIX = 'mtg';

function createFallbackId(): string {
  const random = Math.random().toString(36).slice(2, 10);

  return `${FALLBACK_PREFIX}_${Date.now().toString(36)}${random}`;
}

export function generateMeetingId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `mtg_${crypto.randomUUID()}`;
  }

  return createFallbackId();
}
