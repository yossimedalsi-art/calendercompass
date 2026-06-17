"use client";

import React, { useState, useEffect } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, getDay } from "date-fns";
import { he } from "date-fns/locale";
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon, Clock, Loader2, CalendarPlus, CheckCircle2 } from "lucide-react";
import { isShabbatOrHoliday } from "@/lib/hebcal";
import type { SystemSettings, Service } from "@/lib/settings";
import { getGoogleCalendarLink } from "@/lib/calendarLink";

type Step = "services" | "calendar" | "details" | "success";

export default function CalendarBooking() {
  const [step, setStep] = useState<Step>("services");
  
  // Data State
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  
  // Selections
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", topic: "" });

  // Local (Asia/Jerusalem) date string — avoids the toISOString() UTC day-shift bug.
  const toDateStr = (d: Date) => format(d, "yyyy-MM-dd");

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDay = getDay(monthStart);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: SystemSettings) => {
        setSettings(data);
        setLoadingSettings(false);
        // If only one service exists, auto-select it and skip to calendar
        if (data.services && data.services.length === 1) {
          setSelectedService(data.services[0]);
          setStep("calendar");
        }
      })
      .catch(() => setLoadingSettings(false));
  }, []);

  useEffect(() => {
    if (selectedDate && selectedService) {
      setLoadingSlots(true);
      setSelectedTime(null);
      fetch(`/api/availability?date=${toDateStr(selectedDate)}&duration=${selectedService.durationMinutes}`)
        .then((r) => r.json())
        .then((d) => {
          setAvailableTimes(Array.isArray(d.slots) ? d.slots : []);
          setLoadingSlots(false);
        })
        .catch(() => {
          setAvailableTimes([]);
          setLoadingSlots(false);
        });
    }
  }, [selectedDate, selectedService]);

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !selectedService) return;
    
    setSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        date: toDateStr(selectedDate),
        time: selectedTime,
        topic: `${selectedService.name} | ${formData.topic}`,
      };

      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        // Slot was taken between load and submit — refresh and let them re-pick.
        if (res.status === 409) {
          alert(data.error || "השעה הזו נתפסה. בחר/י שעה אחרת.");
          setSelectedTime(null);
          setStep("calendar");
          const r = await fetch(`/api/availability?date=${payload.date}&duration=${selectedService.durationMinutes}`);
          const dd = await r.json();
          setAvailableTimes(Array.isArray(dd.slots) ? dd.slots : []);
          return;
        }
        throw new Error(data.error || "Booking failed");
      }

      // Confirmation WhatsApp (best-effort; does not block success).
      fetch("/api/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, id: data.id }),
      }).catch(() => {});

      setStep("success");
    } catch (error) {
      console.error(error);
      alert("אירעה שגיאה בקביעת הפגישה. נסה שוב או פנה אלינו.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingSettings) {
    return (
      <div className="flex justify-center items-center py-20 text-primary">
        <Loader2 className="w-10 h-10 animate-spin opacity-50" />
      </div>
    );
  }

  if (step === "success") {
    const calendarLink = selectedDate && selectedTime ? getGoogleCalendarLink(
      toDateStr(selectedDate),
      selectedTime,
      "פגישה - מצפן הלב",
      `סוג: ${selectedService?.name}\nנושא: ${formData.topic}`
    ) : "#";

    return (
      <div className="p-12 text-center flex flex-col items-center animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-primary mb-2 font-display">הפגישה נקבעה בהצלחה!</h2>
        <p className="text-primary/70 mb-8 text-lg">
          קבענו ל-{selectedDate && format(selectedDate, "d בMMMM yyyy", { locale: he })} בשעה {selectedTime}.
          <br/>הודעת אישור נשלחה אליך לוואטסאפ.
        </p>
        
        <div className="flex gap-4">
          <a href={calendarLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-6 py-3 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-100 transition-colors">
            <CalendarPlus className="w-5 h-5" />
            הוסף ליומן גוגל
          </a>
          <button onClick={() => window.location.reload()} className="px-6 py-3 bg-primary/10 text-primary font-bold rounded-xl hover:bg-primary/20 transition-colors">
            חזור להתחלה
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-[500px]">
      
      {/* Services Step */}
      {step === "services" && settings && (
        <div className="p-8 flex-1 animate-in fade-in">
          <h2 className="text-2xl font-bold text-primary font-display mb-6 text-center">בחר את סוג הפגישה</h2>
          <div className="flex flex-col gap-4 max-w-md mx-auto">
            {settings.services.map((service) => (
              <button
                key={service.id}
                onClick={() => {
                  setSelectedService(service);
                  setStep("calendar");
                }}
                className="p-6 border-2 border-primary/10 rounded-2xl hover:border-accent hover:shadow-lg transition-all text-right flex justify-between items-center group bg-white"
              >
                <div>
                  <h3 className="text-lg font-bold text-primary mb-1">{service.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-primary/60">
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4"/> {service.durationMinutes} דקות</span>
                    {service.price > 0 && <span className="font-bold text-accent">{service.price} ₪</span>}
                  </div>
                </div>
                <ChevronLeft className="w-6 h-6 text-primary/30 group-hover:text-accent transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Calendar Side */}
      {(step === "calendar" || step === "details") && (
        <div className={`p-6 flex-1 ${selectedDate && step !== "calendar" ? 'hidden md:block md:border-l border-primary/10' : 'block animate-in fade-in'}`}>
          {settings?.services && settings.services.length > 1 && step === "calendar" && (
            <button onClick={() => setStep("services")} className="mb-6 text-sm text-primary/60 flex items-center gap-1 hover:text-accent transition-colors">
              <ChevronRight className="w-4 h-4" /> חזור לבחירת שירות
            </button>
          )}

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-primary font-display flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-accent" />
              {format(currentDate, "MMMM yyyy", { locale: he })}
            </h2>
            <div className="flex gap-2">
              <button onClick={prevMonth} className="p-2 rounded-full hover:bg-primary/5 transition-colors" aria-label="חודש קודם">
                <ChevronRight className="w-5 h-5 text-primary/70" />
              </button>
              <button onClick={nextMonth} className="p-2 rounded-full hover:bg-primary/5 transition-colors" aria-label="חודש הבא">
                <ChevronLeft className="w-5 h-5 text-primary/70" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map((day, i) => (
              <div key={i} className="text-center text-sm font-medium text-primary/50 py-2">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`} className="p-2" />)}
            {daysInMonth.map((date) => {
              const dayOfWeek = date.getDay();
              const isClosed = settings ? (!settings.schedule[dayOfWeek] || !settings.schedule[dayOfWeek].active) : false;
              
              const isSelected = selectedDate && isSameDay(date, selectedDate);
              const isPast = date < new Date() && !isToday(date);
              const disabled = Boolean(isPast || isShabbatOrHoliday(date) || isClosed);

              return (
                <button
                  key={date.toString()}
                  onClick={() => !disabled && setSelectedDate(date)}
                  disabled={disabled}
                  className={`
                    aspect-square rounded-full flex flex-col items-center justify-center text-sm transition-all relative
                    ${disabled ? 'text-primary/20 cursor-not-allowed bg-gray-50' : 'hover:bg-primary/5 hover:text-primary cursor-pointer'}
                    ${isSelected ? 'bg-primary text-white hover:bg-primary hover:text-white font-bold shadow-md' : 'text-foreground'}
                    ${isToday(date) && !isSelected ? 'border border-accent/50 text-accent font-bold' : ''}
                  `}
                >
                  <span>{format(date, "d")}</span>
                  {!disabled && !isSelected && <span className="w-1 h-1 bg-accent rounded-full absolute bottom-1.5 opacity-50"></span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Time Slots Side */}
      {selectedDate && step === "calendar" && (
        <div className="p-6 md:w-72 bg-primary/5 flex flex-col animate-in fade-in slide-in-from-left-4 duration-300">
          <h3 className="text-lg font-bold text-primary font-display mb-4">
            {format(selectedDate, "EEEE, d בMMMM", { locale: he })}
          </h3>
          <p className="text-sm text-primary/70 mb-4">בחר/י שעה:</p>
          
          <div className="flex flex-col gap-2 overflow-y-auto pr-1 flex-1">
            {loadingSlots ? (
              <div className="flex justify-center items-center h-32 text-primary/50">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : availableTimes.length === 0 ? (
              <div className="text-center text-primary/60 py-8">אין שעות פנויות ביום זה.</div>
            ) : (
              availableTimes.map((time) => {
                const isTimePast = selectedDate && isToday(selectedDate) ? (() => {
                  const [h, m] = time.split(':').map(Number);
                  const slotTime = new Date();
                  slotTime.setHours(h, m, 0, 0);
                  return slotTime < new Date();
                })() : false;

                return (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    disabled={isTimePast}
                    className={`
                      py-3 px-4 rounded-xl text-center font-medium transition-all border
                      ${isTimePast ? 'opacity-40 cursor-not-allowed text-primary/40 bg-gray-100 border-gray-200' : ''}
                      ${selectedTime === time && !isTimePast ? 'bg-accent border-accent text-white shadow-md' : !isTimePast ? 'bg-white border-primary/10 text-primary hover:border-accent hover:text-accent' : ''}
                    `}
                  >
                    {time}
                  </button>
                );
              })
            )}
          </div>

          {selectedTime && (
            <button onClick={() => setStep("details")} className="mt-6 w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg hover:bg-primary/90 transition-all hover:scale-[1.02]">
              המשך להרשמה
            </button>
          )}
        </div>
      )}

      {/* Form Details Side */}
      {step === "details" && (
        <div className="p-6 flex-1 bg-primary/5 flex flex-col animate-in fade-in slide-in-from-left-4 duration-300">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setStep("calendar")} className="p-2 rounded-full hover:bg-black/5 transition-colors">
              <ChevronRight className="w-5 h-5 text-primary" />
            </button>
            <h3 className="text-xl font-bold text-primary font-display">פרטי התקשרות</h3>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-primary/10 flex items-start gap-4 mb-6 shadow-sm">
             <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center shrink-0">
               <Clock className="w-6 h-6 text-accent" />
             </div>
             <div>
               <p className="font-bold text-primary">{selectedService?.name}</p>
               <p className="text-sm text-primary/70">
                 {selectedDate && format(selectedDate, "d בMMMM", { locale: he })} בשעה {selectedTime}
               </p>
               <p className="text-xs text-primary/50 mt-1">אורך מפגש: {selectedService?.durationMinutes} דקות</p>
             </div>
          </div>

          <form onSubmit={handleBooking} className="flex flex-col gap-4 flex-1">
            <div>
              <label className="block text-sm font-medium text-primary mb-1">שם מלא</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 rounded-xl border border-primary/20 focus:border-accent focus:ring-1 focus:ring-accent outline-none bg-white" placeholder="ישראל ישראלי" />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-1">טלפון (לוואטסאפ)</label>
              <input type="tel" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-3 rounded-xl border border-primary/20 focus:border-accent focus:ring-1 focus:ring-accent outline-none bg-white text-left" placeholder="050-1234567" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-1">אימייל (אופציונלי)</label>
              <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-3 rounded-xl border border-primary/20 focus:border-accent focus:ring-1 focus:ring-accent outline-none bg-white text-left" placeholder="email@example.com" dir="ltr" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-primary mb-1">מה הנושא המרכזי עליו נדבר?</label>
              <textarea rows={3} value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} className="w-full p-3 rounded-xl border border-primary/20 focus:border-accent focus:ring-1 focus:ring-accent outline-none bg-white resize-none" placeholder="קצת רקע על מה שתרצה/י להעלות בפגישה..."></textarea>
            </div>
            
            <button type="submit" disabled={submitting} className="mt-auto flex justify-center items-center w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg hover:bg-primary/90 transition-all hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100">
              {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : "אישור וקביעת פגישה"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
