# MultiMO - Multi-Machine Orchestrator

Ovládej desítky AI agentů (Claude Code, Cursor, Codex, Windsurf...) z telefonu. Propoj je napříč různými počítači a projekty — jedno odkud pracuješ.

**Žádné API klíče. Žádné extra náklady. Agenti běží ve tvých stávajících IDE a plánech.**

```
  PC 1 (VS Code + Claude)     PC 2 (Cursor)      PC 3 (Codex)
  projekt: webapp/             projekt: api/       projekt: mobile/
       │                            │                   │
       └────── multimo-agent ───────┴───── HTTP ────────┘
                                    │
                             ┌──────┴──────┐
                             │  Hub Server  │  ← běží na jednom PC
                             └──────┬──────┘
                                    │
                               📱 Telefon
                             (mobilní dashboard)
```

---

## Požadavky

- **Node.js 18+** (zkontroluj: `node --version`)
- **npm 8+** (zkontroluj: `npm --version`)
- Volitelně: `cloudflared` pro přístup z telefonu mimo domácí WiFi

---

## Instalace (jednorázově)

### Krok 1: Stáhni repozitář

```bash
git clone https://github.com/user/MultiMO.git
cd MultiMO
```

### Krok 2: Nainstaluj závislosti a sestav

```bash
npm install
npm run build
```

### Krok 3: Zaregistruj příkaz `multimo-agent` globálně

```bash
npm link -w packages/agent
```

Po tomto kroku můžeš používat `multimo-agent` z jakéhokoli adresáře na tomto PC. **Do svých projektů nic kopírovat nemusíš.**

### Volitelně: Nainstaluj Cloudflare Tunnel (přístup z telefonu odkudkoli)

```bash
winget install Cloudflare.cloudflared
```

---

## Použití

### 1. Spusť Hub (vždy jako první)

```bash
cd MultiMO
npm run dev:hub
```

V terminálu uvidíš:
- **QR kód** — naskenuj telefonem
- **Lokální URL** (např. `http://192.168.1.55:3000`) — pro telefon na stejné WiFi
- **Veřejnou URL** — pokud máš cloudflared, hub ji vytvoří automaticky

Při prvním otevření v prohlížeči nastavíš heslo.

### 2. Připoj agenta (v každém projektu)

Otevři nový terminál, přejdi do adresáře svého projektu a spusť:

```bash
cd C:\Users\tvojejmeno\muj-projekt
multimo-agent start --hub http://192.168.1.55:3000
```

*(URL zkopíruj z terminálu hubu — zobrazí se tam přesný příkaz)*

V terminálu se objeví:
- **QR kód + 6-znakový párovací kód**
- Zadej kód v mobilní aplikaci na telefonu → agent se spáruje

Opakuj pro každý další projekt:

```bash
cd C:\Users\tvojejmeno\dalsi-projekt
multimo-agent start --hub http://192.168.1.55:3000
```

Každý projekt dostane vlastní identitu. Agenti na jednom PC se nepřepisují.

### 3. Řekni AI agentovi aby používal MultiMO

V adresáři projektu vygeneruj instrukční soubor:

```bash
multimo-agent init --type claude     # Pro Claude Code → vytvoří CLAUDE.md
multimo-agent init --type cursor     # Pro Cursor → vytvoří .cursorrules
multimo-agent init --type codex      # Pro Codex → vytvoří AGENTS.md
multimo-agent init --type generic    # Pro ostatní → vytvoří MULTIMO.md
```

Nebo řekni agentovi přímo v chatu:

> „Když dokončíš úkol a nevíš co dál, spusť `multimo-agent next` a pokračuj s tím co dostaneš. Když potřebuješ mou odpověď, spusť `multimo-agent ask "tvoje otázka"`. Když jsi hotov, spusť `multimo-agent done "co jsi udělal"`."

### 4. Ovládej vše z telefonu

Na telefonu (v mobilní aplikaci na URL hubu) můžeš:
- Vidět všechny připojené agenty a jejich stav
- Vytvářet projekty a úkoly
- Označovat úkoly jako **draft** (rozpracované) nebo **ready** (připravené pro agenta)
- Řadit úkoly podle priority
- Posílat agentům zprávy a odpovídat na jejich otázky
- Sledovat postup v reálném čase

---

## Příkazy pro agenty

Tyto příkazy fungují z libovolného adresáře kde byl agent nainstalován:

| Příkaz | Co dělá |
|--------|---------|
| `multimo-agent start --hub <url>` | Nainstaluje agenta do tohoto projektu |
| `multimo-agent next` | Získá další úkol z fronty |
| `multimo-agent done "popis"` | Oznámí dokončení úkolu |
| `multimo-agent ask "otázka"` | Pošle otázku uživateli, čeká na odpověď |
| `multimo-agent status` | Zobrazí stav agenta |
| `multimo-agent init --type <typ>` | Vygeneruje instrukční soubor pro AI |

---

## Jak to funguje

```
1. Vytvořiš úkoly na telefonu (per projekt, seřazené podle priority)

2. AI agent dokončí práci
   → spustí: multimo-agent done "implementoval jsem login"
   → hub to pošle jako notifikaci na tvůj telefon

3. AI agent chce další práci
   → spustí: multimo-agent next
   → hub vrátí nejvyšší prioritní "ready" úkol jako text
   → agent pokračuje v práci

4. AI agent se potřebuje zeptat
   → spustí: multimo-agent ask "mám použít JWT nebo session?"
   → ty na telefonu napíšeš odpověď
   → agent ji dostane a pokračuje

5. Opakuj. Můžeš mít 50 agentů na 10 PC a všechny ovládat z jednoho telefonu.
```

**MultiMO nic nepočítá a nevolá žádné AI API.** Jen přeposílá textové zprávy mezi tebou a tvými agenty. Veškerý AI výpočet běží v rámci tvých stávajících předplatných (Claude, Cursor, OpenAI...).

---

## Přístup z telefonu

| Situace | Co se stane |
|---------|-------------|
| **Telefon na stejné WiFi** | Funguje automaticky — hub zobrazí URL s lokální IP |
| **Telefon na mobilních datech** | Nainstaluj `cloudflared` → hub automaticky vytvoří veřejný HTTPS tunel |
| **PC na různých sítích** | Agenti se připojí přes veřejnou URL tunelu |

Hub vždy zobrazí QR kód — stačí naskenovat telefonem.

---

## Bezpečnost

- **Master heslo** — povinné při prvním spuštění, chrání mobilní UI
- **Per-agent tokeny** — každý projekt má unikátní token
- **Párovací kódy** — platí 5 minut, max 3 pokusy
- **HTTPS** — automaticky přes Cloudflare Tunnel
- **Single-user** — tvé PC, tví agenti, tvé heslo

---

## Víc agentů na jednom PC

Každý projekt má vlastní konfiguraci v `.multimo/agent.json`:

```
C:\projekty\webapp\          ← VS Code #1 (Claude Code)
  .multimo/agent.json        ← agent "WebApp"

C:\projekty\api\             ← VS Code #2 (Cursor)
  .multimo/agent.json        ← agent "API"

C:\projekty\mobile\          ← VS Code #3 (Codex)
  .multimo/agent.json        ← agent "Mobile"
```

Agenti se nepřepisují. Každý komunikuje jako samostatný agent.

Přidej `.multimo/` do `.gitignore` svého projektu (příkaz `multimo-agent init` to udělá automaticky).

---

## Struktura projektu

```
MultiMO/
├── packages/
│   ├── shared/    # Sdílené TypeScript typy
│   ├── hub/       # Express server + SQLite databáze
│   ├── agent/     # CLI nástroj (multimo-agent)
│   └── mobile/    # Mobilní web UI (HTML/CSS/JS)
├── package.json   # Root workspace
└── README.md
```

## Tech Stack

- **Hub**: Node.js, Express, SQLite (better-sqlite3), bcrypt
- **Agent CLI**: Node.js, HTTP client
- **Mobile UI**: Vanilla HTML/CSS/JS — žádný framework, žádný build step
- **Komunikace**: HTTP polling + Server-Sent Events

## License

MIT
