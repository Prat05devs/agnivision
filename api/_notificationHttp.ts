import { createRateLimit } from "./_requestLimits";
import { getDevice, deviceSecretMatches, type DeviceRecord } from "./_notificationStore";

// These endpoints were previously unlimited. Registration in particular is
// trust-on-first-use, so an unlimited caller could mint device records indefinitely —
// each one stored, and each one re-read by every dispatch run.
const allowRegistration = createRateLimit(20);
const allowDeviceRequest = createRateLimit(60);

export function rateLimited(request: Request, kind: "registration" | "device") {
  const allow = kind === "registration" ? allowRegistration : allowDeviceRequest;
  return allow(request) ? null : json({ error: "Too many requests. Please wait a moment." }, 429);
}

export function json(body: unknown, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: {
      "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Agnivision-Installation",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function authenticateDevice(request: Request): Promise<DeviceRecord | Response> {
  const installationId = request.headers.get("X-Agnivision-Installation") ?? "";
  const authorization = request.headers.get("Authorization") ?? "";
  const secret = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!/^[a-f0-9-]{30,50}$/i.test(installationId) || secret.length < 32 || secret.length > 256) {
    return json({ error: "Device authentication is required." }, 401);
  }
  const record = await getDevice(installationId);
  if (!record || !deviceSecretMatches(record, secret)) {
    return json({ error: "Device authentication failed." }, 401);
  }
  return record;
}

export function isResponse(value: DeviceRecord | Response): value is Response {
  return value instanceof Response;
}
