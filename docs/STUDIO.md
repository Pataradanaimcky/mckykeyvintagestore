# Sound organizer (/studio, menu "จัดเรียงเสียง")

People make and edit sounds on their own keyboard as usual. This page is only for putting those sounds in the order they want to find them: drag and drop on a big screen instead of moving one slot at a time on the keyboard. Sound editing and part settings do not belong here (owner decision 2026-11-12).

Order of work set by the owner: DX7 first (to learn the whole loop on a fully documented format), then MODX M, then FANTOM-0.

## What each keyboard does today

- DX7 (works end to end): open one or more .syx files (32-voice cartridges or single voices); the first 32 voices fill the cartridge, the rest wait in the pool. Drag or tap to reorder, rename (10 ASCII characters), listen through the site's FM engine (@audio/synth-dx7), then download the cartridge in the new order as a 32-voice .syx. Empty slots are saved as INIT VOICE. Packing is checked against the engine's unpack in tests/dx7.test.ts. Receive from the keyboard (2026-11-12): "รับเสียง 32 เสียงจาก DX7 ทาง USB-MIDI" listens on every MIDI input (Web MIDI with SysEx, Chrome or Edge) for a 32-voice bulk dump the owner starts on the DX7 itself (FUNCTION, button 8 MIDI until SYS INFO AVAIL, button 8 again, then YES at the transmit prompt; channel 1). The dump is checked (header, 4104 bytes, checksum, F7) before it becomes the cartridge; the old cartridge goes to the shelf. Nothing is sent to the keyboard: the DX7 manual's reception table lists no voice dump request, only one for DX1 performance data.
- MODX M Live Set (checked 2026-11-12): USER banks 1–8, 16 pages each, 16 slots per page (Yamaha "Welcome to MODX M"). Bank Name and Page Name up to 20 characters; per slot Slot Name (20), Color from the keyboard's 16 names (Black, Red, Yellow, Green, Blue, Azure, Pink, Orange, Purple, Sakura, Cream, Lime, Aqua, Beige, Mint, Lilac) and Volume; edit jobs Copy, Exchange, Delete, Delete & Move; register with [SHIFT] + [LIVE SET]. Names, colors and jobs are from the MONTAGE M online manual's Live Set Edit page, which shares the Live Set system; confirm on a MODX M if anything differs. The chosen slot is outlined in orange, as on the keyboard.
- FANTOM-0 scenes: paste scene names, arrange in banks of 16, order sheet with scene numbers. Not verified yet: scene numbering and bank size, exact Scene Write steps.

Work is kept in the visitor's browser per keyboard, in a downloaded work file, or in a share link. Nothing is uploaded.

## Preview sounds

- DX7: the real voice, through the site's FM engine.
- MODX M and FANTOM-0: the keyboards' own sounds are Yamaha/Roland samples and undocumented files, so they cannot play on the site. Each slot gets an open sample of the same type instead (Piano, E.Piano, Strings, Pad, Brass, Organ, Bass, Lead, Bell, Choir...), guessed from the name and changeable per slot. Samples: FluidR3_GM (CC BY 3.0) from midi-js-soundfonts, played by smplr (MIT), loaded from gleitz.github.io in the visitor's browser. Other open sample sets were not used because their licences could not be confirmed. Credit stays visible under the preview keyboard.
- Best match of all: the owner's own recordings of his packs, as audio demos.

## Demo banks

Every store pack opens as a demo bank on its keyboard (MODX M or FANTOM-0). Each slot plays the owner's recorded demo of that sound from `src/content/demos.ts` (first 8 seconds, through Web Audio, no file link), or a close-match preview until a recording exists. Demo banks can be played and rearranged but not downloaded, saved to a file or shared; the visitor's own work is kept aside and comes back with "กลับงานของฉัน".

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

1. [x] DX7: receive a cartridge from the keyboard over USB (read only), done 2026-11-12.
1a. DX7: still open: confirm the exact transmit prompt text on the display (the online copy of the manual is OCR and reads "MIDI TRANSIT?"/"MIT?"; the page now writes "MIDI TRANSMIT ?") and test a real DX7 dump and a downloaded cartridge in Dexed and on a DX7. Yamaha's own DX7 PDF (data.yamaha.com DX7E1.pdf) is a scan with no text, so the transmission data table could not be quoted this run.
2. [x] DX7: find duplicate voices (same 145 parameter bytes, names ignored; "ย้ายเสียงซ้ำลงชั้นวาง" keeps the first copy) and swap halves 1–16 ↔ 17–32, done 2026-11-12 (`duplicateVoices`, `shelveDuplicates`, `swapHalves`, tests/dx7-helpers.test.ts).
2a. DX7: still open from item 2: merge two cartridges into one (pick which 16 of each), export a plain voice list as text (the order sheet already lists names; decide if a separate list is needed).
3. MODX M: done for structure, names, colors, volume and jobs (see above). Still open: the Volume default value and SSS Time per slot (MONTAGE M has SSS Time; check MODX M), and whether Yamaha FM Converter output (DX7 .syx to MONTAGE/MODX) loads on MODX M, and if so show that route next to the DX7 download.
4. MODX M: research whether the MODX M user file or library file lists Performance names in a readable way, so names can be imported from a file instead of typed. Only use documented or clearly safe reading; never write those files.
5. FANTOM-0: confirm scene numbering, banks and the Scene Write / scene order steps from the official manual; update the target.
6. Later: other keyboards' sound lists (XPS, D-50 patch banks, Juno banks) once the three above are done.
