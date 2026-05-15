import { env } from "@/lib/env";
import { createLogger } from "./logger";

const log = createLogger({ module: "mail" });

async function sendEmail(
  to: { email: string; name: string },
  subject: string,
  htmlContent: string,
): Promise<void> {
  if (!env.BREVO_API_KEY) {
    log.warn("BREVO_API_KEY no configurada — email omitido");
    return;
  }

  const body = {
    sender: {
      email: env.BREVO_SENDER_EMAIL ?? "noreply@practix.com",
      name: "PractiX",
    },
    to: [{ email: to.email, name: to.name }],
    subject,
    htmlContent,
  };

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": env.BREVO_API_KEY,
    },
    body: JSON.stringify(body),
  });

  log.info({ subject, to: to.email, status: res.status }, "email sent");
}

// Escape mínimo de HTML para datos que vienen del admin (companyName y
// suspensionReason). El admin no es un atacante, pero un nombre con `<` o `&`
// rompería el render del mail si no lo escapamos.
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function sendCompanyStatusEmail(
  companyEmail: string,
  companyName: string,
  status: "APPROVED" | "REJECTED" | "SUSPENDED",
  suspensionReason?: string | null,
): Promise<void> {
  const safeName = escapeHtml(companyName);

  if (status === "APPROVED") {
    const subject = "¡Tu empresa fue aprobada en PractiX!";
    const htmlContent = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#1d4ed8">¡Bienvenida, ${safeName}!</h2>
      <p style="font-size:16px;color:#374151">
        Tu empresa fue <strong>aprobada</strong>. A partir de ahora tus prácticas
        publicadas serán visibles para todos los estudiantes en PractiX.
      </p>
      <a href="${env.NEXTAUTH_URL}/dashboard/empresa"
         style="display:inline-block;margin-top:16px;padding:12px 24px;background:#1d4ed8;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
        Ir a mi panel
      </a>
      <p style="margin-top:32px;color:#9ca3af;font-size:14px">— Equipo PractiX</p>
    </div>
  `;
    return sendEmail(
      { email: companyEmail, name: companyName },
      subject,
      htmlContent,
    );
  }

  if (status === "SUSPENDED") {
    const subject = "Tu cuenta de PractiX fue suspendida";
    const hasReason = !!suspensionReason && suspensionReason.length > 0;
    const reasonBlock = hasReason
      ? `
      <div style="margin-top:16px;padding:14px 16px;background:#FEF3C7;border-left:3px solid #D97706;border-radius:6px">
        <p style="font-size:13px;color:#92400E;margin:0 0 4px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase">Motivo</p>
        <p style="font-size:14px;color:#92400E;margin:0;line-height:1.5">${escapeHtml(suspensionReason as string)}</p>
      </div>`
      : `
      <div style="margin-top:16px;padding:14px 16px;background:#F1F5F9;border-left:3px solid #94A3B8;border-radius:6px">
        <p style="font-size:13px;color:#475569;margin:0 0 4px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase">Motivo</p>
        <p style="font-size:14px;color:#475569;margin:0;line-height:1.5;font-style:italic">El administrador no especificó un motivo público. Contactá al soporte para más información.</p>
      </div>`;
    const htmlContent = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#B91C1C">Hola ${safeName}</h2>
      <p style="font-size:16px;color:#374151">
        Tu cuenta en PractiX fue <strong>suspendida</strong>. Mientras dure la
        suspensión no podrás publicar prácticas ni gestionar postulaciones.
      </p>
      ${reasonBlock}
      <p style="font-size:16px;color:#374151;margin-top:18px">
        Si crees que es un error o quieres apelar, contactá al administrador escribiendo a
        <a href="mailto:soporte@practix.cl">soporte@practix.cl</a>.
      </p>
      <p style="margin-top:32px;color:#9ca3af;font-size:14px">— Equipo PractiX</p>
    </div>
  `;
    return sendEmail(
      { email: companyEmail, name: companyName },
      subject,
      htmlContent,
    );
  }

  // REJECTED
  const subject = "Actualización sobre tu cuenta en PractiX";
  const htmlContent = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#374151">Hola ${safeName}</h2>
      <p style="font-size:16px;color:#374151">
        Luego de revisar tu solicitud, tu empresa no pudo ser aprobada en esta
        oportunidad. Si crees que es un error o quieres más información, escríbenos a
        <a href="mailto:soporte@practix.cl">soporte@practix.cl</a>.
      </p>
      <p style="margin-top:32px;color:#9ca3af;font-size:14px">— Equipo PractiX</p>
    </div>
  `;
  return sendEmail(
    { email: companyEmail, name: companyName },
    subject,
    htmlContent,
  );
}

export function sendNewApplicationEmail(
  companyEmail: string,
  companyName: string,
  studentName: string,
  internshipTitle: string,
): Promise<void> {
  const subject = `Nueva postulación: ${internshipTitle}`;
  const htmlContent = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#1d4ed8">Hola ${companyName}</h2>
      <p style="font-size:16px;color:#374151">
        <strong>${studentName}</strong> se ha postulado a tu práctica:
        <strong>${internshipTitle}</strong>
      </p>
      <a href="${env.NEXTAUTH_URL}/dashboard"
         style="display:inline-block;margin-top:16px;padding:12px 24px;background:#1d4ed8;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
        Ver postulantes
      </a>
      <p style="margin-top:32px;color:#9ca3af;font-size:14px">— Equipo PractiX</p>
    </div>
  `;
  return sendEmail(
    { email: companyEmail, name: companyName },
    subject,
    htmlContent,
  );
}

export function sendStatusUpdateEmail(
  studentEmail: string,
  studentName: string,
  internshipTitle: string,
  status: string,
): Promise<void> {
  const statusMessages: Record<string, string> = {
    REVIEWED: "Tu postulación está siendo revisada",
    ACCEPTED: "¡Felicitaciones! Tu postulación fue aceptada",
    REJECTED: "Tu postulación no fue seleccionada esta vez",
  };

  const message = statusMessages[status] ?? `Estado actualizado: ${status}`;
  const subject = `Actualización: ${internshipTitle}`;
  const htmlContent = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#1d4ed8">Hola ${studentName}</h2>
      <p style="font-size:16px;color:#374151">
        Hay novedades sobre tu postulación a <strong>${internshipTitle}</strong>:
      </p>
      <p style="font-size:18px;font-weight:600;color:#1d4ed8;margin:16px 0">${message}</p>
      <a href="${env.NEXTAUTH_URL}/dashboard"
         style="display:inline-block;margin-top:16px;padding:12px 24px;background:#1d4ed8;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
        Ver mis postulaciones
      </a>
      <p style="margin-top:32px;color:#9ca3af;font-size:14px">— Equipo PractiX</p>
    </div>
  `;
  return sendEmail(
    { email: studentEmail, name: studentName },
    subject,
    htmlContent,
  );
}

export function sendPasswordResetEmail(
  companyEmail: string,
  companyName: string,
  resetUrl: string,
): Promise<void> {
  const subject = "Restablecer contraseña — PractiX";
  const htmlContent = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#1d4ed8">Hola ${companyName}</h2>
      <p style="font-size:16px;color:#374151">
        Recibimos una solicitud para restablecer la contraseña de tu cuenta empresa en PractiX.
      </p>
      <p style="font-size:14px;color:#374151;margin:16px 0">
        Haz clic en el siguiente botón para crear una nueva contraseña.
        El enlace es válido por <strong>1 hora</strong>.
      </p>
      <a href="${resetUrl}"
         style="display:inline-block;margin-top:8px;padding:12px 24px;background:#1d4ed8;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
        Restablecer contraseña
      </a>
      <p style="margin-top:24px;font-size:13px;color:#6b7280">
        Si no solicitaste este cambio, puedes ignorar este email.
        Tu contraseña no se modificará.
      </p>
      <p style="margin-top:32px;color:#9ca3af;font-size:14px">— Equipo PractiX</p>
    </div>
  `;
  return sendEmail(
    { email: companyEmail, name: companyName },
    subject,
    htmlContent,
  );
}

export function sendLoginBurstAlertEmail(
  userEmail: string,
  userName: string,
): Promise<void> {
  const subject = "Varios intentos de inicio de sesión en tu cuenta PractiX";
  const resetUrl = `${env.NEXTAUTH_URL}/forgot-password`;
  const htmlContent = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#1d4ed8">Hola ${userName}</h2>
      <p style="font-size:16px;color:#374151">
        Detectamos varios intentos fallidos de inicio de sesión en tu cuenta.
        Tu cuenta <strong>no fue bloqueada permanentemente</strong> — puedes
        volver a intentar en unos minutos.
      </p>
      <div style="background:#f3f4f6;border-left:4px solid #1d4ed8;padding:14px 18px;margin:20px 0;border-radius:6px">
        <p style="margin:0 0 8px 0;font-size:14px;font-weight:600;color:#111827">
          Si fuiste tú
        </p>
        <p style="margin:0;font-size:14px;color:#374151;line-height:1.5">
          Si olvidaste tu contraseña, puedes restablecerla en cualquier momento
          haciendo clic en el botón de abajo.
        </p>
      </div>
      <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:14px 18px;margin:20px 0;border-radius:6px">
        <p style="margin:0 0 8px 0;font-size:14px;font-weight:600;color:#991b1b">
          Si no fuiste tú
        </p>
        <p style="margin:0;font-size:14px;color:#374151;line-height:1.5">
          Te recomendamos restablecer tu contraseña como medida de precaución.
        </p>
      </div>
      <a href="${resetUrl}"
         style="display:inline-block;margin-top:8px;padding:12px 24px;background:#1d4ed8;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
        Restablecer contraseña
      </a>
      <p style="margin-top:32px;color:#9ca3af;font-size:14px">— Equipo PractiX</p>
    </div>
  `;
  return sendEmail({ email: userEmail, name: userName }, subject, htmlContent);
}

export function sendRecommendationEmail(
  studentEmail: string,
  studentName: string,
  internshipTitle: string,
  matchScore: number,
): Promise<void> {
  const subject = `Práctica con ${matchScore}% de afinidad para ti`;
  const htmlContent = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#1d4ed8">Hola ${studentName}</h2>
      <p style="font-size:16px;color:#374151">
        Encontramos una práctica que coincide con tu perfil:
      </p>
      <p style="font-size:18px;font-weight:600;color:#374151;margin:16px 0">${internshipTitle}</p>
      <div style="display:inline-block;padding:8px 16px;background:#dbeafe;border-radius:99px;color:#1d4ed8;font-weight:700;font-size:20px">
        ${matchScore}% de afinidad
      </div>
      <a href="${env.NEXTAUTH_URL}/dashboard"
         style="display:block;margin-top:24px;padding:12px 24px;background:#1d4ed8;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;text-align:center">
        Ver práctica
      </a>
      <p style="margin-top:32px;color:#9ca3af;font-size:14px">— Equipo PractiX</p>
    </div>
  `;
  return sendEmail(
    { email: studentEmail, name: studentName },
    subject,
    htmlContent,
  );
}
