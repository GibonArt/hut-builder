# Import na Synology (NAS) bez prohlížeče

Postup přes SSH a Docker — vhodné, když import v prohlížeči padá na timeout nebo Mac usíná. Běží na NAS, ne v produkčním kontejneru `hut`.

## Jednorázová příprava

### 1. Service role klíč v `.env` na NAS

V Supabase: **Project Settings → API → `service_role` secret** (nikdy do Gitu).

Do `/volume1/docker/hut-builder/.env` doplň:

```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

Volitelně (jinak se hledá `gibonart@gmail.com` v auth):

```env
HUT_IMPORT_EDITOR_USER_ID=uuid-admina-z-supabase-auth
```

### 2. Oprávnění skriptů

```bash
cd /volume1/docker/hut-builder
chmod +x scripts/nas/*.sh
```

### 3. Aktuální kód

```bash
git pull origin main
```

---

## Postup krok za krokem

Přihlášení na NAS:

```bash
ssh tvuj-uzivatel@IP-nas
cd /volume1/docker/hut-builder
```

| Krok | Příkaz | Co dělá |
|------|--------|---------|
| 0 (volitelné) | `./scripts/nas/00-deploy-app.sh` | `git pull` + rebuild kontejneru aplikace |
| 1 | `./scripts/nas/01-sync-typy-karet.sh` | Typy karet → `hut_typy_karet_dynamic` |
| 2 | `./scripts/nas/02-import-kombinace.sh` | Kombinace → `bonus_kombinace_global` (dlouhé) |

**Vše najednou:**

```bash
./scripts/nas/spust-import.sh
```

Log jde na stderr (`forwards — žebříček — stránka 3…`).

---

## Stejné příkazy na Macu (s Node)

```bash
cd /cesta/k/HUT
npm ci

# do .env doplň SUPABASE_SERVICE_ROLE_KEY
npm run sync:typy-karet
npm run import:hutbuilder-kombinace
```

Jen stáhnout bez zápisu do Supabase (záloha JSON):

```bash
npm run import:hutbuilder-kombinace -- --jen-stahnout
```

---

## Surový export Hut Builderu (bez mapování do bonusů)

```bash
npm run hutbuilder:kombinace
# nebo na NAS:
./scripts/nas/_docker-tsx.sh scripts/stahni-hutbuilder-kombinace.mjs
```

---

## Řešení problémů

| Problém | Řešení |
|---------|--------|
| `SUPABASE_SERVICE_ROLE_KEY` chybí | Doplň do `.env` na NAS |
| `new row violates row-level security` | Použij service role, ne anon klíč |
| Hut Builder timeout | Skript opakuje pokusy (4×, až 180 s na pokus z CLI). Při opakovaném selhání: `./scripts/nas/02-import-kombinace.sh -- --timeout=300000 --delay=500` |
| `npm ci` v Dockeru trvá dlouho | Normální při prvním běhu; další běhy jsou rychlejší |

Import kombinací **nepotřebuje** běžící prohlížeč ani otevřenou záložku — stačí běžící NAS a síť.
