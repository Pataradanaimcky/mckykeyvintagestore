import { handlers } from "@/lib/auth";

/** Sign-in endpoints used by the platforms: /api/auth/callback/<platform> and friends. */
export const { GET, POST } = handlers;
