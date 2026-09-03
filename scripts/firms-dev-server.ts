import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { pathToFileURL } from "node:url";

import fireDetectionsHandler from "../api/fire-detections";
import advisoriesHandler from "../api/advisories";
import detectionAreasHandler from "../api/detection-areas";
import placesHandler from "../api/places";

const DEFAULT_PORT = 8787;

function loadLocalEnvironment() {
  try {
    const contents = readFileSync(".env", "utf8");

    for (const line of contents.split(/\r?\n/)) {
      const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim());
      const key = match?.[1];
      const rawValue = match?.[2];
      if (!key || rawValue === undefined || process.env[key] !== undefined) {
        continue;
      }

      const value = rawValue.trim().replace(/^(['"])(.*)\1$/, "$2");
      process.env[key] = value;
    }
  } catch {
    // The API handler returns a safe configuration error when .env is absent.
  }
}

export function getLocalIPv4Address() {
  for (const addresses of Object.values(networkInterfaces())) {
    const address = addresses?.find((candidate) => candidate.family === "IPv4" && !candidate.internal);
    if (address) {
      return address.address;
    }
  }

  return "127.0.0.1";
}

export function getLocalFireDataUrl(port = DEFAULT_PORT) {
  return `http://${getLocalIPv4Address()}:${port}/api/fire-detections`;
}

export async function startFirmsDevServer(port = DEFAULT_PORT): Promise<Server> {
  loadLocalEnvironment();

  const server = createServer(async (request, response) => {
    const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? `localhost:${port}`}`);

    if (requestUrl.pathname === "/health") {
      response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ status: "ready" }));
      return;
    }

    if (requestUrl.pathname !== "/api/fire-detections" && requestUrl.pathname !== "/api/places" && requestUrl.pathname !== "/api/detection-areas" && requestUrl.pathname !== "/api/advisories") {
      response.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "Not found." }));
      return;
    }

    try {
      const bodyChunks: Buffer[] = [];
      if (request.method !== "GET" && request.method !== "HEAD") {
        for await (const chunk of request) bodyChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const proxyRequest = new Request(requestUrl, {
        method: request.method,
        headers: request.headers as HeadersInit,
        body: bodyChunks.length > 0 ? Buffer.concat(bodyChunks) : undefined,
      });
      const handler = requestUrl.pathname === "/api/advisories"
        ? advisoriesHandler
        : requestUrl.pathname === "/api/places"
        ? placesHandler
        : requestUrl.pathname === "/api/detection-areas"
          ? detectionAreasHandler
          : fireDetectionsHandler;
      const proxyResponse = await handler.fetch(proxyRequest);
      const body = Buffer.from(await proxyResponse.arrayBuffer());

      response.writeHead(proxyResponse.status, Object.fromEntries(proxyResponse.headers.entries()));
      response.end(body);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown proxy error";
      console.error(`Local FIRMS proxy failed: ${message}`);
      response.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "Local FIRMS proxy failed." }));
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "0.0.0.0", () => {
      server.off("error", reject);
      resolve();
    });
  });

  return server;
}

async function runStandalone() {
  const port = Number(process.env.FIRMS_DEV_PORT ?? DEFAULT_PORT);
  await startFirmsDevServer(port);
  console.log(`FIRMS proxy ready at ${getLocalFireDataUrl(port)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void runStandalone();
}
