# Sound organizer (/studio, menu "จัดเรียงเสียง")

People make and edit sounds on their own keyboard as usual. This page is only for putting those sounds in the order they want to find them: drag and drop on a big screen instead of moving one slot at a time on the keyboard. Sound editing and part settings do not belong here (owner decision 2026-11-12).

Order of work set by the owner: DX7 first (to learn the whole loop on a fully documented format), then MODX M, then FANTOM-0.

## What each keyboard does today

- DX7 (works end to end): open one or more .syx files (32-voice cartridges or single voices); the first 32 voices fill the cartridge, the rest wait in the pool. Drag or tap to reorder, rename (10 ASCII characters), listen through the site's FM engine (@audio/synth-dx7), then download the cartridge in the new order as a 32-voice .syx. Empty slots are saved as INIT VOICE. Packing is checked against the engine's unpack in tests/dx7.test.ts.
- MODX M Live Set: paste the Performance names from the keyboard (one per line), drag them into Live Set pages of 16 slots, choose slot colors, then download or print an order sheet to follow on the keyboard. Not verified yet: page count, slot color names, exact steps.
- FANTOM-0 scenes: paste scene names, arrange in banks of 16, order sheet with scene numbers. Not verified yet: scene numbering and bank size, exact Scene Write steps.

Work is kept in the visitor's browser per keyboard, in a downloaded work file, or in a share link. Nothing is uploaded.

## Where things live

- src/lib/studio/library.ts: keyboard targets (words, grid size, verified flag, sources), layout data, move/swap, fill, sort, order sheet, share links, import checks. Tests: tests/library.test.ts.
- src/lib/studio/dx7.ts: DX7 voice names, single-voice and cartridge .syx writing. Tests: tests/dx7.test.ts.
- src/components/studio/Organizer.tsx: the page.

## Rules

- Use each keyboard's own words, from the official manual, with the link in `sources`. Set `verified: true` only after checking.
- No maker logos, product photos or copies of a keyboard's screen design. Never ship factory sound data from any maker.
- Sending anything to a keyboard over USB that would overwrite its memory must be behind a clear confirmation, off by default, and labelled as needing a real-keyboard test.

## Checklist for the hourly research agent

One small, tested change per run, top to bottom.

1. DX7: check against the DX7 manual's MIDI data format that cartridge files written here load in Dexed and on a DX7 (header, byte count, checksum, packed layout). Add "receive a cartridge from the keyboard over USB" (Web MIDI with SysEx; only reading) so people can pull their DX7 memory into the organizer.
2. DX7: small organizer helpers a DX7 owner wants: merge two cartridges into one, find duplicate voices, swap whole halves (1–16 / 17–32), export a voice list as text.
3. MODX M: confirm from the official MODX M manual how Live Set is organised (banks, pages, 16 slots, slot colors and their names) and the steps to place a Performance in a slot; update the target and the order sheet wording. Confirm whether Yamaha FM Converter output (DX7 .syx to MONTAGE/MODX) loads on MODX M, and if so show that route next to the DX7 download.
4. MODX M: research whether the MODX M user file or library file lists Performance names in a readable way, so names can be imported from a file instead of typed. Only use documented or clearly safe reading; never write those files.
5. FANTOM-0: confirm scene numbering, banks and the Scene Write / scene order steps from the official manual; update the target.
6. Later: other keyboards' sound lists (XPS, D-50 patch banks, Juno banks) once the three above are done.
