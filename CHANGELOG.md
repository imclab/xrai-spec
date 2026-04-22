# Changelog

All notable changes to the XRAI spec + reference implementations.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning follows [Semantic Versioning](https://semver.org/): MAJOR.MINOR.PATCH. Breaking spec changes → MAJOR. New primitives or optional fields → MINOR. Docs / typo / clarifications → PATCH.

## [Unreleased]

### Planned for v1.1
- Event primitives beyond stub (temporal scheduling, triggers, reaction chains).
- Conformance suite (`runtimes/_conformance/`) with minimum viable pass bar.
- Three.js + PlayCanvas reference adapters (alpha).
- MCP server tool surface finalized (`mcp-server/`).

### Planned for v1.2
- visionOS + Unreal reference adapters.
- Federated query (`xrai-fed://`).
- Signed graphs (author attestation, optional).

---

## [1.0.0] — 2026-04-29

First public release. Extracted from the Portals codebase (h3m.ai) as shipped on the CVPR 2026 camera-ready (2026-04-10).

### Added
- Top-level schema: `xrai_version`, `id`, `author`, `scene`, `relations`, `events` (stub).
- Entity primitives: `cube`, `sphere`, `cylinder`, `capsule`, `plane`, `glb`, `hologram`, `light`, `emitter`.
- Relation types: `parent-of`, `wire-binds`, `reacts-to-audio`, `tracks`.
- URI scheme: `xrai://<uuid>/node/<id>`.
- MIME type: `application/vnd.xrai+json`.
- Minimal example scene in `SPEC.md §Examples`.
- LLM authoring guidance in `MANIFESTO.md`.
- 10 design principles.
- BDFL governance (Year 1), transition-to-foundation criteria documented.
- MIT license for spec text, reference implementations, and prompt libraries. CC0 for the normative JSON schema.

### Known gaps
- Event primitives are a stub. Temporal scheduling + triggers ship in 1.1.
- Reference runtimes beyond Portals (Unity) are README-only. Three.js + PlayCanvas adapters are week-2 deliverables.
- No standalone validator CLI yet. Conformance tests ship with 1.1.
- `demos/jarvis_demos.md` scripts are documented but videos are not yet recorded.

### Out of scope for v1
- Physics simulation semantics (engine-defined).
- Rendering quality or LOD hints (renderer-defined).
- Multiplayer sync protocol (separate spec, planned).
- Rights + monetization layer (intentionally absent — spec is neutral).

---

## How to read this changelog

- **[Unreleased]** shows what's in flight. No guarantees until versioned.
- Each release section is frozen once tagged. Fixes applied post-release go to the next version.
- Breaking changes are called out explicitly. Migration notes live at `docs/migrations/<from>-<to>.md`.

If you depend on XRAI and a change would break you, file an issue before we tag — we'd rather know.
