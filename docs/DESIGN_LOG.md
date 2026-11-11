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
- The owner wants the store to look like an ordinary Thai online shop, not a designed "tech" page. His references are plain retail sites (Lenskart listing page, CT Music product page). So: white background, one flat brand blue, red prices, yellow sale tags, Kanit headings and Sarabun body text, thin borders, small corner radius. Do NOT bring back dark hero panels, grid or glow backgrounds, gradients, neon accents, monospace "terminal" text, techno fonts, big rounded cards or scroll fade-ins. He has rejected those twice as looking AI-made.
- Motion is CSS only and small: banner text rises once on load, keys on a cover press on hover (and loop on the banner's cover), a plain strip of pack sound names scrolls under the banner, a highlight steps down the sound list, a tick draws on a paid order. All motion stops for reduced-motion users.
- Real photos beat drawn covers. Set `image` on a product to show a photo from `/public/packs/`. Only use the owner's own photos of his own keyboards.
- The store keeps its own identity and must not imitate Yamaha's or Roland's corporate identity. No maker logos, wordmarks, brand color schemes, product photos from their sites, or drawings of their real products. Maker and model names appear only as plain text saying what a pack works with, never inside a pack's name, and the footer trademark note stays.

## Open questions

- Brand name: the site currently says "Mcky Vintage Key" (from the repo name). Confirm or change.
- Real cover images: the owner can supply his own photos of his own keyboards to replace the drawn covers.

## History

- 2026-11-11: First version as a single HTML page.
- 2026-11-11: Rebuilt as a Next.js store with catalog grid, product pages, checkout, simulated PromptPay payment and optional Postgres storage. Badges moved from the cover into the card body because they covered the cover label at phone width.
- 2026-11-11: Restyled as a dark instrument-panel look with new fonts (Chakra Petch, Anuphan) because the first version read as generic. Added an instrument for every pack, an instrument filter, per-instrument compatibility tables and install steps, and a sample Roland D-50 pack. Covers redrawn as a generic synth panel.
- 2026-11-11: Added motion. Banner load sequence and a self-playing featured cover (keys, knobs, sliders, screen glow), hover chord on product cards, patch-name ticker, scroll fade-ins, a stepping cursor in the patch list and a drawn tick on a paid order.
- 2026-11-11: Restyled again as a plain Thai retail shop after the owner said the dark panel version still looked AI-made. Flat blue banner, white page, Kanit and Sarabun, red prices, flat single-color covers with optional photo support. Removed glow, grid, knobs, scan line and scroll fade-ins (the fade left sections half-visible).
