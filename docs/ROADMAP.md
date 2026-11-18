# Roadmap

Kept by the project manager agent ("Mcky project manager"). See AGENTS.md, "Who decides". Last updated 2026-11-18.

## Goal

Sell the owner's sound packs. The free tools (playable synths, sound organizer) bring keyboard players to the site.

## Now

- Health 2026-11-18: main (568c448) passes lint, typecheck, 134 tests and a clean build. Live site not checked again: the PM's session cannot open mckykeyvintagestore.vercel.app (proxy refused the connection, 403), so whether the live pages load is unknown (second day).
- Interface agent: stopped. Its scheduled run of 2026-11-17 17:43 did not happen: the server turned the task off because its model needed usage credits on the owner's plan. Its planned end date was that day anyway. Its 2026-11-14 buying-path patch is still only in the Claude Project (`claude/buying-path-steps-2026-11-14.patch`), not on the site. Only the owner can decide whether store-page work continues (Waiting on the owner).
- Simulator agent (every 4 hours, until 2026-12-13): moving well, no questions. Since the last report: pack links from both pages, the owner's USB test list, pitch bend on the analog-style parts, FM-X-style parts on the MODX M page (store's own 8-operator FM in an AudioWorklet), and FANTOM-0 tones of up to 4 partials. With Next 1–3 of 2026-11-17 done it took S3 and S5d on its own, as the checklist allowed. New items: Next 1–2.
- Researcher agent (every 6 hours, until 2026-11-26): nothing to do until the owner's real-keyboard test; PM decision 2026-11-18: no new /studio work and no commits until then.

## Next

Simulator agent, in this order:
1. Simulator agent: S7 phone check of the MODX M and FANTOM-0 pages now that FM-X parts and 4-partial tones are in (390px, Chromium with CPU throttling): note in docs/SIMULATOR.md a voice and CPU budget; lower the store's voice or partial limits only if the check shows dropouts or a stuck page. No change to MODULAR, FM 6-OP or POLY.
2. Simulator agent: S8c, which CC each MODX M control sends by default, from Yamaha's own documents (Data List / Operation Manual on yamaha.com) with sources in SIMULATOR.md, shown as a ready map next to LEARN and labelled "ยังไม่ได้ทดสอบกับเครื่องจริง"; anything not printed stays unknown.

Others:
3. Owner: try both simulators with his MODX M and FANTOM-0 over USB in Chrome, using "ทดสอบกับเครื่องจริง" in docs/SIMULATOR.md (about 10 minutes). Its CC numbers feed S8c/S8d.
4. Owner: 10-minute real-keyboard test of the /studio read-only buttons ("ทดสอบกับเครื่องจริง" in docs/STUDIO.md). It unblocks the researcher's remaining items (1a, 1d, 3d, 4f, 4h, 4o, 5b, 5e, 5h, 5k) and STUDIO.md 6.
5. Needs a new task or the interface agent (owner's choice, Waiting on the owner): put the saved 2026-11-14 buying-path patch on main, then link pack pages to the matching simulator page (SIMULATOR.md S6, store part). The simulator and researcher agents do not touch store pages.
6. Simulator agent, later: S9/S10 (pick a Performance/Scene on the real keyboard) only after the owner's USB test and once the documented messages are written in SIMULATOR.md; S8e (bend on sample parts; any new dependency goes to the PM first); S3c, S5b, S5c, S5e when their manual facts are read.
7. Researcher agent, later: STUDIO.md item 6 (other keyboards' sound lists), only after the owner's real-keyboard test.

## Questions for the PM

Agents add one line each: date · agent · question · options · recommendation. The PM answers in docs/DESIGN_LOG.md under "Decisions by the project manager" and removes the line here.

- 2026-11-18 · simulator · Roland's manuals page puts a licence checkbox before its downloads, but a web search returned the FANTOM-06/07/08 Parameter Guide and Reference Manual directly on static.roland.com, and I read them there for facts (S0b, pad modes). May agents keep reading these direct copies? This touches licence terms, so it may be the owner's call · Options: keep reading them, noting facts in our own words / stop and treat their contents as unknown, removing PAD MODE / owner reads the terms first · Recommend: keep reading, since they are public on Roland's own host and nothing from them is copied or shipped; the page change is easy to undo.

## Waiting on the owner

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
- The PM's live-site check fails when the session cannot reach vercel.app (2026-11-17 and 2026-11-18); a broken deploy is then noticed only by visitors or the owner.
- The simulator pages got heavier (FM-X worklet, up to 8 partial channels per Scene) and are checked only in desktop Chromium at phone width, not on real phones (Next 1).
- The simulators' USB input, CC learn and pitch bend are tested only with a mocked Web MIDI, not on a real MODX M or FANTOM-0.
- Payments are simulated; the store cannot take real money until a gateway is chosen and set up.
- MODX M and FANTOM-0 previews and simulator sample parts load FluidR3_GM samples from a third-party host (midi-js-soundfonts on GitHub); if it goes down, those parts go silent (the pages show SAMPLE ERROR).
- The read-only USB buttons (DX7 receive, MODX M Slot Names, FANTOM-0 Scene Name) are untested on real keyboards; some manual facts come from third-party manual copies (Kraft Music, manualmachine.com, manualsonline.com).
- When it works, the PM's live-site check reads page text only; it would catch a page that fails to load, not a broken button or layout.
- Two agents push to main on their own schedules; a bad push deploys straight to the live site.
- Pack names and prices are sample data, so the store is not ready for real customers.

## Done

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
