import { NextResponse } from "next/server";
import { bookAppointment, type BookingInput } from "@/lib/booking-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public: create a booking atomically (server prevents double-booking).
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<BookingInput>;
    if (!body.date || !body.time || !body.name || !body.phone) {
      return NextResponse.json({ error: "חסרים פרטים נדרשים" }, { status: 400 });
    }

    const id = await bookAppointment({
      date: body.date,
      time: body.time,
      name: String(body.name).trim(),
      phone: String(body.phone).trim(),
      email: body.email ? String(body.email).trim() : "",
      topic: body.topic ? String(body.topic).trim() : "",
    });

    return NextResponse.json({ id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "SLOT_TAKEN") {
      return NextResponse.json(
        { error: "השעה הזו נתפסה זה עתה. בחר/י שעה אחרת." },
        { status: 409 }
      );
    }
    console.error("POST /api/book error:", error);
    return NextResponse.json({ error: "אירעה שגיאה בקביעת הפגישה" }, { status: 500 });
  }
}
