# Owner setup checklist

Everything here happens in accounts that belong to you, so only you can do it. The code is already finished: each step below switches a feature on as soon as its values exist in Vercel.

All values go in **Vercel → your project → Settings → Environment Variables**. After adding or changing any of them, open **Deployments**, pick the latest one and choose **Redeploy**.

## 1. Database (about 5 minutes, free tier)

The store uses Postgres. The simplest place to run it is Neon, added from inside Vercel, because Vercel then fills in the connection for you.

1. Vercel → your project → **Storage** tab → **Create Database**.
2. Choose **Neon** (Serverless Postgres), pick the free plan and a region near your buyers (Singapore).
3. When asked, connect it to the `mckykeyvintagestore` project for all environments.
4. Redeploy.

That is all. Vercel adds `DATABASE_URL` by itself, and the build creates the tables. You should see `[migrate] Database tables are up to date.` in the build log.

What changes: orders are now saved, the account page can show order history, and order pages keep working after a payment gateway confirms a payment.

## 2. Secrets (2 minutes)

Make two different long random strings and add them as:

| Name | Used for |
|---|---|
| `ORDER_SECRET` | Signing order links and payment webhooks |
| `AUTH_SECRET` | Signing sign-in sessions |

To make one, run `openssl rand -base64 32` in a terminal, or use the password generator in your password manager (32 characters or more). Do not reuse a password, and do not paste these into chats, emails or the code.

## 3. Sign-in platforms (10 to 30 minutes each)

Follow `docs/LOGIN.md`. Do Google first, then LINE, then Facebook. Each needs a developer app on that platform and two values added to Vercel.

## 4. Check it worked

- `/login` shows a button for each platform you set up.
- Sign in, buy the test pack with the simulated payment, then open `/account`: the order is listed.
- Sign out, and `/account` sends you back to `/login`.

## Still to come before real sales

- A real payment gateway (`docs/PAYMENTS.md`).
- File delivery and receipt emails.
- A privacy policy page.
- Your own domain. When you add one, update the redirect addresses on every sign-in platform and `url` in `src/config/site.ts`.
