"use client";

import { useState, useEffect, FormEvent } from "react";
import { useSession } from "next-auth/react";
import { Plus, Users, Briefcase, X } from "lucide-react";

type Internship = {
  id: string;
  title: string;
  area: string;
  location: string;
  modality: string;
  duration: string;
};

type Applicant = {
  id: string;
  matchScore?: number | null;
  student: {
    name: string;
    email: string;
    image?: string | null;
    studentProfile?: {
      cvUrl?: string | null;
    } | null;
  };
};

const AREAS = [
  "Ingeniería",
  "Marketing",
  "Diseño",
  "Datos",
  "Finanzas",
  "RRHH",
  "Legal",
];

const MODALITIES = [
  { value: "REMOTE", label: "Remoto" },
  { value: "ONSITE", label: "Presencial" },
  { value: "HYBRID", label: "Híbrido" },
];

const EMPTY_FORM = {
  title: "",
  description: "",
  area: AREAS[0],
  location: "",
  modality: "REMOTE",
  duration: "",
  skills: "",
  requirements: "",
};

export default function CompanyDashboard() {
  const { data: session } = useSession();

  const [internships, setInternships] = useState<Internship[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedInternship, setSelectedInternship] = useState<string | null>(
    null
  );
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const loadInternships = async () => {
    try {
      const res = await fetch("/api/internships");
      const data = await res.json();
      setInternships(data.internships ?? []);
    } catch {
      setInternships([]);
    }
  };

  useEffect(() => {
    if (session) loadInternships();
  }, [session]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const toArray = (str: string) =>
      str
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

    try {
      const res = await fetch("/api/internships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          skills: toArray(form.skills),
          requirements: toArray(form.requirements),
        }),
      });

      if (res.ok) {
        setShowForm(false);
        setForm(EMPTY_FORM);
        await loadInternships();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const viewApplicants = async (internshipId: string) => {
    setSelectedInternship(internshipId);
    try {
      const res = await fetch(`/api/applications/internship/${internshipId}`);
      const data = await res.json();
      setApplicants(data ?? []);
    } catch {
      setApplicants([]);
    }
  };

  const field = (key: keyof typeof form) =>
    ({
      value: form[key],
      onChange: (
        e: React.ChangeEvent<
          HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
      ) => setForm((f) => ({ ...f, [key]: e.target.value })),
    });

  const inputClass =
    "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400";

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panel de Empresa</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestioná tus prácticas y revisá los postulantes
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 bg-brand-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva práctica
        </button>
      </div>

      {/* Lista de prácticas */}
      {internships.length === 0 ? (
        <div className="text-center py-20">
          <Briefcase className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-500">
            Aún no publicaste prácticas
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Creá tu primera oferta y empezá a recibir postulantes
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {internships.map((internship) => (
            <div
              key={internship.id}
              className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {internship.title}
                </p>
                <p className="text-sm text-gray-500">
                  {internship.area} · {internship.location}
                </p>
              </div>
              <button
                onClick={() => viewApplicants(internship.id)}
                className="inline-flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors"
              >
                <Users className="w-4 h-4" />
                Ver postulantes
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal creación */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Crear práctica
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  Título
                </label>
                <input
                  type="text"
                  placeholder="Ej: Pasantía Frontend Developer"
                  required
                  className={inputClass}
                  {...field("title")}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  Descripción
                </label>
                <textarea
                  rows={4}
                  placeholder="Describí las tareas y el contexto del puesto"
                  required
                  className={inputClass}
                  {...field("description")}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Área
                  </label>
                  <select className={inputClass} {...field("area")}>
                    {AREAS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Modalidad
                  </label>
                  <select className={inputClass} {...field("modality")}>
                    {MODALITIES.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Ubicación
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Buenos Aires"
                    className={inputClass}
                    {...field("location")}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Duración
                  </label>
                  <input
                    type="text"
                    placeholder="3 meses"
                    className={inputClass}
                    {...field("duration")}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  Skills requeridas
                </label>
                <input
                  type="text"
                  placeholder="React, TypeScript, Node.js"
                  className={inputClass}
                  {...field("skills")}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  Requisitos
                </label>
                <input
                  type="text"
                  placeholder="Estudiante Ing. Informática, 4to año+"
                  className={inputClass}
                  {...field("requirements")}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-brand-600 text-white font-medium py-2.5 rounded-lg hover:bg-brand-700 transition-colors text-sm disabled:opacity-60"
              >
                {submitting ? "Publicando..." : "Publicar práctica"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Panel postulantes */}
      {selectedInternship && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Postulantes
              </h2>
              <button
                onClick={() => setSelectedInternship(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {applicants.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-12">
                Sin postulaciones aún
              </p>
            ) : (
              <div className="space-y-3">
                {applicants.map((app) => {
                  const initial = app.student.name.charAt(0).toUpperCase();
                  return (
                    <div
                      key={app.id}
                      className="border border-gray-100 rounded-lg p-4"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-semibold shrink-0">
                          {initial}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {app.student.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {app.student.email}
                          </p>
                        </div>
                        {app.matchScore != null && app.matchScore > 0 && (
                          <span className="text-xs font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-lg shrink-0">
                            {Math.round(app.matchScore)}%
                          </span>
                        )}
                      </div>
                      {app.student.studentProfile?.cvUrl && (
                        <a
                          href={app.student.studentProfile.cvUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-brand-600 hover:underline"
                        >
                          Ver CV →
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
