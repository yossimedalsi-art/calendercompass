import { Compass, Phone, Mail, MapPin } from "lucide-react";
import CalendarBooking from "@/components/CalendarBooking";
import { getPublicSettings } from "@/lib/booking-core";

export const dynamic = "force-dynamic";

export default async function Home() {
  const settings = await getPublicSettings();
  const contact = settings.contact;
  const hasContact = contact && (contact.phone || contact.email || contact.address);

  return (
    <div className="flex flex-col flex-1 items-center bg-background font-sans min-h-screen py-10 px-4 md:px-0">
      <header className="mb-8 flex flex-col items-center">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-12 h-12 bg-primary text-accent rounded-full flex items-center justify-center">
            <Compass className="w-7 h-7" />
          </div>
          <span className="text-2xl font-display font-black text-primary">מצפן הלב</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-display font-black text-primary mb-2">
          קביעת פגישת ייעוץ
        </h1>
        <p className="text-foreground/70 font-body text-center max-w-md">
          בחר/י את היום והשעה הנוחים לך לפגישה.
        </p>
      </header>

      <main className="w-full max-w-3xl bg-white rounded-3xl shadow-xl border border-primary/10 overflow-hidden">
        <CalendarBooking />
      </main>

      {hasContact && (
        <footer className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-primary/70">
          {contact?.phone && (
            <a href={`tel:${contact.phone}`} className="flex items-center gap-2 hover:text-primary" dir="ltr">
              <Phone className="w-4 h-4" /> {contact.phone}
            </a>
          )}
          {contact?.email && (
            <a href={`mailto:${contact.email}`} className="flex items-center gap-2 hover:text-primary" dir="ltr">
              <Mail className="w-4 h-4" /> {contact.email}
            </a>
          )}
          {contact?.address && (
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4" /> {contact.address}
            </span>
          )}
        </footer>
      )}
    </div>
  );
}
