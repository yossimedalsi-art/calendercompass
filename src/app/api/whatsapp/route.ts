import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, date, time, topic, id } = body;

    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    
    // For local dev use localhost, for production use window.location.origin but since we are on server, we can hardcode the domain or pass it from client.
    // We will hardcode heartcompass.vercel.app for now, or use localhost if not in production.
    const baseUrl = process.env.NODE_ENV === "production" ? "https://heartcompass.vercel.app" : "http://localhost:3000";
    const cancelUrl = `${baseUrl}/cancel/${id}`;

    if (!token || !phoneNumberId) {
      console.warn("WhatsApp API keys are missing. Message not sent.");
      return NextResponse.json({ success: true, warning: "Keys missing" });
    }

    // Format phone number: remove non-digits, ensure country code
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('05')) {
      formattedPhone = '972' + formattedPhone.substring(1);
    }

    const messageText = `שלום ${name}!\n\nהפגישה שלנו נקבעה בהצלחה לתאריך ${date} בשעה ${time}.\n\nנושא: ${topic}\n\nלשינוי או ביטול התור, לחץ כאן:\n${cancelUrl}\n\nמחכה לראותך,\nיוסי מ"מצפן הלב"`;

    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
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

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp API Error:", data);
      throw new Error("Failed to send WhatsApp message");
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error in WhatsApp API route:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
