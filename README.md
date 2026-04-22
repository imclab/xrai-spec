# xrai-website — staging for xrai.dev

**Purpose:** staging area for the public XRAI open-standard site. Will be published at `xrai.dev` once domain is registered + DNS points to hosting.

**Clean separation rule** (see `specs/XXX-zero-to-one/spec.md §5.1`): when ready, contents of this directory move to `github.com/portals-ai/xrai` (or similar open-standard org) — NOT to portals_v4. This directory exists solely as a staging workspace inside the Portals monorepo during Week 1 bootstrap.

## Files

**Read in this order** (for newcomers + future sessions):

1. **[`VISION.md`](./VISION.md)** 🌟 — load-bearing vision source. Problem (we are blind) + Solution (Sight Triad) + Goal (jARvis, verbatim) + Proof (Portals CVPR 2026 paper abstract). Every other file descends from this one.
2. **[`MANIFESTO.md`](./MANIFESTO.md)** — 2-page long-form vision (Bush → Nelson → Berners-Lee → Hofstadter → Huxley → Kurzweil → XRAI lineage)
3. **[`SPEC.md`](./SPEC.md)** — v1.0 draft (extracted from Portals codebase schema — whatever ships today IS v1.0)
4. **[`examples/`](./examples/)** — 4 working v1.0 scenes (minimal / voice-prompt / wired / hologram). Valid JSON.

**Reference:**
- `index.html` — single-page landing (hero + Sight Triad + what-it-is + proof + 20 use cases + lineage + get-started + governance)
- `LICENSE` — MIT (irreversibly open)
- `USE_CASES.md` — 20 voice-command → XRAI payload → runtime examples

**Contributor-facing:**
- `CONTRIBUTING.md` — contribution process + RFC flow + governance
- `CODE_OF_CONDUCT.md` — short + direct
- `CHANGELOG.md` — v1.0 ship notes + [Unreleased] roadmap
- `FAQ.md` — launch-day FAQ (positioning vs USD/glTF/USDZ, governance, licensing, migration, "what-if" scenarios)
- `CITATION.cff` — academic citation (CFF 1.2.0 format, cites Portals CVPR 2026 paper as reference impl)
- `rfcs/` — RFC template + in-flight proposals (see `rfcs/README.md`)
- `.gitignore` — standard multi-language ignore (Node / Python / Rust / Unity)

**Implementation surface:**
- `mcp-server/` — Spatial MCP server README + package manifest (11 tools when fully shipped; 8 shipped today, 3 aspirational — see `mcp-server/README.md`)
- `runtimes/` — per-engine adapter READMEs (Unity, Three.js ✅ shipping, PlayCanvas, Unreal, WebXR/Needle, visionOS)
- [`RUNTIMES.md`](./RUNTIMES.md) — runtime positioning + comparison (answer to "Three.js vs Needle vs PlayCanvas vs Icosa?"). Short version: parallel MIT adapters, not blend; Icosa is Gallery/API, not a runtime.
- `demos/` — jARvis demo storyboards + scripts + captured videos

**Launch operations:**
- `launch/` — copy-paste launch posts (HN, X, Bluesky, LinkedIn) + "This Week in XRAI" drafts (#1 template, #2 voice, #3 bridge, #4 voxel, #5 sight triad) + `voice_stack.md` tone guardrails
- `LAUNCH_CHECKLIST.md` — push-button ready 6-step playbook w/ human-action call-outs

**Related specs in the Portals monorepo** (authoritative engineering reference — xrai-website is the public draft, these are where the reality lives):
- `specs/XRAI_FORMAT_SPECIFICATION_V2.md` — engineering spec v2.0 (glTF 2.0-based, `XRAI_core` extension). xrai-website/SPEC.md v1.0 is the pedagogical subset.
- `specs/004-scene-save-xrai-format/` — scene persistence + XRAI save/load (7/7 complete)
- `specs/009-paint-ar-openbrush/` — `object.paint-stroke` + `object.parametric-stroke` source
- `specs/022-universal-asset-io/` — federated asset references from XRAI
- `specs/023-voxel-world-generator/` — `XRAI_generators.*` extension source
- `specs/024-neural-filters/` — XRAI persistence of filter state
- `~/.claude/knowledgebase/_PORTALS_XRAI_REFERENCE_SCENARIOS.md` — 7 reference scenarios (XRAI schema validation checklist)

## Week-1 Bootstrap (from XXX spec §5.5)

**See [`LAUNCH_CHECKLIST.md`](./LAUNCH_CHECKLIST.md) for the canonical push-button checklist.** The short version:

- [x] **Day 1:** `SPEC.md` v1.0 draft + `MANIFESTO.md` + `LICENSE` + `index.html` (this dir)
- [x] **Day 1+:** CONTRIBUTING + CODE_OF_CONDUCT + CHANGELOG + .gitignore + launch posts + 4 examples
- [ ] **Day 2 (HUMAN):** Create `github.com/portals-ai/xrai` org + repo, copy contents
- [ ] **Day 3 (HUMAN):** Register `xrai.dev`, point DNS
- [ ] **Day 4:** Deploy landing page (Cloudflare Pages recommended — zero capture risk)
- [ ] **Day 5:** Record jARvis demo v1 (see `demos/`)
- [ ] **Day 6:** Post HN + X launch thread (copy from `launch/`)
- [ ] **Day 7:** First "This Week in XRAI" public update (template in `launch/this-week-in-xrai-01.md`)

## Critical do-not-do list (XXX spec §5.3)

- ❌ Do not wait for Portals-app polish before shipping spec
- ❌ Do not let Meta/OpenAI/Google "host" the standard
- ❌ Do not add committee-driven governance before 1000+ adopters
- ❌ Do not skip public dogfood — Portals must export XRAI publicly from day 1
- ❌ Do not design for perfection — ship v1 with known gaps
