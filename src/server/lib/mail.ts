import { env } from "@/lib/env";

async function sendEmail(
  to: { email: string; name: string },
  subject: string,
  htmlContent: string,
): Promise<void> {
  if (!env.BREVO_API_KEY) {
    console.warn("[mail] BREVO_API_KEY no configurada — email omitido");
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

  console.log(`[mail] ${subject} → ${to.email} | status: ${res.status}`);
}

export function sendCompanyStatusEmail(
  companyEmail: string,
  companyName: string,
  status: "APPROVED" | "REJECTED",
): Promise<void> {
  const approved = status === "APPROVED";
  const subject = approved
    ? "¡Tu empresa fue aprobada en PractiX!"
    : "Actualización sobre tu cuenta en PractiX";
  const htmlContent = approved
    ? `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#1d4ed8">¡Bienvenida, ${companyName}!</h2>
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
  `
    : `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#374151">Hola ${companyName}</h2>
      <p style="font-size:16px;color:#374151">
        Luego de revisar tu solicitud, tu empresa no pudo ser aprobada en esta
        oportunidad. Si creés que es un error o querés más información, escribinos a
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
