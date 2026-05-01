# XRAI Launch Read-Through — 2026-04-22

Pre-launch hallucination / consistency audit of `SPEC.md` + `MANIFESTO.md` against live Portals v4 code. Two findings, both fixable in ≤10 min by docs-only edit.

---

## FINDING 1 — SPEC.md: relation types declared but unimplemented

**Claim (SPEC.md:75):**
> Relation types in v1.0: `parent-of`, `wire-binds`, `reacts-to-audio`, `tracks`.

**Contradicting claim (SPEC.md:13):**
> Normative source of truth: the running Portals runtime. Whatever parses and renders correctly in Portals v4 today IS v1.0-compatible.

**Evidence of gap:**
- `grep -rE '"(parent-of|wire-binds|reacts-to-audio|tracks)"' unity/Assets/Scripts/ src/` → zero hits in runtime code.
- `src/services/xrai/XraiWebBridge.ts` emits `relations: []` only.
- No SceneComposer/WireSystem/Hologram handler consumes these strings.

**Risk:** HN / RFC reviewer opens `grep`, finds zero runtime support, calls the "normative = runtime" claim false. Launch credibility hit.

**Fix options:**
- **A (fastest, doc-only):** Amend SPEC.md:75 to `"v1.0 declares 4 relation types (reference implementation pending as RFC-0001-relations)."` Takes 2 minutes.
- **B (stronger):** Implement minimal pass-through in `SceneComposer.AddRelation(type, from, to)` — 4 lines per type, stores in `_relations` dict. Even a no-op round-trip satisfies the "preserves unknown fields" (SPEC.md:136) conformance clause. ~1 hour.

**Recommendation:** Ship A now; open RFC-0001 for B as first community issue.

---

## FINDING 2 — MANIFESTO.md: USDZ characterization is imprecise

**Claim (MANIFESTO.md:96-99):**
> - HTML open → WWW flourished
> - USDZ captured by Apple → locked to Apple hardware
> - Wikidata open → Wikipedia powers half the internet
> - Meta's social graph closed → walled gardens

**Issue:** USDZ is an Apple-originated wrapper around Pixar's open USD format. USD itself is open (BSD-style), and USDZ viewers exist for Android + web. "Locked to Apple hardware" is technically false; the gating is about *ecosystem + authoring tools*, not *hardware*.

**Risk:** first comment on HN / X will be "that's not quite right — USD is open." Wastes a rebuttal cycle.

**Fix:** replace with
> - USDZ shaped by Apple → ecosystem defaults gate adoption

Or keep simpler:
> - USDZ Apple-gated → ecosystem captured by default

Takes 60 seconds.

---

## All other citations verified

- Bush / memex / 1945 ✓ ("As We May Think")
- Nelson / Xanadu / 1965 ✓
- Berners-Lee / WWW / 1989 ✓
- Berners-Lee / Giant Global Graph / 2007 ✓
- Page + Brin / PageRank / 1998 ✓
- Hofstadter / GEB + Surfaces and Essences ✓
- Pattee / epistemic cut ✓ (biology/symbol-grounding literature)
- Simon / near-decomposability ✓ ("The Architecture of Complexity" 1962)
- Blake / "doors of perception" ✓ (Marriage of Heaven and Hell 1790, via Huxley 1954)

No hallucinations in citations.

## Schema consistency — CLEAN

Entity types `object.primitive | glb | hologram | light | emitter | wire-source` are consistently referenced across:
- `SPEC.md:61`
- `llms.txt` entity-types line
- `index.html` entity list
- `runtimes/unity/README.md` mapping table
- `runtimes/icosa/viewer.html`

No drift. No contradictions. Examples in `examples/01-minimal.xrai.json` … `04-hologram.xrai.json` use these types correctly.

## `specs/XRAI_FORMAT_SPECIFICATION_V2.md` referenced from SPEC.md:3

File exists on disk. Internal cross-link resolves. ✓

---

## Summary for the launch checklist

Two small doc edits close both findings; neither requires runtime work before 2026-04-29 launch:

1. SPEC.md:75 — append "(reference implementation pending RFC-0001)"
2. MANIFESTO.md:97 — soften USDZ line to "ecosystem captured" framing

Ship these; mark the two read-through checkboxes green.
