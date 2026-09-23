/** Git SHA / build id vložený při `next build` (Docker ARG nebo next.config). */
export const APP_GIT_SHA =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_GIT_SHA?.trim()) ||
  "dev";

export const APP_BUILT_AT =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_BUILT_AT?.trim()) ||
  "";
