import "server-only";
import NextAuth from "next-auth";
import { env } from "@/lib/env";
import { authSecret, configuredProviders } from "./providers";

export type { SignInOption } from "./providers";
export { supportedPlatforms } from "./providers";
export { safeNextPath } from "@/lib/security/paths";

const { options, providers } = configuredProviders();

/** Sign-in buttons to show. Empty until at least one platform is set up. */
export const signInOptions = options;

export interface StoreUser {
  /** Stable id made of the platform and the person's id there, e.g. "google:1234". */
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  /** Platform the person signed in with, e.g. "google". */
  provider: string | null;
}

const nextAuth = NextAuth({
  providers,
  // With no AUTH_SECRET there are no providers, so nobody can sign in; the
  // fallback only lets session checks run without crashing.
  secret: authSecret ?? env.orderSecret,
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    jwt({ token, account }) {
      if (account) {
        token.uid = `${account.provider}:${account.providerAccountId}`;
        token.provider = account.provider;
      }
      return token;
    },
    session({ session, token }) {
      if (typeof token.uid === "string") session.user.id = token.uid;
      return { ...session, provider: typeof token.provider === "string" ? token.provider : null };
    },
  },
});

export const { handlers, signIn, signOut } = nextAuth;

/** The signed-in person, or null. */
export async function currentUser(): Promise<StoreUser | null> {
  const session = await nextAuth.auth();
  const user = session?.user;
  if (!user?.id || !user.id.includes(":")) return null;
  return {
    id: user.id,
    name: user.name ?? null,
    email: user.email ?? null,
    image: user.image ?? null,
    provider: (session as { provider?: string | null }).provider ?? null,
  };
}
