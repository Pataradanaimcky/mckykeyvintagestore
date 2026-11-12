# Sound organizer (/studio, menu "จัดเรียงเสียง")

People make and edit sounds on their own keyboard as usual. This page is only for putting those sounds in the order they want to find them: drag and drop on a big screen instead of moving one slot at a time on the keyboard. Sound editing and part settings do not belong here (owner decision 2026-11-12).

Order of work set by the owner: DX7 first (to learn the whole loop on a fully documented format), then MODX M, then FANTOM-0.

## What each keyboard does today

- DX7 (works end to end): open one or more .syx files (32-voice cartridges or single voices); the first 32 voices fill the cartridge, the rest wait in the pool. Drag or tap to reorder, rename (10 ASCII characters), listen through the site's FM engine (@audio/synth-dx7), then download the cartridge in the new order as a 32-voice .syx. Empty slots are saved as INIT VOICE. Packing is checked against the engine's unpack in tests/dx7.test.ts. Receive from the keyboard (2026-11-12): "รับเสียง 32 เสียงจาก DX7 ทาง USB-MIDI" listens on every MIDI input (Web MIDI with SysEx, Chrome or Edge) for a 32-voice bulk dump the owner starts on the DX7 itself (FUNCTION, button 8 MIDI until SYS INFO AVAIL, button 8 again, then YES at the transmit prompt; channel 1). The dump is checked (header, 4104 bytes, checksum, F7) before it becomes the cartridge; the old cartridge goes to the shelf. Nothing is sent to the keyboard: the DX7 manual's reception table lists no voice dump request, only one for DX1 performance data.
- MODX M Live Set (checked 2026-11-12): USER banks 1–8, 16 pages each, 16 slots per page (Yamaha "Welcome to MODX M"). Bank Name and Page Name up to 20 characters; per slot Slot Name (20), Color from the keyboard's 16 names (Black, Red, Yellow, Green, Blue, Azure, Pink, Orange, Purple, Sakura, Cream, Lime, Aqua, Beige, Mint, Lilac), Volume and SSS Time (0.0sec–30sec, Hold, System; MODX M operation manual p. 361); edit jobs Copy, Exchange, Delete, Delete & Move; register with [SHIFT] + [LIVE SET]. Names, colors and jobs are from the MONTAGE M online manual's Live Set Edit page, which shares the Live Set system; confirm on a MODX M if anything differs. The chosen slot is outlined in orange, as on the keyboard.
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
2a. [x] DX7: merge two cartridges, done 2026-11-12: put cartridge B in (A moves to the shelf), choose shelf 1–16 or 17–32 and press "วางแทนช่อง 17–32"; the replaced voices go to the end of the shelf. With "สลับครึ่ง" any 16 of each can be combined (`shelfIntoSlots`, tests/dx7-merge.test.ts).
2b. [x] DX7: plain voice list, decided 2026-11-12: no separate export. "ดาวน์โหลดใบจัดเรียง" already gives a .txt with the cartridge name, "Voice 1–32: NAME" in cartridge order and the shelf; now covered by a test in tests/library.test.ts. 1a (real DX7 test, exact prompt text) still needs the owner's keyboard; a ManualsLib copy checked 2026-11-12 did not show the display text.
3. [x] MODX M: SSS Time per slot, done 2026-11-12. The MODX M operation manual (Yamaha's Dutch edition, data.yamaha.com/download/files/2584767, p. 361, Live Set Edit) lists per slot: Slot Type (Perform, Song, Audio, Pattern), Slot Name (20), Performance, Color, Volume and "SSS Time … Instellingen: 0.0sec – 30sec, Hold, System". The organizer now keeps SSS Time per slot (unset = "ตามเครื่อง", System, Hold, or seconds 0.0–30 kept to one decimal) and writes it on the order sheet (`parseSssTime`, `sssLabel`, test in tests/library.test.ts). Still unknown from the manual: the SSS Time step size above 0.0sec, and the Volume range and default (the manual gives neither; the page keeps 0–127 and "ตามเครื่อง" until confirmed). Also still open: whether Yamaha FM Converter output loads on MODX M.
3b. MODX M: Slot Type Song / Audio / Pattern exists (p. 361). The organizer only handles Perform slots; decide with the owner whether a note is enough.
3a. [x] DX7 → MONTAGE/MODX route, done 2026-11-12: the DX7 "บันทึกและนำไปใช้" text points to Yamaha FM Converter. Yamaha's converter page and FM Converter User Guide v1.0 name only "Montage or MODX" as targets, accept .syx and .dxc, and do not state the output file extension. Yamaha's MONTAGE family compatibility page says MONTAGE M (MODX M) can load .X7L and .X8L library files, but no official page confirms the converter output is one of those, so the page says MODX M is not confirmed. Still open: the converter's output extension from an official source, then a real MODX M load test.
4. MODX M: research whether the MODX M user file or library file lists Performance names in a readable way, so names can be imported from a file instead of typed. Only use documented or clearly safe reading; never write those files.
5. FANTOM-0: confirm scene numbering, banks and the Scene Write / scene order steps from the official manual; update the target.
6. Later: other keyboards' sound lists (XPS, D-50 patch banks, Juno banks) once the three above are done.
