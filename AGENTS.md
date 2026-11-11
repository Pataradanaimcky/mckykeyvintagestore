<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project rules

- Read `README.md` for the folder layout and `docs/DESIGN_LOG.md` before changing the interface.
- The site is in Thai. Pack names, prices and counts in `src/lib/catalog/products.ts` are sample data owned by the store owner: do not change them.
- Keep colors and fonts in the `@theme` block of `src/app/globals.css`. Components use those tokens, not literal colors.
- Never add real payment keys, fake reviews, fake sales numbers or Yamaha logos. Keep the footer trademark note.
- Before pushing: `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` must all pass.
- `npm run build` deletes `.next` first on purpose. An incremental build was seen to keep an old stylesheet after `globals.css` and class names changed, so always build clean before checking how a page looks.
