/**
 * Cálculo del progreso del CV / perfil del estudiante. Compartido entre el
 * dashboard (CVPanel) y la página /perfil (CompletenessCard) para que ambos
 * muestren EXACTAMENTE el mismo número.
 *
 * Antes el dashboard tenía `cvPct = hasCv ? 84 : 0` hardcoded → divergía con
 * el cálculo real del perfil. Cualquier cambio futuro a las reglas se hace
 * acá una sola vez.
 */

export type CompletenessItem = {
  key: string;
  title: string;
  body?: string;
  done: boolean;
  pts: number;
};

type CvProgressInput = {
  name?: string | null;
  lastName?: string | null;
  image?: string | null;
  phone?: string | null;
  studentProfile?: {
    bio?: string | null;
    university?: string | null;
    career?: string | null;
    semester?: number | null;
    skills?: string[] | null;
    cvUrl?: string | null;
  } | null;
};

export function computeCompleteness(
  user: CvProgressInput | null | undefined,
): CompletenessItem[] {
  if (!user) return [];
  const sp = user.studentProfile;
  return [
    {
      key: "name",
      title: "Nombre y apellido",
      body: "Empresas confían más en perfiles con nombre real.",
      done: !!user.name && !!user.lastName,
      pts: 10,
    },
    {
      key: "photo",
      title: "Foto de perfil",
      body: "Aumenta tus chances de ser contactado por una empresa.",
      done: !!user.image,
      pts: 10,
    },
    {
      key: "bio",
      title: "Bio",
      body: "Cuenta en 2 líneas quién eres y qué te apasiona.",
      done: !!sp?.bio,
      pts: 15,
    },
    {
      key: "education",
      title: "Universidad y carrera",
      body: "Necesario para filtrar prácticas relevantes a tu perfil.",
      done: !!sp?.university && !!sp?.career,
      pts: 15,
    },
    {
      key: "semester",
      title: "Semestre actual",
      body: "Algunas empresas exigen un semestre mínimo.",
      done: !!sp?.semester,
      pts: 5,
    },
    {
      key: "skills",
      title: "Al menos 3 skills",
      body: "Más skills = más matches semánticos posibles.",
      done: (sp?.skills?.length ?? 0) >= 3,
      pts: 15,
    },
    {
      key: "cv",
      title: "Sube tu CV",
      body: "La IA lo analiza en segundos para encontrarte matches.",
      done: !!sp?.cvUrl,
      pts: 20,
    },
    {
      key: "phone",
      title: "Teléfono",
      body: "Permite que las empresas te contacten más rápido.",
      done: !!user.phone,
      pts: 10,
    },
  ];
}

export function computeCvProgress(
  user: CvProgressInput | null | undefined,
): number {
  const items = computeCompleteness(user);
  const total = items.reduce((s, i) => s + i.pts, 0);
  const earned = items.filter((i) => i.done).reduce((s, i) => s + i.pts, 0);
  return total > 0 ? Math.round((earned / total) * 100) : 0;
}
