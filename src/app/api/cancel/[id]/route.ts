import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public: lets a client view their own appointment via the unguessable id
// from the confirmation link (no other appointment data is reachable).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getAdminDb();
    const snap = await db.collection("appointments").doc(id).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    const data = snap.data() as { name: string; date: string; time: string; topic: string };
    return NextResponse.json({
      id: snap.id,
      name: data.name,
      date: data.date,
      time: data.time,
      topic: data.topic,
    });
  } catch (error) {
    console.error("GET /api/cancel/[id] error:", error);
    return NextResponse.json({ error: "Failed to load appointment" }, { status: 500 });
  }
}

// Public: cancels the appointment AND releases its slot lock so the time
// becomes available again immediately.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getAdminDb();
    const apptRef = db.collection("appointments").doc(id);
    const apptSnap = await apptRef.get();
    if (!apptSnap.exists) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    const { date, time } = apptSnap.data() as { date?: string; time?: string };

    await db.runTransaction(async (tx) => {
      tx.delete(apptRef);
      if (date && time) {
        tx.delete(db.collection("slots").doc(`${date}_${time}`));
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/cancel/[id] error:", error);
    return NextResponse.json({ error: "Failed to cancel" }, { status: 500 });
  }
}
