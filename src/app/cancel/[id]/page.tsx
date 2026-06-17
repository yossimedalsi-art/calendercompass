"use client";

import React, { useEffect, useState } from "react";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { he } from "date-fns/locale";
import Link from "next/link";

interface AppointmentView {
  id: string;
  name: string;
  date: string;
  time: string;
  topic: string;
}

export default function CancelAppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null);
  const [appointment, setAppointment] = useState<AppointmentView | null>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [canceled, setCanceled] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        const { id: appointmentId } = await params;
        setId(appointmentId);
        const res = await fetch(`/api/cancel/${appointmentId}`);
        if (!res.ok) {
          setError("הפגישה לא נמצאה. ייתכן שהיא כבר בוטלה.");
          return;
        }
        const data = await res.json();
        setAppointment(data);
      } catch (err) {
        setError("אירעה שגיאה בטעינת הנתונים.");
      } finally {
        setLoading(false);
      }
    };

    fetchAppointment();
  }, [params]);

  const handleCancel = async () => {
    if (!id) return;
    setCanceling(true);
    try {
      const res = await fetch(`/api/cancel/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to cancel");
      setCanceled(true);
    } catch (err) {
      alert("שגיאה בביטול הפגישה. אנא צור קשר.");
    } finally {
      setCanceling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex justify-center items-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary/50" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-red-100 text-center max-w-md w-full">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-primary mb-2">אופס!</h1>
          <p className="text-primary/70 mb-6">{error}</p>
          <Link href="/" className="inline-block px-6 py-3 bg-primary/10 text-primary font-bold rounded-xl hover:bg-primary/20 transition-colors">
            חזרה לעמוד הבית
          </Link>
        </div>
      </div>
    );
  }

  if (canceled) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-green-100 text-center max-w-md w-full animate-in zoom-in duration-300">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-primary font-display mb-2">הפגישה בוטלה</h1>
          <p className="text-primary/70 mb-6">ביטלנו את הפגישה שלך בהצלחה והשעה התפנתה ביומן.</p>
          <Link href="/" className="inline-block px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors w-full">
            לקביעת פגישה חדשה
          </Link>
        </div>
      </div>
    );
  }

  if (!appointment) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-lg border border-primary/10 text-center max-w-md w-full">
        <h1 className="text-2xl font-bold text-primary font-display mb-6">ביטול פגישה</h1>

        <div className="bg-red-50 p-6 rounded-2xl mb-8 border border-red-100">
          <p className="font-bold text-primary mb-1">שלום {appointment.name},</p>
          <p className="text-sm text-primary/70 mb-4">האם אתה בטוח שברצונך לבטל את הפגישה הבאה?</p>
          
          <div className="bg-white p-4 rounded-xl text-right">
            <p className="font-bold text-primary">{appointment.topic?.split('|')[0] || "פגישת ייעוץ"}</p>
            <p className="text-sm text-primary/70 mt-1">
              {format(parseISO(appointment.date), "EEEE, d בMMMM yyyy", { locale: he })} בשעה {appointment.time}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            onClick={handleCancel} 
            disabled={canceling}
            className="w-full py-4 bg-red-500 text-white font-bold rounded-xl shadow-lg hover:bg-red-600 transition-all flex justify-center items-center disabled:opacity-70"
          >
            {canceling ? <Loader2 className="w-5 h-5 animate-spin" /> : "כן, בטל את הפגישה"}
          </button>
          
          <Link href="/" className="w-full py-4 bg-primary/5 text-primary font-bold rounded-xl hover:bg-primary/10 transition-colors block">
            לא, התחרטתי (השאר פגישה)
          </Link>
        </div>
      </div>
    </div>
  );
}
