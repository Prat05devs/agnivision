import { getOfficialAdvisories } from "./_sachetProvider";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=60, s-maxage=600, stale-while-revalidate=10800", "Content-Type": "application/json; charset=utf-8" } });
}

export default {
  async fetch(request: Request) {
    if (request.method !== "GET") return json({ error: "Method not allowed." }, 405);
    const url = new URL(request.url);
    const state = url.searchParams.get("state")?.trim().toLowerCase();
    const district = url.searchParams.get("district")?.trim().toLowerCase();
    const response = await getOfficialAdvisories();
    const advisories = response.advisories.filter((advisory) =>
      (!state || advisory.state?.toLowerCase() === state || advisory.areaDescription?.toLowerCase().includes(state)) &&
      (!district || advisory.district?.toLowerCase() === district || advisory.areaDescription?.toLowerCase().includes(district)),
    );
    return json({ ...response, advisories });
  },
};
