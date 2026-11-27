# Roadmap

Kept by the project manager agent ("Mcky project manager"). See AGENTS.md, "Who decides". Last updated 2026-11-27.

## Goal

Sell the owner's sound packs. The free tools (playable synths, sound organizer) bring keyboard players to the site.

## Now

- Health 2026-11-27: main (c253e12) passes lint, typecheck, 284 tests and a clean build. Live site not checked today: the PM's web fetch of mckykeyvintagestore.vercel.app was blocked again (permission request not answered), so whether the live pages load is unconfirmed; no sign of a broken deploy in the repo.
- Simulator agent (every 4 hours, until 2026-12-13): shipped S16 (displays count "LOADING 1/3" while samples load) and A2e (end-to-end check of /sampler → zip → both simulator pages with a mocked keyboard: all passed, no code change) on 2026-11-26. Both listed items are done; the PM gives it S17 (self-host the sample files) and S9a (MODX M Program Change facts) today so it does not go idle.
- Researcher agent: its run ended 2026-11-26; its task still fires every 6 hours but makes no changes and asks the owner whether to continue (owner's choice, Waiting on the owner).
- Interface agent: off since 2026-11-17 (usage credits). No agent can change store pages; the buying-path patch is still only in the Claude Project (Waiting on the owner).

## Next

Simulator agent, in this order:
1. Simulator agent: S17 now (PM decision 2026-11-27): copy only the FluidR3_GM files the MODX M and FANTOM-0 simulator pages use into `public/samples/fluidr3/` (same files, CC BY 3.0, credit in README.md and under each simulator kept), load them from the site first and from gleitz.github.io only as fallback; write the file list and total size in SIMULATOR.md (stop and ask the PM if it passes 20 MB); /studio previews untouched. If its machine cannot download the files, write that in SIMULATOR.md and go to item 2, no commit.
2. Simulator agent: S9a, facts only: from Yamaha's own MODX M documentation (Data List / MIDI Reference on yamaha.com or usa.yamaha.com), the Bank Select MSB/LSB and Program Change numbers that pick a Performance, with page links, written in SIMULATOR.md under S9; no code until written. If no Yamaha page opens, skip, no commit.
3. Simulator agent: manual items (A1e, S4c, S5l, S8g/S8i) only on a run where the manual actually opens; no commit on a run with nothing listed it can do.

Others:
4. Owner: record a short test set of one MODX M sound on /sampler (USB to the computer, Chrome, defaults) and play it back on the MODX M simulator page with "โหลดชุดเสียงที่อัดเอง" (now live in the code); tells us whether USB audio works (A1e) and is the first step to store banks (A3).
5. Owner: try both simulators with his MODX M and FANTOM-0 over USB in Chrome, using "ทดสอบกับเครื่องจริง" in docs/SIMULATOR.md (about 10 minutes). Step 10 settles the Split Point question (S1d). While on his phone, note how long LOADING shows on mobile data (S15b/S7c, about 2 minutes).
6. Owner: 10-minute real-keyboard test of the /studio read-only buttons ("ทดสอบกับเครื่องจริง" in docs/STUDIO.md). It unblocks the researcher's remaining items (1a, 1d, 3d, 4f, 4h, 4o, 5b, 5e, 5h, 5k) and STUDIO.md 6.
7. Needs a new task or the interface agent (owner's choice, Waiting on the owner): put the saved 2026-11-14 buying-path patch on main, then link pack pages to the matching simulator page (SIMULATOR.md S6, store part). The simulator and researcher agents do not touch store pages.
8. Simulator agent, after the owner's USB test: S1d (Split Job corrections), S9 (pick a Performance on the real keyboard, documented messages only).
9. Simulator agent, after the owner answers on Roland's manuals: S0b, S5b, S5e, S5g, S5h, S8d, S10.
10. Simulator agent, later: S3c when its manual facts are read; A1b2 only if a real recording clicks at the loop.
11. Researcher agent (if the owner continues it), later: STUDIO.md item 6 (other keyboards' sound lists), only after the owner's real-keyboard test.

## Questions for the PM

Agents add one line each: date · agent · question · options · recommendation. The PM answers in docs/DESIGN_LOG.md under "Decisions by the project manager" and removes the line here.

## Waiting on the owner

- Researcher task after its end date (2026-11-26): continue, slow to daily, or stop. PM recommends: stop (or pause) until the owner has done the 10-minute /studio real-keyboard test, since every remaining /studio item waits on that test. Its runs ask him directly from 2026-11-27.
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
- Owner's own recordings for store banks (A3): sets made with /sampler (or SampleRobot exports in the same manifest), when he has them.
- Simulator versions of the store's packs (later, docs/SIMULATOR.md S4–S5): which store sounds may be rebuilt as simulator presets.

## Risks

- No agent can change store pages now that the interface task is off; the buying-path fix exists only as a Project patch.
- FANTOM-0 PAD MODE (S5f) and some notes in SIMULATOR.md come from Roland manuals whose download page has a licence checkbox; the owner has not ruled on this yet.
- The MODX M Split Job follows the store's own reading where Yamaha's manuals are silent (which Group owns the Split Point key); it is labelled on the page and may be one key off until the owner's test.
- The simulator pages are checked only in desktop Chromium at phone width, not on real phones (SIMULATOR.md S7c).
- The sample parts now play through the store's own voice (S2b, S2c), checked only with a stand-in file, not by ear with the real samples or on real phones; smplr stays as the fallback if the voice cannot load.
- The simulators' USB input, CC learn and pitch bend are tested only with a mocked Web MIDI, not on a real MODX M or FANTOM-0.
- /sampler is tested only with a mocked Web MIDI and a fake audio input; whether MODX M and FANTOM-0 send audio over USB is not confirmed from the manuals (A1e). Recordings are big: a full set may be too heavy for phones (the page warns above 120 MB).
- Payments are simulated; the store cannot take real money until a gateway is chosen and set up.
- MODX M and FANTOM-0 previews and simulator sample parts load FluidR3_GM samples from a third-party host (midi-js-soundfonts on GitHub); if it goes down, those parts go silent (the pages show SAMPLE ERROR). S17 (Next 1) moves the simulator files onto the site.
- The read-only USB buttons (DX7 receive, MODX M Slot Names, FANTOM-0 Scene Name) are untested on real keyboards; some manual facts come from third-party manual copies (Kraft Music, manualmachine.com, manualsonline.com).
- The PM's live-site check reads page text only, through web fetch: it catches a page that fails to load, not a broken button or layout, and does not show which commit is live. It could not run from 2026-11-20 to 2026-11-24, worked on 2026-11-25, and was blocked again on 2026-11-26 and 2026-11-27 (fetch permission not answered).
- Two agents push to main on their own schedules; a bad push deploys straight to the live site.
- Pack names and prices are sample data, so the store is not ready for real customers.

## Done

- 2026-11-26: End-to-end check of the owner's recording path (record on /sampler, save the zip, play it on both simulator pages) passed with a mocked keyboard; not yet on a real keyboard.
- 2026-11-26: MODX M and FANTOM-0 simulator displays count "LOADING 1/3" while sample files load, then READY.
- 2026-11-25: Both simulator pages can load and play a set recorded with /sampler ("โหลดชุดเสียงที่อัดเอง", "ใช้เสียงเดิม" to go back); /sampler links to both simulators.
- 2026-11-25: First-load check at phone width on a slow network: the home page loads no samples; the simulators fetch them only at the first key touch.
- 2026-11-25: The store's sample voice can play a set recorded with /sampler (velocity layers, held loops, bend); not on a page yet.
- 2026-11-24: New page /sampler ("อัดเสียงจากคีย์บอร์ด"): plays notes on a USB keyboard, records them and saves a zip (WAVs, manifest, .sfz) on the visitor's computer, nothing uploaded; not linked yet.
- 2026-11-24: Simulator pages: buttons, knobs and sliders of unused PART/ZONE strips are skipped by Tab and screen readers.
- 2026-11-23: Both simulator pages have Thai screen-reader names on every control and can be played and set with Tab and the arrow keys.
- 2026-11-23: Both simulator pages have a closed "วิธีเล่น" fold: how to play from the screen, computer keys or a USB keyboard, what each button group does, and what is the store's own reading.
- 2026-11-22: Both simulator pages offer "โหลดเสียงอีกครั้ง" when the sample files fail to load, so a visitor can retry without reloading the page.
- 2026-11-22: Touch check at phone width on both simulator pages: 4-finger chords and a finger sliding off the keys leave no stuck notes.
- 2026-11-21: Simulator re-checked at phone width with the store's sample voice: no dropouts; FANTOM-0 reverb no longer works when every REVERB knob is at 0 (lighter on phones).
- 2026-11-21: Test that the store's sample voice and its fallback play the same recording at the same level on every key; the lowest Fingered Bass keys on MCKY Split Bass/Piano no longer silent.
- 2026-11-21: MODX M simulator Knob 3 is BRIGHT on Performances with sample parts (opens fully at start, so nothing sounds different until turned down).
- 2026-11-21: FANTOM-0 simulator LEARN offers KNOB 1–8 in every Scene, so a keyboard knob can be learnt to CTRL knobs 5–8.
- 2026-11-20: FANTOM-0 simulator CTRL ATTACK works on sample (PCM) partials, fading in up to 2 s.
- 2026-11-20: Both simulators' sample parts play through the store's own sample voice and follow the pitch bend wheel, held notes included (smplr kept as fallback).
- 2026-11-20: Store's own sample voice written and tested as logic (sample pick, bend, attack/release, velocity filter, 8 voices).
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
