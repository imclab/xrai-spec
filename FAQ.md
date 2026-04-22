# XRAI FAQ

Answers to questions we expect on launch day. Written to save both you and us time.

Not here: questions about the spec primitives themselves — those go in [`SPEC.md`](./SPEC.md).

---

## Positioning

### Why not USD?

USD is great for rendering pipelines. It's not a graph — it's a scene-composition format. USD describes *what to render*; XRAI describes *what's connected to what, why, and across which time*. XRAI composes with USD: a USD file can be referenced from an XRAI `object.glb` / `object.usd` entity. Use both.

### Why not glTF?

glTF is the best asset-transport format on earth. We love it. glTF is about *moving a single model between renderers*. XRAI is about *relationships between models, agents, events, and intentions across time*. One layer up. Every XRAI runtime supports glTF for the asset payload.

### Why not USDZ?

USDZ is USD in a ZIP, locked to Apple's ecosystem. It's a reasonable delivery format for iOS / visionOS. It is not a neutral graph format — it ships as part of Apple's proprietary stack. If you're happy with that, use it. We wanted a format no single vendor can capture.

### Why not Niantic SPZ?

SPZ is a compressed interchange format for Gaussian splats — excellent for its domain. XRAI references SPZ assets via `object.gaussian-splat` entities. Different layer: SPZ transports the data, XRAI describes the meaning + relationships.

### Why not Matterport / WebXR / OpenXR / MPEG-SCENE?

- **Matterport** is a 3D-capture service + format. Great for real-world scans. Not a graph format.
- **WebXR / OpenXR** are runtime APIs for XR hardware. They don't define a scene format. XRAI runs on top of them.
- **MPEG-SCENE** is ISO-track multimedia; domain too narrow for agent-memory / scene-as-living-graph.

### Why not CloudEvents / OpenTelemetry for the event schema?

CloudEvents is a transport envelope, not a scene format. OpenTelemetry spans are for distributed-tracing software execution, not user-authored events. [RFC 0001](./rfcs/0001-event-primitives.md) explains the design decision in depth.

### Isn't this just another JSON schema?

Yes. And HTML is just SGML. The value is the primitives + conventions, not the syntax. If "just JSON" was a knock on a format, the web wouldn't run on it.

### Why MIT and not Apache 2.0?

Both are valid. We chose MIT for the schema text + reference parsers because: (a) no patent grant debate for a neutral data format, (b) shortest legal text, (c) maximal compatibility with downstream licenses. If you strongly prefer Apache 2.0, file an issue — this is a reasonable discussion to have before v2.0.

### Is this replacing HTML / the web?

No. HTML is for documents. XRAI is for spatial cognition. A webpage can link to an XRAI scene (`<meta name="xrai" content="...">` proposed in [RFC 0004 browser-integration](./rfcs/README.md#in-flight-rfcs) when filed). They coexist, they don't compete.

---

## Governance

### Why BDFL in Year 1?

Year-1 governance is the time when the format is most malleable. A single decider + public RFC process moves fast + stays coherent. Committee-first governance killed OSI + slowed early Python (Guido van Rossum's BDFL title was not accidental). We move to a community foundation (Apache or W3C Community Group) once we hit 1000+ external adopters.

### Who decides when "1000+ external adopters" is real?

- 1000+ GitHub stars *plus* verified projects using XRAI (verified via self-report + automated scan of public repos for `.xrai.json` files)
- At least 3 runtimes beyond Portals with passing conformance tests
- Audit by a neutral third party before the governance transfer

The script to measure this will be published as `scripts/governance-readiness.sh` in the repo before we approach threshold.

### What happens if Meta / OpenAI / Google offers to host the standard?

We decline politely. Early-stage corporate hosting of a standard is how the standard ends up serving the host's business priorities. Post-1000-adopters, if a neutral foundation (Apache SF / W3C) is not available, we'd consider one of them — but only if the host commits in writing to the neutrality protocol (no format changes serving their commercial interests, elected technical steering committee with <50% employees of the host).

### How do I contribute?

See [`CONTRIBUTING.md`](./CONTRIBUTING.md). Spec changes require an RFC in [`rfcs/`](./rfcs/). Reference-implementation PRs land directly.

### What if I disagree with a BDFL decision?

File an issue. Public discussion. If the decision is wrong, the BDFL is persuadable by argument + evidence. If the BDFL is unreasonable, fork the spec — MIT permits it. We prefer you convince us first.

---

## Licensing + legality

### Can I use XRAI in a commercial product?

Yes. MIT for the spec / parsers / reference implementations, CC0 for the schema itself. Use freely, including in proprietary products. You owe us nothing. Attribution appreciated but not required.

### Do I need to publish my XRAI scenes?

No. XRAI is a format — what you do with your own scenes is your business. Nothing in the spec implies a publishing obligation.

### Can I charge for XRAI-compatible tools?

Yes. The spec is free. Tools on top can be any license. Portals itself ships a free public wedge + paid hosted cloud — that pattern is supported, not forbidden.

### Does XRAI include any tracking / telemetry?

No. The spec has no telemetry primitives. Runtimes may add their own; XRAI documents themselves contain only what the author put in them.

### Is there a CLA to sign?

No. Never. The spec + reference implementations stay MIT in perpetuity. The only thing we ask contributors is to attest (in the PR description) that their contribution is theirs to give — standard OSS hygiene.

---

## Compatibility + migration

### Will XRAI scenes break when the spec updates?

v1.X documents remain valid as v1.Y ships. v1.0 → v1.1 is additive-only. Breaking changes require a v2.0 bump + a published migration guide. See [CHANGELOG.md](./CHANGELOG.md) versioning policy.

### What about round-tripping through older runtimes?

Conforming v1.X runtimes preserve unknown fields on round-trip (forward-compat rule in [SPEC.md § Conformance](./SPEC.md)). Data is never lost; behavior degrades gracefully.

### Can I validate my XRAI documents?

Validator CLI ships in v1.1 per [`CHANGELOG.md`](./CHANGELOG.md). Until then, manual validation against the schema. Conformance test corpus ships with v1.1 for reference implementations.

---

## Performance + scale

### How big can an XRAI document get?

v1.0 doesn't enforce a hard size limit. Portals renders scenes of ~2000 entities at 60 FPS on iPhone 14 Pro. Larger scenes work; they just need streaming-friendly packaging (`.xrai.jsonl` event streams + lazy-loaded GLB references).

### Can I stream XRAI?

Append-only event streams via `.xrai.jsonl` are being designed in [RFC 0001 § Future work](./rfcs/0001-event-primitives.md). v1.2 target.

### What's the parse-time cost?

Depends on document size + runtime. Portals' TS parser handles a 500-entity scene in ~5ms on M3 MacBook Air. Reference Python parser (v1.1) will include benchmarks.

---

## Comparison with Portals-the-product

### Is XRAI required to use Portals?

No. Portals ships with its own authoring + rendering. XRAI is the interchange format that lets Portals scenes move to other runtimes. You can use Portals without ever touching XRAI.

### Can I use XRAI without Portals?

Yes. That's the whole point. XRAI is renderer-neutral. Pick Three.js / PlayCanvas / Unreal / WebXR / visionOS / Unity — all have reference adapters landing in weeks 2–3. Or write your own; the spec is simple enough to implement in a few days.

### What's the relationship between XRAI and jARvis?

jARvis is a multi-model agentic swarm that authors + queries XRAI. jARvis is a Portals product; XRAI is an open format any agent can author. Other agent stacks (Claude, Cursor, Cline, Gemini) can emit XRAI via the [Spatial MCP server](./mcp-server/README.md).

---

## "What if…?"

### What if nobody adopts it?

Then we've still shipped our own Portals app on top of a clean, open format instead of a locked-in proprietary one. That's a win for us regardless. Other adopters are icing.

### What if someone else ships a better spec first?

We adopt theirs. The goal is open, not ours-specifically-open. If a better neutral standard emerges, XRAI gracefully deprecates to a parser/converter layer and we move on. There is no ego attached.

### What if Apple ships their own captured spatial graph format?

They already did (USDZ). The question isn't whether a captured format exists; it's whether the *primary* spatial graph format that AI agents adopt is open or captured. Our bet is that if an open one is available with real runtimes + a thriving ecosystem, agents prefer it.

### What if the AI wave turns out to not be spatial?

Then XRAI is a neat graph format with a small community, and we move on. We're not betting the company on XRAI becoming universal; we're betting that *if* spatial AI happens, the substrate should be open. Low downside, asymmetric upside.

---

## How to use this FAQ

Link to specific answers: every heading has an implicit GitHub anchor. File new FAQ entries as PRs against this doc. Anti-pattern: adding marketing FAQ ("How amazing is XRAI?"). Real FAQ = real questions we've been asked or expect to be asked. Keep it honest.
