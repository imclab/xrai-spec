# jARvis × XRAI — First Demo Reel

> Purpose: 3 short videos (60s / 30s / 15s) that sell the XRAI + jARvis thesis — **spatial AI that gives users superpowers.** Shipped alongside Week-1 launch. See XXX spec §5.5 and `../MANIFESTO.md`.

Each demo proves one of the 6 superpowers from the thesis:
1. Persistent memory of everything
2. Time travel in your own life
3. Seeing through others' eyes (consensual)
4. Ambient expertise
5. Spatial search — find by shape/context/history
6. Collaborative world-building

## Demo 1 — "Voice to World" (60s, the hero)

**Pitch:** say a sentence, see a world.

**Script:**
- 0:00 — close-up of Alice in his apartment, iPhone in hand, Portals open, AR camera on empty room
- 0:05 — (voice) "jARvis, build a meditation garden here"
- 0:07–0:20 — objects materialize: low table, cushion, koi pond, bonsai, soft lighting. XRAI graph overlay briefly visible — 12 nodes, 8 relations
- 0:22 — (voice) "make the pond audio-reactive to my breathing"
- 0:24 — wire binding visualized, then ripples in the pond sync to breath
- 0:35 — (voice) "save this as 'morning space'"
- 0:37 — XRAI file exported, QR code appears
- 0:40 — cut to Bill on phone #2 scanning QR → same scene materializes in his different room
- 0:50 — text overlay: "XRAI. Open. MIT. Yours forever."
- 0:55 — URL: `xrai.dev`
- 1:00 — end

**Validates:** superpowers 1 (persistent memory) + 6 (collaborative / portable)
**Tech required:** Portals v4 current build + XRAI export
**Stretch:** Ray-Ban Meta re-record if hardware available

## Demo 2 — "Time Travel" (30s)

**Pitch:** rewind your own life.

**Script:**
- 0:00 — Alice at desk, Portals open, says "show me the last 5 conversations I had about Portals"
- 0:03 — spatial timeline materializes: 5 floating 3D scenes, each with transcript snippets
- 0:10 — Alice taps scene from Tuesday, voice plays back, his workspace from that moment visible in ghost form
- 0:18 — Alice says "resume from here" — scene re-activates, ready to continue
- 0:25 — text: "Memex, finally shipping. xrai.dev"
- 0:30 — end

**Validates:** superpower 2 (time travel)
**Tech required:** XRAI episode recording + retrieval + spatial scrubber UI (need to build — Week 2 stretch)

## Demo 3 — "Ambient Expertise" (15s)

**Pitch:** knowledge overlaid on reality.

**Script:**
- 0:00 — close-up of someone looking at a plant
- 0:02 — (voice) "what's wrong with this plant?"
- 0:04 — AR overlay: labels on yellowing leaves, "likely root rot — reduce watering by 30%", source links
- 0:10 — XRAI logo fades in: "AI grounded in your world. MIT. Open."
- 0:15 — end

**Validates:** superpower 4 (ambient expertise)
**Tech required:** jARvis voice + Gemini Vision + XRAI scene annotation (can be mock for v1)

## Production plan

**Week 1 (flag-plant):**
- [ ] Demo 1 v1 using current Portals build (no new code needed — proves the thesis with what ships today)
- [ ] Shot on iPhone, edited in Final Cut or DaVinci
- [ ] Upload to YouTube + embed on xrai.dev + paste in HN/X launch thread

**Week 2-3 (expand):**
- [ ] Demo 2 (may need spatial-scrubber UI built)
- [ ] Demo 3 (may need AR label overlay UI built)

**Week 4+ (federate):**
- [ ] Demo with Ray-Ban Meta or other glasses if SDK access granted
- [ ] Demo with external collaborator on shared XRAI graph

## Anti-patterns to avoid

- ❌ Over-produced, VFX-heavy demos — look like CGI fakes, erode trust
- ❌ Long intros — cut to the magic moment in <5s
- ❌ Technical narration — show don't tell
- ❌ Vaporware features — only demo what actually works in the build

## Distribution

- YouTube (searchable, embeddable)
- X thread with .mp4 embedded directly (higher view rate than YouTube links)
- HN post with demo + link to spec repo
- LinkedIn for investor / acquirer attention
- Discord / Slack for dev communities
- Reddit: `r/augmentedreality`, `r/LocalLLaMA`, `r/ArtificialIntelligence`
