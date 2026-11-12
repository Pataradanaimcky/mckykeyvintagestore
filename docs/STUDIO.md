# Sound organizer (/studio, menu "จัดเรียงเสียง")

People make and edit sounds on their own keyboard as usual. This page is only for putting those sounds in the order they want to find them: drag and drop on a big screen instead of moving one slot at a time on the keyboard. Sound editing and part settings do not belong here (owner decision 2026-11-12).

Order of work set by the owner: DX7 first (to learn the whole loop on a fully documented format), then MODX M, then FANTOM-0.

## What each keyboard does today

- DX7 (works end to end): open one or more .syx files (32-voice cartridges or single voices); the first 32 voices fill the cartridge, the rest wait in the pool. Drag or tap to reorder, rename (10 ASCII characters), listen through the site's FM engine (@audio/synth-dx7), then download the cartridge in the new order as a 32-voice .syx. Empty slots are saved as INIT VOICE. Packing is checked against the engine's unpack in tests/dx7.test.ts.
- MODX M Live Set (checked 2026-11-12): USER banks 1–8, 16 pages each, 16 slots per page (Yamaha "Welcome to MODX M"). Bank Name and Page Name up to 20 characters; per slot Slot Name (20), Color from the keyboard's 16 names (Black, Red, Yellow, Green, Blue, Azure, Pink, Orange, Purple, Sakura, Cream, Lime, Aqua, Beige, Mint, Lilac) and Volume; edit jobs Copy, Exchange, Delete, Delete & Move; register with [SHIFT] + [LIVE SET]. Names, colors and jobs are from the MONTAGE M online manual's Live Set Edit page, which shares the Live Set system; confirm on a MODX M if anything differs. The chosen slot is outlined in orange, as on the keyboard.
- FANTOM-0 scenes: paste scene names, arrange in banks of 16, order sheet with scene numbers. Not verified yet: scene numbering and bank size, exact Scene Write steps.

Work is kept in the visitor's browser per keyboard, in a downloaded work file, or in a share link. Nothing is uploaded.

## Preview sounds

- DX7: the real voice, through the site's FM engine.
- MODX M and FANTOM-0: the keyboards' own sounds are Yamaha/Roland samples and undocumented files, so they cannot play on the site. Each slot gets an open sample of the same type instead (Piano, E.Piano, Strings, Pad, Brass, Organ, Bass, Lead, Bell, Choir...), guessed from the name and changeable per slot. Samples: FluidR3_GM (CC BY 3.0) from midi-js-soundfonts, played by smplr (MIT), loaded from gleitz.github.io in the visitor's browser. Other open sample sets were not used because their licences could not be confirmed. Credit stays visible under the preview keyboard.
- Best match of all: the owner's own recordings of his packs, as audio demos.

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
3. MODX M: done for structure, names, colors, volume and jobs (see above). Still open: the Volume default value and SSS Time per slot (MONTAGE M has SSS Time; check MODX M), and whether Yamaha FM Converter output (DX7 .syx to MONTAGE/MODX) loads on MODX M, and if so show that route next to the DX7 download.
4. MODX M: research whether the MODX M user file or library file lists Performance names in a readable way, so names can be imported from a file instead of typed. Only use documented or clearly safe reading; never write those files.
5. FANTOM-0: confirm scene numbering, banks and the Scene Write / scene order steps from the official manual; update the target.
6. Later: other keyboards' sound lists (XPS, D-50 patch banks, Juno banks) once the three above are done.
