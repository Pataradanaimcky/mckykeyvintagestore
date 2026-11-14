# Roadmap

Kept by the project manager agent ("Mcky project manager"). See AGENTS.md, "Who decides". Last updated 2026-11-14.

## Goal

Sell the owner's sound packs. The free tools (playable synths, sound organizer) bring keyboard players to the site.

## Now

- Health 2026-11-14: main (119001f) passes lint, typecheck, 76 tests and a clean build; /, /studio and /packs load on the live site.
- Researcher agent (hourly, until 2026-11-26): DX7, MODX M and FANTOM-0 help in /studio, from manuals only. Still no new features that send MIDI to a keyboard until the read-only buttons are tested on a real keyboard (PM decision 2026-11-13). New manual facts go to docs/STUDIO.md and the test script first (PM decision 2026-11-14).
- Interface agent (daily 17:43, until 2026-11-17): its 2026-11-12 and 2026-11-13 runs made no commit; Next items 1 and 2 are waiting for it. Three runs left.

## Next

1. Interface agent: walk the buying path on a phone (home → pack → cart → checkout → order page) and fix the most confusing step; keep the test-mode notices.
2. Interface agent: check /studio at phone width after this week's MODX M, FANTOM-0 and DX7 notes (nothing overlaps, no sideways scroll, steps easy to find, untested buttons clearly labelled "not tested on a real keyboard").
3. Researcher agent: tidy "บันทึกและนำไปใช้" for each keyboard so the steps come first and the longer manual notes sit in a fold; check at 390px (PM decision 2026-11-14).
4. Owner: 10-minute real-keyboard test of the read-only buttons, using "ทดสอบกับเครื่องจริง" in docs/STUDIO.md (also answers 5e and the FM Converter file name).
5. Researcher agent: remaining unchecked items in docs/STUDIO.md that can be confirmed from manuals; not 5e (PM decision 2026-11-14).
6. Researcher agent, later: STUDIO.md item 6 (other keyboards' sound lists), only after the three keyboards above are tested.

## Questions for the PM

Agents add one line each: date · agent · question · options · recommendation. The PM answers in docs/DESIGN_LOG.md under "Decisions by the project manager" and removes the line here.

(none open)

## Waiting on the owner

- Contact details for the store (accounts): a LINE OA or email buyers can write to (src/config/site.ts). PM recommends an email made only for the store. Asked 2026-11-14.
- Demo recordings: the first pack's 8 patches as 15–30 second loops (src/content/demos.ts). PM recommends these before anything else on the store side. Asked 2026-11-14.
- Free pack terms (legal): the free FM bank has no written licence. PM recommends: free in any music including commercial releases; not to be resold or shared as a sound pack. Asked 2026-11-13, no answer yet.
- Brand name (brand): confirm "Mcky Vintage Key" or give another. PM recommends keeping it. Asked 2026-11-13, no answer yet.
- Brand mark redraw (brand): PM recommends keeping the current logo and site icon.
- Payment gateway (money): payments stay simulated until he chooses one (options in docs/PAYMENTS.md).
- Real pack names, prices and counts: the owner replaces the sample data himself (owner decision; agents do not ask).
- Own photos of his own keyboards for pack covers (optional).
- Real-keyboard test of the read-only USB buttons (Next item 4), if he has the keyboards.

## Risks

- Payments are simulated; the store cannot take real money until a gateway is chosen and set up.
- MODX M and FANTOM-0 previews load FluidR3_GM samples from a third-party host (midi-js-soundfonts on GitHub); if it goes down, previews go silent.
- The read-only USB buttons (DX7 receive, MODX M Slot Names, FANTOM-0 Scene Name) are untested on real keyboards; some manual facts come from third-party manual copies (Kraft Music, manualmachine.com, manualsonline.com).
- /studio help text grows every hour; it may get hard to read on a phone (Next items 2 and 3).
- The interface agent has made no commit for two runs and ends 2026-11-17; the buying-path check may not happen in this phase.
- Two agents push to main on their own schedules; a bad push deploys straight to the live site.
- Pack names and prices are sample data, so the store is not ready for real customers.

## Done

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
