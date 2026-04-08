// @ts-nocheck

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequestBody {
  reservationId?: string;
  clientName?: string;
  clientEmail?: string;
  roomName?: string;
  checkIn?: string;
  checkOut?: string;
  stayType?: 'nuitée' | 'journée';
  amountPaid?: number;
  paymentMethod?: string;
  siteName?: string;
}

const cleanValue = (value?: string | null) => (value || '').trim();

const formatDate = (value?: string) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const formatCurrency = (amount?: number) => `${Number(amount || 0).toLocaleString('fr-FR')} F CFA`;

const isValidEmail = (value?: string) => /[^\s@]+@[^\s@]+\.[^\s@]+/.test((value || '').trim());

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
    const body = (await req.json()) as EmailRequestBody;
    const reservationId = cleanValue(body.reservationId);
    const clientName = cleanValue(body.clientName);
    const clientEmail = cleanValue(body.clientEmail);
    const roomName = cleanValue(body.roomName);
    const siteName = cleanValue(body.siteName) || 'Résidence Cheliel';

    if (!isValidEmail(clientEmail)) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'missing_or_invalid_email' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!reservationId || !clientName || !roomName || !body.checkIn || !body.checkOut || body.amountPaid === undefined || body.amountPaid === null) {
      return new Response(JSON.stringify({ error: 'Champs manquants pour l’email de confirmation.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = cleanValue(Deno.env.get('SENDGRID_API_KEY'));
    const fromEmail = cleanValue(Deno.env.get('RESIDENCE_EMAIL_FROM'));

    if (!apiKey || !fromEmail) {
      return new Response(JSON.stringify({
        error: 'Configuration email manquante. Définissez SENDGRID_API_KEY et RESIDENCE_EMAIL_FROM.',
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stayLabel = body.stayType === 'journée' ? 'journée' : 'nuitée';
    const subject = `Confirmation de réservation - ${siteName}`;
    const totalText = formatCurrency(body.amountPaid);
    const arrival = formatDate(body.checkIn);
    const departure = formatDate(body.checkOut);

    const plainText = [
      `Bonjour ${clientName},`,
      ``,
      `Votre réservation a été confirmée chez ${siteName}.`,
      `Numéro de réservation: ${reservationId}`,
      `Chambre réservée: ${roomName}`,
      `Dates: du ${arrival} au ${departure}`,
      `Type de séjour: ${stayLabel}`,
      `Montant payé: ${totalText}`,
      ``,
      `Merci pour votre confiance.`,
    ].join('\n');

    const html = `
      <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6">
        <p>Bonjour <strong>${clientName}</strong>,</p>
        <p>Votre réservation a été confirmée chez <strong>${siteName}</strong>.</p>
        <ul>
          <li><strong>Numéro de réservation :</strong> ${reservationId}</li>
          <li><strong>Chambre réservée :</strong> ${roomName}</li>
          <li><strong>Dates :</strong> du ${arrival} au ${departure}</li>
          <li><strong>Type de séjour :</strong> ${stayLabel}</li>
          <li><strong>Montant payé :</strong> ${totalText}</li>
        </ul>
        <p>Merci pour votre confiance.</p>
      </div>
    `;

    const sendgridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: clientEmail }],
            subject,
          },
        ],
        from: {
          email: fromEmail,
          name: siteName,
        },
        reply_to: {
          email: fromEmail,
          name: siteName,
        },
        content: [
          { type: 'text/plain', value: plainText },
          { type: 'text/html', value: html },
        ],
      }),
    });

    if (!sendgridResponse.ok) {
      const errorText = await sendgridResponse.text();
      return new Response(JSON.stringify({ error: 'L’envoi de l’email a échoué.', details: errorText }), {
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