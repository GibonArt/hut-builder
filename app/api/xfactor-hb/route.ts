import { NextResponse } from "next/server";

const UPSTREAM_BASE =
  "https://nhlhutbuilder.com/images/xfactor_icons/";

/** Stejné soubory jako v jejich glossary; ochrana proti libovolnému fetchi. */
const ALLOWED_FILE =
  /^(?:specialist|all-star|elite)[A-Z0-9_.]+\.png$/;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const file = url.searchParams.get("file")?.trim() ?? "";
  if (!file || !ALLOWED_FILE.test(file)) {
    return NextResponse.json({ error: "Neplatný soubor." }, { status: 400 });
  }

  const upstream = await fetch(`${UPSTREAM_BASE}${file}`, {
    headers: {
      Referer: "https://nhlhutbuilder.com/",
      "User-Agent":
        "Mozilla/5.0 (compatible; HUT-app/1.0; +local x-factor icon proxy)",
    },
    next: { revalidate: 604800 },
  });

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: "Ikona není dostupná." },
      { status: upstream.status === 404 ? 404 : 502 },
    );
  }

  const ct = upstream.headers.get("content-type") ?? "image/png";
  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": ct.startsWith("image/") ? ct : "image/png",
      "Cache-Control": "public, max-age=604800, s-maxage=604800",
    },
  });
}
