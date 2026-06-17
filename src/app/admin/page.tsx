"use client";

import React, { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { he } from "date-fns/locale";
import { Loader2, Trash2, Plus, Calendar as CalendarIcon, User, LogOut, Users, BookOpen, X, Settings as SettingsIcon, Save } from "lucide-react";
import type { SystemSettings } from "@/lib/settings";

type Tab = "calendar" | "clients" | "settings";

const DAYS_HE = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("calendar");
  
  // Data state
  const [appointments, setAppointments] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({ date: "", time: "", title: "" });
  
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [currentAppointment, setCurrentAppointment] = useState<any>(null);
  const [noteText, setNoteText] = useState("");

  const [showAddClient, setShowAddClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", phone: "", email: "" });

  const login = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "yossi123") {
      setIsAuthenticated(true);
      fetchData();
    } else {
      alert("סיסמה שגויה");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load admin data");
      setAppointments(Array.isArray(data.appointments) ? data.appointments : []);
      setClients(Array.isArray(data.clients) ? data.clients : []);
      setSettings(data.settings);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers ---
  const handleDeleteApt = async (id: string) => {
    if (confirm("האם אתה בטוח שברצונך למחוק פגישה/חסימה זו?")) {
      const res = await fetch(`/api/admin?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        alert("שגיאה במחיקת הפגישה");
        return;
      }
      fetchData();
    }
  };

  const handleAddPrivateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.date || !newEvent.time || !newEvent.title) return;
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "private-event", ...newEvent }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "שגיאה בהוספת האירוע");
      return;
    }
    setShowAddEvent(false);
    setNewEvent({ date: "", time: "", title: "" });
    fetchData();
  };

  const handleSaveNote = async () => {
    if (!currentAppointment) return;
    const res = await fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "note", id: currentAppointment.id, notes: noteText }),
    });
    if (!res.ok) {
      alert("שגיאה בשמירת התקציר");
      return;
    }
    setShowNoteModal(false);
    fetchData();
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "client",
        name: newClient.name,
        phone: newClient.phone,
        email: newClient.email,
      }),
    });
    if (!res.ok) {
      alert("שגיאה בהוספת לקוח");
      return;
    }
    setShowAddClient(false);
    setNewClient({ name: "", phone: "", email: "" });
    fetchData();
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    try {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "settings", settings }),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      alert("ההגדרות נשמרו בהצלחה!");
    } catch (error) {
      alert("שגיאה בשמירת הגדרות");
    }
  };

  // --- Render Login ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-primary/5 flex items-center justify-center p-4">
        <form onSubmit={login} className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md flex flex-col gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary text-accent rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-primary font-display">כניסת מנהל</h1>
          </div>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="סיסמה (yossi123)"
            className="w-full p-4 rounded-xl border border-primary/20 focus:border-accent outline-none text-center"
            dir="ltr"
          />
          <button type="submit" className="w-full py-4 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all">
            היכנס
          </button>
        </form>
      </div>
    );
  }

  // --- Render Dashboard ---
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-primary text-white p-6 flex flex-col shrink-0">
        <div className="mb-8 mt-4 text-center md:text-right">
          <h1 className="text-2xl font-bold font-display text-accent">מצפן הלב</h1>
          <p className="text-white/60 text-sm">מערכת ניהול V2</p>
        </div>

        <div className="flex flex-col gap-2 flex-1">
          <button 
            onClick={() => setActiveTab("calendar")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'calendar' ? 'bg-white/20 font-bold' : 'hover:bg-white/10'}`}
          >
            <CalendarIcon className="w-5 h-5" /> יומן פגישות
          </button>
          <button 
            onClick={() => setActiveTab("clients")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'clients' ? 'bg-white/20 font-bold' : 'hover:bg-white/10'}`}
          >
            <Users className="w-5 h-5" /> ניהול לקוחות
          </button>
          <button 
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'settings' ? 'bg-white/20 font-bold' : 'hover:bg-white/10'}`}
          >
            <SettingsIcon className="w-5 h-5" /> הגדרות מערכת
          </button>
        </div>

        <button onClick={() => setIsAuthenticated(false)} className="mt-auto flex items-center gap-3 px-4 py-3 text-white/70 hover:text-white transition-colors">
          <LogOut className="w-5 h-5" /> יציאה
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 md:p-10 overflow-y-auto">
        
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="w-12 h-12 animate-spin text-primary/30" />
          </div>
        ) : (
          <>
            {/* TAB: CALENDAR */}
            {activeTab === "calendar" && (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 animate-in fade-in">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-primary">היומן שלי</h2>
                  <button onClick={() => setShowAddEvent(!showAddEvent)} className="flex items-center gap-2 px-4 py-2 bg-accent text-white font-bold rounded-lg hover:bg-accent/90 transition-colors">
                    <Plus className="w-4 h-4" /> הוסף חסימה/אירוע
                  </button>
                </div>

                {showAddEvent && (
                  <form onSubmit={handleAddPrivateEvent} className="bg-primary/5 p-6 rounded-2xl mb-8 border border-primary/10 flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-sm font-medium text-primary mb-1">כותרת האירוע</label>
                      <input type="text" required value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} className="w-full p-3 rounded-xl border border-white" />
                    </div>
                    <div className="w-48">
                      <label className="block text-sm font-medium text-primary mb-1">תאריך</label>
                      <input type="date" required value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} className="w-full p-3 rounded-xl border border-white" dir="ltr" />
                    </div>
                    <div className="w-32">
                      <label className="block text-sm font-medium text-primary mb-1">שעה</label>
                      <input type="time" required value={newEvent.time} onChange={e => setNewEvent({...newEvent, time: e.target.value})} className="w-full p-3 rounded-xl border border-white" dir="ltr" />
                    </div>
                    <button type="submit" className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 h-[50px]">
                      שמור
                    </button>
                  </form>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="border-b-2 border-gray-100 text-primary/60 text-sm">
                        <th className="pb-3 px-4 font-medium">תאריך ושעה</th>
                        <th className="pb-3 px-4 font-medium">לקוח / אירוע</th>
                        <th className="pb-3 px-4 font-medium">נושא</th>
                        <th className="pb-3 px-4 font-medium text-center">פעולות</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.map((apt) => (
                        <tr key={apt.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${apt.isPrivate ? 'bg-orange-50/30' : ''}`}>
                          <td className="py-4 px-4 font-bold text-primary">
                            {format(parseISO(apt.date), "d בMMMM", { locale: he })} | <span dir="ltr">{apt.time}</span>
                          </td>
                          <td className="py-4 px-4">
                            <div className={`font-bold ${apt.isPrivate ? 'text-orange-600' : 'text-primary'}`}>{apt.name}</div>
                            {!apt.isPrivate && <div className="text-sm text-primary/60" dir="ltr">{apt.phone}</div>}
                          </td>
                          <td className="py-4 px-4 text-primary/70 max-w-[200px] truncate" title={apt.topic}>{apt.topic}</td>
                          <td className="py-4 px-4 flex items-center justify-center gap-2">
                            {!apt.isPrivate && (
                              <button 
                                onClick={() => { setCurrentAppointment(apt); setNoteText(apt.notes || ""); setShowNoteModal(true); }}
                                className={`p-2 rounded-lg transition-colors ${apt.notes ? 'bg-blue-100 text-blue-600' : 'text-primary/40 hover:bg-primary/5'}`}
                                title={apt.notes ? "צפה בסיכום" : "הוסף סיכום"}
                              >
                                <BookOpen className="w-4 h-4" />
                              </button>
                            )}
                            <button onClick={() => handleDeleteApt(apt.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="מחק">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: CLIENTS */}
            {activeTab === "clients" && (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 animate-in fade-in">
                {/* ... existing clients UI ... */}
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-primary">מאגר לקוחות</h2>
                  <button onClick={() => setShowAddClient(!showAddClient)} className="flex items-center gap-2 px-4 py-2 bg-accent text-white font-bold rounded-lg hover:bg-accent/90 transition-colors">
                    <Plus className="w-4 h-4" /> לקוח חדש
                  </button>
                </div>

                {showAddClient && (
                  <form onSubmit={handleAddClient} className="bg-primary/5 p-6 rounded-2xl mb-8 border border-primary/10 flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-sm font-medium text-primary mb-1">שם מלא</label>
                      <input type="text" required value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} className="w-full p-3 rounded-xl border border-white" />
                    </div>
                    <div className="w-48">
                      <label className="block text-sm font-medium text-primary mb-1">טלפון</label>
                      <input type="tel" required value={newClient.phone} onChange={e => setNewClient({...newClient, phone: e.target.value})} className="w-full p-3 rounded-xl border border-white" dir="ltr" />
                    </div>
                    <div className="w-48">
                      <label className="block text-sm font-medium text-primary mb-1">אימייל (אופציונלי)</label>
                      <input type="email" value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} className="w-full p-3 rounded-xl border border-white" dir="ltr" />
                    </div>
                    <button type="submit" className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 h-[50px]">
                      הוסף לקוח
                    </button>
                  </form>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="border-b-2 border-gray-100 text-primary/60 text-sm">
                        <th className="pb-3 px-4 font-medium">שם הלקוח</th>
                        <th className="pb-3 px-4 font-medium">טלפון</th>
                        <th className="pb-3 px-4 font-medium">אימייל</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients.map((client) => (
                        <tr key={client.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 px-4 font-bold text-primary">{client.name}</td>
                          <td className="py-4 px-4 text-primary/70" dir="ltr">{client.phone}</td>
                          <td className="py-4 px-4 text-primary/70" dir="ltr">{client.email || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: SETTINGS */}
            {activeTab === "settings" && settings && (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 animate-in fade-in max-w-4xl">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold text-primary flex items-center gap-3">
                    <SettingsIcon className="w-6 h-6 text-accent" /> הגדרות מערכת
                  </h2>
                  <button onClick={handleSaveSettings} className="flex items-center gap-2 px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors">
                    <Save className="w-4 h-4" /> שמור שינויים
                  </button>
                </div>

                <div className="space-y-12">
                  
                  {/* Working Hours */}
                  <section>
                    <h3 className="text-xl font-bold text-primary mb-4 border-b border-gray-100 pb-2">שעות פעילות וימי עבודה</h3>
                    <p className="text-sm text-primary/60 mb-6">הגדר באילו שעות ניתן לקבוע פגישות בכל יום בשבוע. סימון "סגור" יחסום את היום לחלוטין.</p>
                    
                    <div className="grid gap-4">
                      {Object.keys(settings.schedule).map((dayIndexStr) => {
                        const dayIndex = parseInt(dayIndexStr);
                        const schedule = settings.schedule[dayIndex];
                        return (
                          <div key={dayIndex} className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div className="w-24 font-bold text-primary">{DAYS_HE[dayIndex]}</div>
                            
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={schedule.active}
                                onChange={(e) => {
                                  const newSettings = {...settings};
                                  newSettings.schedule[dayIndex].active = e.target.checked;
                                  setSettings(newSettings);
                                }}
                                className="w-5 h-5 accent-accent"
                              />
                              <span className="text-sm text-primary/70">פתוח</span>
                            </label>

                            {schedule.active ? (
                              <div className="flex items-center gap-3 mr-auto">
                                <div className="flex flex-col">
                                  <span className="text-xs text-primary/50 mb-1">משעה</span>
                                  <input 
                                    type="time" 
                                    value={schedule.start}
                                    onChange={(e) => {
                                      const newSettings = {...settings};
                                      newSettings.schedule[dayIndex].start = e.target.value;
                                      setSettings(newSettings);
                                    }}
                                    className="p-2 rounded-lg border border-gray-200 outline-none"
                                    dir="ltr"
                                  />
                                </div>
                                <span className="mt-4">-</span>
                                <div className="flex flex-col">
                                  <span className="text-xs text-primary/50 mb-1">עד שעה</span>
                                  <input 
                                    type="time" 
                                    value={schedule.end}
                                    onChange={(e) => {
                                      const newSettings = {...settings};
                                      newSettings.schedule[dayIndex].end = e.target.value;
                                      setSettings(newSettings);
                                    }}
                                    className="p-2 rounded-lg border border-gray-200 outline-none"
                                    dir="ltr"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="mr-auto text-primary/40 font-medium text-sm bg-gray-200/50 px-4 py-2 rounded-lg">
                                סגור ביום זה
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {/* Services / Pricing */}
                  <section>
                    <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
                      <h3 className="text-xl font-bold text-primary">סוגי טיפולים ומחירון</h3>
                      <button 
                        onClick={() => {
                          const newSettings = {...settings};
                          newSettings.services.push({ id: Date.now().toString(), name: "שירות חדש", durationMinutes: 60, price: 0 });
                          setSettings(newSettings);
                        }}
                        className="text-sm flex items-center gap-1 text-accent font-bold hover:underline"
                      >
                        <Plus className="w-4 h-4" /> הוסף שירות
                      </button>
                    </div>
                    <p className="text-sm text-primary/60 mb-6">אלו האפשרויות שהלקוח יראה לפני קביעת השעה. משך הזמן יקבע אוטומטית כמה זמן ייחסם ביומן.</p>

                    <div className="grid gap-4">
                      {settings.services.map((service, index) => (
                        <div key={service.id} className="flex flex-wrap items-center gap-4 bg-primary/5 p-4 rounded-xl border border-primary/10">
                          <div className="flex-1 min-w-[200px]">
                            <span className="text-xs text-primary/50 mb-1 block">שם השירות</span>
                            <input 
                              type="text" 
                              value={service.name}
                              onChange={(e) => {
                                const newSettings = {...settings};
                                newSettings.services[index].name = e.target.value;
                                setSettings(newSettings);
                              }}
                              className="w-full p-2 rounded-lg border border-white outline-none font-bold text-primary"
                            />
                          </div>
                          <div className="w-32">
                            <span className="text-xs text-primary/50 mb-1 block">אורך (בדקות)</span>
                            <input 
                              type="number" 
                              value={service.durationMinutes}
                              onChange={(e) => {
                                const newSettings = {...settings};
                                newSettings.services[index].durationMinutes = parseInt(e.target.value) || 30;
                                setSettings(newSettings);
                              }}
                              className="w-full p-2 rounded-lg border border-white outline-none"
                              dir="ltr"
                            />
                          </div>
                          <div className="w-32">
                            <span className="text-xs text-primary/50 mb-1 block">מחיר (₪)</span>
                            <input
                              type="number"
                              value={service.price}
                              onChange={(e) => {
                                const newSettings = {...settings};
                                newSettings.services[index].price = parseInt(e.target.value) || 0;
                                setSettings(newSettings);
                              }}
                              className="w-full p-2 rounded-lg border border-white outline-none"
                              dir="ltr"
                            />
                          </div>
                          <div className="w-32">
                            <span className="text-xs text-primary/50 mb-1 block">מנוחה אחרי (דק')</span>
                            <input
                              type="number"
                              value={service.bufferMinutes || 0}
                              onChange={(e) => {
                                const newSettings = {...settings};
                                newSettings.services[index].bufferMinutes = parseInt(e.target.value) || 0;
                                setSettings(newSettings);
                              }}
                              className="w-full p-2 rounded-lg border border-white outline-none"
                              dir="ltr"
                            />
                          </div>
                          <button 
                            onClick={() => {
                              if(settings.services.length === 1) {
                                alert("חובה להשאיר לפחות שירות אחד במערכת.");
                                return;
                              }
                              const newSettings = {...settings};
                              newSettings.services.splice(index, 1);
                              setSettings(newSettings);
                            }}
                            className="mt-6 p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                            title="מחק שירות"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>

                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Note Modal */}
      {showNoteModal && currentAppointment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="bg-primary p-4 flex justify-between items-center text-white">
              <h3 className="font-bold font-display">תקציר פגישה: {currentAppointment.name}</h3>
              <button onClick={() => setShowNoteModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <p className="text-sm text-primary/60 mb-4">
                תאריך: <span dir="ltr">{currentAppointment.date} {currentAppointment.time}</span>
              </p>
              <textarea 
                rows={6}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="כתוב כאן הערות, סיכומים, משימות לפעם הבאה..."
                className="w-full p-4 rounded-xl border border-primary/20 focus:border-accent outline-none resize-none mb-4"
              ></textarea>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowNoteModal(false)} className="px-4 py-2 text-primary font-bold hover:bg-primary/5 rounded-lg">ביטול</button>
                <button onClick={handleSaveNote} className="px-6 py-2 bg-accent text-white font-bold rounded-lg hover:bg-accent/90">שמור תקציר</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
