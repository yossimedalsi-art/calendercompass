import { NextResponse } from 'next/server';
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET(request: Request) {
  // Protect this route from public access (Vercel sets a specific header for cron jobs)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // In local dev without CRON_SECRET it will pass, in prod it will block unless matched.
    if (process.env.NODE_ENV === "production") {
      return new NextResponse('Unauthorized', { status: 401 });
    }
  }

  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const q = query(collection(db, "appointments"), where("date", "==", tomorrowStr), where("isPrivate", "==", false));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return NextResponse.json({ success: true, message: "No appointments for tomorrow." });
    }

    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneNumberId) {
      return NextResponse.json({ success: false, error: "WhatsApp API keys missing." });
    }

    let count = 0;

    for (const doc of snapshot.docs) {
      const { name, phone, time, topic } = doc.data();
      if (!phone || phone === "-") continue;

      let formattedPhone = phone.replace(/\D/g, '');
      if (formattedPhone.startsWith('05')) {
        formattedPhone = '972' + formattedPhone.substring(1);
      }

      const messageText = `שלום ${name}! 👋\n\nתזכורת ידידותית: מחר בשעה ${time} נקבעה לנו פגישה בנושא "${topic?.split('|')[0] || ''}".\n\nמחכה לראותך!\nיוסי מ"מצפן הלב"`;

      try {
        await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: formattedPhone,
            type: "text",
            text: {
              preview_url: false,
              body: messageText
            }
          })
        });
        count++;
      } catch (err) {
        console.error("Failed to send reminder to", phone, err);
      }
    }

    return NextResponse.json({ success: true, remindersSent: count });
  } catch (error) {
    console.error("Cron Job Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
