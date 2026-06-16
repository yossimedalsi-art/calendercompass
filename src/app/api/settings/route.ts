import { NextResponse } from "next/server";
import { getPublicSettings } from "@/lib/booking-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public: services + weekly schedule (no PII) for the booking UI.
export async function GET() {
  try {
    const settings = await getPublicSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}
