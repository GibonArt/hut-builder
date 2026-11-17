/**
 * Katalog karet z nhlhutbuilder.com — oddělený od inventáře (`cards`).
 * Sync: find_cards.php (seznam) + player-card-popup.php (detail).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { HutCard, Liga, Pozice, Ruka, XFactorZaznam } from "@/types";
import { hutbuilderConfigProSezonu } from "@/lib/hutbuilderSezonaConfig";
import { narodnostKodZHutbuilderJmena, vsechnyNarodnostiCS } from "@/lib/narodnosti";
import { SEZONA_VYCHOZI, type Sezona } from "@/lib/sezona";
import { LIGY_V_PORADI } from "@/lib/tymyPodleLigy";

const LIGA_SET = new Set<string>(LIGY_V_PORADI);
const UA =
  "HUT-App/1.0 (admin sync hutbuilder card catalog; not inventory)";

export type HutbuilderKatalogRadka = {
  hb_id: number;
  hb_typ: "player" | "goalie";
  jmeno: string;
  ovr: number;
  pozice: Pozice;
  preferovana_ruka: Ruka;
  narodnost: string;
  tym: string;
  liga: Liga;
  typ_karty: string;
  plat: number;
  ap: number | null;
  x_factors: XFactorZaznam[] | null;
  card_art_path: string | null;
  zdroj: "hutbuilder";
};

export type HutbuilderSelectMeta = {
  tymPodleAbbr: Map<string, { name: string; liga: string }>;
  tymPodleLogo: Map<string, { name: string; liga: string }>;
  ligaPodleLogo: Map<string, string>;
  narodnostPodleLogo: Map<string, string>;
  typKartyPodleLogo: Map<string, string>;
};

type SelectListItem = {
  id?: string | number;
  name?: string;
  abbr?: string;
  logo?: string;
  group?: string;
};

function basenameCesty(path: string): string {
  const t = path.trim().replace(/\\/g, "/");
  const i = t.lastIndexOf("/");
  return (i >= 0 ? t.slice(i + 1) : t).trim();
}

function logoKlic(path: string): string {
  return basenameCesty(path).toLowerCase();
}

async function fetchText(
  url: string,
  init?: RequestInit,
  timeoutMs = 45_000,
): Promise<string> {
  const signal =
    typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(timeoutMs)
      : undefined;
  const res = await fetch(url, {
    ...init,
    ...(signal ? { signal } : {}),
    cache: "no-store",
    redirect: "follow",
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Hut Builder HTTP ${res.status} (${url}): ${text.slice(0, 160)}`);
  }
  return text;
}

async function nactiSelectList(
  selectListUrl: string,
  referer: string,
  type: string,
): Promise<SelectListItem[]> {
  const url = `${selectListUrl}?type=${encodeURIComponent(type)}`;
  const text = await fetchText(url, {
    headers: {
      "User-Agent": UA,
      Referer: referer,
      Accept: "application/json",
    },
  });
  const raw = JSON.parse(text) as { status?: string; items?: unknown };
  if (!Array.isArray(raw.items)) return [];
  return raw.items.filter((x): x is SelectListItem => x != null && typeof x === "object");
}

export async function nactiHutbuilderSelectMeta(
  sezona: Sezona = SEZONA_VYCHOZI,
): Promise<HutbuilderSelectMeta> {
  const cfg = hutbuilderConfigProSezonu(sezona);
  const [teams, leagues, nats, cardTypes] = await Promise.all([
    nactiSelectList(cfg.selectListUrl, cfg.cardsPageUrl, "team"),
    nactiSelectList(cfg.selectListUrl, cfg.cardsPageUrl, "league"),
    nactiSelectList(cfg.selectListUrl, cfg.cardsPageUrl, "nationality"),
    nactiSelectList(cfg.selectListUrl, cfg.cardsPageUrl, "card_type"),
  ]);

  const tymPodleAbbr = new Map<string, { name: string; liga: string }>();
  const tymPodleLogo = new Map<string, { name: string; liga: string }>();
  for (const t of teams) {
    const name = String(t.name ?? "").trim();
    if (!name) continue;
    const liga = String(t.group ?? "NHL").trim() || "NHL";
    const info = { name, liga };
    const abbr = String(t.abbr ?? "").trim().toUpperCase();
    if (abbr) tymPodleAbbr.set(abbr, info);
    if (t.logo) tymPodleLogo.set(logoKlic(String(t.logo)), info);
  }

  const ligaPodleLogo = new Map<string, string>();
  for (const l of leagues) {
    const name = String(l.name ?? "").trim();
    if (!name || !l.logo) continue;
    ligaPodleLogo.set(logoKlic(String(l.logo)), name);
  }

  const narodnostPodleLogo = new Map<string, string>();
  for (const n of nats) {
    const name = String(n.name ?? "").trim();
    if (!name || !n.logo) continue;
    narodnostPodleLogo.set(logoKlic(String(n.logo)), name);
  }

  const typKartyPodleLogo = new Map<string, string>();
  for (const c of cardTypes) {
    const name = String(c.name ?? "").trim();
    if (!name || !c.logo) continue;
    typKartyPodleLogo.set(logoKlic(String(c.logo)), name);
  }

  return { tymPodleAbbr, tymPodleLogo, ligaPodleLogo, narodnostPodleLogo, typKartyPodleLogo };
}

export type HutbuilderCardListItem = {
  hbId: number;
  hbTyp: "player" | "goalie";
  jmeno: string;
};

/** Jedna stránka výsledků Cards search — HTML. */
export async function stahniFindCardsStranku(
  page: number,
  limit: number,
  sezona: Sezona = SEZONA_VYCHOZI,
): Promise<{ items: HutbuilderCardListItem[]; totalPages: number }> {
  const cfg = hutbuilderConfigProSezonu(sezona);
  const body = new URLSearchParams();
  body.set("limit", String(Math.min(100, Math.max(1, limit))));
  body.set("pageNumber", String(Math.max(1, page)));
  body.set("player_id", "");
  body.set("player_type", "");
  body.set("position", "");
  body.set("hand", "");
  body.set("abilities_match", "");
  body.set("sort", "ovr_desc");
  for (const name of ["card_type", "team", "league", "nationality", "xfactor"]) {
    body.set(`${name}_include`, "");
    body.set(`${name}_exclude`, "");
  }

  const html = await fetchText(
    cfg.findCardsUrl,
    {
      method: "POST",
      headers: {
        "User-Agent": UA,
        Referer: cfg.cardsPageUrl,
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Accept: "text/html,*/*",
      },
      body: body.toString(),
    },
    55_000,
  );

  const pages = [...html.matchAll(/data-card-page="(\d+)"/g)].map((m) => Number(m[1]));
  const totalPages = pages.length ? Math.max(...pages) : 1;

  const items: HutbuilderCardListItem[] = [];
  const seen = new Set<number>();
  const re =
    /id="(\d+)"\s+class="card-result__link[\s\S]*?alt="([^"]*)"[\s\S]*?data-player_type="(Player|Goalie)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const hbId = Number(m[1]);
    if (!Number.isFinite(hbId) || seen.has(hbId)) continue;
    seen.add(hbId);
    items.push({
      hbId,
      jmeno: m[2]!.trim(),
      hbTyp: m[3]!.toLowerCase() === "goalie" ? "goalie" : "player",
    });
  }

  // Fallback: articles without reliable xfactor block order
  if (items.length === 0) {
    const arts = html.split(/<article class="card-result">/).slice(1);
    for (const a of arts) {
      const idM = /id="(\d+)"/.exec(a);
      const nameM = /alt="([^"]*)"/.exec(a);
      const typM = /data-player_type="(Player|Goalie)"/i.exec(a);
      if (!idM) continue;
      const hbId = Number(idM[1]);
      if (!Number.isFinite(hbId) || seen.has(hbId)) continue;
      seen.add(hbId);
      items.push({
        hbId,
        jmeno: (nameM?.[1] ?? "").trim() || `Card ${hbId}`,
        hbTyp: typM?.[1]?.toLowerCase() === "goalie" ? "goalie" : "player",
      });
    }
  }

  return { items, totalPages: Math.max(1, totalPages) };
}

function bioValue(html: string, label: string): string | null {
  const re = new RegExp(
    `pcp-bio-tag__label">${label}</span>\\s*<span class="pcp-bio-tag__content">([\\s\\S]*?)</span>\\s*</div>`,
    "i",
  );
  const block = re.exec(html)?.[1];
  if (!block) return null;
  const value = /pcp-bio-tag__value">([^<]+)/i.exec(block)?.[1]?.trim();
  if (value) return value;
  const src = /src="([^"]+)"/i.exec(block)?.[1]?.trim();
  return src || null;
}

function mapPozice(raw: string, hbTyp: "player" | "goalie"): Pozice | null {
  const t = raw.trim().toUpperCase();
  if (hbTyp === "goalie" || t === "G" || t === "GOA" || t === "GOALIE") return "G";
  if (t === "C") return "C";
  if (t === "LW" || t === "LK") return "LK";
  if (t === "RW" || t === "PK" || t === "RK") return "PK";
  if (t === "LD" || t === "LO") return "LO";
  if (t === "RD" || t === "PO") return "PO";
  return null;
}

function mapRuka(raw: string): Ruka {
  const t = raw.trim().toUpperCase();
  if (t === "RIGHT" || t === "R" || t === "PR") return "PR";
  return "LR";
}

function mapLiga(raw: string): Liga {
  const t = raw.trim();
  if (LIGA_SET.has(t)) return t as Liga;
  const upper = t.toUpperCase();
  if (upper === "NHL") return "NHL";
  if (upper === "NHLAA" || upper.includes("ALUMNI")) return "NHLAA";
  if (upper === "PWHL") return "PWHL";
  // Hut Builder „EA Sports“ atd. — fallback NHL
  return "NHL";
}

function parsePlat(raw: string | null): number {
  if (!raw) return 0;
  const t = raw.trim().replace(/[$,\s]/g, "").toUpperCase();
  const m = /^([\d.]+)\s*([KMB])?$/.exec(t);
  if (!m) return 0;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return 0;
  const suf = m[2];
  if (suf === "K") return Math.round(n * 1_000);
  if (suf === "B") return Math.round(n * 1_000_000_000);
  // M nebo bez suffixu u HUT = miliony
  if (suf === "M" || !suf) return Math.round(n * 1_000_000);
  return Math.round(n);
}

function narodnostCsZHutbuilder(enName: string): string {
  const code = narodnostKodZHutbuilderJmena(enName);
  if (!code) return enName.trim();
  const label = vsechnyNarodnostiCS().find((v) => v.code === code)?.label;
  return label ?? enName.trim();
}

function parseXFactors(html: string): XFactorZaznam[] {
  const out: XFactorZaznam[] = [];
  const seen = new Set<string>();
  const re = /data-pcp-ability="(\d+)"[^>]*title="([^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null && out.length < 3) {
    const id = m[1]!;
    const label = m[2]!.trim();
    if (!label || seen.has(id)) continue;
    seen.add(id);
    out.push({ id: `hb-xf-${id}`, label });
  }
  return out;
}

export function parsujHutbuilderPopupHtml(
  html: string,
  list: HutbuilderCardListItem,
  meta: HutbuilderSelectMeta,
): HutbuilderKatalogRadka | null {
  const typAttr = /data-popup-card-type="(player|goalie)"/i.exec(html)?.[1]?.toLowerCase();
  const hbTyp: "player" | "goalie" =
    typAttr === "goalie" || list.hbTyp === "goalie" ? "goalie" : "player";

  const jmeno =
    /<h3>([^<]+)<\/h3>/i.exec(html)?.[1]?.trim() ||
    list.jmeno.trim() ||
    `Card ${list.hbId}`;

  const ovrRaw = /pcp-overall[\s\S]*?<strong>(\d{1,2})<\/strong>/i.exec(html)?.[1];
  const ovr = ovrRaw ? Number(ovrRaw) : NaN;
  if (!Number.isFinite(ovr) || ovr < 0 || ovr > 99) return null;

  const typKartyZTextu = /pcp-card-type-name">([^<]+)</i.exec(html)?.[1]?.trim();
  const typLogo = /pcp-card-type-icon[^>]+src="([^"]+)"/i.exec(html)?.[1];
  const typKarty =
    typKartyZTextu ||
    (typLogo ? meta.typKartyPodleLogo.get(logoKlic(typLogo)) : null) ||
    "Base";

  const teamLogo = bioValue(html, "Team");
  const teamInfo = teamLogo
    ? meta.tymPodleLogo.get(logoKlic(teamLogo)) ??
      meta.tymPodleAbbr.get(basenameCesty(teamLogo).replace(/\.[^.]+$/, "").toUpperCase())
    : undefined;
  const tym = teamInfo?.name ?? "Unknown";

  const leagueLogo = bioValue(html, "League");
  const ligaRaw =
    (leagueLogo ? meta.ligaPodleLogo.get(logoKlic(leagueLogo)) : null) ||
    teamInfo?.liga ||
    "NHL";
  const liga = mapLiga(ligaRaw);

  const natLogoOrText = bioValue(html, "Nationality");
  let narodnostEn = "";
  if (natLogoOrText?.includes("/") || natLogoOrText?.includes(".png")) {
    narodnostEn = meta.narodnostPodleLogo.get(logoKlic(natLogoOrText)) ?? "";
  } else {
    narodnostEn = natLogoOrText ?? "";
  }
  if (!narodnostEn && natLogoOrText) {
    narodnostEn = meta.narodnostPodleLogo.get(logoKlic(natLogoOrText)) ?? natLogoOrText;
  }
  const narodnost = narodnostCsZHutbuilder(narodnostEn || "Unknown");

  const poziceRaw = bioValue(html, "Position") ?? (hbTyp === "goalie" ? "G" : "");
  const pozice = mapPozice(poziceRaw.replace(/<[^>]+>/g, ""), hbTyp);
  if (!pozice) return null;

  const shoots = bioValue(html, "Shoots") ?? "LEFT";
  const preferovana_ruka = mapRuka(shoots.replace(/<[^>]+>/g, ""));
  const plat = parsePlat(bioValue(html, "Salary"));

  const art =
    /pcp-card-art"[^>]*src="([^"]+)"/i.exec(html)?.[1]?.trim() ||
    /card_art\/[^"]+/i.exec(html)?.[0] ||
    null;

  const xfs = parseXFactors(html);

  return {
    hb_id: list.hbId,
    hb_typ: hbTyp,
    jmeno,
    ovr,
    pozice,
    preferovana_ruka,
    narodnost,
    tym,
    liga,
    typ_karty: typKarty,
    plat,
    ap: null,
    x_factors: xfs.length ? xfs : null,
    card_art_path: art,
    zdroj: "hutbuilder",
  };
}

export async function stahniHutbuilderPopupKartu(
  list: HutbuilderCardListItem,
  meta: HutbuilderSelectMeta,
  sezona: Sezona = SEZONA_VYCHOZI,
): Promise<HutbuilderKatalogRadka | null> {
  const cfg = hutbuilderConfigProSezonu(sezona);
  const typ = list.hbTyp === "goalie" ? "Goalie" : "Player";
  const url = `${cfg.playerCardPopupUrl}?type=${encodeURIComponent(typ)}&id=${list.hbId}`;
  const html = await fetchText(
    url,
    {
      headers: {
        "User-Agent": UA,
        Referer: cfg.cardsPageUrl,
        Accept: "text/html,*/*",
      },
    },
    40_000,
  );
  return parsujHutbuilderPopupHtml(html, list, meta);
}

async function mapPool<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i;
      i += 1;
      out[idx] = await fn(items[idx]!);
    }
  }
  const n = Math.max(1, Math.min(concurrency, items.length || 1));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return out;
}

export async function upsertHutbuilderKatalogRadky(
  supabase: SupabaseClient,
  radky: readonly HutbuilderKatalogRadka[],
): Promise<{ error: Error | null }> {
  if (!radky.length) return { error: null };
  const payload = radky.map((r) => ({
    ...r,
    synced_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from("hutbuilder_katalog_karet").upsert(payload, {
    onConflict: "hb_id",
  });
  return { error: error ? new Error(error.message) : null };
}

/** Jedna stránka syncu: seznam → popup detaily → upsert. */
export async function synchronizujHutbuilderKatalogStranku(
  supabase: SupabaseClient,
  opts: {
    sezona: Sezona;
    page: number;
    limit?: number;
    concurrency?: number;
    meta?: HutbuilderSelectMeta;
  },
): Promise<{
  page: number;
  totalPages: number;
  naStrance: number;
  upserted: number;
  chyby: string[];
  meta: HutbuilderSelectMeta;
}> {
  const limit = opts.limit ?? 50;
  const concurrency = opts.concurrency ?? 6;
  const meta = opts.meta ?? (await nactiHutbuilderSelectMeta(opts.sezona));
  const { items, totalPages } = await stahniFindCardsStranku(opts.page, limit, opts.sezona);

  const chyby: string[] = [];
  const radky = await mapPool(items, concurrency, async (item) => {
    try {
      return await stahniHutbuilderPopupKartu(item, meta, opts.sezona);
    } catch (e) {
      chyby.push(
        `#${item.hbId} ${item.jmeno}: ${e instanceof Error ? e.message : String(e)}`,
      );
      return null;
    }
  });

  const ok = radky.filter((r): r is HutbuilderKatalogRadka => r != null);
  const { error } = await upsertHutbuilderKatalogRadky(supabase, ok);
  if (error) chyby.push(`DB upsert: ${error.message}`);

  return {
    page: opts.page,
    totalPages,
    naStrance: items.length,
    upserted: error ? 0 : ok.length,
    chyby: chyby.slice(0, 12),
    meta,
  };
}

export function hutbuilderKatalogRadkaNaHutCard(r: HutbuilderKatalogRadka): HutCard {
  return {
    id: `hb-katalog-${r.hb_id}`,
    jmeno: r.jmeno,
    ovr: r.ovr,
    pozice: r.pozice,
    preferovanaRuka: r.preferovana_ruka,
    narodnost: r.narodnost,
    tym: r.tym,
    liga: r.liga,
    typKarty: r.typ_karty,
    plat: Number(r.plat) || 0,
    ...(r.ap != null ? { ap: r.ap } : {}),
    ...(r.x_factors?.length ? { xFactory: r.x_factors } : {}),
    // Nikdy „inventář“ — explicitně ne prodano flag pro optimalizátor inventáře
  };
}

export async function nactiHutbuilderKatalogKaret(
  supabase: SupabaseClient,
): Promise<{ data: HutCard[]; error: Error | null; pocet: number }> {
  const { count, error: cErr } = await supabase
    .from("hutbuilder_katalog_karet")
    .select("hb_id", { count: "exact", head: true });
  if (cErr) return { data: [], error: new Error(cErr.message), pocet: 0 };

  const pageSize = 1000;
  const all: HutbuilderKatalogRadka[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("hutbuilder_katalog_karet")
      .select(
        "hb_id, hb_typ, jmeno, ovr, pozice, preferovana_ruka, narodnost, tym, liga, typ_karty, plat, ap, x_factors, card_art_path, zdroj",
      )
      .order("hb_id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) return { data: [], error: new Error(error.message), pocet: count ?? 0 };
    const rows = (data ?? []) as HutbuilderKatalogRadka[];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }

  return {
    data: all.map(hutbuilderKatalogRadkaNaHutCard),
    error: null,
    pocet: count ?? all.length,
  };
}

/** Karty z katalogu, které splní všechny AND požadavky profilu. */
export function filtrujKatalogPodleProfilu(
  katalog: readonly HutCard[],
  pozadavky: readonly import("@/lib/bonusKombinaceDb").BonusKombinaceParametr[],
  kartaSplnuje: (
    k: HutCard,
    p: import("@/lib/bonusKombinaceDb").BonusKombinaceParametr,
  ) => boolean,
  max = 6,
): HutCard[] {
  const out: HutCard[] = [];
  for (const k of katalog) {
    if (!pozadavky.every((p) => kartaSplnuje(k, p))) continue;
    out.push(k);
  }
  out.sort((a, b) => b.ovr - a.ovr || a.jmeno.localeCompare(b.jmeno, "cs"));
  return out.slice(0, max);
}
