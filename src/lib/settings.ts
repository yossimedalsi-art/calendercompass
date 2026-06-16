import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
}

export interface DaySchedule {
  active: boolean;
  start: string; // HH:mm
  end: string;   // HH:mm
}

export interface SystemSettings {
  services: Service[];
  schedule: Record<number, DaySchedule>; // 0 = Sunday, 1 = Monday, etc.
}

const DEFAULT_SETTINGS: SystemSettings = {
  services: [
    { id: "1", name: "פגישת ייעוץ אישית", durationMinutes: 60, price: 300 }
  ],
  schedule: {
    0: { active: true, start: "09:00", end: "16:00" },
    1: { active: true, start: "09:00", end: "16:00" },
    2: { active: true, start: "09:00", end: "16:00" },
    3: { active: true, start: "09:00", end: "16:00" },
    4: { active: true, start: "09:00", end: "14:00" },
    5: { active: false, start: "09:00", end: "12:00" }, // Shabbat
    6: { active: false, start: "09:00", end: "12:00" }  // Shabbat
  }
};

export async function getSettings(): Promise<SystemSettings> {
  try {
    const docRef = doc(db, "config", "settings");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as SystemSettings;
    }
    // If no settings exist, create defaults
    await setDoc(docRef, DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error("Error fetching settings:", error);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: SystemSettings): Promise<void> {
  try {
    const docRef = doc(db, "config", "settings");
    await setDoc(docRef, settings);
  } catch (error) {
    console.error("Error saving settings:", error);
    throw new Error("Failed to save settings");
  }
}
