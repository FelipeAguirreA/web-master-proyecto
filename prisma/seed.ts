import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { config } from "dotenv";
import { hashSync } from "bcryptjs";

config({ path: ".env.local", quiet: true });

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

  const dahoteles = await prisma.user.upsert({
    where: { email: "felipe.aguirre@dahoteles.com" },
    update: { passwordHash: SEED_COMPANY_PASSWORD_HASH },
    create: {
      email: "felipe.aguirre@dahoteles.com",
      name: "Felipe",
      role: "COMPANY",
      passwordHash: SEED_COMPANY_PASSWORD_HASH,
      companyProfile: {
        create: {
          companyName: "Dahoteles",
          companyStatus: "APPROVED",
          industry: "HOTELERA",
          website: "https://www.dahoteles.com",
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
  const dahotelesId = dahoteles.companyProfile!.id;

  const internshipsData: Array<{
    id: string;
    companyId: string;
    title: string;
    description: string;
    area: string;
    location: string;
    modality: "REMOTE" | "ONSITE" | "HYBRID";
    duration: string;
    responsibilities: string[];
    requirements: string[];
    skills: string[];
    isActive?: boolean;
    deletedAt?: Date | null;
  }> = [
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
    {
      id: "cmoai4k6d0000fotxcbl9uloe",
      companyId: dahotelesId,
      title: "Practicante de Marketing Digital Hotelero",
      description:
        "Gestionarás las campañas en redes sociales y portales de reserva (Booking, Expedia), analizarás métricas de ocupación y propondrás acciones para aumentar las reservas directas del hotel.",
      area: "Marketing",
      location: "Santiago",
      modality: "HYBRID" as const,
      duration: "3 meses",
      responsibilities: [
        "Gestionar las redes sociales del hotel y el calendario de contenidos",
        "Operar campañas en Meta Ads y Google Ads orientadas a reservas",
        "Optimizar las fichas del hotel en OTAs como Booking y Expedia",
        "Analizar métricas de ocupación y conversión, y reportar resultados",
        "Proponer acciones para aumentar las reservas directas",
      ],
      requirements: [
        "Estudiante de Marketing, Publicidad o Comunicación",
        "Conocimientos de marketing digital y analítica web",
      ],
      skills: ["Redes Sociales", "Google Analytics", "SEO", "Meta Ads"],
      isActive: true,
      deletedAt: null,
    },
    {
      id: "cmnyudqki0005h0txe0ihfz5x",
      companyId: dahotelesId,
      title: "Practicante de Operaciones Hoteleras",
      description:
        "Apoyarás la planificación del mantenimiento de las instalaciones, la gestión de proveedores y la optimización de los procesos operativos del hotel.",
      area: "Ingeniería",
      location: "Pucón",
      modality: "HYBRID" as const,
      duration: "6 meses",
      responsibilities: [
        "Apoyar la planificación del mantenimiento preventivo de las instalaciones",
        "Coordinar con proveedores y dar seguimiento a las órdenes de servicio",
        "Levantar y documentar los procesos operativos del hotel",
        "Proponer mejoras de eficiencia en las áreas de operación",
        "Elaborar reportes de indicadores operativos para la gerencia",
      ],
      requirements: [
        "Estudiante de Ingeniería Industrial, Civil o afín",
        "Manejo de Excel y orientación a la mejora de procesos",
      ],
      skills: ["Gestión de proyectos", "Excel", "Operaciones"],
      isActive: true,
      deletedAt: null,
    },
    {
      id: "cmpbnbx9q0000estxra24gzik",
      companyId: dahotelesId,
      title: "Practicante de Data Analytics y Revenue",
      description:
        "Analizarás datos de ocupación, tarifas y demanda para apoyar las decisiones de revenue management. Construirás dashboards con los indicadores clave del hotel.",
      area: "Datos",
      location: "Santiago",
      modality: "HYBRID" as const,
      duration: "6 meses",
      responsibilities: [
        "Analizar datos de ocupación, tarifas y demanda del hotel",
        "Construir y mantener dashboards de indicadores clave (KPIs)",
        "Apoyar las decisiones de revenue management con datos",
        "Automatizar la extracción de datos desde el PMS y las OTAs",
        "Presentar hallazgos y recomendaciones a la gerencia",
      ],
      requirements: [
        "Estudiante de Ingeniería, Estadística o afín",
        "Manejo de SQL y de herramientas de visualización de datos",
      ],
      skills: ["SQL", "Python", "Power BI", "Excel"],
      isActive: true,
      deletedAt: null,
    },
    {
      id: "cmo3bsvt40001notxg9ifvxsp",
      companyId: dahotelesId,
      title: "Practicante de Soporte IT y Sistemas Hoteleros",
      description:
        "Brindarás soporte técnico a las áreas operativas del hotel y darás mantenimiento al PMS (Property Management System), redes y equipos. Apoyarás la digitalización de los procesos de recepción y reservas.",
      area: "Ingeniería",
      location: "Santiago",
      modality: "HYBRID" as const,
      duration: "3 meses",
      responsibilities: [
        "Brindar soporte técnico de primer nivel a recepción, reservas y administración",
        "Dar mantenimiento al PMS del hotel y a los equipos de las áreas operativas",
        "Monitorear la red y los puntos de acceso WiFi de las instalaciones",
        "Documentar incidencias y soluciones en la base de conocimiento interna",
        "Apoyar la digitalización de procesos manuales de recepción y check-in",
      ],
      requirements: [
        "Estudiante de Ingeniería Informática, Telecomunicaciones o afín",
        "Conocimientos básicos de redes y sistemas operativos",
      ],
      skills: ["Soporte IT", "Redes", "SQL", "Windows Server"],
      isActive: false,
      deletedAt: null,
    },
    {
      id: "cmo3btiqv0002notxmkokure0",
      companyId: dahotelesId,
      title: "Practicante de Recursos Humanos",
      description:
        "Apoyarás los procesos de reclutamiento y selección de personal para las distintas áreas del hotel, la gestión de turnos y la inducción de nuevos colaboradores.",
      area: "RRHH",
      location: "Viña del Mar",
      modality: "ONSITE" as const,
      duration: "3 meses",
      responsibilities: [
        "Publicar ofertas y filtrar candidatos para las áreas operativas del hotel",
        "Coordinar entrevistas y dar seguimiento a los procesos de selección",
        "Apoyar la inducción y el onboarding de nuevos colaboradores",
        "Mantener actualizada la base de datos de personal y turnos",
        "Colaborar en actividades de clima laboral y bienestar del equipo",
      ],
      requirements: [
        "Estudiante de Psicología, Administración o Recursos Humanos",
        "Manejo de Excel y buena comunicación interpersonal",
      ],
      skills: ["Reclutamiento", "Excel", "Comunicación", "Gestión de personas"],
      isActive: false,
      deletedAt: null,
    },
    {
      id: "cmo3bse3x0000notxme56vzux",
      companyId: dahotelesId,
      title: "Practicante de Diseño Gráfico y Contenido",
      description:
        "Diseñarás piezas gráficas para campañas, menús, señalética y la web del hotel. Apoyarás la producción de contenido audiovisual para las redes sociales.",
      area: "Diseño",
      location: "Valparaíso",
      modality: "ONSITE" as const,
      duration: "3 meses",
      responsibilities: [
        "Diseñar piezas gráficas para campañas, menús y señalética del hotel",
        "Apoyar la actualización visual del sitio web y las OTAs",
        "Producir y editar contenido audiovisual para redes sociales",
        "Mantener la coherencia de la identidad visual de la marca",
        "Colaborar con el equipo de marketing en las activaciones",
      ],
      requirements: [
        "Estudiante de Diseño Gráfico o afín, con portafolio",
        "Manejo de Figma y de la suite Adobe",
      ],
      skills: ["Figma", "Photoshop", "Illustrator", "Diseño UX"],
      isActive: false,
      deletedAt: null,
    },
    {
      id: "cmnysq95z0003h0txzwff7we6",
      companyId: dahotelesId,
      title: "Practicante de Desarrollo Web",
      description:
        "Apoyarás el desarrollo y mantenimiento del sitio web de reservas del hotel, integrando el motor de reservas y mejorando la experiencia de usuario.",
      area: "Ingeniería",
      location: "Santiago",
      modality: "REMOTE" as const,
      duration: "6 meses",
      responsibilities: [
        "Desarrollar y mantener componentes del sitio web de reservas",
        "Integrar el motor de reservas y las pasarelas de pago",
        "Mejorar el rendimiento y la accesibilidad del sitio",
        "Corregir bugs reportados por el equipo de operaciones",
        "Documentar los cambios y participar en revisiones de código",
      ],
      requirements: [
        "Estudiante de Ingeniería Informática o afín",
        "Conocimientos de JavaScript y de algún framework moderno",
      ],
      skills: ["JavaScript", "React", "HTML", "CSS"],
      isActive: false,
      deletedAt: null,
    },
    {
      id: "cmnysagac0002h0txrvtjcmgn",
      companyId: dahotelesId,
      title: "Practicante de Finanzas y Control de Gestión",
      description:
        "Apoyarás el control presupuestario, la conciliación de ingresos por habitaciones y la elaboración de reportes de gestión para la gerencia del hotel.",
      area: "Finanzas",
      location: "Santiago",
      modality: "HYBRID" as const,
      duration: "3 meses",
      responsibilities: [
        "Apoyar el control presupuestario y el seguimiento de gastos por área",
        "Conciliar ingresos por habitaciones, restaurante y eventos",
        "Elaborar reportes de gestión e indicadores para la gerencia",
        "Automatizar reportes recurrentes en Excel y Power BI",
        "Colaborar en el cierre mensual con el equipo de contabilidad",
      ],
      requirements: [
        "Estudiante de Ingeniería Comercial, Auditoría o Contabilidad",
        "Excel avanzado y nociones de análisis financiero",
      ],
      skills: ["Excel", "Análisis financiero", "Power BI", "Contabilidad"],
      isActive: false,
      deletedAt: new Date("2026-05-18T19:59:32.391Z"),
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
        isActive: internship.isActive ?? true,
        deletedAt: internship.deletedAt ?? null,
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
    `✓ Empresas seed login: techcorp@example.com / startupx@example.com / felipe.aguirre@dahoteles.com (password: ${SEED_COMPANY_PASSWORD})`,
  );
  console.log("Seed completado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
