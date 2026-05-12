import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { config } from "dotenv";
import { hashSync } from "bcryptjs";

config({ path: ".env.local" });

// Password de empresas seed para E2E con credentials login.
// Cumple las reglas del registro: 8+ chars, mayúscula, minúscula, número, símbolo.
const SEED_COMPANY_PASSWORD = "Test1234!";
const SEED_COMPANY_PASSWORD_HASH = hashSync(SEED_COMPANY_PASSWORD, 12);

const rawUrl = new URL(process.env.DATABASE_URL!);
rawUrl.searchParams.delete("sslmode");

const pool = new Pool({
  connectionString: rawUrl.toString(),
  ssl: { rejectUnauthorized: false },
});

const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// Modelo de embeddings — debe coincidir con src/server/lib/embeddings.ts.
// Si lo cambian acá, también cambialo allá (o re-generan los embeddings con `pnpm db:reindex --all`).
const HUGGINGFACE_URL =
  "https://router.huggingface.co/hf-inference/models/BAAI/bge-small-en-v1.5";

// Delay entre llamadas para no triggerar rate limit del free tier de HF.
const HF_DELAY_MS = 250;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    console.warn(
      "  ⚠ HUGGINGFACE_API_KEY no configurada — el embedding queda vacío",
    );
    return [];
  }
  try {
    const res = await fetch(HUGGINGFACE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: text.slice(0, 2000) }),
    });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 200);
      console.warn(`  ⚠ HF ${res.status}: ${body}`);
      return [];
    }
    const result = await res.json();
    const embedding: number[] = Array.isArray(result[0]) ? result[0] : result;
    return embedding;
  } catch (err) {
    console.warn(
      `  ⚠ HF error: ${err instanceof Error ? err.message : String(err)}`,
    );
    return [];
  }
}

async function main() {
  // Empresas
  const techcorp = await prisma.user.upsert({
    where: { email: "techcorp@example.com" },
    update: { passwordHash: SEED_COMPANY_PASSWORD_HASH },
    create: {
      email: "techcorp@example.com",
      name: "TechCorp",
      role: "COMPANY",
      passwordHash: SEED_COMPANY_PASSWORD_HASH,
      companyProfile: {
        create: {
          companyName: "TechCorp",
          companyStatus: "APPROVED",
          industry: "Tecnología",
          website: "https://techcorp.cl",
        },
      },
    },
    include: { companyProfile: true },
  });

  const startupx = await prisma.user.upsert({
    where: { email: "startupx@example.com" },
    update: { passwordHash: SEED_COMPANY_PASSWORD_HASH },
    create: {
      email: "startupx@example.com",
      name: "StartupX",
      role: "COMPANY",
      passwordHash: SEED_COMPANY_PASSWORD_HASH,
      companyProfile: {
        create: {
          companyName: "StartupX",
          companyStatus: "APPROVED",
          industry: "Fintech",
          website: "https://startupx.cl",
        },
      },
    },
    include: { companyProfile: true },
  });

  // Estudiante
  await prisma.user.upsert({
    where: { email: "maria.garcia@example.com" },
    update: {},
    create: {
      email: "maria.garcia@example.com",
      name: "María García",
      role: "STUDENT",
      studentProfile: {
        create: {
          university: "Universidad de Chile",
          career: "Ingeniería Informática",
          skills: ["React", "TypeScript", "Node.js", "Python"],
        },
      },
    },
  });

  console.log("✓ Usuarios creados");

  const techcorpId = techcorp.companyProfile!.id;
  const startupxId = startupx.companyProfile!.id;

  const internshipsData = [
    {
      id: "seed-int-1",
      companyId: techcorpId,
      title: "Practicante Desarrollo Web Frontend",
      description:
        "Desarrollarás interfaces modernas usando React y TypeScript. Trabajarás junto a un equipo de producto en funcionalidades reales para usuarios finales.",
      area: "Ingeniería",
      location: "Santiago",
      modality: "REMOTE" as const,
      duration: "3 meses",
      responsibilities: [
        "Construir componentes React reutilizables para el design system",
        "Maquetar nuevas vistas en TypeScript siguiendo specs de Figma",
        "Conectar la UI con APIs internas usando React Query",
        "Participar en revisiones de código y QA manual con el equipo",
        "Documentar componentes en Storybook para escalar el sistema",
      ],
      requirements: [
        "Estudiante de último año de carrera afín",
        "Conocimientos básicos de Git",
      ],
      skills: ["React", "TypeScript", "TailwindCSS"],
    },
    {
      id: "seed-int-2",
      companyId: techcorpId,
      title: "Practicante Data Science",
      description:
        "Analizarás grandes volúmenes de datos para extraer insights de negocio. Aplicarás modelos de machine learning en datasets reales de la empresa.",
      area: "Datos",
      location: "Santiago",
      modality: "HYBRID" as const,
      duration: "6 meses",
      responsibilities: [
        "Escribir queries SQL sobre el data warehouse para responder preguntas de negocio",
        "Construir dashboards en herramientas BI para 3 squads de producto",
        "Hacer análisis ad-hoc: A/B tests, cohortes y funnels de conversión",
        "Entrenar modelos básicos de ML para problemas de clasificación y regresión",
        "Documentar metodologías en Notion para escalar el conocimiento",
      ],
      requirements: ["Conocimientos en Python y estadística", "Manejo de SQL"],
      skills: ["Python", "SQL", "Pandas", "Machine Learning"],
    },
    {
      id: "seed-int-3",
      companyId: techcorpId,
      title: "Practicante UX/UI Design",
      description:
        "Diseñarás flujos de usuario y prototipos interactivos para nuestros productos digitales. Participarás en sesiones de investigación con usuarios reales.",
      area: "Diseño",
      location: "Valparaíso",
      modality: "ONSITE" as const,
      duration: "3 meses",
      responsibilities: [
        "Diseñar flujos de usuario y wireframes para nuevas features",
        "Prototipar interacciones en Figma para validar con usuarios reales",
        "Conducir entrevistas y tests de usabilidad con clientes",
        "Mantener y evolucionar el design system del producto",
        "Trabajar en duplas con frontend para entregar diseños implementables",
      ],
      requirements: ["Portfolio de proyectos", "Manejo de Figma"],
      skills: ["Figma", "Adobe XD", "Prototyping"],
    },
    {
      id: "seed-int-4",
      companyId: startupxId,
      title: "Practicante Marketing Digital",
      description:
        "Gestionarás campañas de performance marketing en Google y Meta. Analizarás métricas y propondrás optimizaciones para mejorar el ROI.",
      area: "Marketing",
      location: "Santiago",
      modality: "REMOTE" as const,
      duration: "3 meses",
      responsibilities: [
        "Operar campañas de performance en Google Ads y Meta Ads",
        "Analizar métricas semanales y proponer optimizaciones de ROI",
        "Diseñar tests A/B de creatividades, audiencias y copies",
        "Generar reportes ejecutivos para el equipo de marketing",
        "Coordinar con diseño y contenidos para producir piezas nuevas",
      ],
      requirements: [
        "Conocimientos básicos de marketing digital",
        "Excel intermedio",
      ],
      skills: ["Google Ads", "Meta Ads", "Analytics", "SEO"],
    },
    {
      id: "seed-int-5",
      companyId: startupxId,
      title: "Practicante Backend Engineer",
      description:
        "Desarrollarás APIs REST para nuestra plataforma de pagos. Trabajarás con arquitectura de microservicios y bases de datos PostgreSQL.",
      area: "Ingeniería",
      location: "Concepción",
      modality: "REMOTE" as const,
      duration: "6 meses",
      responsibilities: [
        "Desarrollar endpoints REST para la plataforma de pagos en Node.js",
        "Diseñar y migrar esquemas en PostgreSQL con foco en performance",
        "Escribir tests unitarios e integración para nuevas rutas",
        "Empaquetar servicios en Docker y desplegar en ambientes de staging",
        "Investigar y corregir incidentes en producción junto a oncall",
      ],
      requirements: [
        "Conocimientos en Node.js o similar",
        "Fundamentos de bases de datos",
      ],
      skills: ["Node.js", "PostgreSQL", "Docker", "APIs REST"],
    },
    {
      id: "seed-int-6",
      companyId: startupxId,
      title: "Practicante Finanzas",
      description:
        "Apoyarás al equipo de finanzas en el análisis de estados financieros y proyecciones. Automatizarás reportes usando Python y Excel avanzado.",
      area: "Finanzas",
      location: "Santiago",
      modality: "ONSITE" as const,
      duration: "3 meses",
      responsibilities: [
        "Apoyar el cierre mensual de estados financieros y conciliaciones",
        "Construir proyecciones de cash-flow con escenarios optimista/base/pesimista",
        "Automatizar reportes recurrentes en Python para reducir trabajo manual",
        "Mantener el control de gastos por centro de costo en Excel avanzado",
        "Presentar hallazgos al CFO en reuniones de revisión quincenal",
      ],
      requirements: [
        "Estudiante de Ingeniería Comercial o afín",
        "Excel avanzado",
      ],
      skills: ["Excel avanzado", "Python", "Análisis financiero"],
    },
  ];

  let indexed = 0;
  let unindexed = 0;
  for (const internship of internshipsData) {
    const text = `${internship.title} ${internship.description} ${internship.skills.join(" ")}`;
    const embedding = await generateEmbedding(text);
    if (embedding.length > 0) {
      indexed++;
      console.log(`  ✓ "${internship.title}" — ${embedding.length} dims`);
    } else {
      unindexed++;
      console.log(`  ✗ "${internship.title}" — embedding vacío`);
    }

    // El update incluye companyId para reparar linkage si el companyProfile cambió
    // (ej. user fue recreado y dejó companyProfile huérfano).
    await prisma.internship.upsert({
      where: { id: internship.id },
      update: {
        embedding,
        companyId: internship.companyId,
        isActive: true,
        responsibilities: internship.responsibilities,
      },
      create: { ...internship, embedding },
    });

    await sleep(HF_DELAY_MS);
  }

  console.log(
    `\n✓ ${internshipsData.length} prácticas seed creadas (${indexed} indexadas, ${unindexed} sin embedding)`,
  );
  if (unindexed > 0) {
    console.log(
      `  ⚠ ${unindexed} prácticas quedaron sin embedding. Corré 'pnpm db:reindex' cuando HF esté disponible.`,
    );
  }
  console.log(
    `✓ Empresas seed login: techcorp@example.com / startupx@example.com (password: ${SEED_COMPANY_PASSWORD})`,
  );
  console.log("Seed completado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
