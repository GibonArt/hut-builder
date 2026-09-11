# NHL 27 — prázdný Supabase projekt

Checklist pro druhou databázi (NHL27). **Auth zůstává na primárním projektu (NHL26).** Data NHL27 jdou do nového projektu / stacku. Inventář a bonusy z NHL26 se **nemigrují**.

## 1. Vytvoř projekt / stack

- Cloud: nový projekt v Supabase Dashboard, nebo
- Self-hosted NAS: druhý stack (jiný Postgres + PostgREST), stejné SQL skripty jako NHL26

## 2. Sdílený JWT secret (povinné pro společné přihlášení)

Aby `auth.uid()` v RLS NHL27 fungovalo s tokenem z Auth NHL26:

1. V NHL26 GoTrue / JWT nastavení zjisti `JWT_SECRET` (self-hosted: `supabase-project/.env` → `JWT_SECRET`).
2. Nastav **stejný** secret u NHL27 PostgREST / GoTrue (u cloudových dvou projektů JWT obvykle nesdílíš — self-hosted je cíl).
3. Spusť `supabase/fix_je_bonus_editor_jwt_email.sql` na NHL27 — editor RLS musí číst e-mail z JWT (lokální `auth.users` na NHL27 je prázdné).
4. Ověř: po loginu v appce otevři `/nhl27` a načti prázdný inventář (SELECT přes RLS, ne 401).

Fallback (fáze 2, pokud JWT sharing nejde): zápisy NHL27 jen přes server API + `service_role` s `user_id` ze session. Preferuj JWT sharing.

## 3. SQL skripty (pořadí)

Spusť v SQL Editoru NHL27 (nebo `psql`) — **bez** datové migrace z NHL26:

| Pořadí | Soubor | Účel |
|--------|--------|------|
| 1 | `supabase/cards_setup.sql` | Tabulka karet + RLS |
| 1b | `supabase/fix_cards_user_id_bez_fk_auth.sql` | Bez FK na auth.users (Auth NHL26) |
| 2 | `supabase/cards_prodano.sql` | Sloupec prodáno (pokud není v setup) |
| 3 | Související RPC dle potřeby: `cards_katalog_kopie_rpc.sql`, `cards_duplikat_obsah_rpc.sql`, `cards_najdi_obnova.sql`, `napoveda_jmena_z_cards_rpc.sql` | |
| 4 | `supabase/bonus_kombinace_global.sql` | Sdílené kombinace |
| 4b | `supabase/fix_je_bonus_editor_jwt_email.sql` | Editor RLS přes JWT e-mail (povinné při Auth NHL26 + data NHL27) |
| 5 | `supabase/bonus_kombinace_nastaveni.sql` | Uživatelská nastavení bonusů |
| 6 | `supabase/hut_typy_karet_dynamic.sql` | Dynamické typy karet |
| 7 | `supabase/hut_typy_karet_dynamic_extend.sql` | `popis_cs`, aliases |
| 8 | `supabase/fix_sync_hut_typy_karet_service_role.sql` | Sync typů přes service role |
| 9 | `supabase/ea_hraci_napoveda.sql` | Nápověda jmen (prázdná — naplnit až budou EA ratings NHL27) |
| 10 | Self-hosted: `supabase/fix_selfhosted_hut_grants.sql`, `data_api_grants_doplneni.sql` | Grants |

Volitelné později: EA ratings (`ea_ratings_setup.sql`), admin přehledy — až budou potřeba.

## 4. Env appky

V `.env` / Docker build args:

```bash
# Auth + NHL26 (stávající)
NEXT_PUBLIC_SUPABASE_URL=…
NEXT_PUBLIC_SUPABASE_ANON_KEY=…
SUPABASE_SERVICE_ROLE_KEY=…

# NHL27 data (veřejná HTTPS — bez interní IP; hairpin řeší docker-compose extra_hosts)
NEXT_PUBLIC_SUPABASE_NHL27_URL=https://supabase27.kc36gaming.gibonart.cz
NEXT_PUBLIC_SUPABASE_NHL27_ANON_KEY=…   # nebo PUBLISHABLE
SUPABASE_NHL27_SERVICE_ROLE_KEY=…
SUPABASE_NHL27_URL=https://supabase27.kc36gaming.gibonart.cz
```

Po změně `NEXT_PUBLIC_*` **rebuild** image. Po změně jen `SUPABASE_NHL27_URL` stačí `docker compose up -d` (restart).

## 5. První sync / import (NAS)

```bash
./scripts/nas/01-sync-typy-karet.sh --sezona=nhl27
./scripts/nas/02-import-kombinace.sh --sezona=nhl27
./scripts/nas/03-over-kombinace.sh --sezona=nhl27
```

Zdroj kombinací: `https://nhlhutbuilder.com/chemistry-combos.php` (aktuální root = NHL 27; archiv NHL 26 pod `/NHL26/`)  
Typy karet: Combo Finder + Chemistry Combos na stejném rootu (`combo-finder.php` má loga, chemistry má kompletní seznam typů)

Default bez `--sezona` = `nhl26` (beze změny chování).

## 6. Smoke checklist

- [ ] Login → rozcestník `/` → NHL 27
- [ ] Inventář `/nhl27` je prázdný (žádné karty z 26)
- [ ] Nastavení bonusů → sync typů + import Chemistry Combos (NHL27)
- [ ] `03-over-kombinace.sh --sezona=nhl27` ukáže rozumné počty řádků
- [ ] NHL26 `/nhl26` stále vidí stará data

## 7. Záměrně později

- EA ratings NHL27
- Migrace inventáře 26→27
- Kompletní vizuální rebrand NHL27
- nhlhutbuilder.app jako zdroj (nepoužívat)
