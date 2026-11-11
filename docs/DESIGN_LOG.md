# Design log

Read this before changing the interface. Add new entries at the bottom of History. Never delete earlier lines.

## Decisions (settled by the owner)

- First product line: Performance packs for MODX M (.Y2L), Thai Pop / City Pop.
- The owner's face does not appear on the site or in demos.
- Pack names, prices and counts are sample data. The owner replaces them himself. Do not ask about this.
- Store layout follows a retail catalog pattern: promo banner, category tabs, product tile grid. The owner pointed to a Lenskart listing page as the reference for this direction.
- The site is in Thai.
- Payments stay simulated until the owner chooses a gateway.

## Open questions

- Brand name: the site currently says "Mcky Vintage Key" (from the repo name). Confirm or change.
- Real cover images for packs, or keep the drawn covers?

## History

- 2026-11-11: First version as a single HTML page.
- 2026-11-11: Rebuilt as a Next.js store with catalog grid, product pages, checkout, simulated PromptPay payment and optional Postgres storage. Badges moved from the cover into the card body because they covered the cover label at phone width.
