// @ts-nocheck

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SmsRequestBody {
  clientName?: string;
  phone?: string;
  roomName?: string;
  checkIn?: string;
  checkOut?: string;
  stayType?: 'nuitée' | 'journée';
  total?: number;
  reservationId?: string;
}

const formatDate = (value?: string) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const cleanPhone = (phone?: string) => (phone || '').replace(/\s+/g, '');
const normalizePhone = (phone?: string) => {
  const cleaned = cleanPhone(phone).replace(/[-().]/g, '');

  if (!cleaned) return '';
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('225') && cleaned.length >= 12) return `+${cleaned}`;
  if (/^0\d{9}$/.test(cleaned)) return `+225${cleaned.slice(1)}`;

  return cleaned;
};
const cleanSecret = (value?: string | null) => (value || '').trim();

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = (await req.json()) as SmsRequestBody;
    const clientName = body.clientName?.trim();
    const phone = normalizePhone(body.phone);

    if (!clientName || !phone || !body.roomName || !body.checkIn || !body.checkOut || !body.total) {
      return new Response(JSON.stringify({ error: 'Champs manquants pour le SMS.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!/^\+\d{8,15}$/.test(phone)) {
      return new Response(JSON.stringify({
        error: "Numéro de téléphone invalide. Utilisez un format international E.164, par exemple +225XXXXXXXXX.",
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accountSid = cleanSecret(Deno.env.get('TWILIO_ACCOUNT_SID'));
    const authToken = cleanSecret(Deno.env.get('TWILIO_AUTH_TOKEN'));
    const fromNumber = cleanSecret(Deno.env.get('TWILIO_FROM_NUMBER'));
    const siteName = cleanSecret(Deno.env.get('RESIDENCE_NAME')) || 'Résidence Cheliel';

    if (!accountSid || !authToken || !fromNumber) {
      return new Response(JSON.stringify({
        error: 'Configuration SMS manquante. Définissez TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN et TWILIO_FROM_NUMBER.',
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!accountSid.startsWith('AC')) {
      return new Response(JSON.stringify({
        error: 'TWILIO_ACCOUNT_SID invalide. Il doit commencer par AC.',
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stayLabel = body.stayType === 'journée' ? 'journée' : 'nuitée';
    const message = [
      `Bonjour ${clientName}, votre réservation est confirmée chez ${siteName}.`,
      `Chambre: ${body.roomName}.`,
      `Séjour: ${stayLabel}, du ${formatDate(body.checkIn)} au ${formatDate(body.checkOut)}.`,
      `Montant total: ${body.total.toLocaleString('fr-FR')} F CFA.`,
      body.reservationId ? `Réf: ${body.reservationId}.` : null,
    ]
      .filter(Boolean)
      .join(' ');

    const credentials = btoa(`${accountSid}:${authToken}`);
    const twilioResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: new URLSearchParams({
        From: fromNumber,
        To: phone,
        Body: message,
      }),
    });

    if (!twilioResponse.ok) {
      const errorText = await twilioResponse.text();
      const authHint = twilioResponse.status === 401
        ? ' Vérifiez TWILIO_ACCOUNT_SID et TWILIO_AUTH_TOKEN (auth Twilio).'
        : '';
      return new Response(JSON.stringify({ error: `L’envoi du SMS a échoué.${authHint}`.trim(), details: errorText }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
