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
| `npm run db:push` | Create or update database tables from `src/lib/db/schema.ts` |

## Settings

Copy `.env.example` to `.env.local`. On Vercel, set the same names under Project Settings → Environment Variables.

| Name | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string. Empty means demo mode. |
| `ORDER_SECRET` | Long random string that signs order links and webhooks. |
| `PAYMENT_PROVIDER` | `mock` (the only provider today). |

To move from demo mode to a real database: create a Postgres database (Neon through Vercel Storage works), set `DATABASE_URL` and `ORDER_SECRET`, then run `npm run db:push` once.

## Where things live

```
src/
  app/                        Pages and API routes (one folder per URL)
    page.tsx                  Home: headline, product lines, featured packs
    packs/                    All packs with filters; packs/[slug] is one pack
    compatibility/            Which keyboards each line works on, and install steps
    faq/                      Questions and answers
    checkout/[slug]/          Checkout form and its server action
    orders/[id]/              Payment QR, order status, test buttons
    icon.svg, apple-icon.png, opengraph-image.png   Site icon and link preview image
    api/payments/webhook/     URL that payment gateways call
  components/
    layout/                   Header, footer, announcement bar, container
    catalog/                  Product card, cover art, tabs, banner, patch list
    checkout/                 Checkout form, QR code, test panel
  config/site.ts              Brand name, site address, contact, sample-data switch
  content/                    Page text that is not product data (FAQ)
  lib/
    catalog/                  Product data and lookups  ← add packs here
    orders/                   Order rules and the two storage back ends
    payments/                 Provider interface, simulator, PromptPay QR builder
    db/                       Database schema and connection
    security/                 Signing helpers
    env.ts                    Every environment variable the app reads
docs/
  PAYMENTS.md                 How to connect a real Thai payment gateway
  BRAND_PROFILE.md            Name, handle, profile pictures and bio text for social media and Gmail
  DESIGN_LOG.md               Design decisions and history
tests/                        Unit tests
```

## Common changes

- **Add or edit a pack:** `src/lib/catalog/products.ts`. Prices are in satang (฿590 = `59000`).
- **Add a keyboard model:** `src/lib/catalog/instruments.ts`, then add its id to `InstrumentId` in `types.ts`.
- **Change brand name or contact:** `src/config/site.ts`.
- **Change colors or fonts:** the `@theme` block in `src/app/globals.css`.
- **Remove the "sample data" strip:** set `isSampleCatalog: false` in `src/config/site.ts`.

## What is built in for safety

- Prices are always read from the server-side catalog, never from the browser.
- Order ids are random and unguessable. Demo-mode links are signed and reject any tampering.
- Webhooks are rejected unless the provider's signature checks out, and applying the same webhook twice changes nothing.
- A real payment provider refuses to start without `DATABASE_URL` and a real `ORDER_SECRET`.
- Form input is validated on the server, and standard security headers are set in `next.config.ts`.

Not built yet: file delivery after payment, order emails, rate limiting, and an admin view.
