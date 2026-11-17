# Roadmap

Kept by the project manager agent ("Mcky project manager"). See AGENTS.md, "Who decides". Last updated 2026-11-17.

## Goal

Sell the owner's sound packs. The free tools (playable synths, sound organizer) bring keyboard players to the site.

## Now

- Health 2026-11-17: main (bda362b) passes lint, typecheck, 115 tests and a clean build. Live site not checked this run: the PM's session could not open mckykeyvintagestore.vercel.app (proxy 403 / fetch permission not granted), so whether the live pages load is unknown today.
- Interface agent (daily 17:43, last run today 2026-11-17): its 2026-11-16 run could not push. It left a note in the Claude Project (`claude/interface-run-2026-11-16-push-blocked.md`): the repo is not in that scheduled task's sources, so the git proxy refused the push (403). This explains why none of its work since 2026-11-12 reached main. Only the owner can fix the task's repository access (Waiting on the owner).
- Simulator agent (runs every 4 hours per its schedule, until 2026-12-13): moving well. Since the last report: MODX M page got the keyboard's own PART / [SHIFT] + [PART SELECT] / [SHIFT] + KNOB POSITION steps and CC learn; a first FANTOM-0 page is in the rack (/#play-fantom: 8 store Scenes, zone pan/level, ZONE INT/EXT, SPLIT, pads pick Scenes, USB keyboard in) with CC learn. Both pages are playable; next is leading players from them to the packs.
- Researcher agent (runs every 6 hours per its schedule, until 2026-11-26): added the /studio → packs links on 2026-11-16 (former Next 2); its later runs had nothing listed and made no commit, as decided. New listed task: Next 4.

## Next

Simulator agent, in this order:
1. Simulator agent: on the MODX M and FANTOM-0 rack pages, one plain link under the page to that keyboard's packs (`/packs?inst=yamaha-modx-m`, `/packs?inst=roland-fantom-0`, ids as in src/components/studio/packsLink.ts), in src/components/rack/sim only; no claims about the packs (PM decision 2026-11-17).
2. Simulator agent: S11, a short Thai owner test list ("ทดสอบกับเครื่องจริง") in docs/SIMULATOR.md for what is live now: play both pages from a USB MODX M / FANTOM-0 in Chrome (notes, velocity, sustain, CC learn). Ten minutes at most, like the one in docs/STUDIO.md.
3. Simulator agent: S8b pitch bend heard on both pages (±2 semitones, store's own choice), without changing the POLY page's sound.

Others:
4. Researcher agent: on /studio, next to the MODX M and FANTOM-0 demo banks, one plain link "ลองเล่นในซิมูเลเตอร์" to `/#play-modxm` / `/#play-fantom` (SIMULATOR.md S6, studio part), in src/components/studio only; none on DX7 (the FM 6-OP page already plays DX7 files; leave it).
5. Interface agent, only if the owner fixes its repository access before 17:43 today: put the saved 2026-11-14 buying-path patch (`claude/buying-path-steps-2026-11-14.patch` in the Claude Project) on main; src part applies to current main, docs lines by hand; run all checks, push. Otherwise this waits for the owner's choice about the task.
6. Owner: 10-minute real-keyboard test of the /studio read-only buttons ("ทดสอบกับเครื่องจริง" in docs/STUDIO.md). It unblocks the remaining researcher items (1a, 1d, 3d, 4f, 4h, 4o, 5b, 5e, 5h, 5k) and STUDIO.md 6.
7. Owner, once Next 2 is in: try both simulators with his MODX M and FANTOM-0 over USB (Chrome), using the new test list in docs/SIMULATOR.md.
8. Simulator agent, later: S9/S10 (pick a Performance/Scene on the real keyboard) only after the owner's USB test and once the documented messages are written in SIMULATOR.md; S3 FM-X engine; S5 tones of up to 4 partials.
9. Researcher agent, later: STUDIO.md item 6 (other keyboards' sound lists), only after the owner's real-keyboard test.
10. Needs a new task or the interface agent: link pack pages to the matching simulator page (SIMULATOR.md S6, store part); the simulator and researcher agents do not touch store pages.

## Questions for the PM

Agents add one line each: date · agent · question · options · recommendation. The PM answers in docs/DESIGN_LOG.md under "Decisions by the project manager" and removes the line here.

- 2026-11-18 · researcher · All my open /studio items (1a, 1d, 3d, 4f, 4h, 4o, 5b, 5e, 5h, 5k) wait for the owner's real-keyboard test, and manual searches have stopped finding anything new (FANTOM-0 Bank Select C/D rows and FM Converter output name looked up again today, still not printed). What should I do until the test? Options: (a) pause my hourly runs until the owner tests; (b) a small tested /studio usability item, e.g. a short Thai "ยังรอทดสอบกับเครื่องจริง" list on the page of what is untested; (c) start STUDIO.md 6 (other keyboards) early. Recommendation: (b) once, then (a).

## Waiting on the owner

- Interface task (accounts and agents), still waiting since 2026-11-16, new fact today: its pushes fail because the repo is not in that scheduled task's sources. PM recommends: open "Vintage Keys interface expert", add Pataradanaimcky/mckykeyvintagestore with write access, and extend it one week (end date in its prompt), store pages only, buying path first. Its last scheduled run is today 17:43 Bangkok. Alternative: let it end and apply the saved buying-path patch himself.
- Contact details for the store (accounts): a LINE OA or email buyers can write to (src/config/site.ts). PM recommends an email made only for the store. Asked 2026-11-14, no answer yet.
- Demo recordings: the first pack's 8 patches as 15–30 second loops (src/content/demos.ts). PM recommends these before anything else on the store side. Asked 2026-11-14, no answer yet.
- Payment gateway (money): payments stay simulated until he chooses one (Opn Payments/Omise, Stripe, 2C2P, GB Prime Pay; see docs/PAYMENTS.md). PM recommends comparing Opn Payments and Stripe first, since both give automatic PromptPay confirmation. The choice also decides how a phone buyer pays a QR shown on the same phone (interface question of 2026-11-14). Asked 2026-11-15.
- Free pack terms (legal): the free FM bank has no written licence. PM recommends: free in any music including commercial releases; not to be resold or shared as a sound pack. Asked 2026-11-13, no answer yet.
- Brand name (brand): confirm "Mcky Vintage Key" or give another. PM recommends keeping it. Asked 2026-11-13, no answer yet.
- Brand mark redraw (brand): PM recommends keeping the current logo and site icon.
- Real pack names, prices and counts: the owner replaces the sample data himself (owner decision; agents do not ask).
- Own photos of his own keyboards for pack covers (optional).
- Real-keyboard test of the read-only USB buttons (Next item 3), if he has the keyboards.
- Simulator versions of the store's packs (later, docs/SIMULATOR.md S4–S5): which store sounds may be rebuilt as simulator presets.

## Risks

- The interface agent cannot push (repo not in its task's sources); its buying-path fix exists only as a Project patch, and the task ends after today's run unless the owner changes it.
- The PM's own live-site check can fail when the session cannot reach vercel.app (2026-11-17); then a broken deploy is noticed only by the next run or by visitors.
- The simulators' USB input and CC learn are tested only with a mocked Web MIDI, not on a real MODX M or FANTOM-0.
- Payments are simulated; the store cannot take real money until a gateway is chosen and set up.
- MODX M and FANTOM-0 previews load FluidR3_GM samples from a third-party host (midi-js-soundfonts on GitHub); if it goes down, previews go silent.
- The read-only USB buttons (DX7 receive, MODX M Slot Names, FANTOM-0 Scene Name) are untested on real keyboards; some manual facts come from third-party manual copies (Kraft Music, manualmachine.com, manualsonline.com).
- When it works, the PM's live-site check reads page text only; it would catch a page that fails to load, not a broken button or layout.
- Two agents push to main on their own schedules; a bad push deploys straight to the live site.
- Pack names and prices are sample data, so the store is not ready for real customers.

## Done

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
