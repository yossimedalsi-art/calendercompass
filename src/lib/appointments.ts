import { collection, addDoc, query, where, getDocs, Timestamp, updateDoc, doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { isShabbatOrHoliday } from "./hebcal";

import { getSettings } from "./settings";

export interface Appointment {
  id?: string;
  date: string; // ISO string YYYY-MM-DD
  time: string; // HH:mm
  name: string;
  phone: string;
  email?: string;
  topic: string;
  notes?: string; // Admin session notes
  isPrivate?: boolean;
  clientId?: string;
  createdAt?: Date;
}

export interface Client {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  createdAt?: Date;
}

export async function getAvailableSlots(date: Date, serviceDurationMinutes: number = 60): Promise<string[]> {
  if (isShabbatOrHoliday(date)) return [];

  const settings = await getSettings();
  const dayOfWeek = date.getDay(); // 0-6
  const daySchedule = settings.schedule[dayOfWeek];

  // If closed today
  if (!daySchedule || !daySchedule.active) return [];

  const dateString = date.toISOString().split('T')[0];
  
  try {
    const q = query(collection(db, "appointments"), where("date", "==", dateString));
    const querySnapshot = await getDocs(q);
    const bookedApts = querySnapshot.docs.map(doc => doc.data() as Appointment);
    
    // Generate potential slots based on working hours and duration
    const slots: string[] = [];
    const [startHour, startMin] = daySchedule.start.split(':').map(Number);
    const [endHour, endMin] = daySchedule.end.split(':').map(Number);
    
    let currentMinutes = startHour * 60 + startMin;
    const endTotalMinutes = endHour * 60 + endMin;

    while (currentMinutes + serviceDurationMinutes <= endTotalMinutes) {
      const h = Math.floor(currentMinutes / 60).toString().padStart(2, '0');
      const m = (currentMinutes % 60).toString().padStart(2, '0');
      const slotTime = `${h}:${m}`;
      
      // Check if this slot conflicts with any existing booking
      // A booking conflicts if it starts before this slot ends, AND ends after this slot starts.
      // For now, to keep it simple, we check if the exact start time is taken. 
      // (Advanced collision detection can be added here)
      const isBooked = bookedApts.some(apt => apt.time === slotTime);
      
      if (!isBooked) {
        slots.push(slotTime);
      }
      
      currentMinutes += serviceDurationMinutes; // Move to next available slot
    }
    
    return slots;
  } catch (error) {
    console.error("Error fetching available slots:", error);
    return [];
  }
}

export async function bookAppointment(data: Appointment): Promise<string> {
  try {
    // Check if client exists by phone
    let clientId = data.clientId;
    if (!clientId && data.phone && data.phone !== "-") {
      const q = query(collection(db, "clients"), where("phone", "==", data.phone));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        // Create new client
        const newClientRef = await addDoc(collection(db, "clients"), {
          name: data.name,
          phone: data.phone,
          email: data.email || "",
          createdAt: Timestamp.now()
        });
        clientId = newClientRef.id;
      } else {
        clientId = snapshot.docs[0].id;
      }
    }

    const docRef = await addDoc(collection(db, "appointments"), {
      ...data,
      clientId: clientId || null,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error booking appointment:", error);
    throw new Error("Failed to book appointment");
  }
}

export async function saveAppointmentNote(appointmentId: string, notes: string): Promise<void> {
  try {
    const ref = doc(db, "appointments", appointmentId);
    await updateDoc(ref, { notes });
  } catch (error) {
    console.error("Error saving note:", error);
    throw new Error("Failed to save note");
  }
}

export async function addClient(client: Client): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, "clients"), {
      ...client,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding client:", error);
    throw new Error("Failed to add client");
  }
}
