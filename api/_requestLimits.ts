// Per-process safeguards. Production still needs shared edge quotas across replicas.

// `x-agnivision-client-ip` is only trustworthy because server/index.ts overwrites it on
// every request. On Vercel nothing strips it, so a caller could set it themselves and
// mint a fresh bucket per request — the limit measured 0 rejections in 100 calls that
// way. On Vercel the identity therefore comes from headers the platform controls, and
// the self-hosted header is ignored entirely.
const VERCEL_CLIENT_HEADERS = ["x-vercel-forwarded-for", "x-real-ip"] as const;

export function clientIdentity(request: Request) {
  if (process.env.VERCEL) {
    for (const header of VERCEL_CLIENT_HEADERS) {
      const value = request.headers.get(header)?.split(",")[0]?.trim();
      if (value) return value;
    }
    return "unidentified";
  }
  return request.headers.get("x-agnivision-client-ip") ?? "unidentified";
}

export function createRateLimit(limit: number, maxClients = 10_000) {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return (request: Request, cost = 1) => {
    if (cost === 0) return true;
    const now = Date.now();
    const client = clientIdentity(request);
    const current = buckets.get(client);
    if (current && current.resetAt > now) {
      if (current.count + cost > limit) return false;
      current.count += cost;
      return true;
    }
    if (buckets.size >= maxClients) {
      for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
      if (buckets.size >= maxClients && !current) return false;
    }
    buckets.set(client, { count: cost, resetAt: now + 60_000 });
    return cost <= limit;
  };
}
