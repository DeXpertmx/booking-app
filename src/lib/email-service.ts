import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const CONSULTANT_EMAIL = process.env.CONSULTANT_EMAIL || 'noreply@dimensionexpert.com';

export class EmailService {
  static async sendBookingConfirmation(clientEmail: string, clientName: string, appointmentDetails: {
    serviceName: string;
    dateTime: string;
    duration: number;
    leadId: string;
  }) {
    if (!resend) {
      console.warn("Resend API Key is missing. Email confirmation skipped.");
      return Promise.resolve();
    }

    const timeZone = process.env.NEXT_PUBLIC_TENANT_TIMEZONE || 'Europe/Madrid';
    const formattedDateTime = new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: timeZone
    }).format(new Date(appointmentDetails.dateTime));

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
            <p><strong>Fecha y Hora:</strong> ${formattedDateTime}</p>
            <p><strong>Duración:</strong> ${appointmentDetails.duration} minutos</p>
          </div>
          <p>Te esperamos pronto.</p>
          <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 20px 0;" />
          <p style="font-size: 12px; color: #666;">Si necesitas cancelar o reprogramar, por favor contáctanos.</p>
        </div>
      `,
    });

    // Send to Consultant
    const consultantPromise = resend.emails.send({
      from: 'Volkern Notifications <system@dimensionexpert.com>',
      to: CONSULTANT_EMAIL,
      subject: `Nueva Cita Agendada: ${clientName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;">
          <h2>Nueva cita agendada en el calendario</h2>
          <p><strong>Cliente:</strong> ${clientName} (${clientEmail})</p>
          <p><strong>Servicio:</strong> ${appointmentDetails.serviceName}</p>
          <p><strong>Fecha y Hora:</strong> ${formattedDateTime}</p>
          <hr />
          <p><a href="${process.env.NEXT_PUBLIC_VOLKERN_URL || 'https://volkern.app'}/dashboard/leads/${appointmentDetails.leadId}" style="color: black; text-decoration: underline;">Ver Lead en Volkern</a></p>
        </div>
      `,
    });

    return Promise.all([clientPromise, consultantPromise]);
  }
}
