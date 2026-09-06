import { writeFile } from "node:fs/promises";

import { featuredDestinations } from "../src/data/destinations";

type CommonsPage = {
  title: string;
  imageinfo?: Array<{
    descriptionurl?: string;
    height?: number;
    mime?: string;
    thumburl?: string;
    url?: string;
    width?: number;
    extmetadata?: {
      LicenseShortName?: { value?: string };
    };
  }>;
};

type DestinationImage = {
  uri: string;
  title: string;
  license: string;
  sourcePage: string;
};

const allowedLicenses = new Set(["cc0", "public domain", "pdm"]);
const unsuitableTitle = /\bmap\b|\bsurroundings\b/i;
const imageManifest: Record<string, DestinationImage[]> = {};

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function commonsRequest(url: string) {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const response = await fetch(url, {
      headers: { "User-Agent": "AgniVision destination-gallery updater (agnivision.live)" },
    });
    if (response.status !== 429 || attempt === 4) return response;
    await wait(attempt * 4_000);
  }
  throw new Error("Commons search retry limit reached.");
}

async function findImages(name: string, region: string) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: `${name} ${region} India filetype:bitmap`,
    gsrnamespace: "6",
    gsrlimit: "40",
    prop: "imageinfo",
    iiprop: "url|mime|size|extmetadata",
    iiurlwidth: "1400",
  });
  const response = await commonsRequest(`https://commons.wikimedia.org/w/api.php?${params}`);
  if (!response.ok) throw new Error(`Commons search returned HTTP ${response.status}.`);

  const payload = (await response.json()) as { query?: { pages?: Record<string, CommonsPage> } };
  return Object.values(payload.query?.pages ?? {}).flatMap((page): DestinationImage[] => {
    const info = page.imageinfo?.[0];
    const license = info?.extmetadata?.LicenseShortName?.value?.trim() ?? "";
    const uri = info?.thumburl ?? info?.url;
    const landscape = Boolean(info?.width && info?.height && info.width >= 900 && info.width >= info.height * 1.08);
    if (!uri || !info?.descriptionurl || !info.mime?.startsWith("image/") || !landscape || unsuitableTitle.test(page.title) || !allowedLicenses.has(license.toLowerCase())) {
      return [];
    }
    return [{ uri: uri.replace(/\?.*$/, ""), title: page.title.replace(/^File:/, ""), license, sourcePage: info.descriptionurl }];
  }).slice(0, 3);
}

async function main() {
  for (const destination of featuredDestinations) {
    try {
      imageManifest[destination.id] = await findImages(destination.name, destination.region);
      console.log(`${destination.name}: ${imageManifest[destination.id]!.length}`);
    } catch (error) {
      imageManifest[destination.id] = [];
      console.warn(`${destination.name}: ${error instanceof Error ? error.message : "search failed"}`);
    }
    await wait(1_200);
  }

  await writeFile("src/data/destinationImages.json", `${JSON.stringify(imageManifest, null, 2)}\n`);

  const credits = [
    "# Destination image provenance",
    "",
    "These images are shown without customer-facing attribution because this manifest only accepts CC0 or public-domain assets. Keep this record when replacing or refreshing imagery.",
    "",
    ...featuredDestinations.flatMap((destination) => [
      `## ${destination.name}, ${destination.region}`,
      "",
      ...(imageManifest[destination.id]?.length
        ? imageManifest[destination.id]!.map((image) => `- [${image.title}](${image.sourcePage}) — ${image.license}`)
        : ["- No qualifying image found."]),
      "",
    ]),
  ];
  await writeFile("docs/DESTINATION_IMAGE_PROVENANCE.md", credits.join("\n"));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Destination image update failed.");
  process.exitCode = 1;
});
