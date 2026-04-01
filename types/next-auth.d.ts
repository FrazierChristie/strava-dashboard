import "next-auth";
import "next-auth/jwt";

// Extend NextAuth's built-in Session type to include our custom fields.
// Without this, TypeScript complains that accessToken doesn't exist on Session.
declare module "next-auth" {
  interface Session {
    accessToken: string;
    athleteId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken: string;
    refreshToken: string;
    athleteId: string;
    expiresAt: number;
    error?: string;
  }
}
