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
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.athleteId = account.providerAccountId;
      }
      return token;
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
