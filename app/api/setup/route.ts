import { NextResponse } from "next/server";
import { setupDatabase } from "@/lib/db";

// One-time endpoint to create database tables.
// Visit /api/setup once after deploying to initialise the schema.
// Safe to call multiple times thanks to "IF NOT EXISTS".
export async function GET() {
  try {
    await setupDatabase();
    return NextResponse.json({ ok: true, message: "Database ready" });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
