import "server-only";
import type { Provider } from "next-auth/providers";
import Apple from "next-auth/providers/apple";
import Facebook from "next-auth/providers/facebook";
import Google from "next-auth/providers/google";
import Line from "next-auth/providers/line";
import TikTok from "next-auth/providers/tiktok";
import Twitter from "next-auth/providers/twitter";

/**
 * Every sign-in option the store supports. An option switches on by itself once
 * its two environment variables are set (and AUTH_SECRET is set). Nothing else
 * needs to change. See docs/LOGIN.md for how to get the values.
 */

interface ProviderEntry {
  /** Used in URLs: /api/auth/callback/<id> */
  id: string;
  /** Name shown on the sign-in button. */
  label: string;
  idEnv: string;
  secretEnv: string;
  create: (clientId: string, clientSecret: string) => Provider;
}

const catalog: ProviderEntry[] = [
  {
    id: "google",
    label: "Google",
    idEnv: "AUTH_GOOGLE_ID",
    secretEnv: "AUTH_GOOGLE_SECRET",
    create: (clientId, clientSecret) => Google({ clientId, clientSecret }),
  },
  {
    id: "line",
    label: "LINE",
    idEnv: "AUTH_LINE_ID",
    secretEnv: "AUTH_LINE_SECRET",
    create: (clientId, clientSecret) => Line({ clientId, clientSecret }),
  },
  {
    id: "facebook",
    label: "Facebook",
    idEnv: "AUTH_FACEBOOK_ID",
    secretEnv: "AUTH_FACEBOOK_SECRET",
    create: (clientId, clientSecret) => Facebook({ clientId, clientSecret }),
  },
  {
    id: "apple",
    label: "Apple",
    idEnv: "AUTH_APPLE_ID",
    secretEnv: "AUTH_APPLE_SECRET",
    create: (clientId, clientSecret) => Apple({ clientId, clientSecret }),
  },
  {
    id: "twitter",
    label: "X",
    idEnv: "AUTH_TWITTER_ID",
    secretEnv: "AUTH_TWITTER_SECRET",
    create: (clientId, clientSecret) => Twitter({ clientId, clientSecret }),
  },
  {
    id: "tiktok",
    label: "TikTok",
    idEnv: "AUTH_TIKTOK_ID",
    secretEnv: "AUTH_TIKTOK_SECRET",
    create: (clientId, clientSecret) => TikTok({ clientId, clientSecret }),
  },
];

function read(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : undefined;
}

/** Sign-in needs its own secret. Without it no provider is offered. */
export const authSecret = read("AUTH_SECRET");

export interface SignInOption {
  id: string;
  label: string;
}

/** Providers that are fully configured, in display order. */
export function configuredProviders(): { options: SignInOption[]; providers: Provider[] } {
  const options: SignInOption[] = [];
  const providers: Provider[] = [];
  if (!authSecret) return { options, providers };

  for (const entry of catalog) {
    const clientId = read(entry.idEnv);
    const clientSecret = read(entry.secretEnv);
    if (clientId && clientSecret) {
      options.push({ id: entry.id, label: entry.label });
      providers.push(entry.create(clientId, clientSecret));
    }
  }
  return { options, providers };
}

/** Names of every platform the store can offer, configured or not. */
export const supportedPlatforms = catalog.map((entry) => entry.label);
