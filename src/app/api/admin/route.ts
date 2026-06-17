import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getPublicSettings } from "@/lib/booking-core";
import type { SystemSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin-only: full appointment/client list + settings for the dashboard.
export async function GET() {
  try {
    const db = getAdminDb();
    // NOTE: we sort in memory rather than with orderBy("date").orderBy("time"),
    // because ordering by two fields would require a composite Firestore index
    // that may not exist — and a missing index makes the whole query throw,
    // which is exactly what would leave the dashboard empty.
    const [apptSnap, clientSnap, settings] = await Promise.all([
      db.collection("appointments").get(),
      db.collection("clients").get(),
      getPublicSettings(),
    ]);

    const appointments = apptSnap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown>))
      .sort((a, b) =>
        `${a.date ?? ""} ${a.time ?? ""}`.localeCompare(`${b.date ?? ""} ${b.time ?? ""}`)
      );
    const clients = clientSnap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown>))
      .sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")));

    return NextResponse.json({ appointments, clients, settings });
  } catch (error) {
    console.error("GET /api/admin error:", error);
    return NextResponse.json({ error: "Failed to load admin data" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const db = getAdminDb();

    if (body.action === "private-event") {
      const { date, time, title } = body;
      if (!date || !time || !title) {
        return NextResponse.json({ error: "חסרים פרטים" }, { status: 400 });
      }

      try {
        const id = await db.runTransaction(async (tx) => {
          const slotRef = db.collection("slots").doc(`${date}_${time}`);
          const slotSnap = await tx.get(slotRef);
          if (slotSnap.exists) throw new Error("SLOT_TAKEN");

          const apptRef = db.collection("appointments").doc();
          tx.set(slotRef, { apptId: apptRef.id, date, time, createdAt: FieldValue.serverTimestamp() });
          tx.set(apptRef, {
            name: title,
            phone: "-",
            topic: title,
            date,
            time,
            isPrivate: true,
            createdAt: FieldValue.serverTimestamp(),
          });
          return apptRef.id;
        });
        return NextResponse.json({ id });
      } catch (error) {
        if (error instanceof Error && error.message === "SLOT_TAKEN") {
          return NextResponse.json({ error: "השעה הזו תפוסה" }, { status: 409 });
        }
        throw error;
      }
    }

    if (body.action === "client") {
      const { name, phone, email } = body;
      if (!name || !phone) {
        return NextResponse.json({ error: "חסרים פרטים" }, { status: 400 });
      }
      const ref = await db.collection("clients").add({
        name: String(name).trim(),
        phone: String(phone).trim(),
        email: email ? String(email).trim() : "",
        createdAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ id: ref.id });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/admin error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const db = getAdminDb();

    if (body.action === "note") {
      const { id, notes } = body;
      if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
      await db.collection("appointments").doc(id).update({ notes: notes || "" });
      return NextResponse.json({ success: true });
    }

    if (body.action === "settings") {
      const settings = body.settings as SystemSettings;
      if (!settings) return NextResponse.json({ error: "Missing settings" }, { status: 400 });
      await db.collection("config").doc("settings").set(settings);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("PATCH /api/admin error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// Deletes an appointment AND releases its slot lock so the time becomes
// bookable again (without this, the slot would stay locked forever).
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const db = getAdminDb();
    const apptRef = db.collection("appointments").doc(id);
    const apptSnap = await apptRef.get();
    if (!apptSnap.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
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
    console.error("DELETE /api/admin error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
