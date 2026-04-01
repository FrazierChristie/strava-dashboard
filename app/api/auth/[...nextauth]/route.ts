import NextAuth, { NextAuthOptions } from "next-auth";
import StravaProvider from "next-auth/providers/strava";

export const authOptions: NextAuthOptions = {
  providers: [
    StravaProvider({
      clientId: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID!,
      clientSecret: process.env.STRAVA_CLIENT_SECRET!,
      authorization: {
        params: {
          // What data we're asking permission to access:
          // "activity:read_all" includes private activities + all sport types
          scope: "read,activity:read_all,profile:read_all",
        },
      },
    }),
  ],
  callbacks: {
    // Called when a JWT token is created/updated.
    // We store the Strava access token here so we can use it for API calls.
    async jwt({ token, account }) {
      // First sign-in: store tokens from Strava
      if (account) {
        token.accessToken  = account.access_token  ?? "";
        token.refreshToken = account.refresh_token ?? "";
        token.expiresAt    = account.expires_at    ?? 0;
        token.athleteId    = account.providerAccountId;
        return token;
      }

      // Token still valid - return as-is
      if (Date.now() < (token.expiresAt as number) * 1000) {
        return token;
      }

      // Token expired - refresh it using Strava's token endpoint
      try {
        const res = await fetch("https://www.strava.com/oauth/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id:     process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
            client_secret: process.env.STRAVA_CLIENT_SECRET,
            grant_type:    "refresh_token",
            refresh_token: token.refreshToken,
          }),
        });
        const refreshed = await res.json();
        return {
          ...token,
          accessToken:  refreshed.access_token,
          refreshToken: refreshed.refresh_token ?? token.refreshToken,
          expiresAt:    refreshed.expires_at,
        };
      } catch {
        // Refresh failed - user will need to sign in again
        return { ...token, error: "RefreshTokenError" };
      }
    },
    // Called when session is checked. Exposes the access token to the client.
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.athleteId = token.athleteId as string;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
