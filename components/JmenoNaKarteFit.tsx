"use client";

import { useLayoutEffect, useRef, useState } from "react";

type Props = {
  text: string;
  /** Výchozí / max. velikost v px (odpovídá cca `text-lg`). */
  maxPx?: number;
  /** Minimální velikost; pak případně „…“. */
  minPx?: number;
  className?: string;
};

/**
 * Jednořádkové jméno: zmenšuje font pod skutečnou šířku sloupce vedle OVR.
 * `truncate` zkresluje scrollWidth v některých prohlížečích — při měření používáme clip.
 */
export function JmenoNaKarteFit({
  text,
  maxPx = 18,
  minPx = 8,
  className = "",
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [fontPx, setFontPx] = useState(maxPx);
  const [potrebaEllipsis, setPotrebaEllipsis] = useState(false);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const span = measureRef.current;
    if (!wrap || !span) return;

    const fit = () => {
      const available = wrap.clientWidth;
      if (available <= 0) return;

      // Ellipsis zkresluje scrollWidth — při hledání velikosti měříme jako oříznutí
      span.style.textOverflow = "clip";

      span.style.fontSize = `${maxPx}px`;
      if (span.scrollWidth <= available) {
        setFontPx(maxPx);
        setPotrebaEllipsis(false);
        return;
      }

      let lo = minPx;
      let hi = maxPx;
      let best = minPx;
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        span.style.fontSize = `${mid}px`;
        if (span.scrollWidth <= available) {
          best = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }

      span.style.fontSize = `${best}px`;
      const stale = span.scrollWidth > available;
      setFontPx(best);
      setPotrebaEllipsis(stale);
    };

    const run = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(fit);
      });
    };
    run();
    const ro = new ResizeObserver(() => run());
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [text, minPx, maxPx]);

  return (
    <div
      ref={wrapRef}
      className="min-w-0 w-full max-w-full shrink overflow-hidden"
    >
      <span
        ref={measureRef}
        className={`block min-w-0 w-full overflow-hidden whitespace-nowrap font-semibold leading-snug text-white ${className}`}
        style={{
          fontSize: `${fontPx}px`,
          textOverflow: potrebaEllipsis ? "ellipsis" : "clip",
        }}
        title={text.trim() || undefined}
      >
        {text}
      </span>
    </div>
  );
}
