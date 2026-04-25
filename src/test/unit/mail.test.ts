import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: {
    BREVO_API_KEY: "test-brevo-key",
    BREVO_SENDER_EMAIL: "noreply@practix.com",
    NEXTAUTH_URL: "https://practix.com",
  },
}));

import {
  sendCompanyStatusEmail,
  sendNewApplicationEmail,
  sendStatusUpdateEmail,
  sendPasswordResetEmail,
  sendRecommendationEmail,
} from "@/server/lib/mail";
import { env as mockedEnv } from "@/lib/env";

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
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

const lastCallBody = (
  fetchSpy: ReturnType<typeof vi.spyOn<typeof globalThis, "fetch">>,
) =>
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
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await sendCompanyStatusEmail("e@x.com", "Empresa X", "APPROVED");

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
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
