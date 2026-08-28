import type { XFactorUroven, XFactorZaznam } from "@/types";
import { xfUrovenZEaTypeLabel } from "@/lib/xfUroven";

const UROVNE = new Set<string>(["gold", "silver", "bronze"]);

function xfUrovenZObjektu(o: Record<string, unknown>): XFactorUroven | undefined {
  const raw = o.xfUroven;
  if (typeof raw !== "string") return undefined;
  return UROVNE.has(raw) ? (raw as XFactorUroven) : undefined;
}

function typZAbility(o: Record<string, unknown>): {
  typeLabel?: string;
  typeIconUrl?: string;
} {
  const typ = o.type;
  if (!typ || typeof typ !== "object" || Array.isArray(typ)) return {};
  const t = typ as Record<string, unknown>;
  return {
    typeLabel: typeof t.label === "string" ? t.label : undefined,
    typeIconUrl: typeof t.iconUrl === "string" ? t.iconUrl : undefined,
  };
}

/** Z pole `playerAbilities` z EA ratings JSON (max 3 jako ve hře). */
export function normalizujEaXFactoryZApi(playerAbilities: unknown): XFactorZaznam[] {
  if (!Array.isArray(playerAbilities)) return [];
  const out: XFactorZaznam[] = [];
  for (const raw of playerAbilities) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    const label = typeof o.label === "string" ? o.label.trim() : "";
    if (!label) continue;
    const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : label;
    const imageUrl = typeof o.imageUrl === "string" ? o.imageUrl : undefined;
    const { typeLabel, typeIconUrl } = typZAbility(o);
    const xfUroven: XFactorUroven = xfUrovenZEaTypeLabel(typeLabel);
    out.push({ id, label, imageUrl, typeLabel, typeIconUrl, xfUroven });
    if (out.length >= 3) break;
  }
  return out;
}

/** Z `jsonb` v `ea_hraci_napoveda` nebo z `cards.atributy.xFactory`. */
export function normalizujEaXFactoryZDb(raw: unknown): XFactorZaznam[] | undefined {
  if (raw == null) return undefined;
  if (!Array.isArray(raw)) return undefined;
  const out: XFactorZaznam[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const label = typeof o.label === "string" ? o.label.trim() : "";
    if (!label) continue;
    const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : label;
    const imageUrl = typeof o.imageUrl === "string" ? o.imageUrl : undefined;
    const { typeLabel, typeIconUrl } = typZAbility(o);
    const xfUroven =
      xfUrovenZObjektu(o) ?? xfUrovenZEaTypeLabel(typeLabel);
    out.push({ id, label, imageUrl, typeLabel, typeIconUrl, xfUroven });
    if (out.length >= 3) break;
  }
  return out.length ? out : undefined;
}
