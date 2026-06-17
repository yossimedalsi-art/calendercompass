import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "./firebaseAdmin";
import { isShabbatOrHoliday } from "./hebcal";
import type { SystemSettings } from "./settings";

// Server-side mirror of the default settings (kept here so this module never
// imports the client Firebase SDK).
const DEFAULT_SETTINGS: SystemSettings = {
  services: [{ id: "1", name: "פגישת ייעוץ אישית", durationMinutes: 60, price: 300, bufferMinutes: 40 }],
  schedule: {
    0: { active: true, start: "09:00", end: "16:00" },
    1: { active: true, start: "09:00", end: "16:00" },
    2: { active: true, start: "09:00", end: "16:00" },
    3: { active: true, start: "09:00", end: "16:00" },
    4: { active: true, start: "09:00", end: "14:00" },
    5: { active: false, start: "09:00", end: "12:00" },
    6: { active: false, start: "09:00", end: "12:00" },
  },
};

export async function getPublicSettings(): Promise<SystemSettings> {
  const ref = getAdminDb().collection("config").doc("settings");
  const snap = await ref.get();
  if (snap.exists) return snap.data() as SystemSettings;
  await ref.set(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}

// Parse a "YYYY-MM-DD" string into a timezone-stable UTC-noon Date and weekday.
// The client sends its own local date string, so no toISOString() drift here.
function parseDateString(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const noonUtc = new Date(Date.UTC(y, m - 1, d, 12));
  const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return { noonUtc, dayOfWeek };
}

// Builds the set of all blocked minutes for a day: each appointment's own
// duration, plus the buffer configured for whichever service has that
// duration (falls back to 40min if no matching service is found). Shared by
// getAvailableSlots (display) and bookAppointment (write-time enforcement)
// so the two can never drift apart.
const DEFAULT_BUFFER_MINUTES = 40;
function buildBlockedMinutes(
  appointments: { time?: string; durationMinutes?: number }[],
  settings: SystemSettings
): Set<number> {
  const blockedMinutes = new Set<number>();
  appointments.forEach((apt) => {
    if (!apt.time) return;
    const [h, m] = apt.time.split(':').map(Number);
    const aptStartMin = h * 60 + m;
    const aptDuration = apt.durationMinutes || 60;
    const aptEndMin = aptStartMin + aptDuration;
    const matchingService = settings.services.find((s) => s.durationMinutes === aptDuration);
    const bufferMinutes = matchingService?.bufferMinutes ?? DEFAULT_BUFFER_MINUTES;
    const blockedUntil = aptEndMin + bufferMinutes;

    for (let min = aptStartMin; min < blockedUntil; min++) {
      blockedMinutes.add(min);
    }
  });
  return blockedMinutes;
}

export async function getAvailableSlots(
  dateStr: string,
  durationMinutes = 60
): Promise<string[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return [];

  const { noonUtc, dayOfWeek } = parseDateString(dateStr);
  if (isShabbatOrHoliday(noonUtc)) return [];

  const settings = await getPublicSettings();
  const daySchedule = settings.schedule[dayOfWeek];
  if (!daySchedule || !daySchedule.active) return [];

  const snap = await getAdminDb()
    .collection("appointments")
    .where("date", "==", dateStr)
    .get();

  const blockedMinutes = buildBlockedMinutes(
    snap.docs.map((doc) => doc.data() as { time?: string; durationMinutes?: number }),
    settings
  );

  const [startHour, startMin] = daySchedule.start.split(":").map(Number);
  const [endHour, endMin] = daySchedule.end.split(":").map(Number);
  let cur = startHour * 60 + startMin;
  const end = endHour * 60 + endMin;

  const slots: string[] = [];
  while (cur + durationMinutes <= end) {
    const h = String(Math.floor(cur / 60)).padStart(2, "0");
    const mm = String(cur % 60).padStart(2, "0");
    const t = `${h}:${mm}`;

    // Check if this slot (duration + buffer) overlaps with any blocked minutes.
    let isAvailable = true;
    for (let min = cur; min < cur + durationMinutes; min++) {
      if (blockedMinutes.has(min)) {
        isAvailable = false;
        break;
      }
    }

    if (isAvailable) slots.push(t);
    cur += durationMinutes;
  }
  return slots;
}

export interface BookingInput {
  date: string; // YYYY-MM-DD (client local)
  time: string; // HH:mm
  name: string;
  phone: string;
  email?: string;
  topic: string;
  durationMinutes?: number;
}

// Atomic booking: a per-slot lock doc guarantees one booking per slot even
// under concurrent requests. The appointment itself gets an unguessable random
// id (used for the cancel link).
export async function bookAppointment(data: BookingInput): Promise<string> {
  const { date, time } = data;
  if (!date || !time || !data.name || !data.phone) {
    throw new Error("INVALID_INPUT");
  }
  const durationMinutes = data.durationMinutes || 60;
  const [h, m] = time.split(':').map(Number);
  const startMin = h * 60 + m;

  const db = getAdminDb();
  const settings = await getPublicSettings();

  return db.runTransaction(async (tx) => {
    const slotRef = db.collection("slots").doc(`${date}_${time}`);
    const dayApptsSnap = await tx.get(db.collection("appointments").where("date", "==", date));
    const slotSnap = await tx.get(slotRef);
    if (slotSnap.exists) throw new Error("SLOT_TAKEN");

    // Re-check the buffer against same-day appointments inside the
    // transaction itself — relying on the client's last-loaded availability
    // list isn't enough, since it can be stale by the time this write happens.
    const blockedMinutes = buildBlockedMinutes(
      dayApptsSnap.docs.map((doc) => doc.data() as { time?: string; durationMinutes?: number }),
      settings
    );
    for (let min = startMin; min < startMin + durationMinutes; min++) {
      if (blockedMinutes.has(min)) throw new Error("SLOT_TAKEN");
    }

    const apptRef = db.collection("appointments").doc();
    tx.set(slotRef, { apptId: apptRef.id, date, time, createdAt: FieldValue.serverTimestamp() });
    tx.set(apptRef, {
      name: data.name,
      phone: data.phone,
      email: data.email || "",
      topic: data.topic || "",
      date,
      time,
      durationMinutes: data.durationMinutes || 60,
      isPrivate: false,
      createdAt: FieldValue.serverTimestamp(),
    });
    return apptRef.id;
  });
}
