import type { CSSProperties } from "react";

const bgCoverFixed: Pick<
  CSSProperties,
  "backgroundRepeat" | "backgroundSize" | "backgroundPosition" | "backgroundAttachment"
> = {
  backgroundRepeat: "no-repeat",
  backgroundSize: "cover",
  backgroundPosition: "center center",
  backgroundAttachment: "fixed",
};

/** Pozadí formuláře (Můj inventář, login, registrace) — NHL 26 Base Theme. */
export const HUT_FORM_PAGE_BG: CSSProperties = {
  ...bgCoverFixed,
  backgroundPosition: "center top",
  backgroundImage:
    "linear-gradient(to bottom, rgba(0,0,0,0.22), rgba(0,0,0,0.48)), url(/images/NHL26_BaseTheme_BG-16x9.png)",
};
