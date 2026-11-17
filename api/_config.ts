/**
 * Shared runtime configuration helpers for the serverless API.
 */

/**
 * True on a production deployment. Every production-vs-dev decision in the API (secret
 * fallback, Redis fallback) must use this one definition so they cannot disagree.
 */
export function isProduction(): boolean {
  if (process.env.VERCEL_ENV === 'production') return true;
  // Allow-list the development behaviour (the insecure dev secret, the in-memory database)
  // instead of deny-listing production: an unset or unexpected NODE_ENV ('staging', '') must not
  // silently turn those fallbacks on.
  return !['development', 'test'].includes(process.env.NODE_ENV ?? '');
}

/**
 * Reads a positive integer from the environment. A missing value uses the default. A value that
 * is set but not a positive integer is logged and also replaced by the default: parsing it with
 * Number() would give NaN, and comparisons against NaN are always false, which would silently
 * disable rate limits and attempt caps. Falling back to the (strict) default keeps the limit
 * in force and the API up, and the log line makes the misconfiguration visible.
 */
const warnedEnv = new Set<string>();

export function envPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = /^\d+$/.test(raw) ? Number(raw) : NaN; // plain decimal digits only ("0x10", "1e3" are not)
  if (!Number.isSafeInteger(value) || value <= 0) {
    // Log once per variable and value, not on every request
    const key = `${name}=${raw}`;
    if (!warnedEnv.has(key)) {
      warnedEnv.add(key);
      console.error(
        `[config] ${name} must be a positive integer (got "${raw}"); using ${fallback}`
      );
    }
    return fallback;
  }
  return value;
}

/** First four groups of an IPv6 address (its /64), expanded and lowercased; null if malformed. */
function ipv6Prefix(address: string): string | null {
  const halves = address.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? head.length !== 8 : missing < 1) return null;
  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill('0'), ...tail];
  if (groups.length !== 8 || !groups.every(g => /^[0-9a-fA-F]{1,4}$/.test(g))) return null;
  return groups
    .slice(0, 4)
    .map(g => g.toLowerCase().padStart(4, '0'))
    .join(':');
}

/**
 * Best-effort client address for rate limiting: the first entry of the forwarded chain, validated
 * and length-capped so a spoofed or oversized header cannot create unbounded keys. IPv6 clients
 * are bucketed by their /64, since one subscriber normally controls the whole /64 and could
 * otherwise rotate through 2^64 addresses to get a fresh bucket for every attempt.
 */
export function clientAddress(headers: Record<string, string | string[] | undefined>): string {
  const raw =
    headers['x-vercel-forwarded-for'] ?? headers['x-forwarded-for'] ?? headers['x-real-ip'];
  const first = (Array.isArray(raw) ? raw[0] : raw)?.split(',')[0]?.trim() ?? '';
  if (!/^[0-9a-fA-F:.]{1,45}$/.test(first)) return 'unknown';

  const mapped = first.match(/^(?:0*:)*ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (mapped) return mapped[1];
  if (first.includes(':')) {
    const prefix = ipv6Prefix(first);
    return prefix ? `${prefix}::/64` : 'unknown';
  }
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(first) ? first : 'unknown';
}
