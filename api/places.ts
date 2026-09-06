import { isCoordinateInIndiaScope } from "../src/map/clustering";
import { createRateLimit } from "./_requestLimits";

const allowRequest = createRateLimit(60);

function json(body: unknown, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: {
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function googleRequest(url: string, key: string, init: RequestInit) {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(10_000),
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      ...init.headers,
    },
  });
  if (!response.ok) throw new Error(`Places service returned HTTP ${response.status}.`);
  return response.json();
}

export default {
  async fetch(request: Request) {
    if (request.method === "OPTIONS") return json({}, 204);
    if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
    if (!allowRequest(request)) return json({ error: "Too many place searches. Please wait a moment." }, 429);
    const key = process.env.GOOGLE_PLACES_API_KEY;
    if (!key) return json({ error: "Destination search is not configured." }, 503);

    try {
      const body = (await request.json()) as { input?: unknown; placeId?: unknown; sessionToken?: unknown };
      if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Invalid request body." }, 400);
      const sessionToken = typeof body.sessionToken === "string" && body.sessionToken.length <= 100 ? body.sessionToken : undefined;
      if (typeof body.input === "string") {
        const input = body.input.trim();
        if (input.length < 2 || input.length > 120) return json({ error: "Search text must contain 2–120 characters." }, 400);
        const payload = await googleRequest("https://places.googleapis.com/v1/places:autocomplete", key, {
          method: "POST",
          headers: {
            "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat.mainText.text,suggestions.placePrediction.structuredFormat.secondaryText.text",
          },
          body: JSON.stringify({
            input,
            includedRegionCodes: ["in"],
            languageCode: "en",
            regionCode: "in",
            ...(sessionToken ? { sessionToken } : {}),
          }),
        }) as { suggestions?: Array<{ placePrediction?: { placeId?: string; text?: { text?: string }; structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } } } }> };
        const suggestions = (payload.suggestions ?? []).flatMap(({ placePrediction }) => {
          if (!placePrediction?.placeId || !placePrediction.text?.text) return [];
          return [{
            placeId: placePrediction.placeId,
            text: placePrediction.text.text,
            mainText: placePrediction.structuredFormat?.mainText?.text ?? placePrediction.text.text,
            secondaryText: placePrediction.structuredFormat?.secondaryText?.text ?? "India",
          }];
        });
        return json({ suggestions });
      }

      if (typeof body.placeId === "string" && /^[A-Za-z0-9_-]{10,200}$/.test(body.placeId)) {
        const placeId = encodeURIComponent(body.placeId);
        const place = await googleRequest(`https://places.googleapis.com/v1/places/${placeId}${sessionToken ? `?sessionToken=${encodeURIComponent(sessionToken)}` : ""}`, key, {
          method: "GET",
          headers: { "X-Goog-FieldMask": "id,displayName,formattedAddress,location" },
        }) as { id?: string; displayName?: { text?: string }; formattedAddress?: string; location?: { latitude?: number; longitude?: number } };
        if (!place.id || !place.displayName?.text || !Number.isFinite(place.location?.latitude) || !Number.isFinite(place.location?.longitude)) {
          return json({ error: "The selected destination did not include a usable location." }, 502);
        }
        const coordinate = { latitude: place.location!.latitude!, longitude: place.location!.longitude! };
        if (!isCoordinateInIndiaScope(coordinate)) return json({ error: "AgniVision.live destination search is limited to India." }, 400);
        return json({
          destination: {
            id: `google:${place.id}`,
            name: place.displayName.text,
            region: place.formattedAddress ?? "India",
            coordinate,
          },
        });
      }
      return json({ error: "Provide search text or a place ID." }, 400);
    } catch {
      return json({ error: "Destination search is temporarily unavailable." }, 502);
    }
  },
};
