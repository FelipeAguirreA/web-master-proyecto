import AdmZip from "adm-zip";

import { prisma } from "@/server/lib/db";

/**
 * F-Legal-2.2 (Ley 21.719): derecho de portabilidad — el titular puede
 * exigir que le entreguemos sus datos en formato estructurado y de uso común.
 *
 * Estrategia:
 * - Junta TODA la data del user de los modelos relacionados.
 * - Sanitiza: NO incluye passwordHash, tokens de reset/refresh, ni IDs
 *   internos de procesadores externos. Sí incluye datos visibles al user.
 * - Empaqueta en ZIP con un archivo JSON por modelo + el CV si existe.
 * - El README explica al usuario qué hay en cada archivo.
 *
 * Este service NO toca infraestructura HTTP — es invocable desde test sin
 * mocks de Next.js.
 */

interface ExportResult {
  zip: Buffer;
  filename: string;
  byteLength: number;
}

const README_TEMPLATE = `# Tus datos personales en PractiX

Este archivo ZIP contiene una copia completa de los datos personales que PractiX tiene sobre ti al momento de generar la exportación.

## Archivos incluidos

- \`user.json\` — datos básicos de tu cuenta (nombre, email, RUT, teléfono, fecha de registro y de aceptación de la política de privacidad).
- \`profile.json\` — perfil de estudiante o empresa según tu rol.
- \`applications.json\` — todas las postulaciones que enviaste (estudiante) o recibiste (empresa), con scores y estado.
- \`conversations.json\` — chats con los mensajes intercambiados.
- \`interviews.json\` — entrevistas agendadas.
- \`notifications.json\` — notificaciones recibidas en la plataforma.
- \`cv.<ext>\` — tu CV original tal como lo subiste (solo si eres estudiante con CV cargado).

## Lo que NO está acá

- Tu contraseña hasheada (no se devuelve por seguridad — solo bcrypt hash, no recuperable).
- Tokens de sesión y refresh (rotativos, se regeneran constantemente).
- Logs internos de seguridad (anonimizados).

## Tus derechos

Si quieres rectificar algún dato o eliminar tu cuenta, puedes:
- Editar tu perfil desde la plataforma.
- Solicitar eliminación escribiendo a soporte@practix.cl o usando la opción "Eliminar mi cuenta" en tu perfil.
- Presentar reclamo ante la APDP (Agencia de Protección de Datos Personales de Chile).

Generado: __TIMESTAMP__
`;

function sanitizeUser(user: {
  id: string;
  email: string;
  name: string;
  lastName: string | null;
  rut: string | null;
  phone: string | null;
  role: string;
  image: string | null;
  consentAcceptedAt: Date | null;
  consentVersion: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    lastName: user.lastName,
    rut: user.rut,
    phone: user.phone,
    role: user.role,
    image: user.image,
    consentAcceptedAt: user.consentAcceptedAt,
    consentVersion: user.consentVersion,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function jsonBuffer(obj: unknown): Buffer {
  return Buffer.from(JSON.stringify(obj, null, 2), "utf-8");
}

function extractCvExtension(cvUrl: string): string {
  const match = cvUrl.match(/\.([a-zA-Z0-9]{2,5})(?:\?|$)/);
  const ext = match?.[1]?.toLowerCase();
  if (ext && ["pdf", "doc", "docx"].includes(ext)) return ext;
  return "pdf";
}

export async function exportUserData(userId: string): Promise<ExportResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      studentProfile: true,
      companyProfile: true,
      applications: {
        include: {
          internship: {
            select: {
              id: true,
              title: true,
              area: true,
              location: true,
              modality: true,
            },
          },
        },
      },
      companyConversations: { include: { messages: true } },
      studentConversations: { include: { messages: true } },
      companyInterviews: true,
      studentInterviews: true,
      notifications: true,
    },
  });

  if (!user) throw new Error("User not found");

  const zip = new AdmZip();

  zip.addFile("user.json", jsonBuffer(sanitizeUser(user)));

  const profile = user.studentProfile ?? user.companyProfile ?? null;
  zip.addFile("profile.json", jsonBuffer(profile));

  zip.addFile("applications.json", jsonBuffer(user.applications));

  const conversations = [
    ...user.companyConversations,
    ...user.studentConversations,
  ];
  zip.addFile("conversations.json", jsonBuffer(conversations));

  const interviews = [...user.companyInterviews, ...user.studentInterviews];
  zip.addFile("interviews.json", jsonBuffer(interviews));

  zip.addFile("notifications.json", jsonBuffer(user.notifications));

  // CV: solo si es estudiante y tiene CV cargado. Bajamos desde la URL pública
  // (el bucket es público para que el dashboard de empresa pueda mostrarlo).
  // Si la descarga falla (URL inválida, network), no rompemos el export — el
  // user igual recibe sus datos estructurados.
  const cvUrl = user.studentProfile?.cvUrl;
  if (cvUrl) {
    try {
      const res = await fetch(cvUrl);
      if (res.ok) {
        const cvBuffer = Buffer.from(await res.arrayBuffer());
        const ext = extractCvExtension(cvUrl);
        zip.addFile(`cv.${ext}`, cvBuffer);
      }
    } catch {
      // CV no disponible — seguimos sin él
    }
  }

  const readme = README_TEMPLATE.replace(
    "__TIMESTAMP__",
    new Date().toISOString(),
  );
  zip.addFile("README.md", Buffer.from(readme, "utf-8"));

  const buffer = zip.toBuffer();
  return {
    zip: buffer,
    filename: `practix-mis-datos-${userId}-${new Date().toISOString().slice(0, 10)}.zip`,
    byteLength: buffer.byteLength,
  };
}
