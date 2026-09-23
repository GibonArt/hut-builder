import { APP_BUILT_AT, APP_GIT_SHA } from "@/lib/appBuild";

/** Veřejný endpoint — ověření, která verze běží na produkci (bez přihlášení). */
export function GET() {
  return Response.json({
    sha: APP_GIT_SHA,
    builtAt: APP_BUILT_AT || null,
  });
}
