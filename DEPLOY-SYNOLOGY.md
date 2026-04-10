# Nasazení HUT na Synology (Docker + Git + Supabase)

Aplikace běží v kontejneru, **Supabase zůstává v cloudu** — kontejner jen obsahuje Next.js; klient v prohlížeči volá Supabase podle `NEXT_PUBLIC_*` proměnných (stejně jako na lokálu).

---

## Nový workflow: Mac → Git → NAS → Synology

Jednorázově musí být na NAS naklonované repo a nastavený `.env` (viz níž). **Při každém nasazení nové verze** stačí:

### A) Na Macu (v projektu HUT)

```bash
cd /cesta/k/HUT   # nebo ke klonu hut-builder

git status
git add -A
git commit -m "Krátký popis změn v češtině"
git push origin main
```

- Použij vlastní větev místo `main`, pokud ji máš (např. `master`).
- Pokud push selže, nejdřív `git pull --rebase origin main` a znovu `git push`.

### B) Na Synology (SSH do NAS)

```bash
ssh tvuj-uzivatel@IP-nas
cd /volume1/docker/hut-builder

git pull
docker compose build
docker compose up -d
```

### C) Volitelně na Synology (bez SSH — Container Manager)

1. **File Station:** ověř, že ve složce projektu je aktuální kód (nebo použij **Git** v balíčku / ruční sync — nejjednodušší je ale **git pull přes SSH**).
2. **Container Manager** → tvůj projekt / stack → **Build** (přestavění image) → **Start** / **Restart** kontejneru.

**Důležité:** Změnil-li jsi v `.env` hodnoty **`NEXT_PUBLIC_*`**, musí proběhnout znovu **`docker compose build`** (ne jen restart). Čistě runtime proměnné bez `NEXT_PUBLIC_` často stačí přegenerovat kontejner (`up -d --force-recreate`) — u Next + embedovaných public env ale drž pravidlo: **po změně public env vždy build.**

### Rychlá kontrola po nasazení

- V prohlížeči: `https://hut.gibonart.cz` (nebo `http://IP-nas:3000`).
- Ověř přihlášení; při chybě redirectů zkontroluj **Supabase → Auth → URL**.

---

## Co potřebuješ

- Synology DSM s **Container Manager** (dříve Docker).
- **Git** na NAS — buď balíček z **Centra balíčků** (Git Server není nutný celý; stačí SSH a příkaz `git`), nebo použij **Task Scheduler** / ručně zkopírovat repo z PC.
- Doporučeno: **SSH** zapnuté (Ovládací panely → Terminál a SNMP → povolit SSH).
- Účet na GitHubu s **SSH klíčem** (už máš) — na NAS přidáš **druhý SSH klíč** jen pro NAS, nebo použiješ **Deploy key** jen pro repo `hut-builder` (read-only).

---

## 1. Kam projekt na NAS uložit

Typicky vlastní složka, např.:

`/volume1/docker/hut-builder`

(Přes **File Station** složku vytvoř, nebo přes SSH `mkdir -p /volume1/docker/hut-builder`.)

---

## 2. Klonování z GitHubu (SSH)

Na PC jsi už měl SSH; **na Synology je to samostatný počítač** — musíš tam mít buď:

- nasazený **SSH klíč** pro GitHub (viz níž), nebo
- klonovat přes **HTTPS + token** (méně pohodlné).

### SSH klíč jen pro NAS (doporučeno)

1. Přes SSH se přihlas na NAS (`ssh admin@IP-nas`).
2. Vygeneruj klíč:  
   `ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_github -N ""`
3. Zobraz veřejný klíč:  
   `cat ~/.ssh/id_ed25519_github.pub`
4. Na GitHubu: **Repo hut-builder → Settings → Deploy keys → Add deploy key** — vlož veřejný klíč, zaškrtni **Allow write access** jen pokud budeš z NAS pushovat (většinou stačí read-only bez write).
5. Vytvoř `~/.ssh/config` na NAS:

```text
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_github
```

6. Test: `ssh -T git@github.com`

### Klonování

```bash
cd /volume1/docker
git clone git@github.com:GibonArt/hut-builder.git
cd hut-builder
```

---

## 3. Soubor `.env` (Supabase — není v Gitu)

```bash
cp .env.example .env
nano .env
```

Vyplň z **Supabase → Project Settings → API**:

- `NEXT_PUBLIC_SUPABASE_URL` — Project URL  
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` **nebo** `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (podle toho, co dashboard ukazuje)

Soubor `.env` nech jen na NAS (záloha mimo Git).

**Poznámka:** Po změně těchto `NEXT_PUBLIC_*` hodnot musíš **znovu sestavit image** (`docker compose build`), ne jen restartovat kontejner — hodnoty se při buildu vkládají do frontendu.

---

## 4. Spuštění přes Docker Compose

Na Synology může být příkaz `docker compose` nebo starší `docker-compose`. Zkus:

```bash
cd /volume1/docker/hut-builder
docker compose build
docker compose up -d
```

První **build může trvat dlouho** (stahování Node image, `npm ci`, `next build`). Na slabších NAS dej pozor na RAM; případně v Container Manageru zvyš limit paměti pro Docker.

Ověření: v prohlížeči `http://IP-tvého-NAS:3000` (nebo port z `HUT_PORT` v `.env`).

---

## 5. Doména a HTTPS (volitelné, doporučeno)

1. DNS: **A záznam** tvé domény → veřejná IP (nebo DynDNS).
2. Router: přesměrování **80** a **443** na IP Synology.
3. DSM: **Login Portal / Reverse Proxy** — nový záznam:
   - Zdroj: `https://tvoje-domena.cz`, port 443  
   - Cíl: `http://127.0.0.1:3000` (nebo host port z kroku 4)
4. Certifikát **Let’s Encrypt** v DSM pro tuto doménu.

### Supabase a přihlášení

V **Supabase → Authentication → URL Configuration** přidej do **Redirect URLs** / **Site URL** adresu tvé aplikace (např. `https://tvoje-domena.cz`), jinak OAuth redirecty po přihlášení nemusí fungovat.

---

## 6. Aktualizace po změnách v Gitu (standardní workflow)

```bash
ssh admin@IP-nas
cd /volume1/docker/hut-builder
git pull
docker compose build
docker compose up -d
```

- Jen změny v kódu → stačí `pull` + `build` + `up`.
- Změna **jen** v `.env` (bez změny `NEXT_PUBLIC_*`) → často stačí `docker compose up -d --force-recreate` (ověř v dokumentaci; runtime načte nové env).
- Změna **`NEXT_PUBLIC_*`** v `.env` → vždy znovu **`docker compose build`** (kvůli Next buildu).

---

## 7. Container Manager (GUI) místo SSH

Můžeš **Import** z existujícího `docker-compose.yml** přes Container Manager → **Projekt** → vytvořit projekt ze složky s `docker-compose.yml`.  
Stejně budeš potřebovat na disku **naklonovaný** repozitář + `.env`. Build z GUI spouští totéž co `docker compose build`.

---

## 8. Řešení problémů

| Problém | Nápověda |
|--------|----------|
| Build padá na paměti | Zavři jiné kontejnery, přidej swap na NAS, nebo buildni na PC a pushni image do registru (pokročilé). |
| 403 / git na NAS | Deploy key nebo SSH klíč na GitHubu. |
| Aplikace běží, ale Supabase chyby | Špatné klíče v `.env`; u custom domény doplnit URL v Supabase Auth. |
| Port obsazený | V `.env` nastav `HUT_PORT=8080` a v reverse proxy cílit na tento port. |

---

## Shrnutí toku

1. **Klon** `hut-builder` na NAS.  
2. **`.env`** se správnými Supabase hodnotami.  
3. **`docker compose build` + `up -d`**.  
4. **Reverse proxy** + DNS + **Supabase redirect URL** pro vlastní doménu.  
5. Při nové verzi z Gitu: **`git pull` → `docker compose build` → `up -d`**.
