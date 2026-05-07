// @vitest-environment node
// adm-zip usa Buffer nativo de Node — jsdom no maneja correctamente la
// serialización ZIP, los entries quedan vacíos al releer el buffer.
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import AdmZip from "adm-zip";

import { prismaMock, resetPrismaMock } from "@/test/mocks/prisma";
import { exportUserData } from "@/server/services/data-export.service";

const baseStudent = {
  id: "user-1",
  email: "estudiante@example.com",
  name: "Juan",
  lastName: "Pérez",
  rut: "12345678-9",
  phone: "+56912345678",
  role: "STUDENT",
  image: null,
  provider: "google",
  providerId: "google-123",
  passwordHash: "$2a$10$shouldNeverAppear",
  resetToken: "secret-reset-token",
  resetTokenExp: null,
  consentAcceptedAt: new Date("2026-05-07T10:00:00Z"),
  consentVersion: "2026-05-07",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-05-07T10:00:00Z"),
  studentProfile: {
    id: "sp-1",
    userId: "user-1",
    university: "PUC",
    career: "Computer Science",
    semester: 8,
    skills: ["TypeScript", "React"],
    bio: "Estudiante apasionado",
    cvUrl: null,
    cvText: null,
    cvParsed: null,
    embedding: [],
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-05-07T10:00:00Z"),
  },
  companyProfile: null,
  applications: [
    {
      id: "app-1",
      studentId: "user-1",
      internshipId: "int-1",
      status: "PENDING",
      matchScore: 85.5,
      coverLetter: "Hola",
      atsScore: null,
      moduleScores: null,
      passedFilters: true,
      filterReason: null,
      pipelineStatus: "PENDING",
      createdAt: new Date("2026-04-15T00:00:00Z"),
      updatedAt: new Date("2026-04-15T00:00:00Z"),
      internship: {
        id: "int-1",
        title: "Practicante Frontend",
        area: "tech",
        location: "Santiago",
        modality: "REMOTE",
      },
    },
  ],
  companyConversations: [],
  studentConversations: [
    {
      id: "conv-1",
      companyId: "company-99",
      studentId: "user-1",
      applicationId: "app-1",
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [
        {
          id: "msg-1",
          conversationId: "conv-1",
          senderId: "company-99",
          content: "Hola, nos interesa tu perfil",
          type: "TEXT",
          metadata: null,
          isRead: true,
          createdAt: new Date("2026-04-20T00:00:00Z"),
        },
      ],
    },
  ],
  companyInterviews: [],
  studentInterviews: [],
  notifications: [
    {
      id: "notif-1",
      userId: "user-1",
      type: "APPLICATION_REVIEWED",
      title: "Tu postulación está en revisión",
      body: "...",
      read: false,
      entityId: "app-1",
      createdAt: new Date(),
    },
  ],
};

function readZip(buffer: Buffer) {
  const zip = new AdmZip(buffer);
  const entries: Record<string, string | Buffer> = {};
  for (const entry of zip.getEntries()) {
    if (entry.entryName.match(/\.(json|md)$/)) {
      entries[entry.entryName] = entry.getData().toString("utf-8");
    } else {
      entries[entry.entryName] = entry.getData();
    }
  }
  return entries;
}

describe("exportUserData — happy path estudiante", () => {
  beforeEach(() => resetPrismaMock());

  it("retorna un ZIP con filename + byteLength", async () => {
    prismaMock.user.findUnique.mockResolvedValue(baseStudent);
    const result = await exportUserData("user-1");
    expect(result.filename).toContain("practix-mis-datos-user-1");
    expect(result.filename.endsWith(".zip")).toBe(true);
    expect(result.byteLength).toBe(result.zip.byteLength);
    expect(result.byteLength).toBeGreaterThan(0);
  });

  it("incluye los 6 archivos JSON + README en el ZIP", async () => {
    prismaMock.user.findUnique.mockResolvedValue(baseStudent);
    const result = await exportUserData("user-1");
    const entries = readZip(result.zip);
    expect(Object.keys(entries).sort()).toEqual([
      "README.md",
      "applications.json",
      "conversations.json",
      "interviews.json",
      "notifications.json",
      "profile.json",
      "user.json",
    ]);
  });

  it("user.json NO incluye passwordHash ni resetToken", async () => {
    prismaMock.user.findUnique.mockResolvedValue(baseStudent);
    const result = await exportUserData("user-1");
    const entries = readZip(result.zip);
    const userJson = entries["user.json"] as string;
    expect(userJson).not.toContain("$2a$10$");
    expect(userJson).not.toContain("secret-reset-token");
    expect(userJson).not.toContain("passwordHash");
    expect(userJson).not.toContain("resetToken");
  });

  it("user.json incluye consentAcceptedAt y consentVersion", async () => {
    prismaMock.user.findUnique.mockResolvedValue(baseStudent);
    const result = await exportUserData("user-1");
    const entries = readZip(result.zip);
    const parsed = JSON.parse(entries["user.json"] as string);
    expect(parsed.consentVersion).toBe("2026-05-07");
    expect(parsed.consentAcceptedAt).toBeTruthy();
  });

  it("profile.json contiene el StudentProfile cuando es estudiante", async () => {
    prismaMock.user.findUnique.mockResolvedValue(baseStudent);
    const result = await exportUserData("user-1");
    const entries = readZip(result.zip);
    const parsed = JSON.parse(entries["profile.json"] as string);
    expect(parsed.university).toBe("PUC");
    expect(parsed.skills).toEqual(["TypeScript", "React"]);
  });

  it("applications.json incluye la postulación con datos de la práctica", async () => {
    prismaMock.user.findUnique.mockResolvedValue(baseStudent);
    const result = await exportUserData("user-1");
    const entries = readZip(result.zip);
    const parsed = JSON.parse(entries["applications.json"] as string);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].internship.title).toBe("Practicante Frontend");
    expect(parsed[0].matchScore).toBe(85.5);
  });

  it("conversations.json combina companyConversations + studentConversations", async () => {
    prismaMock.user.findUnique.mockResolvedValue(baseStudent);
    const result = await exportUserData("user-1");
    const entries = readZip(result.zip);
    const parsed = JSON.parse(entries["conversations.json"] as string);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].messages[0].content).toBe("Hola, nos interesa tu perfil");
  });

  it("README incluye timestamp ISO y descripción de archivos", async () => {
    prismaMock.user.findUnique.mockResolvedValue(baseStudent);
    const result = await exportUserData("user-1");
    const entries = readZip(result.zip);
    const readme = entries["README.md"] as string;
    expect(readme).toContain("Tus datos personales en PractiX");
    expect(readme).toMatch(/Generado: \d{4}-\d{2}-\d{2}T/);
    expect(readme).toContain("APDP");
  });
});

describe("exportUserData — CV", () => {
  beforeEach(() => resetPrismaMock());
  afterEach(() => vi.unstubAllGlobals());

  it("incluye cv.<ext> cuando hay cvUrl y fetch resuelve OK", async () => {
    const studentWithCv = {
      ...baseStudent,
      studentProfile: {
        ...baseStudent.studentProfile!,
        cvUrl: "https://storage.supabase.co/cvs/user-1/123456-mi-cv.pdf",
      },
    };
    prismaMock.user.findUnique.mockResolvedValue(studentWithCv);

    // Buffer.from(...) puede compartir el ArrayBuffer pool de Node — al pasarlo
    // a addFile el CRC se corrompe. Aislamos con slice() para tener un AB propio.
    const fakePdf = Buffer.from("%PDF-1.4 fake content");
    const fakePdfAB = fakePdf.buffer.slice(
      fakePdf.byteOffset,
      fakePdf.byteOffset + fakePdf.byteLength,
    );
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(fakePdfAB),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await exportUserData("user-1");
    const entries = readZip(result.zip);
    expect(entries["cv.pdf"]).toBeDefined();
    expect(fetchMock).toHaveBeenCalledWith(studentWithCv.studentProfile.cvUrl);
  });

  it("NO rompe si fetch del CV falla — sigue con el resto", async () => {
    const studentWithCv = {
      ...baseStudent,
      studentProfile: {
        ...baseStudent.studentProfile!,
        cvUrl: "https://example.com/cv.pdf",
      },
    };
    prismaMock.user.findUnique.mockResolvedValue(studentWithCv);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );

    const result = await exportUserData("user-1");
    const entries = readZip(result.zip);
    expect(entries["cv.pdf"]).toBeUndefined();
    // El resto SÍ debe estar
    expect(entries["user.json"]).toBeDefined();
    expect(entries["README.md"]).toBeDefined();
  });

  it("usa extensión docx cuando la URL termina en .docx", async () => {
    const studentWithCv = {
      ...baseStudent,
      studentProfile: {
        ...baseStudent.studentProfile!,
        cvUrl: "https://storage/cv.docx",
      },
    };
    prismaMock.user.findUnique.mockResolvedValue(studentWithCv);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      }),
    );

    const result = await exportUserData("user-1");
    const entries = readZip(result.zip);
    expect(entries["cv.docx"]).toBeDefined();
    expect(entries["cv.pdf"]).toBeUndefined();
  });

  it("default a pdf cuando la extensión no es reconocida", async () => {
    const studentWithCv = {
      ...baseStudent,
      studentProfile: {
        ...baseStudent.studentProfile!,
        cvUrl: "https://storage/something.xyz",
      },
    };
    prismaMock.user.findUnique.mockResolvedValue(studentWithCv);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      }),
    );

    const result = await exportUserData("user-1");
    const entries = readZip(result.zip);
    expect(entries["cv.pdf"]).toBeDefined();
  });
});

describe("exportUserData — errors", () => {
  beforeEach(() => resetPrismaMock());

  it("throws cuando el user no existe", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    await expect(exportUserData("nonexistent")).rejects.toThrow(
      "User not found",
    );
  });
});

describe("exportUserData — empresa", () => {
  beforeEach(() => resetPrismaMock());

  it("usa companyProfile en profile.json cuando es empresa", async () => {
    const company = {
      ...baseStudent,
      role: "COMPANY",
      studentProfile: null,
      companyProfile: {
        id: "cp-1",
        userId: "user-1",
        companyName: "Acme Corp",
        empresaRut: "76123456-7",
        companyStatus: "APPROVED",
        industry: "tech",
        website: "https://acme.cl",
        logo: null,
        description: "We make stuff",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
    prismaMock.user.findUnique.mockResolvedValue(company);

    const result = await exportUserData("user-1");
    const entries = readZip(result.zip);
    const parsed = JSON.parse(entries["profile.json"] as string);
    expect(parsed.companyName).toBe("Acme Corp");
    expect(parsed.empresaRut).toBe("76123456-7");
  });
});
