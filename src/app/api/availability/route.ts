import { NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/booking-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public: returns only free slot times for a date. No appointment PII leaves the server.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const duration = Number(searchParams.get("duration")) || 60;
    if (!date) {
      return NextResponse.json({ error: "missing date" }, { status: 400 });
    }
    const slots = await getAvailableSlots(date, duration);
    return NextResponse.json({ slots });
  } catch (error) {
    console.error("GET /api/availability error:", error);
    return NextResponse.json({ error: "Failed to load availability" }, { status: 500 });
  }
}
