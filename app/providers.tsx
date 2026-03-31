"use client";

// This file is a client component - it runs in the browser, not on the server.
// NextAuth's SessionProvider uses React Context, which only works client-side.
// We wrap the whole app in this so any component can access the session.

import { SessionProvider } from "next-auth/react";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
