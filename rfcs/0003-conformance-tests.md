# RFC 0003: Conformance test corpus + normative runtime behavior

- **Status:** Draft
- **Author:** @jamestunick
- **Date:** 2026-04-22
- **Target version:** v1.1
- **Related:** [RFC 0001 events](./0001-event-primitives.md), [RFC 0002 hyperedges](./0002-nary-hyperedges.md), `scripts/governance-readiness.sh § Criterion 2`

---

## Summary

Ship a normative conformance test corpus (`runtimes/_conformance/`) + a pass/fail reference harness that every runtime must clear to claim XRAI v1.1-compatibility. Creates a mechanical gate for the "3 runtimes passing conformance" criterion in the BDFL→foundation transfer protocol.

> **Alignment with engineering spec.** v2 (`specs/XRAI_FORMAT_SPECIFICATION_V2.md`) ships binary-packed paint strokes (32 bytes/point, § 9 Binary Data Strategy) for efficiency. This RFC's conformance fixtures are JSON-only v1.0 docs for pedagogical + public-adapter use. Runtime adapters that implement both v1.0 JSON + v2 binary can drop BOTH `<runtime>.v1.ok` and `<runtime>.v2.ok` markers.

## Motivation

Today, "XRAI-compatible" is self-declared. This is how formats fork silently. Without a conformance corpus:

- `governance-readiness.sh` Criterion 2 (≥3 non-Portals runtimes pass conformance) is unmeasurable.
- The FAQ promise "any XRAI runtime can load any XRAI doc" has no teeth.
- External contributors have no target to hit when writing an adapter.
- Subtle parse differences (whitespace, number precision, unknown-field preservation) silently diverge across Three.js / Unity / Unreal / visionOS.

glTF solved this with `glTF-Sample-Assets` + Khronos conformance tests. XRAI needs the same.

## Design

### Corpus layout

```
runtimes/_conformance/
├── README.md                     # how to run the suite
├── v1.0/
│   ├── 001-minimal.xrai.json     # single cube — parse + preserve
│   ├── 002-voice-prompt.xrai.json
│   ├── 003-wired.xrai.json
│   ├── 004-hologram.xrai.json
│   ├── 010-unknown-fields.xrai.json   # forward-compat test
│   ├── 011-forgiving-parse.xrai.json  # Postel partial inputs
│   └── 012-roundtrip-stability.xrai.json
├── v1.1/                         # adds event + hyperedge fixtures
│   ├── 020-recurring-event.xrai.json
│   ├── 021-causal-chain.xrai.json
│   ├── 022-counterfactual-branch.xrai.json
│   ├── 023-coauthorship-hyperedge.xrai.json
│   ├── 024-clinical-report-hyperedge.xrai.json
│   └── 025-mixed-binary-and-nary.xrai.json
└── results/                      # each runtime drops <name>.ok or <name>.fail
    ├── threejs.ok
    ├── unity.ok
    ├── unreal.fail
    └── visionos.ok
```

### Normative behavior (what each runtime must guarantee)

A conforming v1.1 runtime MUST:

1. **Accept** every well-formed fixture in `v1.0/` and `v1.1/` (where v1.1 = v1.0 + events + hyperedges).
2. **Preserve** unknown fields on round-trip (forward-compat rule).
3. **Produce** semantically-equivalent output when re-exporting an imported fixture — tested via a normalized-diff tool.
4. **Reject** malformed docs with a clear error (not silent failure) — fixtures in `v1.0/_malformed/` test this negative path.
5. **Stable sort** event arrays by `t` then `id` to enable deterministic replay.
6. **Graceful-degrade** on v1.2+ fields (preserve them; do not render them if unimplemented).

### Reference harness

```bash
# scripts/xrai-conformance
# Usage: xrai-conformance --runtime <name> --adapter <path-to-runtime-cli>
xrai-conformance --runtime threejs --adapter ./runtimes/threejs/bin/cli
# Exits 0 + writes runtimes/_conformance/results/threejs.ok on pass
# Exits non-zero + writes runtimes/_conformance/results/threejs.fail on fail
```

The adapter CLI contract: read XRAI JSON on stdin, emit normalized round-trip on stdout, exit 0 iff parse succeeded. Harness diffs stdout against expected output.

### Normalized-diff tool

Deep-equal comparison after:
- Sort object keys lexicographically
- Normalize numeric precision (float32 round-trip)
- Strip whitespace from string values that contain only whitespace-diff
- Ignore `metadata.debug.*` fields (runtime-local debug)

## Alternatives

**A. Ship only format text + trust self-reports.** Current state. Rejected — see motivation.
**B. Outsource to W3C test framework.** Too early; we have no institutional home yet. Re-consider post-foundation-transfer.
**C. Snapshot-test (golden-file) instead of semantic diff.** Brittle to numeric precision + key ordering. Rejected.
**D. Property-based / fuzz testing via QuickCheck-style generator.** Complementary, not a replacement. Future RFC.

## Backwards compatibility

- v1.0-only runtimes: pass v1.0 corpus, SKIP v1.1 corpus, drop `v1.0.ok` marker.
- v1.1 runtimes: pass both. v1.0.ok + v1.1.ok markers.
- Full compatibility table in `runtimes/_conformance/README.md`.

## Implementation plan

1. Author 13 fixtures (6 v1.0 already exist in `examples/` — reuse + copy).
2. Write reference adapter CLI for Portals runtime (sets baseline pass behavior).
3. Write normalize-diff tool (~200 lines Python).
4. Write `xrai-conformance` harness (~100 lines bash).
5. Document how external runtimes hook in (`runtimes/_conformance/README.md`).
6. Wire into `scripts/governance-readiness.sh` Criterion 2 (count `*.ok` files).

## Unresolved

- Performance bar: should conformance include latency assertions (parse < Nms per KB)? **Current proposal:** no — performance is a separate benchmark suite. Conformance = correctness.
- Should fixtures be generated or hand-authored? **Current proposal:** hand-authored for readability. Generator-based later.
- Multi-runtime replay: does `ok` require cross-runtime round-trip identity, or per-runtime only? **Current proposal:** per-runtime for v1.1; cross-runtime round-trip is a v1.2 RFC.

## Prior art

- **Khronos glTF-Sample-Assets + glTF-Conformance-Suite**
- **W3C Web Platform Tests (WPT)** — every browser ships WPT pass results
- **JSON Schema Test Suite** — fixtures + expected outcomes across implementations
- **IETF JOSE/COSE interop tests** — signed-token format cross-lib verification

## Adoption signals

- At v1.1 ship: `threejs.ok` + `unity.ok` present (we author both).
- Within 60 days: 1 external `.ok` from a non-Portals contributor.
- Within 6 months: 3 external `.ok` files → unblocks governance-readiness Criterion 2.
