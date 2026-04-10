import type { XFactorUroven } from "@/types";

/** Z `type.label` u položky `playerAbilities` v EA ratings JSON (např. Elite, Superstar). */
export function xfUrovenZEaTypeLabel(typeLabel: string | undefined): XFactorUroven {
  const t = (typeLabel ?? "").toLowerCase();
  if (t.includes("silver") || t.includes("all-star") || t.includes("all star"))
    return "silver";
  if (
    t.includes("bronze") ||
    t.includes("specialist") ||
    t.includes("t2") ||
    t.includes("tier 2")
  )
    return "bronze";
  if (
    t.includes("gold") ||
    t.includes("elite") ||
    t.includes("superstar") ||
    t.includes("t3") ||
    t.includes("tier 3")
  )
    return "gold";
  return "gold";
}
