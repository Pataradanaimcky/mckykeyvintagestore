# Design log

Read this before changing the interface. Add new entries at the bottom of History. Never delete earlier lines.

## Decisions (settled by the owner)

- First product line: Performance packs for MODX M (.Y2L), Thai Pop / City Pop.
- The owner's face does not appear on the site or in demos.
- Pack names, prices and counts are sample data. The owner replaces them himself. Do not ask about this.
- Store layout follows a retail catalog pattern: promo banner, category tabs, product tile grid. The owner pointed to a Lenskart listing page as the reference for this direction.
- The site is in Thai.
- Payments stay simulated until the owner chooses a gateway.
- Buyers must see at a glance which keyboard each pack is for. Every pack carries a plain-text "สำหรับ <maker> <model>" label, and the store front filters by instrument.
- The store keeps its own identity: dark instrument-panel look, teal display accent, Chakra Petch headings and Anuphan body text. It must not imitate Yamaha's or Roland's corporate identity. No maker logos, wordmarks, brand color schemes, product photos from their sites, or drawings of their real products. Maker and model names appear only as plain text saying what a pack works with, never inside a pack's name, and the footer trademark note stays.

## Open questions

- Brand name: the site currently says "Mcky Vintage Key" (from the repo name). Confirm or change.
- Real cover images: the owner can supply his own photos of his own keyboards to replace the drawn covers.

## History

- 2026-11-11: First version as a single HTML page.
- 2026-11-11: Rebuilt as a Next.js store with catalog grid, product pages, checkout, simulated PromptPay payment and optional Postgres storage. Badges moved from the cover into the card body because they covered the cover label at phone width.
- 2026-11-11: Restyled as a dark instrument-panel look with new fonts (Chakra Petch, Anuphan) because the first version read as generic. Added an instrument for every pack, an instrument filter, per-instrument compatibility tables and install steps, and a sample Roland D-50 pack. Covers redrawn as a generic synth panel.
