import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: {
    BREVO_API_KEY: "test-brevo-key",
    BREVO_SENDER_EMAIL: "noreply@practix.com",
    NEXTAUTH_URL: "https://practix.com",
  },
}));

const { mockLog } = vi.hoisted(() => ({
  mockLog: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/server/lib/logger", () => ({
  createLogger: () => mockLog,
  getRequestId: () => undefined,
}));

import {
  sendCompanyStatusEmail,
  sendNewApplicationEmail,
  sendStatusUpdateEmail,
  sendPasswordResetEmail,
  sendRecommendationEmail,
  sendLoginBurstAlertEmail,
} from "@/server/lib/mail";
import { env as mockedEnv } from "@/lib/env";

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

beforeEach(() => {
  vi.restoreAllMocks();
  mockLog.warn.mockClear();
  mockLog.error.mockClear();
  mockLog.info.mockClear();
  (
    mockedEnv as {
      BREVO_API_KEY?: string;
      BREVO_SENDER_EMAIL?: string;
      NEXTAUTH_URL: string;
    }
  ).BREVO_API_KEY = "test-brevo-key";
  (
    mockedEnv as {
      BREVO_API_KEY?: string;
      BREVO_SENDER_EMAIL?: string;
      NEXTAUTH_URL: string;
    }
  ).BREVO_SENDER_EMAIL = "noreply@practix.com";
});

const okResponse = () => new Response("{}", { status: 200 });

const lastCallBody = (fetchSpy: { mock: { calls: unknown[][] } }) =>
  JSON.parse(
    (fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1][1] as RequestInit)
      .body as string,
  ) as {
    sender: { email: string; name: string };
    to: { email: string; name: string }[];
    subject: string;
    htmlContent: string;
  };

describe("sendEmail (vía sendCompanyStatusEmail) sin BREVO_API_KEY", () => {
  it("retorna sin llamar a fetch y emite warning", async () => {
    (mockedEnv as { BREVO_API_KEY?: string }).BREVO_API_KEY = undefined;
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await sendCompanyStatusEmail("e@x.com", "Empresa X", "APPROVED");

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mockLog.warn).toHaveBeenCalledWith(
      expect.stringContaining("BREVO_API_KEY no configurada"),
    );
  });
});

describe("sendEmail (request HTTP)", () => {
  it("llama a Brevo con method POST, headers y body correcto", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(okResponse());

    await sendCompanyStatusEmail("e@x.com", "Empresa", "APPROVED");

    expect(fetchSpy).toHaveBeenCalledWith(
      BREVO_URL,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "api-key": "test-brevo-key",
        }),
      }),
    );
    const body = lastCallBody(fetchSpy);
    expect(body.sender).toEqual({
      email: "noreply@practix.com",
      name: "PractiX",
    });
    expect(body.to).toEqual([{ email: "e@x.com", name: "Empresa" }]);
  });

  it("usa fallback noreply@practix.com cuando BREVO_SENDER_EMAIL es undefined", async () => {
    (mockedEnv as { BREVO_SENDER_EMAIL?: string }).BREVO_SENDER_EMAIL =
      undefined;
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(okResponse());

    await sendCompanyStatusEmail("e@x.com", "Empresa", "APPROVED");

    expect(lastCallBody(fetchSpy).sender.email).toBe("noreply@practix.com");
  });
});

describe("sendCompanyStatusEmail", () => {
  it("APPROVED → subject de bienvenida con link al dashboard empresa", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(okResponse());

    await sendCompanyStatusEmail("e@x.com", "TechCorp", "APPROVED");

    const body = lastCallBody(fetchSpy);
    expect(body.subject).toBe("¡Tu empresa fue aprobada en PractiX!");
    expect(body.htmlContent).toContain("¡Bienvenida, TechCorp!");
    expect(body.htmlContent).toContain("https://practix.com/dashboard/empresa");
  });

  it("REJECTED → subject neutro y soporte@practix.cl", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(okResponse());

    await sendCompanyStatusEmail("e@x.com", "TechCorp", "REJECTED");

    const body = lastCallBody(fetchSpy);
    expect(body.subject).toBe("Actualización sobre tu cuenta en PractiX");
    expect(body.htmlContent).toContain("Hola TechCorp");
    expect(body.htmlContent).toContain("soporte@practix.cl");
  });

  it("SUSPENDED con reason → subject de suspensión + bloque Motivo + reason escapado + soporte", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(okResponse());

    await sendCompanyStatusEmail(
      "e@x.com",
      "TechCorp",
      "SUSPENDED",
      "Publicaciones fuera de norma",
    );

    const body = lastCallBody(fetchSpy);
    expect(body.subject).toBe("Tu cuenta de PractiX fue suspendida");
    expect(body.htmlContent).toContain("Hola TechCorp");
    expect(body.htmlContent).toContain("suspendida");
    expect(body.htmlContent).toContain("Motivo");
    expect(body.htmlContent).toContain("Publicaciones fuera de norma");
    expect(body.htmlContent).toContain("soporte@practix.cl");
  });

  it("SUSPENDED sin reason → bloque Motivo con texto fallback genérico", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(okResponse());

    await sendCompanyStatusEmail("e@x.com", "TechCorp", "SUSPENDED");

    const body = lastCallBody(fetchSpy);
    expect(body.subject).toBe("Tu cuenta de PractiX fue suspendida");
    expect(body.htmlContent).toContain("Motivo");
    expect(body.htmlContent).toContain(
      "El administrador no especificó un motivo",
    );
  });

  it("companyName con < > & queda HTML-escapeado en el body", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(okResponse());

    await sendCompanyStatusEmail(
      "e@x.com",
      "<script>alert(1)</script> & Co",
      "APPROVED",
    );

    const body = lastCallBody(fetchSpy);
    expect(body.htmlContent).not.toContain("<script>alert(1)</script>");
    expect(body.htmlContent).toContain(
      "&lt;script&gt;alert(1)&lt;/script&gt; &amp; Co",
    );
  });
});

describe("sendNewApplicationEmail", () => {
  it("subject incluye el título de la práctica y el cuerpo nombra al estudiante", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(okResponse());

    await sendNewApplicationEmail(
      "empresa@x.com",
      "TechCorp",
      "Juan Pérez",
      "Backend Intern",
    );

    const body = lastCallBody(fetchSpy);
    expect(body.subject).toBe("Nueva postulación: Backend Intern");
    expect(body.htmlContent).toContain("Juan Pérez");
    expect(body.htmlContent).toContain("Backend Intern");
    expect(body.htmlContent).toContain("https://practix.com/dashboard");
  });
});

describe("sendStatusUpdateEmail", () => {
  it.each([
    ["REVIEWED", "Tu postulación está siendo revisada"],
    ["ACCEPTED", "¡Felicitaciones! Tu postulación fue aceptada"],
    ["REJECTED", "Tu postulación no fue seleccionada esta vez"],
  ])("status %s → mensaje correspondiente en el body", async (status, msg) => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(okResponse());

    await sendStatusUpdateEmail("e@x.com", "Juan", "Backend Intern", status);

    expect(lastCallBody(fetchSpy).htmlContent).toContain(msg);
  });

  it("status desconocido → fallback con prefijo 'Estado actualizado:'", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(okResponse());

    await sendStatusUpdateEmail("e@x.com", "Juan", "Backend Intern", "FOO");

    expect(lastCallBody(fetchSpy).htmlContent).toContain(
      "Estado actualizado: FOO",
    );
  });

  it("subject incluye el título de la práctica", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(okResponse());

    await sendStatusUpdateEmail(
      "e@x.com",
      "Juan",
      "Frontend Intern",
      "ACCEPTED",
    );

    expect(lastCallBody(fetchSpy).subject).toBe(
      "Actualización: Frontend Intern",
    );
  });
});

describe("sendPasswordResetEmail", () => {
  it("incluye el resetUrl como href del CTA y subject de reset", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(okResponse());
    const resetUrl = "https://practix.com/reset?token=abc123";

    await sendPasswordResetEmail("e@x.com", "TechCorp", resetUrl);

    const body = lastCallBody(fetchSpy);
    expect(body.subject).toBe("Restablecer contraseña — PractiX");
    expect(body.htmlContent).toContain(resetUrl);
    expect(body.htmlContent).toContain("válido por <strong>1 hora</strong>");
  });
});

describe("sendRecommendationEmail", () => {
  it("subject y body muestran el matchScore como % de afinidad", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(okResponse());

    await sendRecommendationEmail("e@x.com", "Juan", "Backend Intern", 87);

    const body = lastCallBody(fetchSpy);
    expect(body.subject).toBe("Práctica con 87% de afinidad para ti");
    expect(body.htmlContent).toContain("87% de afinidad");
    expect(body.htmlContent).toContain("Backend Intern");
  });
});

describe("sendLoginBurstAlertEmail", () => {
  it("envía email de alerta con asunto de seguridad y URL de reset", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(okResponse());

    await sendLoginBurstAlertEmail("user@x.com", "María");

    const body = lastCallBody(fetchSpy);
    expect(body.subject).toBe(
      "Varios intentos de inicio de sesión en tu cuenta PractiX",
    );
    expect(body.to[0].email).toBe("user@x.com");
    expect(body.htmlContent).toContain("María");
    expect(body.htmlContent).toContain("Restablecer contraseña");
  });

  it("incluye la URL de reset apuntando a /forgot-password", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(okResponse());

    await sendLoginBurstAlertEmail("u@x.com", "Pedro");

    const body = lastCallBody(fetchSpy);
    expect(body.htmlContent).toContain("/forgot-password");
  });
});
