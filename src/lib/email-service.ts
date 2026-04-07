import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const CONSULTANT_EMAIL = process.env.CONSULTANT_EMAIL || 'noreply@dimensionexpert.com';
const TENANT_TIMEZONE = process.env.NEXT_PUBLIC_TENANT_TIMEZONE || 'Europe/Madrid';

export class EmailService {
  static async sendBookingConfirmation(clientEmail: string, clientName: string, appointmentDetails: {
    serviceName: string;
    dateTime: string;
    duration: number;
    leadId: string;
    userTimezone?: string;
  }) {
    if (!resend) {
      console.warn("Resend API Key is missing. Email confirmation skipped.");
      return Promise.resolve();
    }

    const appointmentDate = new Date(appointmentDetails.dateTime);
    const userTz = appointmentDetails.userTimezone || TENANT_TIMEZONE;
    const isDifferentTimezone = userTz !== TENANT_TIMEZONE;

    // Format in tenant timezone (Málaga/España)
    const tenantFormattedDateTime = new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: TENANT_TIMEZONE
    }).format(appointmentDate);

    // Format in user's timezone
    const userFormattedDateTime = new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: userTz
    }).format(appointmentDate);

    // Get timezone display name
    const getUserTimezoneDisplay = (tz: string): string => {
      try {
        const formatter = new Intl.DateTimeFormat('es-ES', {
          timeZone: tz,
          timeZoneName: 'long'
        });
        const parts = formatter.formatToParts(appointmentDate);
        const tzPart = parts.find(p => p.type === 'timeZoneName');
        return tzPart?.value || tz;
      } catch {
        return tz;
      }
    };

    const userTzDisplay = getUserTimezoneDisplay(userTz);

    // Send to Client
    const clientPromise = resend.emails.send({
      from: 'Volkern <appointments@dimensionexpert.com>',
      to: clientEmail,
      subject: 'Confirmación de tu Cita - Volkern',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 12px;">
          <h1 style="color: #000; font-size: 24px;">¡Tu cita está confirmada, ${clientName}!</h1>
          <p>Hemos agendado tu sesión exitosamente. Aquí están los detalles:</p>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Servicio:</strong> ${appointmentDetails.serviceName}</p>
            <p><strong>Duración:</strong> ${appointmentDetails.duration} minutos</p>
            <hr style="border: 0; border-top: 1px solid #ddd; margin: 12px 0;" />
            ${isDifferentTimezone ? `
              <p><strong>📅 Tu hora local (${userTzDisplay}):</strong></p>
              <p style="font-size: 18px; color: #2563eb; font-weight: bold;">${userFormattedDateTime}</p>
              <p style="font-size: 13px; color: #666; margin-top: 8px;"><strong>Hora en España (Málaga):</strong> ${tenantFormattedDateTime}</p>
            ` : `
              <p><strong>📅 Fecha y Hora:</strong></p>
              <p style="font-size: 18px; color: #2563eb; font-weight: bold;">${tenantFormattedDateTime}</p>
            `}
          </div>
          <p>Te esperamos pronto.</p>
          <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 20px 0;" />
          <p style="font-size: 12px; color: #666;">Si necesitas cancelar o reprogramar, por favor contáctanos.</p>
        </div>
      `,
    });

    // Send to Consultant (always show both timezones if different)
    const consultantPromise = resend.emails.send({
      from: 'Volkern Notifications <system@dimensionexpert.com>',
      to: CONSULTANT_EMAIL,
      subject: `Nueva Cita Agendada: ${clientName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;">
          <h2>Nueva cita agendada en el calendario</h2>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p><strong>Cliente:</strong> ${clientName} (${clientEmail})</p>
            <p><strong>Servicio:</strong> ${appointmentDetails.serviceName}</p>
            <hr style="border: 0; border-top: 1px solid #ddd; margin: 12px 0;" />
            <p><strong>📅 Hora en España (Málaga):</strong> ${tenantFormattedDateTime}</p>
            ${isDifferentTimezone ? `<p><strong>🕐 Hora local del cliente (${userTzDisplay}):</strong> ${userFormattedDateTime}</p>` : ''}
          </div>
          <hr />
          <p><a href="${process.env.NEXT_PUBLIC_VOLKERN_URL || 'https://volkern.app'}/dashboard/leads/${appointmentDetails.leadId}" style="color: black; text-decoration: underline;">Ver Lead en Volkern</a></p>
        </div>
      `,
    });

    return Promise.all([clientPromise, consultantPromise]);
  }
}
