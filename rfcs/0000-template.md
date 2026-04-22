# RFC 0000: <Short title>

- **Status:** Draft
- **Author:** @your-github-handle
- **Date:** YYYY-MM-DD
- **Target version:** v1.X (or v2.0 for breaking changes)
- **Related issues:** #NNN, #NNN
- **Supersedes:** (none / RFC NNNN)

---

## Summary

One paragraph, plain English. Someone who reads only this paragraph should understand what's being proposed.

## Motivation

Why does this need to exist? What's broken / missing / painful without it? Who's been asking for it? Cite discussions, issues, or real-world use cases.

Name the specific problem, not the general aspiration. "Users want better primitives" is not a motivation. "An XRAI scene can't describe a recurring scheduled event without encoding it as repeated entity stamps, which breaks compression and round-tripping (discussion #42, issue #87)" is a motivation.

## Design

Exact schema, syntax, behavior. Include:

- **JSON / schema fragments** — show the before / after of the normative schema
- **Example scenes** — at least one working before / after
- **Conformance impact** — what must a runtime do differently after this lands?
- **URI / MIME type changes** — if any
- **Error semantics** — what happens when input is malformed or partially valid?

Be specific. Someone implementing this from your RFC alone should not need to ask follow-up questions.

## Alternatives considered

At least three. Explain why you rejected each. If you haven't considered alternatives, stop writing the RFC and consider some — the first idea is rarely the best.

### Alternative A — do nothing

What happens if we don't ship this? Is there a workaround in existing spec? When does the workaround fall over?

### Alternative B — <name>

What would this look like? Why did you reject it?

### Alternative C — <name>

Same.

## Backwards compatibility

- **Existing documents:** will a v1.X document still parse + render correctly after this lands? If not, this is a breaking change and must be v2.0.
- **Existing runtimes:** will a runtime that only implements v1.X continue to work against a v1.Y document that uses this new feature? What's the graceful-degradation path?
- **Migration:** if this is breaking, describe the migration. One-line sed commands > hand-written converters > "users update manually."

## Implementation plan

What ships + in what order:

1. Spec text (this RFC merged)
2. Reference runtime update (Portals Unity)
3. Reference parser updates (TS / Python / Rust)
4. Conformance tests added
5. MCP server tool exposure (if applicable)
6. Docs + examples updated

Not every RFC touches every step. Call out which ones are skipped and why.

## Unresolved questions

What don't you know yet? Name them. Don't pretend the design is done if it isn't. Unresolved questions are a reason to delay an RFC to "Under review," not to merge it with hidden gaps.

## Prior art

Does any existing format / spec / protocol do this well (or badly)? USD, glTF, Wikidata, schema.org, OpenXR, MPEG-SCENE, X3D — show your homework. An RFC that doesn't cite prior art is an RFC that will reinvent a mistake.

## Future work

What does this unlock that isn't in scope for this RFC but might become another RFC later? Keep the list short — premature promises rot.

## Adoption signals

How will we know this was the right call? Concrete: "if a v1.2 runtime adopts this within 6 months + the conformance-corpus-bug count stays below X, we keep it. If not, revisit at v1.3 with an eye toward simplification."
