# Design log

Read this before changing the interface. Add new entries at the bottom of History. Never delete earlier lines.

## Decisions (settled by the owner)

- Product lines: packs for Yamaha MODX M (.Y2L) and Roland FANTOM-0 (.SVZ), Thai Pop / City Pop.
- The owner's face does not appear on the site or in demos.
- Pack names, prices and counts are sample data. The owner replaces them himself. Do not ask about this.
- Store layout follows a retail catalog pattern: promo banner, category tabs, product tile grid. The owner pointed to a Lenskart listing page as the reference for this direction.
- The site is in Thai.
- Payments stay simulated until the owner chooses a gateway.
- Buyers must see at a glance which keyboard each pack is for. Every pack carries a plain-text "สำหรับ <maker> <model>" label, and the store front filters by instrument.
- The owner approved this direction on 2026-11-11 ("เอาอันนี้"). Refine it; do not replace it. Colors are black, blue and red only: near-black page, white text, blue for the MODX M line and red for the FANTOM-0 line. No yellow, no other accent.
- Current direction: a modern studio-style page. Very large tight headlines, lots of empty space, white pill buttons on the black page, large rounded cards, one typeface (Anuphan). His reference for the feel and the animation is the Arounda agency site; take the general approach only, never its layout, text or artwork.
- The store is themed around two product lines, and each has its own color used on its hero card, pack covers and chip dot: Yamaha MODX M (blue) and Roland FANTOM-0 (red). These are the store's own line colors, not the makers' brand colors. Do not add a third accent color.
- Motion is part of the look: headline lines slide up from a mask on load, sections fade up on scroll (RevealObserver + `data-reveal`), a large marquee of sound names, cards zoom their cover and show an arrow on hover, keys play on hover, button arrows slide. Keep motion smooth and slow (the `--ease-out-soft` curve). Everything stops for reduced-motion users and nothing is hidden without JavaScript.
- Do not bring back: dark hero with grid or glow, neon accents, monospace "terminal" text, drawn synth panels with knobs. The owner rejected those as looking AI-made.
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
- 2026-11-11: Restyled as a modern studio-style page at the owner's request, themed around the MODX M and FANTOM-0 lines. Roland line changed from D-50 to FANTOM-0. New hero with masked headline, product-line cards, sound-name marquee, scroll reveals, pill buttons and large rounded cards.
- 2026-11-11: Owner approved the studio-style design and asked for a black, red and blue palette. Page turned near-black with white text; yellow accents replaced by the two line colors (pressed keys, discount tag, list highlight, pending badge).
