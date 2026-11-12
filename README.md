# Mcky Vintage Key store

Online store for Yamaha MODX M / MONTAGE M sound packs. Built with Next.js (App Router), TypeScript, Tailwind CSS, Drizzle ORM and Postgres.

**Status:** catalog data is sample data and payments are simulated. No real money moves yet.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

With no settings at all the store runs in **demo mode**: there is no database, and each order lives inside its own signed link. That is enough to click through the whole purchase flow.

| Command | What it does |
|---|---|
| `npm run dev` | Local development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit tests |
| `npm run db:generate` | After changing `src/lib/db/schema.ts`, write a new migration file into `drizzle/` |
| `npm run db:migrate` | Apply migration files to the database (also runs by itself in every build) |

## Settings

Copy `.env.example` to `.env.local`. On Vercel, set the same names under Project Settings → Environment Variables.

| Name | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string (`POSTGRES_URL` also works). Empty means demo mode. |
| `ORDER_SECRET` | Long random string that signs order links and webhooks. |
| `PAYMENT_PROVIDER` | `mock` (the only provider today). |
| `AUTH_SECRET` | Long random string for sign-in sessions. No sign-in is offered without it. |
| `AUTH_<PLATFORM>_ID` / `_SECRET` | Keys for Google, LINE, Facebook, Apple, X (`TWITTER`) and TikTok. Each platform appears on the sign-in page once both are set. |

To move from demo mode to a real database, follow `docs/SETUP.md`. The tables are created automatically during the next build; there is nothing to run by hand.

## Where things live

```
src/
  app/                        Pages and API routes (one folder per URL)
    page.tsx                  Home: headline, product lines, featured packs
    packs/                    All packs with filters; packs/[slug] is one pack
    compatibility/            Which keyboards each line works on, and install steps
    faq/                      Questions and answers
    studio/                   Sound organizer: order DX7 cartridges, MODX M Live Sets, FANTOM-0 scenes (see docs/STUDIO.md)
    login/, account/          Sign in with a social account; my orders
    api/auth/                 Sign-in endpoints the platforms call back to
    cart/                     Cart page and the add/remove actions
    checkout/                 Checkout for everything in the cart
    orders/[id]/              Payment QR, order status, test buttons
    icon.svg, apple-icon.png, opengraph-image.png   Site icon and link preview image
    api/payments/webhook/     URL that payment gateways call
  components/
    layout/                   Header, footer, announcement bar, container
    catalog/                  Product card, cover art, tabs, banner, patch list
    cart/                     Add-to-cart buttons, cart rows, header cart link, order summary
    checkout/                 Checkout form, QR code, test panel
    studio/                   The sound organizer page
    rack/                     Playable rack at the top of the home page, as swipeable pages (RackCarousel):
                              MODULAR (SynthRack: cables, knobs, sequencer), fm/ (six-operator FM that
                              opens DX7 .syx files) and poly/ (eight-voice analog-style polysynth)
  worklets/                   AudioWorklet code; scripts/build-worklets.mjs bundles it into public/worklets/
  config/site.ts              Brand name, site address, contact, sample-data switch
  content/                    Page text that is not product data (FAQ); demos.ts lists the owner's recorded demo clips (played on pack pages and in organizer demo banks)
  lib/
    catalog/                  Product data and lookups  ← add packs here
    auth/                     Sign-in setup and the list of platforms
    cart/                     Cart cookie: read, write, clean up
    studio/                   Organizer rules and DX7 .syx writing
    orders/                   Order rules and the two storage back ends
    payments/                 Provider interface, simulator, PromptPay QR builder
    db/                       Database schema and connection
    security/                 Signing helpers
    env.ts                    Every environment variable the app reads
docs/
  PAYMENTS.md                 How to connect a real Thai payment gateway
  SETUP.md                    Owner checklist: database, secrets and sign-in keys
  LOGIN.md                    How to switch on each social sign-in
  BRAND_PROFILE.md            Name, handle, profile pictures and bio text for social media and Gmail
  DESIGN_LOG.md               Design decisions and history
  STUDIO.md                   How the sound organizer works, and the research checklist
tests/                        Unit tests
```

`public/worklets/` and `public/vendor/` are generated by `npm run dev` and `npm run build`; do not edit or commit them.

## Common changes

- **Add or edit a pack:** `src/lib/catalog/products.ts`. Prices are in satang (฿590 = `59000`).
- **Add a keyboard model:** `src/lib/catalog/instruments.ts`, then add its id to `InstrumentId` in `types.ts`.
- **Change brand name or contact:** `src/config/site.ts`.
- **Change colors or fonts:** the `@theme` block in `src/app/globals.css`.
- **Remove the "sample data" strip:** set `isSampleCatalog: false` in `src/config/site.ts`.

## What is built in for safety

- Prices are always read from the server-side catalog, never from the browser. The cart cookie holds pack names only, and unknown or unavailable packs in it are dropped.
- Order ids are random and unguessable. Demo-mode links are signed and reject any tampering.
- Webhooks are rejected unless the provider's signature checks out, and applying the same webhook twice changes nothing.
- A real payment provider refuses to start without `DATABASE_URL` and a real `ORDER_SECRET`.
- Form input is validated on the server, and standard security headers are set in `next.config.ts`.

- Sign-in never handles passwords: the platform confirms who the buyer is. Sessions are signed cookies, and an order is only listed for the account that was signed in when it was made.

## Credits

The FM page runs [@audio/synth-dx7](https://www.npmjs.com/package/@audio/synth-dx7) (Apache-2.0), a JavaScript port of the Music Synthesizer for Android engine (Copyright 2012-2013 Google Inc.), the same engine Dexed builds on. Its LICENSE and NOTICE are published with the site at `/vendor/synth-dx7/`. The FM voices in `src/components/rack/fm/presets.ts` were written for this store; Yamaha's factory voices are not included. Dexed itself and other GPL synth code are not used, so the store's code stays under its own licence.

The sound organizer previews MODX M and FANTOM-0 slots with open General MIDI samples: FluidR3_GM by Frank Wen (Creative Commons Attribution 3.0), loaded in the visitor's browser from the [midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts) project and played with [smplr](https://www.npmjs.com/package/smplr) (MIT). They are close matches by type of sound, not the keyboard's own sounds; the credit is shown under the preview keyboard.

Not built yet: file delivery after payment, order emails, rate limiting, and an admin view.
