import { env } from "@/lib/env";
import { createLogger } from "./logger";

const log = createLogger({ module: "mail" });

// ---------------------------------------------------------------------------
// Low-level Brevo dispatcher
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Shell de email reutilizable — Variant "Soft Warm Marketing"
// ---------------------------------------------------------------------------
// Layout table-based (estándar email para compatibilidad con Outlook desktop
// y Gmail mobile). Paleta warm coherente con la app (#FF6A3D / #FF9B6A en
// gradient). Footer con compliance Ley 21.719. Responsive via inline + media
// queries (graceful degradation en clients que las ignoran).

interface EmailBadge {
  text: string;
  bg: string; // background del badge (puede ser color o gradient)
  color: string; // color del texto
}

interface EmailShellOptions {
  preheader: string; // texto invisible para el preview del inbox
  bodyContent: string; // HTML del body principal (entre header y CTA)
  badge?: EmailBadge; // badge opcional arriba del título
  cta?: { text: string; url: string }; // botón opcional
  // Bloque opcional adicional debajo del CTA (ej. disclaimer del password reset)
  afterCta?: string;
  // Incluir aviso de Ley 21.719 + link a perfil (default: true).
  // Solo lo desactivamos en emails transaccionales puramente operacionales.
  includePrivacyNote?: boolean;
}

function renderEmailShell(opts: EmailShellOptions): string {
  const includePrivacyNote = opts.includePrivacyNote ?? true;

  const badgeHtml = opts.badge
    ? `<div style="display:inline-block;padding:4px 12px;background:${opts.badge.bg};color:${opts.badge.color};border-radius:99px;font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:16px">${opts.badge.text}</div>`
    : "";

  const ctaHtml = opts.cta
    ? `
        <tr>
          <td class="email-body-padding" style="padding:0 32px 32px" align="center">
            <a class="email-cta-link" href="${opts.cta.url}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#FF6A3D 0%,#FF9B6A 100%);color:#FFFFFF;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px;box-shadow:0 6px 16px rgba(255,106,61,0.33)">${opts.cta.text}</a>
          </td>
        </tr>`
    : "";

  const afterCtaHtml = opts.afterCta
    ? `
        <tr>
          <td class="email-body-padding" style="padding:0 32px 32px">${opts.afterCta}</td>
        </tr>`
    : "";

  const privacyNoteHtml = includePrivacyNote
    ? `<p style="margin:8px 0 0;font-size:10px;color:#9CA3AF;line-height:1.6">Recibes este email porque tienes una cuenta activa en PractiX. Gestiona tus datos según Ley 21.719 en <a href="${env.NEXTAUTH_URL}/perfil" style="color:#FF6A3D;text-decoration:none">tu perfil</a>.</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  @media only screen and (max-width: 480px) {
    .email-body-padding { padding: 24px 20px !important; }
    .email-footer-padding { padding: 20px !important; }
    .email-header-padding { padding: 24px 20px 18px !important; }
    .email-cta-link {
      display: block !important;
      width: 100% !important;
      box-sizing: border-box !important;
      text-align: center !important;
    }
  }
</style>
</head>
<body style="margin:0;padding:0">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FAFAF8;padding:32px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.04);max-width:600px;width:100%">
        <tr>
          <td style="font-size:1px;line-height:1px;color:#FAFAF8;height:0">${opts.preheader}</td>
        </tr>
        <tr>
          <td class="email-header-padding" style="padding:32px 32px 24px;border-bottom:1px solid #00000010">
            <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;font-weight:800;background:linear-gradient(135deg,#FF6A3D 0%,#FF9B6A 100%);-webkit-background-clip:text;background-clip:text;color:transparent">PractiX</span>
            <span style="margin-left:8px;font-size:12px;color:#6B7280;letter-spacing:0.5px">Portal de prácticas con IA</span>
          </td>
        </tr>
        <tr>
          <td class="email-body-padding" style="padding:32px">
            ${badgeHtml}
            ${opts.bodyContent}
          </td>
        </tr>
        ${ctaHtml}
        ${afterCtaHtml}
        <tr>
          <td class="email-footer-padding" style="padding:24px 32px;background:#FAFAF8;border-top:1px solid #00000010">
            <p style="margin:0 0 6px;font-size:12px;color:#374151;font-weight:600">PractiX · Santiago, Chile</p>
            <p style="margin:0 0 16px;font-size:11px;color:#6B7280">Portal de prácticas laborales con matching inteligente por IA</p>
            <p style="margin:0 0 8px;font-size:11px;color:#6B7280">¿Necesitas ayuda? <a href="mailto:soporte@practix.cl" style="color:#FF6A3D;text-decoration:none;font-weight:500">soporte@practix.cl</a></p>
            ${privacyNoteHtml}
            <p style="margin:12px 0 0;font-size:10px;color:#9CA3AF">© 2026 PractiX · All rights reserved</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Paleta de badges reusables
// ---------------------------------------------------------------------------
const BADGE = {
  success: { bg: "#DCFCE7", color: "#15803D" },
  warning: { bg: "#FEF3C7", color: "#92400E" },
  danger: { bg: "#FEF2F2", color: "#B91C1C" },
  brand: {
    bg: "linear-gradient(135deg,#FFE8DD 0%,#FFD6B8 100%)",
    color: "#A8430D",
  },
} as const;

// ---------------------------------------------------------------------------
// Templates específicos
// ---------------------------------------------------------------------------
export function sendCompanyStatusEmail(
  companyEmail: string,
  companyName: string,
  status: "APPROVED" | "REJECTED" | "SUSPENDED",
  suspensionReason?: string | null,
): Promise<void> {
  const safeName = escapeHtml(companyName);

  if (status === "APPROVED") {
    const subject = "¡Tu empresa fue aprobada en PractiX!";
    const html = renderEmailShell({
      preheader: `${safeName} — tu empresa fue aprobada en PractiX`,
      badge: { text: "Empresa aprobada", ...BADGE.brand },
      bodyContent: `
        <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#0A0909;letter-spacing:-0.4px">¡Bienvenida, ${safeName}!</h1>
        <p style="margin:0 0 16px;font-size:15px;color:#0A0909;line-height:1.6">
          Tu empresa fue <strong style="color:#FF6A3D">aprobada</strong>. A partir de ahora tus prácticas publicadas serán visibles para los estudiantes en PractiX.
        </p>
        <p style="margin:0;font-size:14px;color:#6B7280;line-height:1.6">
          Ya puedes crear tu primera práctica desde el panel y empezar a recibir postulantes rankeados por nuestro matching IA.
        </p>`,
      cta: {
        text: "Ir a mi panel →",
        url: `${env.NEXTAUTH_URL}/dashboard/empresa`,
      },
    });
    return sendEmail({ email: companyEmail, name: companyName }, subject, html);
  }

  if (status === "SUSPENDED") {
    const subject = "Tu cuenta de PractiX fue suspendida";
    const hasReason = !!suspensionReason && suspensionReason.length > 0;
    const reasonBlock = hasReason
      ? `
        <div style="margin:20px 0;padding:16px 18px;background:#FEF3C7;border-left:3px solid #D97706;border-radius:8px">
          <p style="margin:0 0 6px;font-size:11px;color:#92400E;font-weight:700;letter-spacing:0.5px;text-transform:uppercase">Motivo</p>
          <p style="margin:0;font-size:14px;color:#78350F;line-height:1.5">${escapeHtml(
            suspensionReason as string,
          )}</p>
        </div>`
      : `
        <div style="margin:20px 0;padding:16px 18px;background:#F1F5F9;border-left:3px solid #94A3B8;border-radius:8px">
          <p style="margin:0 0 6px;font-size:11px;color:#475569;font-weight:700;letter-spacing:0.5px;text-transform:uppercase">Motivo</p>
          <p style="margin:0;font-size:14px;color:#475569;line-height:1.5;font-style:italic">El administrador no especificó un motivo público. Contacta al soporte para más información.</p>
        </div>`;

    const html = renderEmailShell({
      preheader: "Tu cuenta en PractiX fue suspendida",
      badge: { text: "Cuenta suspendida", ...BADGE.danger },
      bodyContent: `
        <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#0A0909;letter-spacing:-0.4px">Hola ${safeName}</h1>
        <p style="margin:0 0 20px;font-size:15px;color:#0A0909;line-height:1.6">
          Tu cuenta en PractiX fue <strong>suspendida</strong>. Mientras dure la suspensión no podrás publicar prácticas ni gestionar postulaciones.
        </p>
        ${reasonBlock}
        <p style="margin:20px 0 0;font-size:14px;color:#6B7280;line-height:1.6">
          Si crees que es un error o quieres apelar, escribe al administrador a <a href="mailto:soporte@practix.cl" style="color:#FF6A3D;text-decoration:none;font-weight:500">soporte@practix.cl</a>.
        </p>`,
    });
    return sendEmail({ email: companyEmail, name: companyName }, subject, html);
  }

  // REJECTED
  const subject = "Actualización sobre tu cuenta en PractiX";
  const html = renderEmailShell({
    preheader: "Actualización sobre tu solicitud en PractiX",
    bodyContent: `
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#0A0909;letter-spacing:-0.4px">Hola ${safeName}</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#0A0909;line-height:1.6">
        Luego de revisar tu solicitud, tu empresa no pudo ser aprobada en esta oportunidad.
      </p>
      <p style="margin:0;font-size:14px;color:#6B7280;line-height:1.6">
        Si crees que es un error o quieres más información, escríbenos a <a href="mailto:soporte@practix.cl" style="color:#FF6A3D;text-decoration:none;font-weight:500">soporte@practix.cl</a>.
      </p>`,
  });
  return sendEmail({ email: companyEmail, name: companyName }, subject, html);
}

export function sendNewApplicationEmail(
  companyEmail: string,
  companyName: string,
  studentName: string,
  internshipTitle: string,
): Promise<void> {
  const subject = `Nueva postulación: ${internshipTitle}`;
  const html = renderEmailShell({
    preheader: `${escapeHtml(studentName)} se postuló a ${escapeHtml(internshipTitle)}`,
    badge: { text: "Nueva postulación", ...BADGE.brand },
    bodyContent: `
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#0A0909;letter-spacing:-0.4px">Hola ${escapeHtml(companyName)}</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#0A0909;line-height:1.6">
        <strong>${escapeHtml(studentName)}</strong> acaba de postular a tu práctica:
      </p>
      <div style="margin:16px 0;padding:18px 20px;background:#FAFAF8;border-radius:12px;border:1px solid #00000010">
        <p style="margin:0;font-size:16px;font-weight:700;color:#0A0909">${escapeHtml(internshipTitle)}</p>
      </div>
      <p style="margin:16px 0 0;font-size:14px;color:#6B7280;line-height:1.6">
        Entra al ATS para revisar su CV, ver el score de matching IA y mover su postulación en el pipeline.
      </p>`,
    cta: { text: "Ver postulantes →", url: `${env.NEXTAUTH_URL}/dashboard` },
  });
  return sendEmail({ email: companyEmail, name: companyName }, subject, html);
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

  // Badge color según severidad del cambio
  const badge =
    status === "ACCEPTED"
      ? { text: "Aceptado", ...BADGE.success }
      : status === "REJECTED"
        ? { text: "No seleccionado", ...BADGE.danger }
        : { text: "Actualización", ...BADGE.brand };

  const html = renderEmailShell({
    preheader: message,
    badge,
    bodyContent: `
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#0A0909;letter-spacing:-0.4px">Hola ${escapeHtml(studentName)}</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#0A0909;line-height:1.6">
        Hay novedades sobre tu postulación a <strong>${escapeHtml(internshipTitle)}</strong>:
      </p>
      <p style="margin:16px 0;font-size:18px;font-weight:700;color:#FF6A3D">${message}</p>`,
    cta: {
      text: "Ver mis postulaciones →",
      url: `${env.NEXTAUTH_URL}/dashboard`,
    },
  });
  return sendEmail({ email: studentEmail, name: studentName }, subject, html);
}

export function sendPasswordResetEmail(
  companyEmail: string,
  companyName: string,
  resetUrl: string,
): Promise<void> {
  const subject = "Restablecer contraseña — PractiX";
  const html = renderEmailShell({
    preheader: "Restablece tu contraseña — enlace válido por 1 hora",
    bodyContent: `
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#0A0909;letter-spacing:-0.4px">Restablecer contraseña</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#0A0909;line-height:1.6">
        Hola ${escapeHtml(companyName)}, recibimos una solicitud para restablecer la contraseña de tu cuenta empresa en PractiX.
      </p>
      <p style="margin:0;font-size:14px;color:#6B7280;line-height:1.6">
        Haz clic en el botón para crear una nueva contraseña. El enlace es válido por <strong>1 hora</strong>.
      </p>`,
    cta: { text: "Restablecer contraseña →", url: resetUrl },
    afterCta: `
      <div style="padding:14px 18px;background:#FAFAF8;border-radius:10px;border-left:3px solid #94A3B8">
        <p style="margin:0;font-size:13px;color:#475569;line-height:1.6">
          Si no solicitaste este cambio, puedes ignorar este email. Tu contraseña no se modificará.
        </p>
      </div>`,
    // Es un email de seguridad transaccional — no agregamos privacy note
    // adicional para no diluir la urgencia.
    includePrivacyNote: false,
  });
  return sendEmail({ email: companyEmail, name: companyName }, subject, html);
}

export function sendLoginBurstAlertEmail(
  userEmail: string,
  userName: string,
): Promise<void> {
  const subject = "Varios intentos de inicio de sesión en tu cuenta PractiX";
  const resetUrl = `${env.NEXTAUTH_URL}/forgot-password`;
  const html = renderEmailShell({
    preheader: "Detectamos varios intentos de inicio de sesión en tu cuenta",
    badge: { text: "Alerta de seguridad", ...BADGE.warning },
    bodyContent: `
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#0A0909;letter-spacing:-0.4px">Hola ${escapeHtml(userName)}</h1>
      <p style="margin:0 0 20px;font-size:15px;color:#0A0909;line-height:1.6">
        Detectamos varios intentos fallidos de inicio de sesión en tu cuenta. Tu cuenta <strong>no fue bloqueada permanentemente</strong> — puedes volver a intentar en unos minutos.
      </p>
      <div style="margin:16px 0;padding:16px 18px;background:#F0FDF4;border-left:3px solid #16A34A;border-radius:8px">
        <p style="margin:0 0 6px;font-size:13px;color:#14532D;font-weight:700">Si fuiste tú</p>
        <p style="margin:0;font-size:13px;color:#166534;line-height:1.5">Si olvidaste tu contraseña, restablécela con el botón de abajo.</p>
      </div>
      <div style="margin:16px 0;padding:16px 18px;background:#FEF2F2;border-left:3px solid #DC2626;border-radius:8px">
        <p style="margin:0 0 6px;font-size:13px;color:#7F1D1D;font-weight:700">Si NO fuiste tú</p>
        <p style="margin:0;font-size:13px;color:#991B1B;line-height:1.5">Te recomendamos restablecer tu contraseña como medida de precaución.</p>
      </div>`,
    cta: { text: "Restablecer contraseña →", url: resetUrl },
    includePrivacyNote: false,
  });
  return sendEmail({ email: userEmail, name: userName }, subject, html);
}

export function sendRecommendationEmail(
  studentEmail: string,
  studentName: string,
  internshipTitle: string,
  matchScore: number,
): Promise<void> {
  const subject = `Práctica con ${matchScore}% de afinidad para ti`;
  const html = renderEmailShell({
    preheader: `${matchScore}% de match — ${escapeHtml(internshipTitle)}`,
    badge: { text: "Match alto", ...BADGE.brand },
    bodyContent: `
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#0A0909;letter-spacing:-0.4px">Hola ${escapeHtml(studentName)}</h1>
      <p style="margin:0 0 20px;font-size:15px;color:#0A0909;line-height:1.6">
        Nuestra IA encontró una práctica que coincide con tu perfil:
      </p>
      <div style="margin:16px 0;padding:20px 22px;background:linear-gradient(135deg,#FFF5F0 0%,#FFEDE0 100%);border-radius:14px;border:1px solid #FF6A3D30">
        <p style="margin:0 0 14px;font-size:17px;font-weight:800;color:#0A0909">${escapeHtml(internshipTitle)}</p>
        <div style="display:inline-block;padding:8px 18px;background:linear-gradient(135deg,#FF6A3D 0%,#FF9B6A 100%);color:#FFFFFF;border-radius:99px;font-weight:800;font-size:18px;box-shadow:0 4px 12px rgba(255,106,61,0.33)">${matchScore}% de afinidad</div>
      </div>
      <p style="margin:16px 0 0;font-size:14px;color:#6B7280;line-height:1.6">
        Postula rápido — las prácticas con alto match cierran en pocos días.
      </p>`,
    cta: { text: "Ver práctica →", url: `${env.NEXTAUTH_URL}/dashboard` },
  });
  return sendEmail({ email: studentEmail, name: studentName }, subject, html);
}
