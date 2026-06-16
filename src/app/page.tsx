import Image from "next/image";
import CalendarBooking from "@/components/CalendarBooking";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center bg-background font-sans min-h-screen py-10 px-4 md:px-0">
      <header className="mb-8 flex flex-col items-center">
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
    </div>
  );
}
