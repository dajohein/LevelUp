/**
 * Shared runtime configuration helpers for the serverless API.
 */

/**
 * True on a production deployment. Every production-vs-dev decision in the API (secret
 * fallback, Redis fallback) must use this one definition so they cannot disagree.
 */
export function isProduction(): boolean {
  if (process.env.VERCEL_ENV === 'production') return true;
  // `vercel dev` sets VERCEL_ENV=development; it is a development run even if NODE_ENV is unset
  if (process.env.VERCEL_ENV === 'development') return false;
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

const IPV4_OCTET = '(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';
const IPV4_PATTERN = new RegExp(`^${IPV4_OCTET}(?:\\.${IPV4_OCTET}){3}$`);

/** The eight 16-bit groups of an IPv6 address, or null if it is not a well-formed one. */
function parseIPv6(address: string): number[] | null {
  // A trailing dotted IPv4 part ("64:ff9b::192.0.2.1", "::ffff:1.2.3.4") stands for two groups
  let text = address;
  const lastColon = text.lastIndexOf(':');
  const tail = text.slice(lastColon + 1);
  if (tail.includes('.')) {
    if (!IPV4_PATTERN.test(tail)) return null;
    const [a, b, c, d] = tail.split('.').map(Number);
    text = `${text.slice(0, lastColon + 1)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }

  const halves = text.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const rest = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const fill = 8 - head.length - rest.length;
  // "::" must stand for at least one group; without "::" all eight must be written out
  if (halves.length === 2 ? fill < 1 : fill !== 0) return null;

  const groups = [...head, ...Array<string>(halves.length === 2 ? fill : 0).fill('0'), ...rest];
  if (!groups.every(g => /^[0-9a-fA-F]{1,4}$/.test(g))) return null;
  return groups.map(g => parseInt(g, 16));
}

/**
 * Best-effort client address for rate limiting: the first entry of the forwarded chain, validated
 * and length-capped so a spoofed or oversized header cannot create unbounded keys.
 *
 * - IPv4 maps to itself (octets must be 0-255).
 * - An IPv4-mapped IPv6 address (::ffff:a.b.c.d, or the same in hex) maps to that IPv4 address.
 * - Any other IPv6 address maps to its /64 prefix. One subscriber normally controls a whole /64
 *   and could otherwise rotate through 2^64 addresses to get a fresh bucket for every attempt.
 * - Anything malformed maps to "unknown".
 */
export function clientAddress(headers: Record<string, string | string[] | undefined>): string {
  const raw =
    headers['x-vercel-forwarded-for'] ?? headers['x-forwarded-for'] ?? headers['x-real-ip'];
  const first = (Array.isArray(raw) ? raw[0] : raw)?.split(',')[0]?.trim() ?? '';
  if (!/^[0-9a-fA-F:.]{1,45}$/.test(first)) return 'unknown';

  if (!first.includes(':')) return IPV4_PATTERN.test(first) ? first : 'unknown';

  const groups = parseIPv6(first);
  if (!groups) return 'unknown';

  const isMapped = groups.slice(0, 5).every(g => g === 0) && groups[5] === 0xffff;
  if (isMapped) {
    return [groups[6] >> 8, groups[6] & 255, groups[7] >> 8, groups[7] & 255].join('.');
  }
  const prefix = groups
    .slice(0, 4)
    .map(g => g.toString(16).padStart(4, '0'))
    .join(':');
  return `${prefix}::/64`;
}
