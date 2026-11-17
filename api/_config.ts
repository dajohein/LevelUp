/**
 * Shared runtime configuration helpers for the serverless API.
 */

/**
 * True on a production deployment. Every production-vs-dev decision in the API (secret
 * fallback, Redis fallback) must use this one definition so they cannot disagree.
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
}

/**
 * Reads a positive integer from the environment. A missing value uses the default. A value that
 * is set but not a positive integer is logged and also replaced by the default: parsing it with
 * Number() would give NaN, and comparisons against NaN are always false, which would silently
 * disable rate limits and attempt caps. Falling back to the (strict) default keeps the limit
 * in force and the API up, and the log line makes the misconfiguration visible.
 */
export function envPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    console.error(`[config] ${name} must be a positive integer (got "${raw}"); using ${fallback}`);
    return fallback;
  }
  return value;
}

/**
 * Best-effort client address for rate limiting: the first entry of the forwarded chain,
 * trimmed and length-capped so a spoofed or oversized header cannot create unbounded keys.
 */
export function clientAddress(headers: Record<string, string | string[] | undefined>): string {
  const raw =
    headers['x-vercel-forwarded-for'] ?? headers['x-forwarded-for'] ?? headers['x-real-ip'];
  const first = (Array.isArray(raw) ? raw[0] : raw)?.split(',')[0]?.trim() ?? '';
  return /^[0-9a-fA-F:.]{1,45}$/.test(first) ? first : 'unknown';
}
