# XRAI RFCs

**R**equests **F**or **C**omments — the process for changing the XRAI spec.

Small clarifications, typo fixes, and non-normative doc improvements don't need an RFC. Submit them as direct PRs.

**Anything that would require a version bump — new primitives, changed entity / relation schemas, new MIME types, new conformance requirements, new URI schemes — requires an RFC.**

## Why

Specs that drift without a paper trail rot. An RFC is a commitment: here's the idea, here's the motivation, here's what will break, here's how we migrate. Future you (and anyone reading the spec in 2029) will thank present you for writing it down.

## Process

1. **Open a [Discussion](https://github.com/imclab/xra1/discussions) first.** If the room shrugs, file an issue. If the idea has traction, proceed to RFC.
2. **Copy [`0000-template.md`](./0000-template.md) to `NNNN-<slug>.md`.** `NNNN` is the next available 4-digit number (check latest merged RFC + 1).
3. **Fill in every section honestly.** "Alternatives considered" and "Backwards compatibility" are the ones most RFCs get wrong — no hand-waving.
4. **Open a PR** with the RFC markdown only. No implementation. The RFC itself is the thing under review.
5. **Discussion period:** minimum 2 weeks. Longer for breaking changes. BDFL (@jamestunick) is the eventual decider in Year 1; transitions to Apache/W3C Community Group post-1000-adopters.
6. **Accepted RFCs merge.** Implementation happens in a follow-up PR that references the RFC number.
7. **Rejected RFCs merge** into `rfcs/_rejected/` with a `# Why not` postscript. No RFC is deleted — the history is the library of decisions.

## Statuses

- **Draft** — author still writing. PR in draft state.
- **Under review** — PR open, public discussion period active.
- **Accepted** — merged to `main`. Implementation may begin.
- **Implemented** — ships in a spec version. RFC marked with the shipping version.
- **Superseded** — replaced by a later RFC. RFC keeps a pointer to the successor.
- **Rejected** — moved to `_rejected/` with a "Why not" postscript.
- **Withdrawn** — author pulled it before merge. Archived in `_withdrawn/`.

## What NOT to file an RFC for

- Typo / grammar / formatting in existing docs → direct PR
- Example clarifications (adding a sample that shows existing behavior) → direct PR
- New reference runtime adapters (Three.js / Unreal / visionOS) → direct PR, they conform to the spec, they don't change it
- Tooling (validator CLI, MCP server extensions, test harness) → direct PR or issue
- Anything that breaks published schemas without a migration path → RFC **and** major version bump

## In-flight RFCs

None yet. First candidates planned for v1.1:

- **0001** — Event primitives (temporal scheduling, trigger chains, reaction graphs). Currently stubbed in v1.0.
- **0002** — Typed n-ary hyperedges (replaces v1.0 binary relations). Currently spec'd at SPEC.md § Future.
- **0003** — Conformance test corpus + normative runtime behavior.

File one if you want to write it.

## Governance note

RFCs are how the community shapes XRAI post-BDFL. Year 1: @jamestunick merges. Year 2+: transferred to Apache Software Foundation or W3C Community Group once 1000+ external adopters are validated. Never to a single-vendor foundation. The RFC process itself may be revised by an RFC (meta-level — use `rfcs/meta/NNNN-<slug>.md`).
