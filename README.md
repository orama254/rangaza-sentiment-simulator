# Rangaza

Rangaza is a rehearsal room for a public announcement in Kenya.

A civic educator loads an official notice. A fixed population of 3,500 simulated residents, across all 47 counties, reacts. The map shows where the notice creates friction, and which clause drives that reaction. The result is a diagnostic. It is not a forecast of protest.

## Why

Access to a policy often depends on whether people can find a version they understand and trust. A bill can be public for weeks and still arrive in a community as a rumour, a price change, or a clip.

Rangaza is for the person who has to explain the notice before that happens. That person is a civic educator, such as an NGO officer, a county communications desk, a peace committee, or a journalist. Residents are the simulated population. They are not asked to operate the tool.

Each reaction stays tied to one provision in the source text. The screen labels every run "Simulated, not measured" until real aggregate counts replace a simulated county. Ethnicity is not a resident attribute. A mobilization score is an input to friction and is never shown, ranked, or exported.

The proof uses two Kenyan notices. The Finance Bill, 2024, including a draft that drops VAT on bread and the motor vehicle tax, is the screen you can open. The Social Health Insurance Act rollout is stored as data and is not on that screen yet.

## How to start

You need Node 20 or newer, and pnpm.

From this folder:

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open http://localhost:3000. Choose Finance Bill 2024. Press Announce. Open a county from the menu on the right. Kilifi is the useful one for this bill. The fisher row is marked hotspot, and its clause is the motor vehicle tax.

Leave `RANGAZA_MODE=offline` in `.env.local` for that run. Offline uses `src/lib/engine/mock.ts` and does not call the network. The population file is already at `data/generated/residents.json`. Rebuild it with `pnpm generate:population` if you change `data/counties.json`, `data/archetypes.json`, `data/county-weights.json`, or `data/sample-frame.csv`.

`pnpm typecheck` and `pnpm lint` check the project. `pnpm build` produces a production build.

### Modes and keys

`RANGAZA_MODE` is `offline`, `live`, or `cached`. An unset value is `offline`.

`offline` is the demo. `live` and `cached` both construct the Jev engine in `src/lib/engine/jev.ts`. There is no saved pack for `cached` to serve yet, so both modes call the Vercel AI Gateway.

Jev uses `experimental_evaluate` and the model `typesafe-ai/jev`. Set `AI_GATEWAY_API_KEY` for that call and for brief and explainer generation. `RANGAZA_LLM_PROVIDER` picks the Gateway model for those two jobs. Allowed values are `anthropic`, `google`, and `openai`. `ANTHROPIC_API_KEY` is used only when the Gateway key is missing. `TYPESAFE_API_KEY` is optional and unused when the Gateway key is set. `RANGAZA_JEV_MODEL` overrides the Jev model id.

`JEV_CONCURRENCY` defaults to 2. The engine also caps in-flight Jev calls at 2. Do not commit `.env.local`.

`pnpm react:sample` prints mock reactions, then live Jev reactions when a Gateway key is present. `JEV_SAMPLE_SIZE` caps that live sample. Leave this command alone unless you mean to spend Gateway quota.

### Routes in this build

| Path | What it does |
| --- | --- |
| `/` | Landing. One preset link, plus Methods. Paste and URL ingest are stubbed. |
| `/sim/finance-bill-2024` | 3D county map, Announce, county panel, and the A/B draft toggle. |
| `/methods` | Friction weights and the census, HDX, and geoBoundaries sources. |
| `POST /api/simulate` | Streams county updates for a saved brief. |
| `POST /api/brief` | Reads announcement text into a brief. |
| `POST /api/explainer` | Writes a plain-language note and an SMS from a directory file. |

The map reads county shapes from `public/geo/kenya-counties.geojson`. Saved briefs live in `data/briefs/`. Next-step directories live in `data/directory/`.

## Still to build

These are the gaps between this folder and a complete rehearsal tool. Finish them inside this folder.

The simulation page always loads `data/briefs/finance-bill-2024.json` and `data/briefs/finance-bill-2024-b.json`. `data/briefs/sha-rollout-2024.json` and `data/directory/sha-rollout-2024.json` are not wired to a route. The landing page has no link for that notice.

`src/components/panels/ExplainerPanel.tsx` is not mounted on the map. `POST /api/explainer` accepts English and Swahili (`en`, `sw`) and can return plain text plus an SMS of at most 160 characters. Somali (`so`) is on the explainer schema and is not a session language yet. Next steps may use only entries already in `data/directory/`.

`cached` mode does not read a pack. Add a bake step that writes reactions, county pulses, and explainers under `public/`, and teach `src/lib/engine/mode.ts` to serve that pack when the mode is `cached`. Until then, record demos in `offline`.

The A/B control swaps the whole brief. It does not colour counties by the change in friction. Variant B is the Finance Bill without bread VAT and the motor vehicle tax.

These screens and controls are not in the app yet. A 2D fallback route. A verified-counts upload that accepts aggregate rows only. Friction-weight sliders. A radio script. Printable explainer export. A backtest view that compares this Finance Bill run with the withdrawal on 26 June 2024.

Paste and URL ingest on `/` are still a stub. `POST /api/brief` is the extraction path to connect when that form is real.

Later, a second country needs its own geo file, census weights, livelihoods, languages, and directory, in the same shape as `data/` and `public/geo/`. A worker queue for Jev fan-out, and a store for briefs and verified counts, sit behind that. They are not required to run the Finance Bill rehearsal above.
