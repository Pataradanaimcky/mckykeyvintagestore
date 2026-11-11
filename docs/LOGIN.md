# Sign-in with social accounts

Buyers can sign in with an account they already have. The store never sees or stores a password. Buying without signing in still works; signing in adds an order history at `/account` and fills in the email at checkout.

The code supports six platforms. **None is switched on yet**, because each one needs keys that only the store owner can create.

| Platform | Variable names | Where the keys come from | Notes |
|---|---|---|---|
| Google | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Google Cloud Console → OAuth client (type: Web application) | Free. Start here. |
| LINE | `AUTH_LINE_ID`, `AUTH_LINE_SECRET` | LINE Developers Console → a LINE Login channel | Free. The most used in Thailand. Does not share the buyer's email unless you apply for that permission. |
| Facebook | `AUTH_FACEBOOK_ID`, `AUTH_FACEBOOK_SECRET` | Meta for Developers → an app with Facebook Login | Free. Needs a privacy policy page before going live. |
| Apple | `AUTH_APPLE_ID`, `AUTH_APPLE_SECRET` | Apple Developer account → Sign in with Apple | Needs the paid Apple Developer Program. The secret is a generated token that expires and must be renewed. |
| X | `AUTH_TWITTER_ID`, `AUTH_TWITTER_SECRET` | X Developer Portal → an app with OAuth 2.0 | Check the current developer plan terms first. |
| TikTok | `AUTH_TIKTOK_ID`, `AUTH_TIKTOK_SECRET` | TikTok for Developers → Login Kit | Needs app review by TikTok. |

Recommended order: Google, then LINE, then Facebook. Those three cover almost every Thai buyer. Add the others only if buyers ask.

## Steps for each platform

1. Create a developer account on the platform and make a new app (or "channel", "client").
2. When it asks for a **redirect URL** (also called callback URL), enter this, with the platform's name at the end:

   ```
   https://<your-domain>/api/auth/callback/google
   https://<your-domain>/api/auth/callback/line
   https://<your-domain>/api/auth/callback/facebook
   https://<your-domain>/api/auth/callback/apple
   https://<your-domain>/api/auth/callback/twitter
   https://<your-domain>/api/auth/callback/tiktok
   ```

   For local testing also add `http://localhost:3000/api/auth/callback/<platform>` where the platform allows it.
3. Copy the app's ID and secret.
4. In Vercel → Project → Settings → Environment Variables, add the two variables for that platform, plus `AUTH_SECRET` once (make one with `openssl rand -base64 32`).
5. Redeploy. The button for that platform now appears on `/login`.

Never put these values in the code or commit them. Treat them like passwords.

## What has and has not been tested

Tested: the sign-in page, the account page, sign-out, order history per account, checkout email pre-fill, rejection of forged session cookies, and that a buyer cannot see another account's orders.

Not tested: a real sign-in round trip with any platform. That needs real keys and an internet connection to the platform, so test each one yourself after adding its keys: sign in, check `/account`, sign out.

## Before going live

- Publish a privacy policy page. Most platforms require its address, and Thailand's PDPA expects you to say what personal data you keep and why. The store keeps only what the platform sends at sign-in (name, email, picture address) inside the session cookie, and the account id on orders.
- Sign-in buttons are plain text. Each platform has its own rules for using its logo on a button; follow them if you add logos.
- Order history needs the database (`DATABASE_URL`). In demo mode the account page shows no orders.

## Adding or removing a platform

Edit the list in `src/lib/auth/providers.ts`. One entry per platform.
