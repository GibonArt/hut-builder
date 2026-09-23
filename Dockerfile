# syntax=docker/dockerfile:1
# Next.js (App Router) + Tailwind v4 — build zahrnuje zkompilované CSS (PostCSS).
# Veřejné proměnné Supabase musí být k dispozici při `npm run build` (vkládají se do klienta).

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# --- Závislosti ---
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# --- Build (Tailwind / PostCSS běží uvnitř `next build`) ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# NEXT_PUBLIC_* — musí být nastavené při buildu (viz docker-compose build args / --build-arg).
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_SUPABASE_NHL27_URL
ARG NEXT_PUBLIC_SUPABASE_NHL27_ANON_KEY
ARG NEXT_PUBLIC_SUPABASE_NHL27_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ARG NEXT_PUBLIC_APP_GIT_SHA=
ARG NEXT_PUBLIC_APP_BUILT_AT=
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_SUPABASE_NHL27_URL=$NEXT_PUBLIC_SUPABASE_NHL27_URL
ENV NEXT_PUBLIC_SUPABASE_NHL27_ANON_KEY=$NEXT_PUBLIC_SUPABASE_NHL27_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_NHL27_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_NHL27_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY

# SHA i při holém `sudo docker compose build` (sudo maže env):
# build-arg → .build-git-sha → .git/HEAD (v kontextu) → unknown
RUN SHA="${NEXT_PUBLIC_APP_GIT_SHA}"; \
  if [ -z "$SHA" ] || [ "$SHA" = "unknown" ]; then \
    if [ -f .build-git-sha ]; then SHA="$(tr -d '[:space:]' < .build-git-sha)"; fi; \
  fi; \
  if [ -z "$SHA" ] || [ "$SHA" = "unknown" ]; then \
    if [ -f .git/HEAD ]; then \
      _ref="$(tr -d '[:space:]' < .git/HEAD)"; \
      case "$_ref" in \
        ref:*) \
          _path=".git/${_ref#ref:}"; \
          if [ -f "$_path" ]; then SHA="$(tr -d '[:space:]' < "$_path" | cut -c1-7)"; \
          elif [ -f .git/packed-refs ]; then \
            SHA="$(awk -v r="${_ref#ref:}" 'index($0," " r)>0 { print substr($1,1,7); exit }' .git/packed-refs)"; \
          fi ;; \
        *) SHA="$(printf '%s' "$_ref" | cut -c1-7)" ;; \
      esac; \
    fi; \
  fi; \
  BUILT="${NEXT_PUBLIC_APP_BUILT_AT}"; \
  if [ -z "$BUILT" ]; then BUILT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"; fi; \
  echo "→ next build SHA=${SHA:-unknown} ($BUILT)" >&2; \
  NEXT_PUBLIC_APP_GIT_SHA="${SHA:-unknown}" \
  NEXT_PUBLIC_APP_BUILT_AT="$BUILT" \
  npm run build

# --- Runtime (jen standalone výstup) ---
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Standalone: server.js + minimal node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
