import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, date, time, topic, id } = body;

    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    
    // Derive the base URL from the incoming request's own host header, so the
    // cancel link always matches whatever domain Vercel actually served this
    // request on (avoids hardcoding a domain that may change or be wrong).
    const requestUrl = new URL(request.url);
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
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

    // Notify the business owner too, so new bookings don't go unnoticed.
    const ownerPhone = process.env.OWNER_WHATSAPP_PHONE;
    if (ownerPhone) {
      const ownerMessageText = `התקבלה פגישה חדשה!\n\nלקוח/ה: ${name}\nטלפון: ${phone}\nתאריך: ${date} בשעה ${time}\nנושא: ${topic}`;
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
            to: ownerPhone.replace(/\D/g, ''),
            type: "text",
            text: {
              preview_url: false,
              body: ownerMessageText
            }
          })
        });
      } catch (err) {
        console.error("Failed to notify owner of new booking:", err);
      }
    } else {
      console.warn("OWNER_WHATSAPP_PHONE is missing. Owner was not notified of the new booking.");
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error in WhatsApp API route:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
