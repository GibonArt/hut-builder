"use client";

import { useEffect, useState } from "react";
import { iniciályTymu } from "@/lib/tymLoga";

/**
 * Logo ve fixním čtverci formuláře (výběr týmu, hledání) — celé SVG se vejde
 * (`object-contain`), proporce zůstávají, max. rozměr = `size`.
 */
export function TymLogoOblast({
  size,
  url,
  nazevTymu,
}: {
  size: number;
  url: string | null;
  nazevTymu: string;
}) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-md min-h-0 min-w-0"
      style={{
        width: size,
        height: size,
        maxWidth: size,
        maxHeight: size,
      }}
    >
      <TymLogo
        url={url}
        nazevTymu={nazevTymu}
        size={size}
        vmistitDoCtverce
      />
    </span>
  );
}

type Props = {
  url: string | null;
  nazevTymu: string;
  size?: number;
  /**
   * Vyplní rodiče s pevnou výškou/šířkou (např. řádek kombinací bonusů).
   * Uvnitř `object-contain` + volitelně `className` s `p-1.5` apod.
   */
  fill?: boolean;
  /**
   * Rodič má fixní stranu `size` (např. `TymLogoOblast`) — obrázek se do čtverce vejde celý,
   * bez ořezu, se zachováním proporcí (vhodné pro široké SVG jako PWHL).
   */
  vmistitDoCtverce?: boolean;
  className?: string;
};

export function TymLogo({
  url,
  nazevTymu,
  size = 28,
  fill = false,
  vmistitDoCtverce = false,
  className = "",
}: Props) {
  const [broken, setBroken] = useState(false);
  const init = iniciályTymu(nazevTymu);

  useEffect(() => {
    setBroken(false);
  }, [url]);

  if (fill) {
    if (!url || broken) {
      return (
        <div
          className={`flex h-full w-full min-h-0 min-w-0 items-center justify-center rounded-md bg-zinc-700 text-[10px] font-bold leading-none text-zinc-200 ring-1 ring-inset ring-white/10 ${className}`}
          aria-hidden
        >
          {init}
        </div>
      );
    }
    return (
      <img
        src={url}
        alt=""
        className={`block h-full w-full min-h-0 min-w-0 object-contain ${className}`}
        loading="lazy"
        decoding="async"
        onError={() => setBroken(true)}
      />
    );
  }

  if (vmistitDoCtverce) {
    if (!url || broken) {
      return (
        <div
          className={`flex h-full w-full min-h-0 min-w-0 items-center justify-center rounded-md bg-zinc-700 text-[10px] font-bold leading-none text-zinc-200 ring-1 ring-inset ring-white/10 ${className}`}
          aria-hidden
        >
          {init}
        </div>
      );
    }
    return (
      <img
        src={url}
        alt=""
        className={`block h-full w-full max-h-full max-w-full min-h-0 min-w-0 object-contain ${className}`}
        loading="lazy"
        decoding="async"
        onError={() => setBroken(true)}
      />
    );
  }

  if (!url || broken) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-md bg-zinc-700 text-[10px] font-bold leading-none text-zinc-200 ring-1 ring-white/10 ${className}`}
        style={{ width: size, height: size }}
        aria-hidden
      >
        {init}
      </div>
    );
  }

  return (
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      className={`shrink-0 object-contain ${className}`}
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
    />
  );
}
