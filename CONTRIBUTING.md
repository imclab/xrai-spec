# Contributing to XRAI

Thanks for caring about an open spatial graph format. Here's how to help.

## Before you contribute

1. Read [`MANIFESTO.md`](./MANIFESTO.md) — what XRAI is and is not, and why it has to stay open.
2. Read [`SPEC.md`](./SPEC.md) — the v1.0 draft (extracted from Portals). "Whatever ships in Portals today IS v1.0."
3. Skim [open issues](https://github.com/imclab/xra1/issues) + [discussions](https://github.com/imclab/xra1/discussions) — your idea may already be in flight.

## Ways to contribute

**Zero-code:**
- File an issue describing a missing primitive, ambiguous spec text, or broken example.
- Post a scene you authored (voice prompt + exported XRAI) in `/discussions/showcase`.
- Dogfood: try authoring XRAI with Claude / GPT / Gemini, report where the LLM got confused.

**Low-code:**
- Parser for a language we don't yet cover (see `runtimes/`).
- Example scene in `examples/` — real, working, under 200 lines.
- Improve LLM authoring prompts in `prompts/`.

**High-effort:**
- Reference runtime for a target engine (Three.js, PlayCanvas, Unreal, visionOS, Godot).
- Conformance tests in `runtimes/_conformance/`.
- MCP server tools in `mcp-server/`.
- Typed TS + Rust + Python parser libraries.

## How the process works

**Issues first, PRs second.** If the work involves a spec change, open a [discussion](https://github.com/imclab/xra1/discussions) or issue before writing a PR — saves you from work we can't accept.

**Small PRs only.** One change per PR. If your PR touches more than five files, split it.

**Spec changes** require a short RFC in `/rfcs/NNNN-<slug>.md`. Template: motivation, design, alternatives considered, compatibility impact. Any breaking change needs a major version bump.

**Reference implementations** don't need an RFC. File a PR directly. Include a test proving it round-trips against the conformance suite.

## Style

- Markdown: one sentence per line in spec + normative docs. Helps review diffs.
- Spec JSON: 2-space indent, LF endings.
- Code: follow the host language's idiomatic style. No bikeshedding in PR review.

## Governance

Year 1: @jamestunick is BDFL. Decisions visible in public issue threads. No private Slack.

Year 2+: transfer to Apache Software Foundation or W3C Community Group once we have 1000+ external adopters (measured via GitHub stars + runtime downloads + referenced-in-production scenes). Never to a single-vendor foundation.

## License + signing

All contributions are MIT-licensed. You are attesting that you have the right to contribute the code/text. No CLA. No assignment to a corporation.

## Code of Conduct

See [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md). Short version: behave like an adult who wants the project to succeed.

## Where to ask

- Public questions: [GitHub Discussions](https://github.com/imclab/xra1/discussions).
- Security issues: `security@xrai.dev` (private). Do not file public issues for security.
- Everything else: open an issue.
