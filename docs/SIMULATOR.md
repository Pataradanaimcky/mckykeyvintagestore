# MODX M and FANTOM-0 simulators

Owner request, 2026-11-16: the site has no MODX M or FANTOM simulator; he wants one, and if there is no ready-made one, a way must be found. A dedicated scheduled task, "Mcky keyboard simulator builder", builds it. The project manager ("Mcky project manager") sets its priorities in `docs/ROADMAP.md` (Next, items marked "simulator agent") and answers its questions like the other agents (AGENTS.md, "Who decides").

## What "simulator" means here (read first)

- **No exact copy is possible or allowed.** The real sounds are the makers' own samples and data (Yamaha AWM2 waveforms, Roland ZEN-Core PCM). They cannot be downloaded, extracted or redistributed, and there is no official browser version of either keyboard. Never ship, extract or reverse-engineer factory sounds, waveforms or firmware; never copy the panel or screen design (owner decision of 2026-11-12, MODX M entry in DESIGN_LOG).
- **What we can build:** a page in the home-page rack for each keyboard that works the way the keyboard works and is played with our own engines and openly licensed samples:
  - **MODX M style:** a Performance of up to 8 keyboard parts (layer and split by key range), sample, FM and analog-style engines like the keyboard's three engines, a Super Knob that moves several parameters at once, and 8 Scenes that recall part settings.
  - **FANTOM-0 style:** a Scene with zones (layer and split), tones made of partials (sample, analog-style, supersaw, noise), and 16 pads.
  - The face is the store's own drawing, as on /studio. Labels say plainly that it is an emulation and not the keyboard's real sound, for example "จำลองการทำงานแบบ MODX M · ไม่ใช่เสียงจริงของเครื่อง". Maker names are plain text only, as in the footer trademark note.
- **Why it sells packs:** players learn the workflow on the site, hear the store's own sounds built for the simulator, and buy the real packs for their keyboard. Simulator versions of the store's packs are the owner's to approve (Waiting on the owner).

## Building blocks already in the repo

- `src/components/rack/poly/voices.ts` (`PolyVoices`): analog-style polysynth, chorus, filter. Basis for the AN-X-like and VA partials.
- `/worklets/dx7-poly.js` from `@audio/synth-dx7` (Apache-2.0, MSFA): 6-operator FM. An 8-operator FM-X-like engine has to be our own code (keep the MSFA licence notice for anything derived from it).
- `src/components/studio/gmPreview.ts` with smplr@1.1.0 (MIT) and FluidR3_GM (CC BY 3.0, hosted on gleitz.github.io): sample playback. Look for better openly licensed sample sets (CC0 or CC BY) with clear licences; record each one's licence and credit in README.md. Never use samples whose licence is unclear.
- `src/components/rack/RackCarousel.tsx`: add pages here (`PAGES`), each with `active` so only the page in view makes sound. `/#play-<id>` links open a page.

## Checklist (work top to bottom; tick with the date)

- [ ] S0 Research, with sources in this file: from Yamaha's MODX M / MONTAGE M manuals, the Performance structure (parts, key and velocity ranges, Scenes, Super Knob assign), the three engines and their main parameters (FM-X operator count and algorithm count). From Roland's FANTOM-0 manuals, Scene / Zone / Tone / Partial structure and pad modes. Write down only what a manual confirms; list unknowns.
- [ ] S1 Shared multi-part engine in `src/lib/sim/` (pure, tested logic: parts, key/velocity ranges, layer/split routing, scene recall, knob morph curves) and `src/components/rack/sim/` (audio). Mobile-friendly voice limits.
- [ ] S2 Sample engine page piece: openly licensed multi-sample playback with loops, release, filter and envelope; loading state; works offline-safe (no sound without samples, no errors).
- [ ] S3 FM-X-style 8-operator engine (own AudioWorklet), with tests for algorithm routing.
- [ ] S4 "MODX M SIM" rack page: Performance of 8 parts, part mixer, Super Knob, 8 Scenes, the store's own default Performances (at least 8). Desktop and 390px phone layouts.
- [ ] S5 "FANTOM-0 SIM" rack page: Scene with zones, tones of up to 4 partials, 16 pads, the store's own default Scenes (at least 8).
- [ ] S6 Links: pack pages and /studio demo banks link to the simulator page of the matching keyboard (`/#play-modxm`, `/#play-fantom`).
- [ ] S7 Sound quality pass on real phones' limits (CPU, latency), and a performance budget written here.

## Rules for the simulator agent

- Same limits as the other agents (AGENTS.md): do not touch the store (catalog, prices, orders, payments, login, database, security), `next.config.ts` or environment handling. New dependencies only if MIT, Apache-2.0, BSD, ISC, CC0 or CC BY, small, and recorded in README credits; otherwise ask the PM.
- Do not change how the existing MODULAR, FM 6-OP and POLY pages sound or behave, except to share code without audible change.
- Each run: one small, tested step; lint, typecheck, test and build must pass; look at the home page at desktop and phone width.
