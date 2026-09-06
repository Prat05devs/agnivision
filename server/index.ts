import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { pathToFileURL } from "node:url";
import { createRateLimit } from "../api/_requestLimits";

import advisoriesHandler from "../api/advisories";
import detectionAreasHandler from "../api/detection-areas";
import fireDetectionsHandler from "../api/fire-detections";
import notificationDeviceHandler from "../api/notification-device";
import notificationInboxHandler from "../api/notification-inbox";
import notificationLocationHandler from "../api/notification-location";
import placesHandler from "../api/places";

const DEFAULT_PORT = 8080;
const MAX_BODY_BYTES = 64 * 1024;

const handlers = new Map([
  ["/api/advisories", advisoriesHandler],
  ["/api/detection-areas", detectionAreasHandler],
  ["/api/fire-detections", fireDetectionsHandler],
  ["/api/notification-device", notificationDeviceHandler],
  ["/api/notification-inbox", notificationInboxHandler],
  ["/api/notification-location", notificationLocationHandler],
  ["/api/places", placesHandler],
]);

class PayloadTooLargeError extends Error {}

async function readBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) {
      throw new PayloadTooLargeError("Request body exceeds the allowed size.");
    }
    chunks.push(buffer);
  }
  return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
}

function requestUrl(request: IncomingMessage) {
  // Route only by path. Host and forwarded-host are controlled by the caller.
  return new URL(request.url ?? "/", "https://api.agnivision.invalid");
}

function applySecurityHeaders(headers: Headers) {
  headers.set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
}

async function send(response: ServerResponse, upstream: Response) {
  const headers = new Headers(upstream.headers);
  applySecurityHeaders(headers);
  response.writeHead(upstream.status, Object.fromEntries(headers.entries()));
  if (upstream.status === 204 || upstream.status === 304) {
    response.end();
    return;
  }
  response.end(Buffer.from(await upstream.arrayBuffer()));
}

function json(response: ServerResponse, status: number, body: unknown) {
  const headers = new Headers({
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  applySecurityHeaders(headers);
  response.writeHead(status, Object.fromEntries(headers.entries()));
  response.end(JSON.stringify(body));
}

export function createApiServer() {
let active = 0;
const allowRequest = createRateLimit(180);
const server = createServer(async (request, response) => {
  let url: URL;
  try { url = requestUrl(request); } catch { json(response, 400, { error: "Invalid request URL." }); return; }
  if (url.pathname === "/healthz") {
    json(response, 200, { status: "ready" });
    return;
  }

  const handler = handlers.get(url.pathname);
  if (!handler) {
    json(response, 404, { error: "Not found." });
    return;
  }

  if (active >= 200) {
    response.setHeader("Retry-After", "5");
    json(response, 503, { error: "Service is busy. Please retry shortly." });
    return;
  }
  active += 1;

  try {
    const method = request.method ?? "GET";
    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers)) {
      if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    }
    // Opt in only behind a proxy that overwrites/appends the real client address.
    const forwarded = headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
    headers.set("x-agnivision-client-ip", process.env.TRUST_PROXY === "true" && forwarded ? forwarded : request.socket.remoteAddress ?? "unknown");
    if (!allowRequest(new Request(url, { headers }))) {
      response.setHeader("Retry-After", "60");
      json(response, 429, { error: "Too many requests. Please wait a moment." });
      return;
    }
    const body = method === "GET" || method === "HEAD" ? undefined : await readBody(request);
    const proxyRequest = new Request(url, {
      method,
      headers,
      body,
    });
    await send(response, await handler.fetch(proxyRequest));
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      json(response, 413, { error: "Request body is too large." });
      return;
    }
    console.error("API request failed", {
      method: request.method,
      path: url.pathname,
      error: error instanceof Error ? error.name : "UnknownError",
    });
    json(response, 500, { error: "Internal server error." });
  } finally { active -= 1; }
});
server.requestTimeout = 20_000;
server.headersTimeout = 10_000;
server.keepAliveTimeout = 5_000;
server.maxRequestsPerSocket = 1_000;
return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
const server = createApiServer();
const port = Number(process.env.PORT ?? DEFAULT_PORT);
server.listen(port, "0.0.0.0", () => {
  console.log(`AgniVision API listening on port ${port}`);
});

function shutdown(signal: string) {
  console.log(`Received ${signal}; closing HTTP server.`);
  server.close((error) => {
    process.exitCode = error ? 1 : 0;
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
}
