# HUT Builder

Neoficiální komunitní webová aplikace pro správu karet a sestavování formací v režimu **NHL Hockey Ultimate Team (HUT)**. Není spojená s EA Sports ani NHL.

**Stack:** Next.js 16 (App Router), React, TypeScript, Supabase (Auth + PostgreSQL), nasazení viz [DEPLOY-SYNOLOGY.md](./DEPLOY-SYNOLOGY.md).

### Dokumentace

| Dokument | Pro koho |
|----------|----------|
| **[docs/NAVOD-UZIVATELE.md](./docs/NAVOD-UZIVATELE.md)** | Uživatelé — kompletní návod krok za krokem (how-to) |
| [DEPLOY-SYNOLOGY.md](./DEPLOY-SYNOLOGY.md) | Správce serveru — nasazení |
| Tento README | Vývojáři — přehled funkcí a struktury |

---

## Aktuální stav aplikace (květen 2026)

Po přihlášení je k dispozici hlavní obrazovka se dvěma sekcemi a samostatné stránky v navigaci.

### Můj inventář (`/` → sekce Inventář)

- Přidávání a úprava karet: jméno, OVR, pozice, ruka, národnost, tým, liga, typ karty, plat (mil. $), až 3× X-Factor.
- **Nápověda při zadávání jména:** shody z EA NHL 26 ratingů a z komunitních karet v databázi (předvyplnění údajů).
- **Hromadný import z globálního katalogu** — kopírování karet jiných uživatelů do vlastního inventáře (kontrola duplicit).
- Označení karty jako **prodané** — neúčastní se optimalizátoru, zůstává v DB.
- Odkaz na úpravu karty ze stránky **Moje karty** (`?edit=slug`).

### Moje karty (`/moje-karty`)

- Přehled všech karet v inventáři, řazení, filtr aktivní / prodané.
- Úprava a mazání jednotlivých karet.

### Optimalizátor formací (`/` → sekce Optimalizátor)

Vyhledává z karet v inventáři (kromě prodaných) kombinace bonusů podle pravidel z **Nastavení bonusů**.

**Filtry (aplikují se po kliknutí na Hledat):**

| Filtr | Popis |
|--------|--------|
| Typ bonusu | Vše / PLAT / CLK / BS |
| OVR min.–max. | Volitelný rozsah |
| Hráč z inventáře | Vyhledávání podle jména karty (jen formace s touto kartou) |
| Max. rozpočet | Součet platů hráčů ve formaci (mil. $) |
| Křídla vzájemně | LK↔PK u útoku |
| LO↔PO u obrany | Vzájemná záměna pozic v obranné dvojici |

**Výsledky:**

- Útočné formace (LK · C · PK), obranné dvojice (LO · PO), brankářské dvojice (G · G).
- Rychlý filtr sekce (útok / obrana / brankáři / vše).
- Řazení podle součtu OVR nebo hodnoty bonusu; filtr překryvu bonusů (více typů na stejné hráče).
- Tlačítko **Přidat do soupisky** — připnutí řádku; ze seznamů se skryjí varianty se stejným hráčem v dané sekci.

**Soupiska (připnuté sestavy):**

- Cíl: **4 útok + 3 obrana + 1 brankář** (celkem přes všechny typy bonusu PLAT/CLK/BS dohromady, ne 4×3×1 pro každý typ zvlášť).
- Součet **platů soupisky** v patičce panelu, porovnání s limitem rozpočtu z filtru.
- **Automatické ukládání** do `localStorage` prohlížeče po každé změně připnutí (vázané na `userId`).
- Po **Hledat** se uložená soupiska **automaticky obnoví** (jednou za relaci hledání; po **Zrušit výsledky** znovu).
- Tlačítka: **Uložit kompletní soupisku** (4+3+1, s potvrzením), **Obnovit z uložené** (ruční přepsání aktuálního výběru), **Smazat uloženou**.

Implementace ukládání: [`lib/optimalizatorSoupiskaStorage.ts`](./lib/optimalizatorSoupiskaStorage.ts).

### Nastavení bonusů (`/nastaveni-bonusu`)

- Sdílená pravidla kombinací bonusů (útočné / obranné řádky, parametry: národnost, tým, typ karty).
- Typy bonusu: **PLAT**, **CLK**, **BS**.
- Import z Hutbuilder (admin); úpravy ovlivňují výpočet v optimalizátoru.

### Účet a administrace

| Stránka | Přístup |
|---------|---------|
| `/nastaveni-uctu` | Přihlášený uživatel |
| `/nastaveni-bonusu` | Správci bonusů |
| `/admin/uzivatele` | Admin |
| `/o-aplikaci` | Veřejně (info o datech) |
| `/login`, `/register`, obnova hesla | Veřejně |

---

## Vývoj

```bash
cp .env.example .env.local   # doplň Supabase URL a klíč
npm install
npm run dev
```

Otevři [http://localhost:3000](http://localhost:3000). Vyžaduje přihlášení (Supabase Auth).

```bash
npm run build    # produkční build
npm run lint
```

### Proměnné prostředí

Viz [`.env.example`](./.env.example): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (nebo publishable key).

### Důležité složky

| Cesta | Účel |
|-------|------|
| `app/` | Stránky App Routeru |
| `components/` | UI (inventář, optimalizátor, bonusy, …) |
| `lib/` | DB klient, bonusy, ukládání soupisky, EA nápověda |
| `supabase/` | SQL migrace a RPC pro Supabase |

---

## Nasazení

Produkční běh na Synology (Docker + Git pull): **[DEPLOY-SYNOLOGY.md](./DEPLOY-SYNOLOGY.md)**. Databáze a auth zůstávají v Supabase cloudu.

---

## Licence a vztah k EA

Komunitní nástroj bez oficiální podpory EA. Data karet zadávají uživatelé; aplikace neposkytuje herní obsah od EA.
