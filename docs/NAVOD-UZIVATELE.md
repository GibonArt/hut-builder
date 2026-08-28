# HUT Builder — návod pro uživatele

Neoficiální nástroj pro evidenci karet a hledání sestav s bonusy v NHL Hockey Ultimate Team. Není od EA Sports.

---

## Obsah

1. [Začínáme](#1-začínáme)
2. [Kam v aplikaci](#2-kam-v-aplikaci)
3. [Můj inventář — přidání a úprava karet](#3-můj-inventář--přidání-a-úprava-karet)
4. [Moje karty — přehled všech karet](#4-moje-karty--přehled-všech-karet)
5. [Optimalizátor formací](#5-optimalizátor-formací)
6. [Soupiska — skládání týmu](#6-soupiska--skládání-týmu)
7. [Nastavení účtu](#7-nastavení-účtu)
8. [Časté otázky a tipy](#8-časté-otázky-a-tipy)

---

## 1. Začínáme

### Registrace a přihlášení

1. Otevři aplikaci v prohlížeči.
2. Pokud nemáš účet, zvol **Registrace** a vyplň e-mail a heslo (min. 6 znaků).
3. Přihlas se na stránce **Přihlášení**.
4. Zapomenuté heslo obnovíš přes **Obnova hesla** — přijde odkaz na e-mail.

Po přihlášení tě aplikace pustí na hlavní stránku. Karty se ukládají pod tvým účtem v cloudu — na jiném počítači je uvidíš po stejném přihlášení.

### Co potřebuješ mít

- Alespoň **jednu kartu** v inventáři, aby šel použít optimalizátor.
- Pro smysluplné výsledky v optimalizátoru musí komunita (správci) mít nastavená **pravidla bonusů** — jinak se nezobrazí žádné kombinace.

---

## 2. Kam v aplikaci

V levém menu (na mobilu ikona ☰) najdeš:

| Položka | K čemu slouží |
|---------|----------------|
| **Můj Inventář** | Přidávání a úprava karet, rychlý import z katalogu |
| **Moje karty** | Celý seznam karet, filtry, export |
| **Optimalizátor formací** | Hledání útočných, obranných a brankářských sestav |
| **Nastavení účtu** | Změna hesla |
| **O aplikaci a datech** | Informace o aplikaci a datech |

Na hlavní stránce (`/`) přepínáš mezi **Inventářem** a **Optimalizátorem** — obojí je pod jednou adresou, liší se jen aktivní sekcí v menu.

**Odhlášení:** tlačítko v horní liště.

---

## 3. Můj inventář — přidání a úprava karet

### Přidání karty krok za krokem

1. Otevři **Můj Inventář**.
2. Vyplň formulář **Přidat kartu** (všechna pole kromě X-Faktorů jsou povinná).
3. U pole **Jméno** začni psát — zobrazí se nápověda:
   - **Hráč z EA** — doplní se jméno, pozice, ruka, liga a tým.
   - **Karta z komunity** — doplní se údaje z poslední uložené karty stejného jména a týmu. **Vždy zkontroluj** OVR, plat, typ karty a X-Faktory — může jít o jinou variantu karty.
4. Doplň **OVR**, **pozici**, **ruku**, **plat** (v milionech, např. `1,5`), **národnost**, **typ karty**, **ligu** a **tým**.
5. Volitelně vyber až **3 X-Faktory** (jako ve hře).
6. Klikni **Přidat kartu**.

**Tip:** Na počítači uložíš formulář zkratkou **Ctrl+Enter** (Mac **⌘+Enter**).

### Liga a tým

- Nejdřív zvol **ligu**, pak **tým** ze seznamu.
- Nevíš ligu? Použij pole **Najít tým napříč ligami** — po výběru se doplní obojí.

### Rychlý import víc karet

Nahoře ve formuláři je blok **Rychlý import víc karet z databáze**:

1. Klikni **Rozbalit seznam**.
2. Vyfiltruj nebo projdi karty od ostatních uživatelů.
3. Zaškrtni karty, které chceš (šedé = už máš v inventáři).
4. **Vybrat viditelné** označí vše z aktuálního filtru.
5. **Přidat vybrané** — karty se zkopírují do tvého inventáře najednou.

### Úprava a smazání

- V náhledu karet pod formulářem klikni na kartu → **Upravit** (nebo z **Moje karty**).
- **Vymazat formulář** / **Zrušit úpravu** zruší rozpracované změny.
- **Smazat** kartu je nevratné (potvrzení v dialogu).

### Označení „Prodáno“

Při **úpravě** karty můžeš zaškrtnout **Prodáno**:

- Karta zůstane v databázi (ostatní ji mohou dál používat v nápovědě / importu).
- **Do optimalizátoru se nepočítá** — jako bys ji už neměl v aktivním týmu.

### Náhled pod formulářem

Pod formulářem je zkrácený přehled (cca 4 karty). Řazení: podle přidání, OVR vzestupně nebo sestupně. Odkaz **Všechny karty** vede na plný seznam.

---

## 4. Moje karty — přehled všech karet

Stránka **Moje karty** zobrazí kompletní inventář.

### Filtry a řazení

- **Řazení:** podle přidání, OVR od nejnižšího, OVR od nejvyššího.
- **Pozice:** všechny nebo konkrétní (C, LW, …).
- **Prodáno:** všechny / jen aktivní / jen prodané.

### Akce u karty

| Akce | Co udělá |
|------|-----------|
| **Upravit** | Otevře inventář s vyplněným formulářem |
| **Duplikovat** | Vytvoří novou kartu se stejnými údaji (např. druhá varianta OVR) |
| **Smazat** | Trvale odstraní kartu |

### Export

**Exportovat JSON** stáhne zálohu všech tvých karet do souboru na disk.

---

## 5. Optimalizátor formací

Optimalizátor hledá **plné sestavy**, které splňují uložená pravidla bonusů (nastavuje je správce komunity). Zobrazuje tři typy:

| Sekce | Sestava |
|-------|---------|
| **Útok** | 3 hráči: levé křídlo · centrum · pravé křídlo (LK · C · PK) |
| **Obrana** | 2 hráči: levý obránce · pravý obránce (LO · PO) |
| **Brankáři** | 2 brankáři (G · G) |

U každého výsledku vidíš hráče, jaký bonus sedí (typ a hodnotu), plat sestavy a případně **překryv bonusů** — stejní hráči mohou splnit víc typů bonusu najednou (PLAT, CLK, BS).

**Prodané karty** se do výpočtu nezahrnují.

### Jak na to — základní postup

1. Otevři **Optimalizátor formací** v menu.
2. Nastav **filtry** (viz níže).
3. Klikni **Hledat** — teprve teď proběhne výpočet (stránka se při prvním otevření nenačítá zbytečně dlouho).
4. Procházej výsledky, řaď je, připínej řádky do **soupisky**.
5. Po změně filtrů nahoře znovu klikni **Hledat**.

**Zrušit výsledky** skryje výsledky a vynuluje stav hledání (soupiska v prohlížeči zůstane uložená).

### Filtry před Hledat

| Filtr | Význam |
|-------|--------|
| **Typ bonusu** | Vše, nebo jen PLAT / CLK / BS |
| **OVR min. / max.** | Prázdné = bez limitu |
| **Hráč z inventáře** | Začni psát jméno — vyber kartu. Zobrazí se jen sestavy, kde hráč je |
| **Rozpočet (max. plat)** | Součet platů všech hráčů ve formaci (mil. $). Prázdné = bez limitu |
| **Křídla vzájemně** | U útoku může sedět LK↔PK (prohozené křídla) |
| **LO↔PO u obrany** | U obrany může sedět prohozená dvojice |

Když upravíš filtry **po** hledání, zobrazí se upozornění — pro nový výpočet je potřeba znovu **Hledat**.

### Po kliknutí na Hledat

**Překryv bonusů** — stejná sestava hráčů může mít víc typů bonusu. Filtruj např. jen „PLAT + CLK“ nebo „Jen 1 typ bonusu“.

**Zobrazit sekci** — zobraz jen útok, obranu, brankáře nebo vše (méně scrollování).

**Řadit podle**

- **Součet OVR** — síla hráčů ve formaci
- **Hodnota bonusu** — číslo u daného typu bonusu z nastavení

**Směr:** nejvyšší → nejnižší nebo naopak.

### Řádek ve výsledcích

- U každé sestavy je tlačítko **Přidat do soupisky**.
- Po připnutí **zmizí** z seznamu jiné varianty se **stejným hráčem** v dané sekci (útok / obrana / brankáři zvlášť).
- Žlutý pruh u řádku = **překryv bonusů** — stejní hráči mají i jiný typ bonusu v databázi.

---

## 6. Soupiska — skládání týmu

Když připneš alespoň jeden řádek, objeví se panel **Soupiska (připnuté sestavy)**.

### Cílové složení

Kompletní soupiska = **4 útočné řádky + 3 obranné + 1 brankářská dvojice** (celkem přes všechny typy bonusu dohromady, ne 4×3 pro PLAT, CLK a BS zvlášť).

V panelu vidíš:

- kolik řádků máš v každé části,
- **součet platů** soupisky,
- porovnání s limitem rozpočtu z filtru (pokud jsi ho zadal).

### Ukládání

| Co | Jak |
|----|-----|
| **Automaticky** | Každá změna připnutí se uloží do **tohoto prohlížeče** |
| **Po Hledat** | Uložená soupiska se **sama obnoví** (pokud řádky sedí na aktuální výsledky) |
| **Uložit kompletní soupisku** | Ruční potvrzení, až máš 4+3+1 |
| **Obnovit z uložené** | Přepíše aktuální připnutí uloženou verzí |
| **Smazat uloženou** | Vymaže uloženou soupisku i připnuté řádky |

**Důležité:** Uložená soupiska je **jen v tomto prohlížeči** (ne na serveru). Jiný počítač nebo vymazaná data prohlížeče = prázdná soupiska. Karty v inventáři v cloudu zůstávají.

**Odebrat** řádek: v panelu soupisky **Odebrat**, nebo **Zrušit vše** u celé sekce (útok / obrana / brankáři).

---

## 7. Nastavení účtu

V **Nastavení účtu** změníš heslo:

1. Zadej **současné heslo**.
2. Zadej **nové heslo** dvakrát (min. 6 znaků).
3. Pokud se zobrazí kontrola „jsem člověk“, dokonči ji.
4. Ulož.

---

## 8. Časté otázky a tipy

### Proč optimalizátor nic nenajde?

- Nemáš žádné **aktivní** (neprodané) karty.
- Filtry jsou moc přísné — zkus prázdné OVR/rozpočet, typ bonusu **Vše**, zruš výběr hráče.
- V databázi chybí kombinace pro tvoje karty — kontaktuj správce bonusů.
- Hráč je na špatné pozici (např. obránce hledáš v útoku).

### Co znamenají PLAT, CLK, BS?

Typy bonusů z nastavení komunity — obvykle souvisí s **platem**, **chemií (CLK)** a **body synergie (BS)**. Konkrétní pravidla (národnost, tým, typ karty) definuje správce.

### Proč se po Hledat soupiska trochu liší?

Změnil jsi filtry nebo OVR — některé staré řádky už nejsou ve výsledcích a aplikace je přeskočí. Zkus **Obnovit z uložené** nebo připni znovu ručně.

### Můžu mít stejného hráče dvakrát?

Ano — **Duplikovat** na stránce Moje karty vytvoří druhou kartu (jiné OVR / typ). V optimalizátoru se ale stejný hráč v jedné sekci typicky vyloučí po připnutí jiné formace s ním.

### Kde je nápověda k bonusům?

Pravidla kombinací spravují oprávnění uživatelé v **Nastavení bonusů** (odkaz v menu jen pro správce). Běžný hráč bonusy neupravuje — jen je používá v optimalizátoru.

### Aplikace a EA

HUT Builder je komunitní projekt. Data zadáváš ty a ostatní hráči. Aplikace není oficiální produkt EA Sports ani NHL.

---

*Poslední aktualizace návodu: květen 2026 — odpovídá aktuální verzi aplikace (inventář, optimalizátor se soupiskou a ukládáním v prohlížeči).*
