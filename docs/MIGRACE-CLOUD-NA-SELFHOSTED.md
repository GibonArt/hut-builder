# Migrace HUT Builder: supabase.com → self-hosted Supabase (Synology)

Přechod z **cloud Supabase** na lokální Docker stack **`/volume1/docker/supabase-project`** — stejný jako u projektu **hut-turnaj**. Oba projekty sdílí jednu Postgres DB; HUT přidává vlastní tabulky (`cards`, `bonus_kombinace_global`, …).

**Storage:** HUT neukládá soubory do Supabase Storage (loga jsou v `public/logos/` v repu). Migrace Storage není potřeba.

---

## Přehled kroků

| # | Co | Kde |
|---|-----|-----|
| 0 | Self-hosted Supabase běží | NAS — už máš z hut-turnaj |
| 1 | Schéma HUT Builder (tabulky, RLS, RPC) | `migrate-selfhosted.sh` |
| 2 | Data z cloudu | `pg_dump` z supabase.com |
| 3 | Import dat | `import-hut-data-selfhosted.sh` |
| 4 | Auth (volitelně) | jen pokud HUT cloud měl jiné uživatele než NAS |
| 5 | `.env` hut-builder | přepnout URL a klíče na lokální Supabase |
| 6 | Auth redirect URL | `supabase-project/.env` |

---

## Předpoklady

- Na NAS běží **supabase-project** (viz [hut-turnaj/docs/MIGRACE-CLOUD-NA-SELFHOSTED.md](https://github.com/GibonArt/hut-turnaj/blob/main/docs/MIGRACE-CLOUD-NA-SELFHOSTED.md)).
- Repo **hut-builder** je v `/volume1/docker/hut-builder`.
- Máš **Direct connection** URI z cloud projektu HUT (Dashboard → **Database** → Connection string → **Direct**).

> **Důležité:** Nepoužívej `migrate-selfhosted.sh --reset` z hut-turnaj — ten maže tabulky turnaje. Pro HUT použij skript z tohoto repa.

---

## 1. Schéma HUT Builder na NAS

```bash
ssh tvuj-uzivatel@IP-nas
cd /volume1/docker/hut-builder
git pull

chmod +x supabase/scripts/*.sh

# Jen vytvoří/aktualizuje HUT tabulky (hut-turnaj nechá na pokoji):
./supabase/scripts/migrate-selfhosted.sh /volume1/docker/supabase-project
```

Ověř ve Studiu (`http://IP-nas:8000` nebo tvá doména) → **Table Editor** → tabulka `cards` existuje.

Čistý restart **jen HUT** dat (smaže karty a bonusy, ne ligy turnaje):

```bash
./supabase/scripts/migrate-selfhosted.sh --reset /volume1/docker/supabase-project
```

---

## 2. Export dat z supabase.com

### Connection string

| Typ | Pro pg_dump? |
|-----|----------------|
| **Direct** (`db.[REF].supabase.co:5432`) | **Ano** |
| Session pooler | raději ne |
| Transaction pooler (6543) | **ne** |

### Export na NAS (doporučeno)

```bash
cd /volume1/docker/hut-builder
mkdir -p export

# Heslo z Dashboard → Database (ne API klíč!)
export CLOUD_URI='postgresql://postgres.[REF]:[HESLO]@db.[REF].supabase.co:5432/postgres'

./supabase/scripts/export-cloud-data.sh
```

Výstup: `export/hut-builder-public-data.sql`

Volitelně i auth (stejné přihlašovací účty jako na cloudu):

```bash
export CLOUD_URI='...'
export EXPORT_AUTH=1
./supabase/scripts/export-cloud-data.sh
```

### Ruční pg_dump (stejný obsah)

```bash
cd /volume1/docker/hut-builder/export

docker run --rm -v "$PWD:/out" postgres:17 \
  pg_dump "$CLOUD_URI" \
  --schema=public \
  --data-only \
  --no-owner \
  --table=public.cards \
  --table=public.ea_hraci_napoveda \
  --table=public.bonus_kombinace_global \
  --table=public.bonus_kombinace_nastaveni \
  --table=public.hut_typy_karet_dynamic \
  -f /out/hut-builder-public-data.sql
```

### Úprava pro PG 15 (self-hosted)

Cloud běží na PG 17, NAS Supabase na PG 15:

```bash
./supabase/scripts/fix-pg17-dump-for-pg15.sh export/hut-builder-public-data.sql
# → export/hut-builder-public-data-pg15.sql
```

---

## 3. Import dat do lokální DB

```bash
cd /volume1/docker/hut-builder

./supabase/scripts/import-hut-data-selfhosted.sh \
  export/hut-builder-public-data-pg15.sql \
  /volume1/docker/supabase-project
```

Kontrola:

```bash
cd /volume1/docker/supabase-project
docker compose exec db psql -U postgres -d postgres -c "SELECT count(*) FROM public.cards;"
docker compose exec db psql -U postgres -d postgres -c "SELECT count(*) FROM public.bonus_kombinace_global;"
```

---

## 4. Auth — sdílený supabase s hut-turnaj

Tabulka `cards` má `user_id` → `auth.users`. Možnosti:

| Situace | Postup |
|---------|--------|
| Stejní uživatelé už jsou na NAS (z migrace hut-turnaj) a **stejné UUID** jako v HUT cloudu | Stačí import public dat (krok 3) |
| HUT cloud měl **vlastní** uživatele (jiný Supabase projekt) | Export auth (`EXPORT_AUTH=1`) a import — pozor na konflikty e-mailů |
| Uživatel existuje na NAS i v HUT exportu se **stejným e-mailem** | `auth.users` se nepřepíše; karty musí mít `user_id` odpovídající NAS UUID — může vyžadovat UPDATE `cards.user_id` |

Import auth z hut-turnaj skriptů (pokud potřebuješ sloučit účty z HUT cloudu):

```bash
# Z hut-turnaj repa na NAS:
/volume1/docker/hut-turnaj/supabase/scripts/import-auth-data-selfhosted.sh \
  /volume1/docker/hut-builder/export/hut-builder-auth-data-pg15.sql \
  /volume1/docker/supabase-project
```

**Varování:** import auth **smaže** stávající lokální uživatele (včetně hut-turnaj profilů). Používej jen při čisté instalaci nebo záloze.

---

## 5. Přepnout hut-builder na lokální Supabase

Soubor `/volume1/docker/hut-builder/.env`:

```env
# Prohlížeč — veřejná URL (reverse proxy)
NEXT_PUBLIC_SUPABASE_URL=https://supabase.kc36gaming.gibonart.cz

# Klíče z /volume1/docker/supabase-project/.env
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>

# Volitelně jiný port než hut-turnaj
HUT_PORT=3000
```

V **`/volume1/docker/supabase-project/.env`** přidej redirect pro HUT:

```env
ADDITIONAL_REDIRECT_URLS=...,https://hut.gibonart.cz/auth/callback,https://hut.gibonart.cz/**
```

Pak:

```bash
cd /volume1/docker/supabase-project && docker compose up -d --force-recreate
cd /volume1/docker/hut-builder && docker compose build && docker compose up -d
```

### Rychlejší server → Supabase (volitelné, jako u hut-turnaj)

Pokud kontejner `hut` nevidí veřejnou doménu Supabase, přidej do `docker-compose.yml` síť `supabase_default` a `extra_hosts` — viz hut-turnaj `DEPLOY-SYNOLOGY.md` §6.

---

## 6. Kontrolní seznam

- [ ] `migrate-selfhosted.sh` proběhlo bez ERROR
- [ ] `cards` + `bonus_kombinace_global` mají data z cloudu
- [ ] `.env` ukazuje na lokální Supabase (ANON + service role z `supabase-project`)
- [ ] Přihlášení na `https://hut.gibonart.cz` funguje
- [ ] Uživatel vidí své karty v inventáři
- [ ] Admin: sync typů karet / kombinace (service role v `.env`)

---

## Pořadí pro tebe teď

1. Ověř, že **supabase-project** na NAS běží (`docker compose ps` v `/volume1/docker/supabase-project`).
2. `git pull` v hut-builder + `./supabase/scripts/migrate-selfhosted.sh …`
3. Export z cloudu (`export-cloud-data.sh` + `fix-pg17-dump-for-pg15.sh`)
4. Import (`import-hut-data-selfhosted.sh`)
5. Přepni `.env` + rebuild hut-builder
6. Otestuj přihlášení a inventář

---

## Řešení problémů

| Problém | Řešení |
|---------|--------|
| `pg_dump: connection refused` | Použij **Direct** URI, ne pooler |
| Import: `duplicate key` | Nejdřív `truncate-hut-public-data.sql` (import skript to dělá sám) |
| Karty prázdné po přihlášení | `user_id` v `cards` neodpovídá `auth.users` na NAS — srovnej UUID nebo importuj auth |
| `new row violates row-level security` | V `.env` musí být `SUPABASE_SERVICE_ROLE_KEY` pro import skripty |
| PG 17 dump na PG 15 | Vždy `fix-pg17-dump-for-pg15.sh` |

Související: hut-turnaj migrace, Storage opravy — `/volume1/docker/hut-turnaj/docs/MIGRACE-CLOUD-NA-SELFHOSTED.md`.
