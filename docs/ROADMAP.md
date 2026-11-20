# Roadmap

Kept by the project manager agent ("Mcky project manager"). See AGENTS.md, "Who decides". Last updated 2026-11-20.

## Goal

Sell the owner's sound packs. The free tools (playable synths, sound organizer) bring keyboard players to the site.

## Now

- Health 2026-11-20: main (58521bd) passes lint, typecheck, 189 tests and a clean build. Live site not checked today: the PM's web fetch timed out waiting for permission and direct curl gets no connection through the proxy, so whether /, /studio, /packs and /history load is unknown (they loaded on 2026-11-19).
- Simulator agent (every 4 hours, until 2026-12-13): moving well, no questions. Finished Next 1–3 of 2026-11-19 (S7b limiter: 0 of 16 presets over full scale; S5c FANTOM-0 CTRL knobs; S8f MODX M Knobs 1–8), then on its own: MODX M [ASSIGN], FANTOM-0 OCTAVE / TRANSPOSE, and S2a, the store's own sample voice as tested logic (not heard yet). New items: Next 1–3, which put that voice on the pages so held sample notes can bend and FANTOM-0 ATTACK works on PCM. It stays off Roland's Reference Manual, Parameter Guide and MIDI Implementation until the owner answers.
- Researcher agent (every 6 hours, until 2026-11-26): idle by decision, no commits, until the owner's real-keyboard test.
- Interface agent: off since 2026-11-17 (usage credits; its end date has passed). No agent can change store pages; the buying-path patch is still only in the Claude Project (Waiting on the owner).

## Next

Simulator agent, in this order:
1. Simulator agent: S2b, play the S2a sample voice on the MODX M page for its AWM2 parts, fed first by the FluidR3_GM files the page already loads (no new source, no new dependency); keep smplr as a fallback and switch only if the new voice sounds at least as good; LOADING and SAMPLE ERROR as now.
2. Simulator agent: S8e, pitch bend on held MODX M sample notes through the new voice (±2 semitones like the AN-X parts), then the same voice on the FANTOM-0 PCM partials.
3. Simulator agent: S5j, FANTOM-0 CTRL ATTACK on PCM partials through the new voice. No change to MODULAR, FM 6-OP or POLY.

Others:
4. Owner: try both simulators with his MODX M and FANTOM-0 over USB in Chrome, using "ทดสอบกับเครื่องจริง" in docs/SIMULATOR.md (about 10 minutes). Step 10 settles the Split Point question (S1d).
5. Owner: 10-minute real-keyboard test of the /studio read-only buttons ("ทดสอบกับเครื่องจริง" in docs/STUDIO.md). It unblocks the researcher's remaining items (1a, 1d, 3d, 4f, 4h, 4o, 5b, 5e, 5h, 5k) and STUDIO.md 6.
6. Needs a new task or the interface agent (owner's choice, Waiting on the owner): put the saved 2026-11-14 buying-path patch on main, then link pack pages to the matching simulator page (SIMULATOR.md S6, store part). The simulator and researcher agents do not touch store pages.
7. Simulator agent, after the owner's USB test: S1d (Split Job corrections), S9 (pick a Performance on the real keyboard, documented messages only).
8. Simulator agent, after the owner answers on Roland's manuals: S0b, S5b, S5e, S5g, S5h, S8d, S10.
9. Simulator agent, later: S3c when its manual facts are read; S8e (any new dependency goes to the PM first).
10. Researcher agent, later: STUDIO.md item 6 (other keyboards' sound lists), only after the owner's real-keyboard test.

## Questions for the PM

Agents add one line each: date · agent · question · options · recommendation. The PM answers in docs/DESIGN_LOG.md under "Decisions by the project manager" and removes the line here.

## Waiting on the owner

- Roland manual terms (legal), new 2026-11-19: Roland's manuals page puts a licence checkbox before the FANTOM-0 Reference Manual, Parameter Guide and MIDI Implementation. The simulator agent found the first two as direct PDFs on static.roland.com and read them (S0b, PAD MODE, shipped as S5f). PM recommends: the owner reads the terms on Roland's page and says whether agents may use these manuals. Other options: allow it without reading; or stop and remove PAD MODE. Until then agents do not read them, and PAD MODE stays on the site.
- Store-page work after the interface task stopped (accounts and money), changed 2026-11-18: the task was turned off on 2026-11-17 because its model needed usage credits, and its end date has passed. PM recommends: one store-pages task (on the same model as the other tasks, so no extra credits), with this repo added with write access, for one week: apply the saved buying-path patch first, then link pack pages to the simulators. Alternatives: apply the patch himself; or leave the store pages as they are for now.
- Contact details for the store (accounts): a LINE OA or email buyers can write to (src/config/site.ts). PM recommends an email made only for the store. Asked 2026-11-14, no answer yet.
- Demo recordings: the first pack's 8 patches as 15–30 second loops (src/content/demos.ts). PM recommends these before anything else on the store side. Asked 2026-11-14, no answer yet.
- Payment gateway (money): payments stay simulated until he chooses one (Opn Payments/Omise, Stripe, 2C2P, GB Prime Pay; see docs/PAYMENTS.md). PM recommends comparing Opn Payments and Stripe first, since both give automatic PromptPay confirmation. The choice also decides how a phone buyer pays a QR shown on the same phone (interface question of 2026-11-14). Asked 2026-11-15.
- Free pack terms (legal): the free FM bank has no written licence. PM recommends: free in any music including commercial releases; not to be resold or shared as a sound pack. Asked 2026-11-13, no answer yet.
- Brand name (brand): confirm "Mcky Vintage Key" or give another. PM recommends keeping it. Asked 2026-11-13, no answer yet.
- Brand mark redraw (brand): PM recommends keeping the current logo and site icon.
- Real pack names, prices and counts: the owner replaces the sample data himself (owner decision; agents do not ask).
- Own photos of his own keyboards for pack covers (optional).
- Real-keyboard test of the read-only USB buttons (Next 4) and of both simulators (Next 3), if he has the keyboards.
- Simulator versions of the store's packs (later, docs/SIMULATOR.md S4–S5): which store sounds may be rebuilt as simulator presets.

## Risks

- No agent can change store pages now that the interface task is off; the buying-path fix exists only as a Project patch.
- FANTOM-0 PAD MODE (S5f) and some notes in SIMULATOR.md come from Roland manuals whose download page has a licence checkbox; the owner has not ruled on this yet.
- The MODX M Split Job follows the store's own reading where Yamaha's manuals are silent (which Group owns the Split Point key); it is labelled on the page and may be one key off until the owner's test.
- The simulator pages are checked only in desktop Chromium at phone width, not on real phones (SIMULATOR.md S7c).
- Moving the sample parts from smplr to the store's own voice (Next 1–2) could make them sound worse or fail on some browsers; smplr stays as the fallback until the new voice is at least as good.
- The simulators' USB input, CC learn and pitch bend are tested only with a mocked Web MIDI, not on a real MODX M or FANTOM-0.
- Payments are simulated; the store cannot take real money until a gateway is chosen and set up.
- MODX M and FANTOM-0 previews and simulator sample parts load FluidR3_GM samples from a third-party host (midi-js-soundfonts on GitHub); if it goes down, those parts go silent (the pages show SAMPLE ERROR).
- The read-only USB buttons (DX7 receive, MODX M Slot Names, FANTOM-0 Scene Name) are untested on real keyboards; some manual facts come from third-party manual copies (Kraft Music, manualmachine.com, manualsonline.com).
- The PM's live-site check reads page text only, through web fetch: it catches a page that fails to load, not a broken button or layout, and does not show which commit is live. On 2026-11-20 it could not run at all.
- Two agents push to main on their own schedules; a bad push deploys straight to the live site.
- Pack names and prices are sample data, so the store is not ready for real customers.

## Done

- 2026-11-20: Store's own sample voice written and tested as logic (sample pick, bend, attack/release, velocity filter, 8 voices); not on the pages yet.
- 2026-11-20: FANTOM-0 simulator OCTAVE ±3 and TRANSPOSE −5..+6 for the on-screen keys (Owner's Manual p. 18).
- 2026-11-19: MODX M simulator Knobs 1–4 / 5–8 panel (store CUTOFF and LAYER knobs), Knob 1–8 = CC 17–24 in the ready map.
- 2026-11-19: FANTOM-0 simulator CTRL knob mode (ATTACK, RELEASE, REVERB, CHORUS, EQ) for the current zone, with [ZONE SELECT].
- 2026-11-19: Simulator pages no longer clip on 16-note chords (limiter and soft clip on the simulator bus only).
- 2026-11-19: MODX M simulator [ASSIGN] button switches the four knobs between Knobs 1–4 and 5–8 (Quick Guide p. 22).
- 2026-11-19: MODX M simulator Split Job on [SPLIT] (Split Points, Groups A–D), labelled where it is the store's reading.
- 2026-11-19: MODX M simulator: set each Part's Note Limit and Velocity Limit on the page with [SHIFT] + [SPLIT].
- 2026-11-18: FANTOM-0 simulator [PAD MODE] with ZONE MUTE and ZONE SOLO.
- 2026-11-18: MODX M simulator Velocity Limit per Part; louder playing from a USB keyboard brings in extra layers on two Performances.
- 2026-11-18: MODX M simulator ready CC map from Yamaha's documents (Super Knob CC 95, Scene CC 92), labelled untested.
- 2026-11-18: Simulator phone-width check at 390px with CPU throttling and a written budget: no dropouts, no limits lowered (not a real phone).
- 2026-11-18: FANTOM-0 simulator tones of up to 4 partials (PCM or VA, each on its own channel with its zone's slider and knob); five store tones layer two partials.
- 2026-11-18: MODX M simulator FM-X-style parts: the store's own 8-operator FM in an AudioWorklet ("FM Tine", "FM Bell"), 6 voices per part for phones.
- 2026-11-17: Pitch bend from a USB keyboard on the MODX M AN-X and FANTOM-0 VA parts (±2 semitones).
- 2026-11-17: Thai owner test list for playing both simulators from the real keyboards over USB (docs/SIMULATOR.md).
- 2026-11-17: MODX M and FANTOM-0 simulator pages link to that keyboard's packs; /studio demo banks link to the simulator pages.
- 2026-11-17: FANTOM-0 simulator page in the rack (/#play-fantom): 8 store Scenes of 4 zones, knobs = zone pan, sliders = zone level, ZONE INT/EXT layers, [SPLIT] + key, pads pick Scenes, play from a USB keyboard, CC learn. Labelled as an emulation.
- 2026-11-16: MODX M simulator page in the rack (/#play-modxm): 8 store Performances, part faders, PART buttons and [SHIFT] + [PART SELECT] mute, Super Knob with KNOB POSITION store, 8 Scenes with [SHIFT] + SCENE store, play from a USB keyboard, CC learn. Labelled as an emulation.
- 2026-11-16: Simulator research S0 (MODX M Quick Guide, FANTOM-0 Owner's Manual, ZENOLOGY manual) written in docs/SIMULATOR.md with sources.
- 2026-11-16: /studio MODX M and FANTOM-0 tabs link to that keyboard's packs.
- 2026-11-16: /history page (Yamaha, Roland, Oberheim, Moog; Commons photos with credits) and square corners site-wide.
- 2026-11-15: /studio phone check at 390px passed (no sideways scroll, nothing overlaps); nothing to fix.
- 2026-11-15: /studio help without repeats: DX7 steps no longer repeat Memory Protect and the manual page; MODX M and FANTOM-0 rearrange headings shared by the page and the order sheet (STUDIO.md 7h, 7i, 7j).
- 2026-11-14: /studio "บันทึกและนำไปใช้" for DX7, MODX M and FANTOM-0: numbered steps in the order they are done, steps first, longer manual notes in a fold, same numbering on the order sheet (former Next 3).
- 2026-11-14: /studio labels: DX7 receive button marked not tested on a real keyboard like the other two; MODX M names "Receive Bulk" and "Copy/Exchange" as Yamaha prints them.
- 2026-11-14: DX7 help: what the DX7 shows after receiving, keeping old voices on a RAM cartridge first, receive settings, and storing a single voice ([STORE] + 1–32).
- 2026-11-13: MODX M help: USB settings (MIDI IN/OUT, Device Number), Bulk Receive can stay Protect, rearranging slots with Exchange and [SHIFT] + [EDIT], file types MODX M can load.
- 2026-11-13: Thai 10-minute real-keyboard test script for the three read-only USB buttons (docs/STUDIO.md, "ทดสอบกับเครื่องจริง").
- 2026-11-13: FANTOM-0 read-only "รับชื่อ Scene" button, which finds the keyboard's USB port by Identity Reply first, with USB Driver help.
- 2026-11-13: FANTOM-0 scenes numbered A001–D128 with Scene Write and Scene Chain steps on the order sheet.
- 2026-11-13: MODX M read-only "รับชื่อช่อง" button and the Perform-slots-only note.
- 2026-11-12: MODX M name checks (printable ASCII warnings for slot, bank and page names), SSS Time per slot.
- 2026-11-12: DX7 duplicates, half swap and two-cartridge merge in the organizer.
- 2026-11-12: Simpler navigation (numbered menu, footer links), ▶ on pack sounds, demo-bank links; /demo removed.
- 2026-11-12: Day-to-day decisions handed to the PM agent.
