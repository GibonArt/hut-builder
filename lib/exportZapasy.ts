import type { OdehranyZapas } from "@/lib/zapasyStorage";
import { seraditZapasyPodleData } from "@/lib/zapasyStorage";

export type FormatExportuZapasu = "radek" | "tsv";

export function formatujDatumCs(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d.padStart(2, "0")}.${m.padStart(2, "0")}.${y}`;
}

function escTsv(v: string): string {
  return v.replace(/\t/g, " ").replace(/\r?\n/g, " ");
}

export function formatujZapasyProExport(
  zapasy: readonly OdehranyZapas[],
  format: FormatExportuZapasu,
): string {
  const serazene = seraditZapasyPodleData(zapasy);
  if (serazene.length === 0) return "";

  if (format === "tsv") {
    const radky = ["datum\tsouper\tskore\tpoznamka"];
    for (const z of serazene) {
      radky.push(
        [
          formatujDatumCs(z.datum),
          escTsv(z.souper),
          escTsv(z.skore),
          escTsv(z.poznamka),
        ].join("\t"),
      );
    }
    return radky.join("\n");
  }

  return serazene
    .map((z) => {
      const casti = [formatujDatumCs(z.datum), z.skore];
      if (z.souper.trim()) casti.push(z.souper.trim());
      if (z.poznamka.trim()) casti.push(z.poznamka.trim());
      return casti.join(" | ");
    })
    .join("\n");
}

export function nazevSouboruExportuZapasu(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `hut-zapasy-${y}-${m}-${day}.txt`;
}

export function stahniTextovySoubor(obsah: string, nazevSouboru: string): void {
  const blob = new Blob([obsah], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nazevSouboru;
  a.click();
  URL.revokeObjectURL(url);
}

export async function kopirujTextDoSchranky(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}
