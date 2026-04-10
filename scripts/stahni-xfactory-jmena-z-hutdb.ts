/**
 * Načte unikátní `abilities[].name` z veřejného HUTDB Supabase (stejný klíč jako web hutdb.app)
 * a ověří párování s `najdiVKataloguPodleEa` (katalog = pouze oficiální EA hub X-Faktory).
 *
 * Názory z HUTDB mimo těch 16 se očekávají jako „nepárovatelné“ — nejsou chybou skriptu.
 *
 * npm run xfactor-jmena-z-hutdb
 */
import { najdiVKataloguPodleEa } from "@/lib/xFactoryKatalog";

const HUTDB_SUPABASE_URL = "https://cfahmyecewzymggdoebn.supabase.co";
/** Veřejný anon klíč z bundle `www.hutdb.app` — jen čtení `players`. */
const HUTDB_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmYWhteWVjZXd6eW1nZ2RvZWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1ODM4MDksImV4cCI6MjA4NjE1OTgwOX0.SBtLCuO4j68fmTLGai5dVJcwkNCr9n2MgoXFcK7HYIM";

async function unikátníJménaZDb(): Promise<string[]> {
  const names = new Set<string>();
  for (let off = 0; off < 20_000; off += 1000) {
    const r = await fetch(
      `${HUTDB_SUPABASE_URL}/rest/v1/players?select=abilities&limit=1000&offset=${off}`,
      {
        headers: {
          apikey: HUTDB_ANON_KEY,
          Authorization: `Bearer ${HUTDB_ANON_KEY}`,
        },
      },
    );
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const rows = (await r.json()) as { abilities?: unknown }[];
    if (!Array.isArray(rows) || rows.length === 0) break;
    for (const row of rows) {
      const ab = row.abilities;
      if (!Array.isArray(ab)) continue;
      for (const a of ab) {
        if (a && typeof a === "object" && "name" in a) {
          const n = (a as { name?: string }).name;
          if (typeof n === "string" && n.trim()) names.add(n.trim());
        }
      }
    }
  }
  return [...names].sort();
}

async function main() {
  const names = await unikátníJménaZDb();
  console.error(`HUTDB: ${names.length} unikátních ability názvů v tabulce players.\n`);

  const nepárovatelné: string[] = [];
  for (const n of names) {
    const hit = najdiVKataloguPodleEa(n, n);
    if (!hit) nepárovatelné.push(n);
  }

  const párovatelné = names.length - nepárovatelné.length;
  console.error(
    `Oficiální katalog (EA hub): ${párovatelné} názvů z HUTDB lze namapovat, ${nepárovatelné.length} ne (očekáváno — HUTDB má více ability než hub).`,
  );
  if (nepárovatelné.length) {
    console.error("\nNepárovatelné (ukázka až 40):");
    for (const n of nepárovatelné.slice(0, 40)) {
      console.error(`  ${n}`);
    }
    if (nepárovatelné.length > 40) {
      console.error(`  … a dalších ${nepárovatelné.length - 40}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
