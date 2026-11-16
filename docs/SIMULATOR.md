# MODX M and FANTOM-0 simulators

Owner request, 2026-11-16: the site has no MODX M or FANTOM simulator; he wants one, and if there is no ready-made one, a way must be found. A dedicated scheduled task, "Mcky keyboard simulator builder", builds it. The project manager ("Mcky project manager") sets its priorities in `docs/ROADMAP.md` (Next, items marked "simulator agent") and answers its questions like the other agents (AGENTS.md, "Who decides").

## What "simulator" means here (read first)

- **No exact copy is possible or allowed.** The real sounds are the makers' own samples and data (Yamaha AWM2 waveforms, Roland ZEN-Core PCM). They cannot be downloaded, extracted or redistributed, and there is no official browser version of either keyboard. Never ship, extract or reverse-engineer factory sounds, waveforms or firmware; never copy the panel or screen design (owner decision of 2026-11-12, MODX M entry in DESIGN_LOG).
- **What we can build:** a page in the home-page rack for each keyboard that works the way the keyboard works and is played with our own engines and openly licensed samples:
  - **MODX M style:** a Performance of up to 8 keyboard parts (layer and split by key range), sample, FM and analog-style engines like the keyboard's three engines, a Super Knob that moves several parameters at once, and 8 Scenes that recall part settings.
  - **FANTOM-0 style:** a Scene with zones (layer and split), tones made of partials (sample, analog-style, supersaw, noise), and 16 pads.
  - The face is the store's own drawing, as on /studio. Labels say plainly that it is an emulation and not the keyboard's real sound, for example "จำลองการทำงานแบบ MODX M · ไม่ใช่เสียงจริงของเครื่อง". Maker names are plain text only, as in the footer trademark note.
- **Why it sells packs:** players learn the workflow on the site, hear the store's own sounds built for the simulator, and buy the real packs for their keyboard. Simulator versions of the store's packs are the owner's to approve (Waiting on the owner).

## Owner request 2026-11-16 (second message): feel like the real keyboard, and connect to it

**Face.** The owner wants playing the simulator to feel like playing a real MODX M or FANTOM-0. Do this through *function and placement*, not by copying the look:
- Same controls, in the same places relative to each other, doing the same jobs, with the keyboard's own words on them. MODX M: part sliders and knobs, the Super Knob, Scene buttons, part select/mute/solo, a display showing what the keyboard's display shows (Performance name, parts, Scene). FANTOM-0: zone sliders and knobs, the pads, Scene select, zone on/off, a display with Scene and zones.
- The same steps to do things (e.g. pick a part, then turn its knobs; press a Scene button to recall). A player who knows the keyboard should know where to reach without reading.
- The appearance stays the store's own drawing (shapes, colors, type, no maker logos, no copy of the panel's styling or the screen's graphics), like /studio. Yamaha's and Roland's panel designs are theirs; the owner's earlier permission is not his to give (DESIGN_LOG, 2026-11-12). Copy the layout of controls and the workflow, never the styling.

**Connect to the real keyboard (Web MIDI, USB).** Works in Chrome and Edge (desktop and Android); say plainly on the page when the browser has no Web MIDI (e.g. Safari on iPhone). Only messages printed in the maker's own MIDI documentation (MODX M / MONTAGE M Data List and MIDI implementation; FANTOM-0 MIDI implementation). Add each message with its source page to this file before using it.
- **In (keyboard → site):** play the simulator from the real keyboard's keys, wheels, sustain and knobs/sliders (notes, pitch bend, CCs). Learn which CC each control sends from the manual, with a "learn" fallback (turn a control, the site picks it up).
- **Out (site → keyboard), live control only:** select a Performance / Scene on the real keyboard (Bank Select + Program Change as documented), send knob/slider CCs, all-notes-off. Nothing that writes or overwrites the keyboard's memory.
- **Writing to the keyboard's memory:** not part of the simulator. Only if the maker documents it, behind a clear confirmation that is off by default and says it is untested on a real keyboard (same rule as /studio).
- Everything is labelled "ยังไม่ได้ทดสอบกับเครื่องจริง" until the owner tries it on his keyboards (Waiting on the owner).

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
- [ ] S8 Web MIDI in: play both simulator pages from a USB keyboard (notes, bend, sustain, CC learn), only on the page in view.
- [ ] S9 Web MIDI out, MODX M: documented Bank Select / Program Change to pick a Performance on the real keyboard; Super Knob and part knob CCs from the site's controls. Sources in this file.
- [ ] S10 Web MIDI out, FANTOM-0: documented messages to pick a Scene; zone knob/slider CCs. Sources in this file.
- [ ] S11 Owner test list ("ทดสอบกับเครื่องจริง") for S8–S10, like docs/STUDIO.md.
- [ ] S12 Send to the keyboard (owner request 2026-11-16): people arrange sounds on the site (simulator and /studio) and then send the result into their real MODX M / FANTOM-0. First research, with sources here, whether Yamaha's and Roland's official MIDI documentation describes receiving that data (bulk dump or parameter change for a Performance / Live Set / Scene). If it is documented: add it behind a clear confirmation, off by default, that warns it can overwrite the chosen memory and is untested on a real keyboard, and tell people to back up first. If it is not documented: give the steps on the keyboard instead and say plainly that the site cannot send it. Never write in an undocumented format.
- [ ] S7 Sound quality pass on real phones' limits (CPU, latency), and a performance budget written here.

## Rules for the simulator agent

- Same limits as the other agents (AGENTS.md): do not touch the store (catalog, prices, orders, payments, login, database, security), `next.config.ts` or environment handling. New dependencies only if MIT, Apache-2.0, BSD, ISC, CC0 or CC BY, small, and recorded in README credits; otherwise ask the PM.
- Do not change how the existing MODULAR, FM 6-OP and POLY pages sound or behave, except to share code without audible change.
- Each run: one small, tested step; lint, typecheck, test and build must pass; look at the home page at desktop and phone width.
