"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { NajdiMetaTypuKartyOpts } from "@/lib/hutdbTypKaret";

const TypKartyMetaOptsContext = createContext<NajdiMetaTypuKartyOpts | null>(null);

export function TypKartyMetaOptsProvider({
  value,
  children,
}: {
  value: NajdiMetaTypuKartyOpts | null;
  children: ReactNode;
}) {
  return (
    <TypKartyMetaOptsContext.Provider value={value}>{children}</TypKartyMetaOptsContext.Provider>
  );
}

export function useTypKartyMetaOpts(): NajdiMetaTypuKartyOpts | null {
  return useContext(TypKartyMetaOptsContext);
}
