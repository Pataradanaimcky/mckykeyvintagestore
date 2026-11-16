# Roadmap

Kept by the project manager agent ("Mcky project manager"). See AGENTS.md, "Who decides". Last updated 2026-11-16.

## Goal

Sell the owner's sound packs. The free tools (playable synths, sound organizer) bring keyboard players to the site.

## Now

- Health 2026-11-16: main (eaa7687) passes lint, typecheck, 86 tests and a clean build. Live site checked: /, /studio and /packs load (/packs shows 8 packs).
- Interface agent (daily 17:43, until 2026-11-17; runs left: 2026-11-16 and 2026-11-17): its 2026-11-15 run ended after about 2 minutes with no commit and no note, the second run in a row whose work did not reach main. The 2026-11-14 buying-path patch (`claude/buying-path-steps-2026-11-14.patch` in the Claude Project) still applies: the five store files it edits are unchanged on main (same file versions as the patch's starting point).
- Researcher agent (hourly, until 2026-11-26): finished its listed tasks on 2026-11-15 (phone check, shorter help for DX7, MODX M and FANTOM-0); no commit since 2026-11-15 03:40 UTC, as decided. New listed task below (Next 2).

## Next

1. Interface agent: put the saved 2026-11-14 buying-path patch on main (three-step line on cart, checkout and order page; clearer button labels; test-mode box above the mock QR). The src part applies cleanly to current main; take the docs lines by hand. Run all checks, push. If anything stops you (clone, push, checks), write the exact error under Questions for the PM, even if you change nothing.
2. Researcher agent: on /studio, outside the demo-bank view, add one plain link from the MODX M and FANTOM-0 tabs to that keyboard's packs (`/packs?inst=<id>`), in src/components/studio only; no new section, no claims about the packs, no link on the DX7 tab (PM decision 2026-11-16).
3. Owner: 10-minute real-keyboard test of the read-only buttons, using "ทดสอบกับเครื่องจริง" in docs/STUDIO.md. It unblocks all remaining researcher items (1a, 1d, 3d, 4f, 4h, 4o, 5b, 5e, 5h, 5k) and STUDIO.md 6.
4. Owner: decide whether the interface task continues after 2026-11-17 (see Waiting on the owner). Until then no agent works on the store pages.
5. Researcher agent, later: STUDIO.md item 6 (other keyboards' sound lists), only after the owner's real-keyboard test.
6. Simulator agent (new 2026-11-16, owner request): MODX M and FANTOM-0 simulator pages in the rack, following the checklist in docs/SIMULATOR.md from S0. The PM sets its order here.

## Questions for the PM

Agents add one line each: date · agent · question · options · recommendation. The PM answers in docs/DESIGN_LOG.md under "Decisions by the project manager" and removes the line here.

(none open)

## Waiting on the owner

- Interface task after 2026-11-17 (accounts and agents): its last two runs did not reach main. PM recommends extending it one week, store pages only (buying path first), or, if he prefers, applying the saved buying-path patch himself. Asked 2026-11-16.
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

- The interface agent's work is not reaching main: its 2026-11-14 change exists only as a Project patch, its 2026-11-15 run produced nothing, and it has made no commit since 2026-11-12. If its last two runs fail the same way, the buying-path fix waits for the owner.
- Payments are simulated; the store cannot take real money until a gateway is chosen and set up.
- MODX M and FANTOM-0 previews load FluidR3_GM samples from a third-party host (midi-js-soundfonts on GitHub); if it goes down, previews go silent.
- The read-only USB buttons (DX7 receive, MODX M Slot Names, FANTOM-0 Scene Name) are untested on real keyboards; some manual facts come from third-party manual copies (Kraft Music, manualmachine.com, manualsonline.com).
- The PM's live-site check reads page text only; it would catch a page that fails to load, not a broken button or layout.
- Two agents push to main on their own schedules; a bad push deploys straight to the live site.
- Pack names and prices are sample data, so the store is not ready for real customers.

## Done

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
