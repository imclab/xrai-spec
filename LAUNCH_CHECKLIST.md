# XRAI Launch Checklist — Push-Button Ready

**Target repo public:** 2026-04-29
**Target launch post:** 2026-04-30
**First weekly update:** 2026-05-02 (Friday)

This checklist matches the 6-step playbook in [`specs/XXX-zero-to-one/spec.md §5.5`](../spec.md). Each step has blockers, acceptance criteria, and the human-action call-outs.

---

## Pre-flight (T-7 days — do now)

- [x] Staged site at `specs/XXX-zero-to-one/xrai-website/` populated (SPEC, MANIFESTO, README, LICENSE, demos, mcp-server, runtimes, USE_CASES)
- [x] CONTRIBUTING.md written
- [x] CODE_OF_CONDUCT.md written
- [x] CHANGELOG.md written with v1.0 + [Unreleased]
- [x] .gitignore written
- [x] Launch posts drafted (HN, X, Bluesky, LinkedIn)
- [x] "This Week in XRAI #1" template ready
- [ ] Final read-through of SPEC.md — any hallucinated example, any missing primitive that blocks day-1 authoring?
- [ ] Final read-through of MANIFESTO.md — any claim that could be contested + embarrass the project?
- [ ] At least 1 working example in `examples/` (currently empty — minimum: one 5-line scene + one 50-line scene)
- [ ] Demo video of voice-to-XRAI authoring (unlisted YouTube OK; will be linked from HN first comment)

---

## Step 1 — GitHub repo (DONE 2026-04-22)

- [x] **DONE:** `imclab/xra1` created as public repo (exists at https://github.com/imclab/xra1)
- [x] **DONE:** content pushed via `scripts/xrai_repo_bootstrap.sh --repo imclab/xra1 --no-dry-run`
- [x] **DONE:** 20+ files at repo root (README, SPEC, MANIFESTO, VISION, FAQ, CITATION.cff, LICENSE, CHANGELOG, CONTRIBUTING, CODE_OF_CONDUCT, LAUNCH_CHECKLIST, RUNTIMES, RUNTIMES_EVALUATION, USE_CASES, index.html, demos/, examples/, launch/, mcp-server/, rfcs/, runtimes/)
- [x] **DONE:** GitHub Pages enabled (source: main/root, CNAME: xrai.dev)
- [x] **DONE:** 7 labels seeded (rfc, v1.0, v1.1, conformance, runtime, governance, parity)

**Remaining:** enable Discussions (`gh repo edit imclab/xra1 --enable-discussions`), optionally add branch protection.

**Acceptance:** ✅ repo live at github.com/imclab/xra1. Pages URL `imclab.github.io/xra1` + CNAME to `xrai.dev` set (resolves after DNS propagation).

---

## Step 2 — Extract XRAI schema → SPEC.md v1.0 (4hr — **already done**)

- [x] SPEC.md v1.0 extracted from Portals codebase
- [x] Entity primitives documented (cube/sphere/cylinder/capsule/plane/glb/hologram/light/emitter)
- [x] Relations documented (parent-of, wire-binds, reacts-to-audio, tracks)
- [x] URI scheme + MIME type documented
- [x] Minimal example
- [ ] Sanity check: can a fresh LLM authoring attempt with Claude + Gemini + GPT each produce a valid scene from a 1-sentence prompt? (ad-hoc test, 15 min)

**Acceptance:** SPEC.md alone is enough to write an XRAI parser in a new language in under a week.

---

## Step 3 — Write MANIFESTO.md 2 pages (2hr — **already done**)

- [x] Lineage (Bush → Nelson → Berners-Lee → Hofstadter → PageRank → XRAI)
- [x] What changed / why now
- [x] What XRAI is / is not
- [x] Design principles
- [x] Governance
- [x] Commercial relationship
- [x] Stakes

**Acceptance:** MANIFESTO alone answers "what is XRAI and why should I care" for three audiences: (a) engineer evaluating a dependency, (b) researcher evaluating a citation, (c) investor evaluating a market.

---

## Step 4 — Register xrai.dev domain (15min — **human action required**)

- [ ] **HUMAN:** purchase `xrai.dev` via Namecheap / Porkbun / Cloudflare Registrar (cheapest TLD renewal long-term is Cloudflare)
  - [ ] 2-year minimum registration (signals commitment, avoids lapse)
  - [ ] Enable WHOIS privacy
  - [ ] Register corresponding `xrai.org` + `xrai.ai` defensively ($20 combined — do not develop, just own)
- [ ] **HUMAN:** point DNS to hosting (Vercel / Netlify / Cloudflare Pages — all free tier, all fine)
  - [ ] Recommended: Cloudflare Pages (zero corporate capture risk, free tier generous, DDoS protected)
  - [ ] CNAME: `xrai.dev` → `<cloudflare-pages-subdomain>.pages.dev`
  - [ ] Set up `@` + `www` + `docs` subdomains
- [ ] **HUMAN:** set up `hello@xrai.dev`, `conduct@xrai.dev`, `security@xrai.dev` email aliases (Cloudflare Email Routing → @jamestunick@gmail.com; free)
- [ ] Deploy static site from `xrai-website/` (commit = deploy via GitHub action)
- [ ] Verify https:// cert valid
- [ ] Verify landing page renders on mobile + desktop

**Acceptance:** `https://xrai.dev` resolves to the landing page, `https://xrai.dev/SPEC.md` serves SPEC, `mailto:hello@xrai.dev` works.

---

## Step 5 — HN + X launch post (30min)

**Pre-post:**
- [ ] All of Steps 1–4 complete + verified
- [ ] Launch video uploaded (unlisted YouTube), URL ready for first-comment drop
- [ ] James online + clear 2-hour block to respond to comments
- [ ] Notifications off on everything except HN + X

**HN submission:**
- [ ] Submit window: Tue/Wed/Thu, 8–10am Pacific
- [ ] Title: `Show HN: XRAI – an open spatial graph format for AI agents (MIT)`
- [ ] URL: `https://xrai.dev`
- [ ] Immediately post the body text (from `launch/hn-show-hn.md`) as the first comment
- [ ] Drop demo video URL as a reply to the OP
- [ ] Actively respond to comments for 2+ hours

**X/Twitter:**
- [ ] Post the 10-tweet thread from `launch/x-twitter-thread.md`
- [ ] Pin the first tweet for the week
- [ ] Reply to quote-tweets with substantive engagement (no dunks)

**Bluesky + LinkedIn:**
- [ ] Same day, 1–2 hours after X thread
- [ ] From `launch/bluesky-post.md` and `launch/linkedin-post.md`

**Acceptance:** HN submission + X thread live + Bluesky + LinkedIn posts live. At least 10 organic responses across channels within 2 hours.

---

## Step 6 — Weekly public updates — ongoing commitment

- [ ] "This Week in XRAI #1" posted on Friday 2026-05-02, template from `launch/this-week-in-xrai-01.md`
- [ ] Calendar block: every Friday 3–4pm Pacific, draft next week's update
- [ ] GitHub milestone for each week
- [ ] Never skip a week. Short posts are fine. Dead repos signal death.

---

## Content copy mapping (staged → repo)

When copying from `specs/XXX-zero-to-one/xrai-website/` to `github.com/imclab/xra1`:

| Staged path | Repo path | Notes |
|---|---|---|
| `README.md` | `/README.md` | Update any `specs/XXX-zero-to-one/...` internal refs to `/` |
| `MANIFESTO.md` | `/MANIFESTO.md` | |
| `SPEC.md` | `/SPEC.md` | |
| `LICENSE` | `/LICENSE` | |
| `CONTRIBUTING.md` | `/CONTRIBUTING.md` | |
| `CODE_OF_CONDUCT.md` | `/CODE_OF_CONDUCT.md` | |
| `CHANGELOG.md` | `/CHANGELOG.md` | |
| `.gitignore` | `/.gitignore` | |
| `USE_CASES.md` | `/USE_CASES.md` | |
| `demos/` | `/demos/` | |
| `runtimes/` | `/runtimes/` | |
| `mcp-server/` | `/mcp-server/` | |
| `launch/` | `/launch/` OR `/docs/launch/` | Choose — recommend `/docs/launch/` so repo root stays clean |
| `index.html` | `/index.html` | Optional — if Cloudflare Pages serves from repo root, keep it. If separate site repo, move. |

**Hallucinated-link audit:** before copying, grep staged site for `specs/XXX-zero-to-one/` + `portals_v4/` + `RiderProjects/` and rewrite to public paths.

---

## Rollback plan (if launch fails)

**If repo has a showstopper bug in first hour:**
- Revert the problematic file (don't delete the repo)
- Comment on HN / reply to X: "spotted a bug in <file>, pushing a fix"
- Public recovery > silent retreat

**If HN ratios (>30 min, <5 upvotes, only critical comments):**
- Let it die. Don't delete the post.
- Wait 72h, try a different angle (e.g., "Show HN: A 5-line XRAI scene compiled from voice in under 2 seconds" — lead with demo, not spec).

**If domain registration fails or DNS takes >24h:**
- Launch with `github.com/imclab/xra1` as canonical URL
- Update all launch posts to point to repo
- Add `xrai.dev redirect → github repo` once DNS lands

**If repo rename needed** (e.g. `imclab/xra1` → different name):
- Fallback: `xrai-dev`, `open-xrai`, `portals-format`
- Update launch posts + README before submitting

---

## Anti-checklist (things NOT to do)

- [ ] **DO NOT** wait for the Portals app to be polished before launching the spec. They ship independently.
- [ ] **DO NOT** accept Meta / OpenAI / Google / Amazon offers to host the standard. Politely decline.
- [ ] **DO NOT** add committee-driven governance before 1000+ adopters.
- [ ] **DO NOT** skip public dogfood. Portals must export XRAI publicly from day 1.
- [ ] **DO NOT** design for perfection. Ship v1 with known gaps. Fix in v1.1.
- [ ] **DO NOT** mention valuation, funding, accelerator applications in launch posts.
- [ ] **DO NOT** let enterprise contracts influence the spec direction for 12 months.
- [ ] **DO NOT** skip a "This Week in XRAI" post. Rhythm > perfection.

---

## Post-launch 30-day plan

- Week 1: launch, respond, ship one patch release (v1.0.1) based on feedback
- Week 2: Three.js adapter alpha, MCP server tools implementation
- Week 3: conformance suite skeleton, first RFC on event primitives
- Week 4: first external reference runtime adoption (goal: at least 1 non-Portals project uses XRAI)

Metric that matters: **external scenes authored in XRAI by non-Portals users.** Everything else is noise.

---

*Updated 2026-04-22 (session scope claim). Edit freely — but keep the 6-step order and the anti-checklist intact.*
