"use client";

import { useEffect, useState } from "react";
import { HutShell, type HutSection } from "@/components/HutShell";
import {
  HUT_PENDING_HOME_SECTION_KEY,
  type HutPendingHomeSection,
} from "@/lib/hutHomeSectionPending";
import { MujInventar } from "@/components/MujInventar";
import { OptimalizatorFormaci } from "@/components/OptimalizatorFormaci";
import { HUT_FORM_PAGE_BG } from "@/lib/hutFormBackground";

const NAV = [
  { id: "inventar" as const, label: "Můj Inventář", hint: "Správa karet a hráčů" },
  { id: "optimalizator" as const, label: "Optimalizátor formací", hint: "Sestavení lajn" },
];

type Section = (typeof NAV)[number]["id"];

function SectionPanel({ section }: { section: Section }) {
  if (section === "inventar") {
    return <MujInventar />;
  }
  if (section === "optimalizator") {
    return <OptimalizatorFormaci />;
  }
  return null;
}

function jePlatnaPendingSekce(s: string | null): s is HutPendingHomeSection {
  return s === "inventar" || s === "optimalizator";
}

export function AppShell() {
  const [active, setActive] = useState<Section>("inventar");

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(HUT_PENDING_HOME_SECTION_KEY);
      if (jePlatnaPendingSekce(raw)) {
        setActive(raw);
        sessionStorage.removeItem(HUT_PENDING_HOME_SECTION_KEY);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const headerLabel =
    active === "inventar"
      ? NAV[0].label
      : NAV.find((n) => n.id === active)?.label ?? NAV[0].label;

  return (
    <HutShell
      headerSectionLabel={headerLabel}
      mainStyle={
        active === "inventar" || active === "optimalizator" ? HUT_FORM_PAGE_BG : undefined
      }
      mainInnerClassName={
        active === "inventar"
          ? "relative z-0 mx-auto max-w-5xl"
          : active === "optimalizator"
            ? "relative z-0 mx-auto max-w-6xl"
            : "mx-auto max-w-3xl"
      }
      homeActiveSection={active as HutSection}
      onHomeSectionChange={(s) => setActive(s as Section)}
    >
      <SectionPanel section={active} />
    </HutShell>
  );
}
