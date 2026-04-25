import { describe, it, expect } from "vitest";
import {
  registrationSchema,
  registerSchema,
  studentProfileSchema,
  companyProfileSchema,
  createInternshipSchema,
  filterInternshipSchema,
  applySchema,
  updateStatusSchema,
  companyRegisterSchema,
  companyLoginSchema,
  normalizarRUT,
} from "@/server/validators";

// RUT chileno válido conocido (cuerpo 12345678, dv calculado = 5)
const RUT_VALIDO = "12345678-5";
const RUT_INVALIDO = "12345678-9";
const TEL_VALIDO = "+56912345678";
const TEL_VALIDO_SIN_PREFIJO = "912345678";

describe("normalizarRUT", () => {
  it("normaliza con punto y guión", () => {
    expect(normalizarRUT("12.345.678-5")).toBe("12345678-5");
  });

  it("agrega guión cuando viene sin separador", () => {
    expect(normalizarRUT("123456785")).toBe("12345678-5");
  });

  it("convierte K minúscula a mayúscula", () => {
    expect(normalizarRUT("1234567-k")).toBe("1234567-K");
  });

  it("retorna el input original si no matchea el formato", () => {
    expect(normalizarRUT("invalid-rut")).toBe("invalid-rut");
  });

  it("acepta RUT con espacios y los limpia", () => {
    expect(normalizarRUT("12 345 678-5")).toBe("12345678-5");
  });
});

describe("registrationSchema", () => {
  const baseValid = {
    name: "Juan",
    lastName: "Pérez",
    rut: RUT_VALIDO,
    documentType: "rut" as const,
    phone: TEL_VALIDO,
  };

  it("acepta un registro válido con RUT", () => {
    expect(registrationSchema.safeParse(baseValid).success).toBe(true);
  });

  it("aplica default 'rut' cuando no se especifica documentType", () => {
    const { documentType, ...rest } = baseValid;
    void documentType;
    const parsed = registrationSchema.parse(rest);
    expect(parsed.documentType).toBe("rut");
  });

  it("rechaza name menor a 2 caracteres", () => {
    const result = registrationSchema.safeParse({ ...baseValid, name: "J" });
    expect(result.success).toBe(false);
  });

  it("rechaza lastName menor a 2 caracteres", () => {
    const result = registrationSchema.safeParse({
      ...baseValid,
      lastName: "P",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza RUT chileno inválido (dv erróneo)", () => {
    const result = registrationSchema.safeParse({
      ...baseValid,
      rut: RUT_INVALIDO,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (i) => i.path[0] === "rut" && i.message.includes("RUT chileno"),
        ),
      ).toBe(true);
    }
  });

  it("rechaza RUT con formato totalmente inválido", () => {
    expect(
      registrationSchema.safeParse({ ...baseValid, rut: "abc" }).success,
    ).toBe(false);
  });

  it("acepta passport válido (alfanumérico 6-20)", () => {
    const result = registrationSchema.safeParse({
      ...baseValid,
      documentType: "passport",
      rut: "AB123456",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza passport con menos de 6 caracteres", () => {
    const result = registrationSchema.safeParse({
      ...baseValid,
      documentType: "passport",
      rut: "AB12",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza passport con caracteres no alfanuméricos", () => {
    const result = registrationSchema.safeParse({
      ...baseValid,
      documentType: "passport",
      rut: "AB-1234",
    });
    expect(result.success).toBe(false);
  });

  it("acepta teléfono sin prefijo +56", () => {
    expect(
      registrationSchema.safeParse({
        ...baseValid,
        phone: TEL_VALIDO_SIN_PREFIJO,
      }).success,
    ).toBe(true);
  });

  it("acepta teléfono con espacios y guiones (los limpia)", () => {
    expect(
      registrationSchema.safeParse({
        ...baseValid,
        phone: "+56 9 1234-5678",
      }).success,
    ).toBe(true);
  });

  it("rechaza teléfono que no arranca en 9", () => {
    const result = registrationSchema.safeParse({
      ...baseValid,
      phone: "+56812345678",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza teléfono con cantidad incorrecta de dígitos", () => {
    expect(
      registrationSchema.safeParse({ ...baseValid, phone: "+5691234" }).success,
    ).toBe(false);
  });
});

describe("registerSchema", () => {
  it("acepta un registro mínimo válido", () => {
    expect(
      registerSchema.safeParse({
        email: "a@b.com",
        name: "Juan",
        role: "STUDENT",
      }).success,
    ).toBe(true);
  });

  it("acepta provider, providerId e image opcionales", () => {
    expect(
      registerSchema.safeParse({
        email: "a@b.com",
        name: "Juan",
        role: "COMPANY",
        provider: "google",
        providerId: "abc-123",
        image: "https://x.com/avatar.png",
      }).success,
    ).toBe(true);
  });

  it("rechaza email inválido", () => {
    expect(
      registerSchema.safeParse({
        email: "no-es-email",
        name: "Juan",
        role: "STUDENT",
      }).success,
    ).toBe(false);
  });

  it("rechaza role no enumerado", () => {
    expect(
      registerSchema.safeParse({
        email: "a@b.com",
        name: "Juan",
        role: "ADMIN",
      }).success,
    ).toBe(false);
  });

  it("rechaza image que no sea URL válida", () => {
    expect(
      registerSchema.safeParse({
        email: "a@b.com",
        name: "Juan",
        role: "STUDENT",
        image: "not-a-url",
      }).success,
    ).toBe(false);
  });
});

describe("studentProfileSchema", () => {
  it("acepta objeto vacío (todos los campos opcionales)", () => {
    expect(studentProfileSchema.safeParse({}).success).toBe(true);
  });

  it("acepta semester entre 1 y 16", () => {
    expect(studentProfileSchema.safeParse({ semester: 8 }).success).toBe(true);
  });

  it("rechaza semester < 1", () => {
    expect(studentProfileSchema.safeParse({ semester: 0 }).success).toBe(false);
  });

  it("rechaza semester > 16", () => {
    expect(studentProfileSchema.safeParse({ semester: 17 }).success).toBe(
      false,
    );
  });

  it("rechaza semester no entero", () => {
    expect(studentProfileSchema.safeParse({ semester: 3.5 }).success).toBe(
      false,
    );
  });

  it("rechaza bio mayor a 500 caracteres", () => {
    expect(
      studentProfileSchema.safeParse({ bio: "x".repeat(501) }).success,
    ).toBe(false);
  });
});

describe("companyProfileSchema", () => {
  it("acepta payload mínimo con companyName", () => {
    expect(
      companyProfileSchema.safeParse({ companyName: "Acme" }).success,
    ).toBe(true);
  });

  it("rechaza companyName menor a 2 caracteres", () => {
    expect(companyProfileSchema.safeParse({ companyName: "A" }).success).toBe(
      false,
    );
  });

  it("rechaza website que no sea URL", () => {
    expect(
      companyProfileSchema.safeParse({
        companyName: "Acme",
        website: "no-url",
      }).success,
    ).toBe(false);
  });

  it("rechaza description mayor a 1000 caracteres", () => {
    expect(
      companyProfileSchema.safeParse({
        companyName: "Acme",
        description: "x".repeat(1001),
      }).success,
    ).toBe(false);
  });
});

describe("createInternshipSchema", () => {
  const valid = {
    title: "Backend Intern",
    description: "Trabajarás en una API REST con Node.js y PostgreSQL",
    area: "Backend",
    location: "Santiago",
    modality: "REMOTE" as const,
    duration: "3 meses",
    requirements: ["Node.js"],
    skills: ["TypeScript"],
  };

  it("acepta payload válido", () => {
    expect(createInternshipSchema.safeParse(valid).success).toBe(true);
  });

  it("rechaza title menor a 3 caracteres", () => {
    expect(
      createInternshipSchema.safeParse({ ...valid, title: "AB" }).success,
    ).toBe(false);
  });

  it("rechaza description menor a 20 caracteres", () => {
    expect(
      createInternshipSchema.safeParse({ ...valid, description: "corta" })
        .success,
    ).toBe(false);
  });

  it("rechaza modality no enumerado", () => {
    expect(
      createInternshipSchema.safeParse({ ...valid, modality: "FULLTIME" })
        .success,
    ).toBe(false);
  });

  it.each(["REMOTE", "ONSITE", "HYBRID"])("acepta modality %s", (m) => {
    expect(
      createInternshipSchema.safeParse({ ...valid, modality: m }).success,
    ).toBe(true);
  });
});

describe("filterInternshipSchema", () => {
  it("aplica defaults page=1 y limit=12", () => {
    const parsed = filterInternshipSchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(12);
  });

  it("coerciona page string a number", () => {
    expect(filterInternshipSchema.parse({ page: "3" }).page).toBe(3);
  });

  it("coerciona limit string a number", () => {
    expect(filterInternshipSchema.parse({ limit: "25" }).limit).toBe(25);
  });

  it("rechaza limit > 50", () => {
    expect(filterInternshipSchema.safeParse({ limit: 51 }).success).toBe(false);
  });

  it("rechaza page < 1", () => {
    expect(filterInternshipSchema.safeParse({ page: 0 }).success).toBe(false);
  });

  it("acepta filtros opcionales (area, search, location)", () => {
    const result = filterInternshipSchema.parse({
      area: "Backend",
      location: "Santiago",
      search: "node",
    });
    expect(result.area).toBe("Backend");
    expect(result.search).toBe("node");
  });
});

describe("applySchema", () => {
  it("acepta internshipId obligatorio", () => {
    expect(applySchema.safeParse({ internshipId: "abc" }).success).toBe(true);
  });

  it("rechaza coverLetter > 2000 caracteres", () => {
    expect(
      applySchema.safeParse({
        internshipId: "abc",
        coverLetter: "x".repeat(2001),
      }).success,
    ).toBe(false);
  });

  it("falla sin internshipId", () => {
    expect(applySchema.safeParse({}).success).toBe(false);
  });
});

describe("updateStatusSchema", () => {
  it.each(["REVIEWED", "ACCEPTED", "REJECTED"])("acepta status %s", (s) => {
    expect(updateStatusSchema.safeParse({ status: s }).success).toBe(true);
  });

  it("rechaza status PENDING o uno fuera del enum", () => {
    expect(updateStatusSchema.safeParse({ status: "PENDING" }).success).toBe(
      false,
    );
  });
});

describe("companyRegisterSchema", () => {
  const baseValid = {
    name: "Juan",
    lastName: "Pérez",
    phone: TEL_VALIDO,
    companyName: "Acme",
    empresaRut: RUT_VALIDO,
    documentType: "rut" as const,
    email: "ceo@acme.cl",
    password: "Aa1!aaaa",
    confirmPassword: "Aa1!aaaa",
    allowGenericEmail: false,
  };

  it("acepta registro corporativo válido", () => {
    expect(companyRegisterSchema.safeParse(baseValid).success).toBe(true);
  });

  it("rechaza password sin mayúscula", () => {
    expect(
      companyRegisterSchema.safeParse({
        ...baseValid,
        password: "aa1!aaaa",
        confirmPassword: "aa1!aaaa",
      }).success,
    ).toBe(false);
  });

  it("rechaza password sin minúscula", () => {
    expect(
      companyRegisterSchema.safeParse({
        ...baseValid,
        password: "AA1!AAAA",
        confirmPassword: "AA1!AAAA",
      }).success,
    ).toBe(false);
  });

  it("rechaza password sin número", () => {
    expect(
      companyRegisterSchema.safeParse({
        ...baseValid,
        password: "Aaaa!aaa",
        confirmPassword: "Aaaa!aaa",
      }).success,
    ).toBe(false);
  });

  it("rechaza password sin símbolo", () => {
    expect(
      companyRegisterSchema.safeParse({
        ...baseValid,
        password: "Aa1aaaaa",
        confirmPassword: "Aa1aaaaa",
      }).success,
    ).toBe(false);
  });

  it("rechaza password menor a 8 caracteres", () => {
    expect(
      companyRegisterSchema.safeParse({
        ...baseValid,
        password: "Aa1!a",
        confirmPassword: "Aa1!a",
      }).success,
    ).toBe(false);
  });

  it("rechaza cuando password y confirmPassword no coinciden", () => {
    const result = companyRegisterSchema.safeParse({
      ...baseValid,
      confirmPassword: "Bb2@bbbb",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (i) =>
            i.path[0] === "confirmPassword" &&
            i.message.includes("no coinciden"),
        ),
      ).toBe(true);
    }
  });

  it("rechaza email gmail.com cuando allowGenericEmail=false", () => {
    const result = companyRegisterSchema.safeParse({
      ...baseValid,
      email: "ceo@gmail.com",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (i) =>
            i.path[0] === "email" && i.message.includes("correo corporativo"),
        ),
      ).toBe(true);
    }
  });

  it("acepta email gmail.com cuando allowGenericEmail=true", () => {
    expect(
      companyRegisterSchema.safeParse({
        ...baseValid,
        email: "ceo@gmail.com",
        allowGenericEmail: true,
      }).success,
    ).toBe(true);
  });

  it.each(["hotmail.com", "yahoo.com", "outlook.com", "live.com"])(
    "rechaza dominio bloqueado %s sin allowGenericEmail",
    (domain) => {
      const result = companyRegisterSchema.safeParse({
        ...baseValid,
        email: `ceo@${domain}`,
      });
      expect(result.success).toBe(false);
    },
  );

  it("rechaza RUT empresa inválido", () => {
    expect(
      companyRegisterSchema.safeParse({
        ...baseValid,
        empresaRut: RUT_INVALIDO,
      }).success,
    ).toBe(false);
  });

  it("acepta DNI passport con documentType=passport", () => {
    expect(
      companyRegisterSchema.safeParse({
        ...baseValid,
        documentType: "passport",
        empresaRut: "ABC123456",
      }).success,
    ).toBe(true);
  });

  it("rechaza DNI passport demasiado corto", () => {
    expect(
      companyRegisterSchema.safeParse({
        ...baseValid,
        documentType: "passport",
        empresaRut: "AB12",
      }).success,
    ).toBe(false);
  });

  it("acepta website empty string (cobertura del .or(literal(''))) ", () => {
    expect(
      companyRegisterSchema.safeParse({
        ...baseValid,
        website: "",
      }).success,
    ).toBe(true);
  });

  it("acepta website URL válida", () => {
    expect(
      companyRegisterSchema.safeParse({
        ...baseValid,
        website: "https://acme.cl",
      }).success,
    ).toBe(true);
  });

  it("rechaza website sin https", () => {
    expect(
      companyRegisterSchema.safeParse({
        ...baseValid,
        website: "no-url",
      }).success,
    ).toBe(false);
  });

  it("aplica default allowGenericEmail=false cuando no se especifica", () => {
    const { allowGenericEmail, ...rest } = baseValid;
    void allowGenericEmail;
    const parsed = companyRegisterSchema.parse(rest);
    expect(parsed.allowGenericEmail).toBe(false);
  });
});

describe("companyLoginSchema", () => {
  it("acepta email + password no vacíos", () => {
    expect(
      companyLoginSchema.safeParse({
        email: "ceo@acme.cl",
        password: "x",
      }).success,
    ).toBe(true);
  });

  it("rechaza email inválido", () => {
    expect(
      companyLoginSchema.safeParse({
        email: "no-es-email",
        password: "x",
      }).success,
    ).toBe(false);
  });

  it("rechaza password vacío", () => {
    expect(
      companyLoginSchema.safeParse({
        email: "ceo@acme.cl",
        password: "",
      }).success,
    ).toBe(false);
  });
});
