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

## Who decides (owner instruction, 2026-11-12)

The owner, Mcky, has handed day-to-day decisions to the project manager agent ("Mcky project manager", daily 08:17 Bangkok). Agents do not ask the owner for permission or choices directly.

- When you need a decision, add it under "Questions for the PM" in `docs/ROADMAP.md`: one line with the date, your agent name, the question, the options and your recommendation. If the choice is low-risk and easy to undo, carry on with your recommendation and say so; otherwise leave that part and work on something else.
- The PM answers under "Decisions by the project manager" in `docs/DESIGN_LOG.md`. Treat those as settled, like the owner's decisions, unless the owner later overrules them.
- Reserved for the owner (the PM must not decide these; it asks him): money (prices, discounts, payment gateways, anything that costs money), legal and licences (pack terms, third-party content, trademarks), the brand (name, logo, palette, overall visual direction), accounts and secrets (keys, sign-in setup, anything sent to real customers or posted publicly), anything irreversible or destructive (deleting data or features the owner asked for, history rewrites, changes to real orders), and changing or reversing any of the owner's own decisions.

