# Studio (/studio)

A tool for arranging layered sounds for hardware keyboards: parts (or zones), the sound each one uses, key ranges (split points), velocity ranges, level, pan and octave. Visitors hear it in the browser, or on their own keyboard over USB, then download a work file, a setup sheet in the keyboard's own words, or share a link.

## Where things live

- `src/lib/studio/machines.ts`: one profile per keyboard: part count, key sizes, note naming (Yamaha middle C = C3, Roland = C4), the keyboard's own words for each setting, MIDI behaviour, `verified` and `sources`.
- `src/lib/studio/arrangement.ts`: the data and rules (routing a played note to parts, reorder, fit to another keyboard, Split/Dual detection, share links, setup sheet). Tested in `tests/studio.test.ts`.
- `src/components/studio/`: the page. `Studio.tsx` (screen-style part list, part editor, USB, files), `KeyMap.tsx` (keyboard with one draggable lane per part), `studioSound.ts` (browser preview: FM engine and polysynth from the rack, one channel strip per part), `useMidi.ts` (Web MIDI: notes and CC only, never SysEx).

## What USB does today

- Plays: notes played on the page (screen keys, A–K, or a connected MIDI keyboard) are routed by key and velocity range and sent to each part's MIDI channel, so the keyboard sounds its own parts. Two-part keyboards (XPS, D-50) get the note as played, because they split by themselves.
- Sends: Level as CC7 and Pan as CC10 per part channel.
- Does not yet: write key ranges, sound choice or anything else into the keyboard. That needs each maker's system-exclusive (SysEx) parameter addresses from its MIDI implementation or data list, and must be tested on a real keyboard before it ships. Add it per machine, behind a clear "write to keyboard" button, only after checking the addresses in the official document.

## Rules

- Use the maker's own parameter names in `terms`, taken from the official manual. Put the document link in `sources`. Set `verified: true` only after checking the manual.
- No maker logos, product photos or screen copies. The screen-style list is the store's own drawing.
- Never ship factory sound data from any maker. Visitors load their own .syx files; they stay in their browser.
- Nothing is uploaded: work is kept in the visitor's browser (localStorage), in files they download, or in the link they share.

## Checklist for the hourly research agent

Work top to bottom; one small, tested change per run.

1. XPS-30: confirm from the official manual how many parts a Performance layers, the split/dual terms, and per-part MIDI channels. Update its profile and set `verified`.
2. D-50: confirm Key Mode names (Whole, Dual, Split, Separate, ...), Split Point term, Upper/Lower tone balance range, and update the profile.
3. MODX M: confirm the screen term for key range ("Note Limit") and velocity ("Velocity Limit"), how many parts can be under Keyboard Control, and per-part receive channel behaviour. Add element count notes if useful.
4. FANTOM-0: confirm "Keyboard Range" wording on the zone screen and the receive channel default per zone.
5. Add a SysEx write path for one machine only after the parameter addresses are confirmed in an official MIDI implementation PDF. Keep it off by default and label it as needing a test on a real keyboard.
6. Improve the arranging flow itself (faster split setting, templates such as "piano + pad split at C4", "layer strings on piano"), keeping the page easy on a phone.
