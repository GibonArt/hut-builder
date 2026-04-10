import type { ReactNode } from "react";
import { HUT_FORM_PAGE_BG } from "@/lib/hutFormBackground";

/** Stejné pozadí jako u formuláře pro zadávání karet (`HUT_FORM_PAGE_BG`). */
export function AuthPageShell({
  children,
  contentAlign = "center",
}: {
  children: ReactNode;
  /** `start` = obsah odshora (`pt-6` jako `gap-6` u loginu), bez velké mezery pod viewport. */
  contentAlign?: "center" | "start";
}) {
  const inner =
    contentAlign === "start"
      ? "relative z-10 flex min-h-svh flex-col items-center justify-start px-4 pb-12 pt-6"
      : "relative z-10 flex min-h-svh flex-col items-center justify-center px-4 py-12";
  return (
    <div className="relative min-h-svh w-full overflow-hidden">
      <div aria-hidden className="absolute inset-0" style={HUT_FORM_PAGE_BG} />
      <div className={inner}>{children}</div>
    </div>
  );
}

/** Panel jako u formuláře „Přidat kartu“ v `MujInventar`. */
export const authFormPanelClass =
  "w-full max-w-md rounded-2xl border border-[var(--hut-border)] bg-[var(--hut-surface)]/52 p-6 shadow-[0_24px_48px_rgba(0,0,0,0.45)] md:p-8";

export const authInputClass =
  "w-full rounded-lg border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)] px-3 py-2 text-sm text-white placeholder:text-[var(--hut-muted)]/50 outline-none transition-[border-color,box-shadow] focus:border-[var(--hut-focus)]/70 focus:ring-2 focus:ring-[var(--hut-focus-ring)]";

export const authLabelClass =
  "mb-1.5 block text-xs font-medium text-[var(--hut-muted)]";

export const authPrimaryButtonClass =
  "w-full rounded-full border border-zinc-600 bg-[var(--hut-btn)] py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:border-zinc-500 hover:bg-[var(--hut-btn-hover)] disabled:cursor-not-allowed disabled:opacity-45";

export const authLinkClass =
  "font-medium text-[var(--hut-lime)] underline underline-offset-2 decoration-[var(--hut-lime)]/35 transition-colors hover:text-[var(--hut-lime-dim)]";

export const authMutedLinkClass =
  "text-sm text-[var(--hut-muted)] transition-colors hover:text-white";
