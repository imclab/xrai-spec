# RFC 0013: Master ontology — faceted axes, archetype grouping, continuous learning

- **Status:** Draft
- **Author:** @jamestunick
- **Date:** 2026-04-23
- **Target version:** v1.2 (ships with RFC 0009 / 0012)
- **Related:** **RFC 0009 (stream ingestion + SSE)**, **RFC 0010 (archetypes)**, **RFC 0012 (decoder contract)**
- **Prior art:** Wikidata P31/P279, schema.org, WordNet, CIDOC-CRM, BFO, SUMO, Cyc/OpenCyc, DBpedia, YAGO, BabelNet, Dublin Core, CIDOC-PROV-O, Ranganathan colon classification, UDC faceted classification, OpenTelemetry semantic conventions, Penn Treebank POS tagset, NIST SI unit system

---

## Summary

Define a **master ontology** for XRAI that (a) is **faceted**, not a single tree — every ontology entry is tagged along 18 independent axes (identity, temporality, structure, topology, scale, role, grammar, dimensionality, modality, provenance, unit, trust, **physics regime, dynamics class, causality/driver, origin [nature-vs-nurture], expression cascade [genotype-to-phenotype], emergence level**); (b) groups archetypes (RFC 0010) as *saved queries* over facet tuples; (c) **learns + grows continuously** — new component candidates arrive from ingestion (RFC 0009), are auto-aligned via embeddings, reviewed, and promoted into the public ontology via a lightweight RFC-or-auto path. Scale A5 spans linguistic → narrative → digital → subatomic → molecular → cellular → organismal → ecological → cosmic. The ontology is itself an XRAI document (self-referential), versioned, diffable, and signable.

## Motivation

- A single fixed taxonomy dies on first contact with the real world. Wikidata proved facets + crowd-learned ontology scale where Cyc/SUMO's hand-curated trees stalled.
- RFC 0009 emits components keyed by ontology names (`pose_6dof`, `metric_value`, `heart_rate_bpm`, `text`, …). Without a **master** ontology, every adopter coins their own names — the M+N promise of the semantic bus collapses back to M×N.
- Decoders (RFC 0012) need to dispatch on **multiple independent criteria**: "I consume anything 3D + live-stream + geometry-kind" is a filter across three axes, not one. A faceted ontology makes that filter trivial; a single tree forces every decoder to walk the tree.
- Data types drift. `heart_rate_bpm` today, `hrv_rmssd` tomorrow, `ecg_lead_ii` next week. Ingestion adapters will encounter names the spec hasn't seen. The ontology MUST have a first-class mechanism for observing + aligning + promoting these without a human in the critical path.
- The ontology is the most load-bearing asset in XRAI: it's what makes the format semantic instead of merely structured. It deserves its own RFC, not a buried sub-section.

## Design

### 1. Faceted axes (independent dimensions)

Every ontology entry (component name, archetype, entity-type, relation-type) carries tags along these axes. Axes compose orthogonally — an entry may carry any subset per axis, including multiple values.

| Axis | Purpose | Values (v1 starter) |
|---|---|---|
| **A1 · Identity** | What *kind* of thing at the upper level | `person`, `place`, `thing`, `concept`, `event`, `quantity`, `property`, `relation`, `agent`, `system`, `process` |
| **A2 · Temporality** | How it relates to time | `static`, `linear-time`, `non-linear-time`, `live-stream`, `recorded-stream`, `snapshot`, `interval`, `recurring`, `counterfactual` |
| **A3 · Structure** | Shape of the payload | `structured`, `semi-structured`, `unstructured`, `mixed` |
| **A4 · Topology** | Graph-theoretic shape | `atom`, `node`, `edge`, `hyperedge`, `graph`, `hypergraph`, `tree`, `lattice`, `bag`, `sequence`, `grid` |
| **A5 · Scale hierarchy** | Nested whole-vs-part across ALL domains. Each domain is an independent sub-axis; an entry may carry values from multiple domains | **Linguistic:** `letter`, `phoneme`, `morpheme`, `word`, `sentence`, `paragraph`, `chapter`, `book`, `corpus`. **Narrative:** `frame`, `shot`, `clip`, `scene`, `act`, `film`, `series`. **Digital:** `bit`, `byte`, `param`, `record`, `file`, `folder`, `collection`, `repo`, `org`. **Temporal window:** `sample`, `window`, `session`, `cohort`, `era`. **Subatomic:** `quark`, `lepton`, `boson`, `gluon`, `photon`. **Nuclear:** `proton`, `neutron`, `electron`, `nucleus`. **Atomic:** `atom`, `ion`, `isotope`. **Molecular:** `molecule`, `polymer`, `nucleotide`, `amino-acid`, `peptide`, `protein`, `lipid`, `carbohydrate`. **Supramolecular:** `complex`, `organelle`, `membrane`, `ribosome`. **Cellular:** `prokaryote`, `eukaryote`, `cell`, `tissue`, `organ`, `organ-system`. **Organismal:** `individual`, `clone`, `colony`, `population`, `species`, `super-organism`. **Ecological:** `niche`, `community`, `ecosystem`, `biome`, `biosphere`. **Planetary → cosmic:** `planet`, `moon`, `system`, `star`, `cluster`, `galaxy`, `supercluster`, `cosmic-web`, `universe`, `multiverse` |
| **A6 · Role (resource kind)** | What category of artifact | `data`, `algorithm`, `model`, `asset`, `file`, `schema`, `mapping`, `decoder`, `blueprint`, `ontology-entry`, `test-vector` |
| **A7 · Grammar / sign** | Symbol-vs-meaning stratification | `symbol`, `referent`, `signifier`, `signified`; `noun`, `pronoun`, `verb`, `adjective`, `adverb`, `determiner`, `preposition`, `conjunction`, `interjection`, `numeral` (Penn Treebank-aligned) |
| **A8 · Dimensionality** | Numeric rank / axis count | `0D-scalar`, `1D-time`, `1D-spatial`, `2D-image`, `2D-plane`, `3D-volume`, `3D-mesh`, `4D-spacetime`, `4D-video`, `5D-feature`, `ND-tensor` |
| **A9 · Modality** | Sensory / representational kind | `text`, `numeric`, `boolean`, `enum`, `image`, `video`, `audio`, `depth`, `pose`, `point-cloud`, `mesh`, `latent`, `shader-param`, `symbol-graph`, `haptic`, `olfactory`, `thermal`, `electromagnetic`, `biosignal` |
| **A10 · Provenance** | Origin of the emission | `human`, `agent`, `sensor`, `simulator`, `generator`, `derived`, `inferred`, `annotated` |
| **A11 · Unit / measure** | Metrology binding | `dimensionless`, `SI.<unit>`, `ISO-8601`, `currency.<ISO-4217>`, `custom.<slug>` |
| **A12 · Trust tier** | Confidence + verification state (aligns to CLAUDE.md T1–T4) | `T1-battle-tested`, `T2-partially-validated`, `T3-speculative`, `T4-benchmarked-external` |
| **A13 · Physics regime** | Which body of physical law governs | `classical-newtonian`, `special-relativistic`, `general-relativistic`, `quantum-mechanical`, `quantum-field`, `statistical-mechanical`, `thermodynamic`, `continuum`, `lattice`, `none` (non-physical / informational) |
| **A14 · Dynamics class** | Determinism + time-evolution character | `deterministic`, `stochastic`, `probabilistic`, `chaotic`, `non-deterministic`, `emergent`, `reductive`, `adaptive`, `equilibrium`, `non-equilibrium` |
| **A15 · Causality / driver** | What makes the state evolve | `physical-law`, `interaction`, `force`, `entropy`, `free-energy`, `information`, `selection`, `mutation`, `learning`, `design`, `intention`, `social`, `cultural`, `unknown` |
| **A16 · Origin** | Nature-vs-nurture gradient | `innate`, `genetic`, `epigenetic`, `developmental`, `environmental`, `learned`, `cultural`, `designed`, `mixed`, `gene-environment-interaction` |
| **A17 · Expression cascade** | The abstract → instance → effect pipeline across domains | **Bio:** `genotype`, `epigenome`, `transcript`, `protein`, `metabolite`, `phenotype`, `behavior`. **Software:** `source`, `intermediate-repr`, `compiled`, `runtime`, `effect`, `log`. **Physics:** `law`, `field`, `particle-instance`, `measurement`. **Design:** `concept`, `spec`, `prototype`, `product`, `usage` |
| **A18 · Emergence level** | Ontological-reduction position | `fundamental`, `composite`, `weakly-emergent`, `strongly-emergent`, `irreducible` |

**Open-closed principle:** axes are closed (adding an axis requires an RFC); axis values are open (adding values is a PR under RFC 0003 conformance gating).

### 2. Upper layer — universal top categories

A thin universal top layer borrowed from BFO + schema.org + Wikidata, normalized to one slug per concept:

```
Entity
├── Occurrent                  (things that happen)
│   ├── Event                  (bounded occurrent)
│   ├── Process                (continuous occurrent)
│   └── State                  (instantaneous occurrent snapshot)
└── Continuant                 (things that persist)
    ├── Independent
    │   ├── Person             (conscious agent)
    │   ├── Place              (spatial region)
    │   └── Thing              (physical object)
    └── Dependent
        ├── Property           (quality, attribute)
        ├── Quantity           (measurable magnitude)
        ├── Concept            (abstract / informational)
        ├── Relation           (binary or n-ary bond)
        └── System             (composite of the above)
```

**Strata view** (A5 scale + A18 emergence, read upward). Each stratum's laws are consistent with the one below, but higher strata also have their own **emergent** laws that are irreducible in practice:

```
Culture / society / memes        (A15=cultural, A18=strongly-emergent)
Mind / cognition / language      (A15={learning,intention}, A18=strongly-emergent)
Organism / behavior / ecology    (A15=selection, A14=adaptive, A18=strongly-emergent)
Cell / tissue / organ / system   (A13=continuum/biochem, A14=adaptive)
Biochemistry / metabolism        (A13=statistical, A15=free-energy)
Chemistry / reactions            (A13=quantum-mechanical, A14=stochastic)
Atomic / molecular               (A13=quantum-mechanical, A5=atomic/molecular)
Subatomic / fields               (A13=quantum-field, A18=fundamental)
Spacetime / cosmology            (A13=general-relativistic, A5=cosmic)
```

Every ontology entry inherits from one of the upper-layer categories AND sits somewhere in the strata. An archetype (RFC 0010) is a saved query across those axes: `Hologram` := `Thing ∩ 3D-mesh ∩ live-stream ∩ modality:depth`; `ProteinFold` := `Thing ∩ A5:protein ∩ A17:phenotype ∩ A13:quantum-mechanical ∩ A18:weakly-emergent`; `EvolutionaryTrajectory` := `Process ∩ A15:{selection,mutation} ∩ A14:stochastic`.

### 3. Mid layer — faceted groupings (examples)

Mid-layer entries are named intersections of axis values. These are the concrete dispatch targets decoders consume. Examples span **digital, linguistic, market, physical, chemical, biological, cognitive, and cultural** domains to show the axes are universal, not spatial-only:

| Mid entry | Facets |
|---|---|
| `LiveSensorStream` | A2=live-stream, A3=structured, A4=sequence, A10=sensor |
| `StaticAsset` | A2=static, A6=asset |
| `HypergraphScene` | A4=hypergraph, A1=thing, A8=3D-mesh |
| `TextCorpus` | A3=unstructured, A5=corpus, A9=text |
| `TimeSeriesMetric` | A2=linear-time, A8=0D-scalar, A9=numeric, A11=SI.* |
| `Pose6DOFStream` | A2=live-stream, A8=3D-spatial, A9=pose |
| `LatentFrame` | A8=ND-tensor, A9=latent, A10=generator |
| `StructuredLog` | A3=semi-structured, A4=sequence, A6=data, A9=text |
| `MarketTick` | A1=quantity, A2=live-stream, A8=0D-scalar, A9=numeric, A11=currency.*, A15=social |
| `MocapSkeleton` | A1=person, A2=live-stream, A8=3D-spatial, A9=pose, A4=tree |
| `QuarkState` | A1=thing, A5=subatomic:quark, A13=quantum-field, A14=probabilistic, A18=fundamental |
| `AtomicOrbital` | A1=thing, A5=atomic, A13=quantum-mechanical, A14=probabilistic, A8=3D-volume, A18=composite |
| `NewtonianRigidBody` | A1=thing, A13=classical-newtonian, A14=deterministic, A15=force, A18=composite |
| `RelativisticWorldline` | A1=thing, A13=general-relativistic, A14=deterministic, A8=4D-spacetime |
| `ThermodynamicState` | A1=property, A13=statistical-mechanical, A14=equilibrium, A15=entropy, A18=weakly-emergent |
| `FreeEnergyLandscape` | A1=property, A13=statistical-mechanical, A14=non-equilibrium, A15=free-energy |
| `ChaoticAttractor` | A1=process, A13=classical-newtonian, A14=chaotic, A15=physical-law, A18=strongly-emergent |
| `ChemicalReaction` | A1=event, A5=molecular, A13=quantum-mechanical, A14=stochastic, A15=free-energy, A17={law→particle-instance} |
| `Biochemistry.MetabolicPath` | A1=process, A5=molecular, A14=stochastic, A15=free-energy, A17=metabolite, A18=weakly-emergent |
| `AminoAcidSequence` | A1=concept, A5=macromolecular:amino-acid, A3=structured, A4=sequence, A16=genetic, A17=transcript |
| `ProteinFold` | A1=thing, A5=macromolecular:protein, A8=3D-mesh, A14=deterministic, A17=phenotype, A18=weakly-emergent |
| `Genotype` | A1=concept, A16=genetic, A17=genotype, A18=fundamental |
| `Phenotype` | A1=property, A16=gene-environment-interaction, A17=phenotype, A18=strongly-emergent |
| `GeneExpression` | A1=process, A2=linear-time, A15=information, A17={genotype→protein}, A14=stochastic |
| `Cell` | A1=thing, A5=cellular:cell, A8=3D-volume, A14=adaptive, A15=free-energy, A18=strongly-emergent |
| `Organism` | A1=person/thing, A5=organismal:individual, A14=adaptive, A15=selection, A16=gene-environment-interaction, A18=strongly-emergent |
| `SuperOrganism` | A1=system, A5=organismal:super-organism, A14=emergent, A15={social, selection}, A18=strongly-emergent |
| `Ecosystem` | A1=system, A5=ecological:ecosystem, A14=non-equilibrium, A15={free-energy, selection}, A18=strongly-emergent |
| `EvolutionaryTrajectory` | A1=process, A2=linear-time, A14=stochastic, A15={selection, mutation}, A16=gene-environment-interaction, A17={genotype→phenotype} |
| `LearnedBehavior` | A1=process, A14=adaptive, A15=learning, A16=nurture, A17=behavior |
| `InnateReflex` | A1=process, A14=deterministic, A15=physical-law, A16=innate |
| `CulturalMeme` | A1=concept, A15=cultural, A16=cultural, A18=strongly-emergent |
| `LLMToolCall` | A1=event, A2=live-stream, A10=agent, A15=intention, A9=text |
| `SessionMetric` | A1=quantity, A2=live-stream, A8=0D-scalar, A10=agent, A15=unknown (from `history.jsonl`) |
| `ConsoleLogLine` | A1=event, A2=live-stream, A3=semi-structured, A9=text, A10={human, agent} |
| `NewsArticle` | A1=event, A3=unstructured, A5=paragraph, A9=text, A15={social, cultural} |

Mid entries are **not** required — ingestion can produce ad-hoc component names; mid entries exist only where they help decoder dispatch or reader comprehension. **The point of the new physics/bio axes: a physics-simulator decoder subscribes with `filter: { facets: { A13: 'classical-newtonian' } }` and gets only Newtonian bodies; a quantum decoder subscribes with `A13: 'quantum-mechanical'`; an evolutionary-sim decoder with `A15: 'selection'`; a cultural/social decoder with `A15: {social, cultural}`. One stream, many lawful readings.**

### 4. Archetypes as saved queries (bridge to RFC 0010)

An archetype is a named intersection over facets plus a bundle of required/optional components:

```json
{
  "archetype_id": "Hologram",
  "identity": "Thing",
  "facets": { "A1":"thing", "A2":"live-stream", "A8":"3D-mesh", "A9":"depth" },
  "required_components": ["transform", "hologram_feed"],
  "optional_components": ["material", "audio_reactive_gain"],
  "extends": ["Thing"],
  "since_version": "1.1"
}
```

This makes archetypes (a) discoverable by facet query, (b) automatically derivable from empirical data (see §6 learning), (c) version-stable — adding a component to an optional list doesn't change archetype identity.

### 5. Ontology-as-XRAI (self-reference)

The ontology IS an XRAI document:

- Entries are entities (`entity_path = /ontology/component/<slug>`).
- Axis memberships are relations (RFC 0002 n-ary hyperedges): `(entry, axis, value)` triples.
- Version bumps are events (timeline.log_time).
- The ontology can be browsed, queried, and decoded like any other XRAI document — the landing page at `xra1.com/ontology` is itself a force-graph render of the ontology (dogfood).

This is the same move Wikidata made (everything is an item, including properties). It buys us: one schema, one toolchain, one query surface.

### 6. Continuous learning — how the ontology grows

Ingestion (RFC 0009) observes component names in the wild. When a mapping emits a component slug that is not in the ontology, XRAI does NOT reject it. Instead:

1. **Candidate capture.** The unknown slug is recorded under `xrai://ontology/candidates/<slug>.json` with: first-seen timestamp, emitting mapping id, observed payload samples, inferred dimensional/modality facets from payload shape.

2. **Auto-alignment.** A nightly process computes embeddings of each candidate's `(name + sample payloads + context)` and ranks nearest existing ontology entries. If cosine-sim ≥ 0.92 and facet-overlap ≥ 3 axes → auto-propose as alias. If 0.75–0.92 → propose as sibling. If <0.75 → propose as novel entry.

3. **Review + promotion.** Proposals land in a queue at `xrai://ontology/proposals/`. A maintainer (BDFL year 1; foundation after) reviews via a diff view. Accept → merged as a new ontology version; signed + changelogged. Reject → moved to `_rejected/` with reason.

4. **Soft-landing during review.** Until promotion, candidate slugs still work on the bus — they propagate as `provisional` entries that decoders MAY consume with a warning. Producers are never blocked by ontology latency.

5. **Auto-merge for low-risk cases.** If (auto-alignment cosine ≥ 0.98) ∧ (facet-overlap = all axes) ∧ (>1 independent producer observed the same slug) → auto-merge as an alias. Logged with provenance, reversible.

6. **Signed provenance.** Every ontology commit is signed by the committer (W3C VC later). Alias merges carry the originating producer's id so disputes are traceable.

### 7. Ontology versioning + compatibility

- **Additive changes** (new entry, new axis value, new alias) — minor version (1.2.1 → 1.2.2). All v1.2 runtimes handle.
- **Axis additions** — require RFC, ship in next minor (1.2 → 1.3).
- **Renames / removals** — require RFC + 2-version deprecation window; old slug becomes alias.
- **Alias fan-in** — unlimited. `heart_rate_bpm` ← alias ← `hr_bpm`, `bpm_heart_rate`, `pulse_per_minute`. Aliases resolve at SSE decode, producers can emit any.

### 8. Public query interface

The ontology exposes:

- `xrai://ontology/query?facets[A1]=thing&facets[A8]=3D-mesh` — JSON list.
- SPARQL / Cypher-like surface (later RFC) — defer until real load.
- `xrai://ontology/component/<slug>` — full record.
- `xrai://ontology/changelog` — signed version history.
- MCP tool `ontology.search(query)` for LLM agents authoring mappings or blueprints.

### Conformance impact

v1.2 runtimes MUST:
1. Dereference `component` slugs against the master ontology (with alias resolution).
2. Accept `provisional` entries — render/process them best-effort.
3. Never hard-fail on unknown slug (capture + annotate, never drop).
4. Publish a manifest declaring which ontology version they target + fallback behavior.

### Error semantics

- Unknown slug: accept as `provisional`; emit a `ontology_missing` warning event (itself an ontology entry: `Event.OntologyMissing`).
- Alias cycle: broken at resolve — first-hit wins; log cycle to `ontology/diagnostics/`.
- Conflicting facet tags across versions: the newer version wins at resolve; older stays as history.

## Alternatives considered

### A — single hierarchical tree (Cyc / SUMO style)
Rejected: 30-year evidence says hand-curated trees don't scale past ~50k concepts. Facets + learning do (Wikidata is >110M items).

### B — free-form tag cloud (folksonomy)
Rejected: no structure → no decoder dispatch. Aliases lose their semantics.

### C — adopt schema.org directly
Schema.org is web-centric (Article, Event, Product, …). Missing: sensor streams, mocap, shaders, biosignal, agent traces. We reuse schema.org entries where they exist (`Person`, `Place`, `Event`) and extend with domain-specific slugs.

### D — adopt Wikidata directly
Too general, too big, too slow. We reuse Wikidata's P31/P279 pattern and link select entries by QID for interop but don't force every XRAI component to resolve against WD.

### E — adopt an existing upper ontology (BFO / DOLCE / SUMO) as-is
Too formal for everyday use; too sparse on the modalities we care about. We borrow upper-layer names (Continuant, Occurrent) where they disambiguate; we don't inherit the axiomatic baggage.

### F — defer ontology to post-v1
Rejected: without an ontology, RFC 0009's component strings are meaningless and RFC 0012's decoder dispatch has nothing to dispatch on. Ontology is v1.2 blocking.

## Backwards compatibility

- v1.0/1.1 runtimes do not consult the ontology; they see component strings as opaque. Still works — snapshot projection (RFC 0009) doesn't require ontology resolution.
- Adding ontology entries never changes a wire message. Removing entries follows the 2-version deprecation window above.

## Implementation plan

1. RFC merged.
2. **Ontology v1 starter corpus** shipped at `xrai-website/ontology/v1.json`: ~200 entries covering the Tier-1 mappings from RFC 0009 (arkit, livekit, rgbd, mediapipe, claude-session-history, console-jsonl, unity-debuglog, mcp-tool-trace).
3. **Axes v1 spec** (A1–A12) frozen; axis-value additions follow PR process.
4. Auto-alignment pipeline (Python + embeddings via a tiny local model, e.g. MiniLM) behind `scripts/ontology_align.py`.
5. Proposal queue + signed commits + changelog surface.
6. MCP tool `ontology.search` for LLM-driven mapping authoring.
7. Ontology-as-XRAI self-reference landing page at `xra1.com/ontology`.
8. Decoders (RFC 0012) gain a `facets:` filter in their subscription call.

## Unresolved

- **Cross-ontology alignment** — do we mint XRAI-local slugs or always round-trip through schema.org/Wikidata QIDs where they exist? Propose: prefer local slug, carry `external_refs:[schemaorg:Thing, wd:Q35120]` as a side-channel for interop.
- **Trust-tier promotion policy** — when does a candidate T3 slug become T1? Propose: after ≥3 independent producer observations + ≥1 decoder consumer in production for ≥30 days.
- **Private / proprietary extensions** — `x-<org>-<slug>` namespace for commercial domains where the org doesn't want to publish. Respect the namespace; never auto-merge into public ontology without org opt-in.
- **Adversarial poisoning** — bad actors flooding proposals. Rate-limit per signer, require stake, or require a sponsor from the accepted maintainer list.

## Prior art (primary sources only)

- **Wikidata** — P31 (instance of), P279 (subclass of), 110M+ items, crowdsource-learned. [site](https://www.wikidata.org)
- **schema.org** — Person, Place, Thing, Event hierarchy for web data. [schema.org](https://schema.org)
- **WordNet** — lexical semantic net; synsets. [princeton](https://wordnet.princeton.edu)
- **CIDOC-CRM** — cultural-heritage upper ontology, ISO 21127.
- **BFO (Basic Formal Ontology)** — Continuant / Occurrent upper split.
- **DOLCE** — descriptive ontology for linguistic + cognitive engineering.
- **SUMO / OpenCyc** — hand-curated upper ontologies (cautionary tale on scale).
- **DBpedia / YAGO / BabelNet** — auto-built ontologies from Wikipedia + WordNet.
- **Dublin Core** — 15-element metadata.
- **W3C PROV-O** — provenance ontology (our A10 aligns).
- **OpenTelemetry semantic conventions** — operational telemetry names; our telemetry-family components reuse verbatim.
- **NIST SI unit system** — our A11 Unit axis binds here.
- **Penn Treebank POS tagset** — our A7 grammar axis aligns.
- **Ranganathan colon classification + UDC** — library science's original faceted classification; our axis approach is a modern restatement.
- **Google / LinkedIn / Uber Knowledge Graphs** — production examples of learned + aligned enterprise ontologies.
- **SKOS** — W3C simple knowledge organization system — alias / preferred-label patterns.

## Future work

- **Embedding-based semantic search** across ontology entries (RFC 0013a).
- **Ontology as a learnable model** — fine-tuned LLM that predicts facet tags for novel slugs (RFC 0013b).
- **Cross-federation alignment** — XRAI ontologies in different organizations auto-align via shared schema.org / Wikidata anchors (RFC 0014 federated streams).
- **Counterfactual / belief / affordance** extensions (roadmap v1.2–v2.0) — these are new facet values in A1/A2/A7, not new axes.

## Adoption signals

- Ontology v1 starter corpus (≥200 entries) ships at v1.2.
- ≥10 proposals reviewed + merged in the first 6 months.
- ≥3 independent producers emit the same novel slug → auto-alias lands without human review.
- ≥1 external decoder uses the facet-filter API instead of hard-coded component names.
- First LLM-authored mapping that references `ontology.search` lands by end of Q3 2026.
