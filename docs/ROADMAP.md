# Roadmap

Kept by the project manager agent ("Mcky project manager"). See AGENTS.md, "Who decides". Last updated 2026-11-13.

## Goal

Sell the owner's sound packs. The free tools (playable synths, sound organizer) bring keyboard players to the site.

## Now

- Health 2026-11-13: main (1a05e06) passes lint, typecheck, 61 tests and a clean build; /, /studio and /packs load on the live site.
- Researcher agent (hourly, until 2026-11-26): FANTOM-0 and MODX M parts of /studio. Per the PM decision of 2026-11-13, no new features that send MIDI to a keyboard until the existing read-only buttons are tested on a real keyboard.
- Interface agent (daily 17:43, until 2026-11-17): interface polish; its 2026-11-12 run made no commit.

## Next

1. Researcher agent: write a short Thai test script in docs/STUDIO.md (what to connect, what to press, what to expect, what to report) for the read-only MODX M "รับชื่อช่อง" and FANTOM-0 "รับชื่อ Scene" buttons and the DX7 receive, so the owner can test in 10 minutes (covers STUDIO.md items 1a, 4f, 5h).
2. Interface agent: walk the buying path on a phone (home → pack → cart → checkout → order page) and fix the most confusing step; keep the test-mode notices.
3. Interface agent: check /studio at phone width after this week's new MODX M and FANTOM-0 buttons and notes (nothing overlaps, no sideways scroll, buttons clearly labelled "not tested on a real keyboard").
4. Researcher agent: STUDIO.md item 5e (FANTOM-0 Receive Exclusive default and Device ID setting), from manuals only.
5. Owner: real-keyboard test of the read-only buttons using the script from item 1.
6. Researcher agent, later: STUDIO.md item 6 (other keyboards' sound lists), only after the three keyboards above are tested.

## Questions for the PM

Agents add one line each: date · agent · question · options · recommendation. The PM answers in docs/DESIGN_LOG.md under "Decisions by the project manager" and removes the line here.

- 2026-11-13 · researcher · FANTOM-0 item 5e (Receive Exclusive default, Device ID name and range) is only in Roland's Reference Manual / Parameter Guide, whose download needs accepting Roland's manual terms (private, non-commercial use). This is legal, so it is the owner's call. Options: (a) owner downloads the Parameter Guide himself and notes the SYSTEM: MIDI rows into STUDIO.md 5e; (b) leave 5e to the owner's real-keyboard test (the test script already asks for it); (c) agents accept the terms. Recommendation: (b), or (a) if he has 5 minutes; not (c). Until then the researcher stops retrying 5e.

## Waiting on the owner

- Free pack terms (legal): the free FM bank has no written licence. PM recommends: free in any music including commercial releases; not to be resold or shared as a sound pack. Asked 2026-11-13.
- Brand name (brand): confirm "Mcky Vintage Key" or give another. PM recommends keeping it. Asked 2026-11-13.
- Brand mark redraw (brand): PM recommends keeping the current logo and site icon.
- Payment gateway (money): payments stay simulated until he chooses one.
- Real pack names, prices and counts: the owner replaces the sample data himself (owner decision; agents do not ask).
- Demo recordings: first pack's 8 patches as 15–30 second loops (src/content/demos.ts).
- Own photos of his own keyboards for pack covers (optional).
- Real contact details for the store.
- Real-keyboard test of the read-only USB buttons (Next item 5), if he has the keyboards.

## Risks

- Payments are simulated; the store cannot take real money until a gateway is chosen and set up.
- MODX M and FANTOM-0 previews load FluidR3_GM samples from a third-party host (midi-js-soundfonts on GitHub); if it goes down, previews go silent.
- The read-only USB buttons (DX7 receive, MODX M Slot Names, FANTOM-0 Scene Name) are untested on real keyboards; some manual facts come from third-party manual copies (Kraft Music, manualmachine.com).
- Two agents push to main on their own schedules; a bad push deploys straight to the live site.
- Pack names and prices are sample data, so the store is not ready for real customers.

## Done

- 2026-11-13: FANTOM-0 read-only "รับชื่อ Scene" button, which finds the keyboard's USB port by Identity Reply first.
- 2026-11-13: FANTOM-0 scenes numbered A001–D128 with Scene Write and Scene Chain steps on the order sheet.
- 2026-11-13: MODX M read-only "รับชื่อช่อง" button and the Perform-slots-only note.
- 2026-11-12: MODX M name checks (printable ASCII warnings for slot, bank and page names), SSS Time per slot.
- 2026-11-12: DX7 duplicates, half swap and two-cartridge merge in the organizer.
- 2026-11-12: Simpler navigation (numbered menu, footer links), ▶ on pack sounds, demo-bank links; /demo removed.
- 2026-11-12: Day-to-day decisions handed to the PM agent.
