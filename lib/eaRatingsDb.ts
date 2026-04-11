import type { SupabaseClient } from "@supabase/supabase-js";
import type { Liga, Ruka } from "@/types";
import { LIGY_V_PORADI } from "@/lib/tymyPodleLigy";
import type { EaNhl26Hrac } from "@/lib/eaNhl26Ratings";
import { xFactoryZAtributyJsonbSloupec } from "@/lib/cardsDb";
import { normalizujEaXFactoryZDb } from "@/lib/eaXFactors";
import { obnovIkonyXeFactoryZKatalogu } from "@/lib/xFactoryKatalog";

import { normalizujPozici } from "@/lib/hutPozice";
const LIGA_SET = new Set<Liga>(LIGY_V_PORADI);

type EaNapovedaRow = {
  ea_player_id: number;
  jmeno: string;
  team_label: string | null;
  position_short: string | null;
  ea_rank: number;
  x_factors?: unknown;
  updated_at?: string | null;
};

type RpcNapovedaRow = {
  jmeno: string;
  tym: string;
  pozice: string;
  liga: string;
  posledni_uprava: string;
  preferovana_ruka: string | null;
  ovr?: number | null;
  plat?: number | string | null;
  narodnost?: string | null;
  typ_karty?: string | null;
  atributy?: unknown | null;
};

function rukaZRadekRpc(s: string | null | undefined): Ruka | undefined {
  if (s === "LR" || s === "PR") return s;
  return undefined;
}

function normKlicJmenoTym(jmeno: string, tym: string): string {
  return `${jmeno.trim().toLowerCase()}|${tym.trim().toLowerCase()}`;
}

function klicProKartuVsechny(jmeno: string, tym: string): string {
  return `card-glob-${normKlicJmenoTym(jmeno, tym).replace(/\|/g, "--")}`;
}

function rowNaEaHrace(r: EaNapovedaRow): EaNhl26Hrac {
  const eaXFactory = normalizujEaXFactoryZDb(r.x_factors);
  return {
    key: `ea-${r.ea_player_id}`,
    source: "ea",
    id: r.ea_player_id,
    jmeno: r.jmeno.trim(),
    tym: r.team_label ?? "",
    positionShort: r.position_short ?? "",
    rank: r.ea_rank,
    ...(eaXFactory?.length ? { eaXFactory } : {}),
  };
}

function rpcNaNapovedu(r: RpcNapovedaRow, rank: number): EaNhl26Hrac | null {
  const hutPozice = normalizujPozici(r.pozice);
  if (!hutPozice) return null;
  if (!LIGA_SET.has(r.liga as Liga)) return null;
  const hutPreferovanaRuka = rukaZRadekRpc(r.preferovana_ruka);

  const ovrNum = Number(r.ovr);
  const napovedaOvr =
    r.ovr != null && Number.isFinite(ovrNum) ? Math.round(ovrNum) : undefined;

  let napovedaPlat: number | undefined;
  if (r.plat != null && r.plat !== "") {
    const p = typeof r.plat === "number" ? r.plat : Number.parseFloat(String(r.plat));
    if (Number.isFinite(p)) napovedaPlat = p;
  }

  const nar = String(r.narodnost ?? "").trim();
  const napovedaNarodnost = nar ? nar : undefined;

  const typ = String(r.typ_karty ?? "").trim();
  const napovedaTypKarty = typ ? typ : undefined;

  const rawXf = xFactoryZAtributyJsonbSloupec(r.atributy);
  const napovedaXFactory =
    rawXf?.length && rawXf.some((x) => x.label.trim())
      ? obnovIkonyXeFactoryZKatalogu(rawXf)
      : undefined;

  return {
    key: klicProKartuVsechny(r.jmeno, r.tym),
    source: "card",
    id: 0,
    jmeno: r.jmeno.trim(),
    tym: r.tym.trim(),
    positionShort: "",
    rank,
    hutPozice,
    hutLiga: r.liga as Liga,
    ...(hutPreferovanaRuka ? { hutPreferovanaRuka } : {}),
    ...(napovedaOvr != null ? { napovedaOvr } : {}),
    ...(napovedaPlat != null ? { napovedaPlat } : {}),
    ...(napovedaNarodnost ? { napovedaNarodnost } : {}),
    ...(napovedaTypKarty ? { napovedaTypKarty } : {}),
    ...(napovedaXFactory?.length ? { napovedaXFactory } : {}),
  };
}

/**
 * EA (`ea_hraci_napoveda`) + unikátní jména ze všech `cards` přes RPC `napoveda_jmena_z_cards`.
 * Stejné jméno+tým jako v EA se z karet neopakuje.
 */
export async function nactiNapoveduHracu(
  supabase: SupabaseClient,
  options: { nacistAgregaciZeVsechKaret: boolean },
): Promise<{
  data: EaNhl26Hrac[];
  syncedAt: string | null;
  error: Error | null;
}> {
  const { data: eaData, error: eaErr } = await supabase
    .from("ea_hraci_napoveda")
    .select("ea_player_id, jmeno, team_label, position_short, ea_rank, x_factors, updated_at")
    .order("ea_rank", { ascending: true });

  let syncedAt: string | null = null;
  const eaHraci: EaNhl26Hrac[] = [];

  const zKaretKomunity: EaNhl26Hrac[] = [];
  let rpcErr: { message: string } | null = null;
  let rpcRows: RpcNapovedaRow[] | null = null;

  if (options.nacistAgregaciZeVsechKaret) {
    const { data: rpcData, error: rErr } = await supabase.rpc("napoveda_jmena_z_cards");
    rpcErr = rErr;
    if (!rErr && rpcData?.length) {
      rpcRows = rpcData as RpcNapovedaRow[];
      for (const row of rpcRows) {
        const u = row.posledni_uprava;
        if (u && (!syncedAt || u > syncedAt)) syncedAt = u;
      }
    }
  }

  if (!eaErr && eaData) {
    for (const r of eaData as EaNapovedaRow[]) {
      eaHraci.push(rowNaEaHrace(r));
      const u = r.updated_at;
      if (u && (!syncedAt || u > syncedAt)) syncedAt = u;
    }
  }

  const eaKlice = new Set<string>();
  for (const h of eaHraci) {
    eaKlice.add(normKlicJmenoTym(h.jmeno, h.tym));
  }

  if (options.nacistAgregaciZeVsechKaret && rpcRows) {
    const filtrovane = rpcRows.filter(
      (row) => !eaKlice.has(normKlicJmenoTym(row.jmeno, row.tym)),
    );
    filtrovane.sort((a, b) => {
      const j = a.jmeno.localeCompare(b.jmeno, "cs");
      if (j !== 0) return j;
      return a.tym.localeCompare(b.tym, "cs");
    });

    let rank = 1_000_000;
    for (const row of filtrovane) {
      const h = rpcNaNapovedu(row, rank);
      if (h) {
        zKaretKomunity.push(h);
        rank += 1;
      }
    }
  }

  const data = [...eaHraci, ...zKaretKomunity];

  let error: Error | null = null;
  if (data.length === 0) {
    if (eaErr) error = new Error(eaErr.message);
    else if (options.nacistAgregaciZeVsechKaret && rpcErr)
      error = new Error(rpcErr.message);
  }

  return { data, syncedAt, error };
}

export async function nactiEaRatingsZeSupabase(
  supabase: SupabaseClient,
): Promise<{
  data: EaNhl26Hrac[];
  syncedAt: string | null;
  error: Error | null;
}> {
  return nactiNapoveduHracu(supabase, { nacistAgregaciZeVsechKaret: false });
}
