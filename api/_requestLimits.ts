// Per-process safeguards. Production still needs shared edge quotas across replicas.
export function createRateLimit(limit: number, maxClients = 10_000) {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return (request: Request, cost = 1) => {
    if (cost === 0) return true;
    const now = Date.now();
    // The HTTP adapter supplies a trusted address; never trust caller-supplied XFF.
    const client = request.headers.get("x-agnivision-client-ip") ?? "unknown";
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
