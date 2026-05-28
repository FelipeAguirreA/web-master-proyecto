"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { fetchWithRefresh } from "@/lib/client/fetch-with-refresh";
import { PerfilHero } from "@/components/perfil/PerfilHero";
import { AboutBlock } from "@/components/perfil/AboutBlock";
import { EducationBlock } from "@/components/perfil/EducationBlock";
import { SkillsBlock } from "@/components/perfil/SkillsBlock";
import { CVUploadCard } from "@/components/perfil/CVUploadCard";
import { CompletenessCard } from "@/components/perfil/CompletenessCard";
import { computeCompleteness, computeCvProgress } from "@/lib/cv-progress";
import { ContactCard } from "@/components/perfil/ContactCard";
import { Block } from "@/components/perfil/Block";
import MyRightsCard from "@/components/MyRightsCard";

type ProfileData = {
  id: string;
  name: string;
  lastName: string | null;
  email: string;
  phone: string | null;
  rut: string | null;
  role: string;
  image: string | null;
  studentProfile: {
    bio: string | null;
    university: string | null;
    career: string | null;
    semester: number | null;
    skills: string[];
    cvUrl: string | null;
  } | null;
};

export default function PerfilPage() {
  const { update } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const isCompany = profile != null && profile.role !== "STUDENT";

  // /perfil sólo aplica al estudiante. Si entra una empresa (link viejo,
  // bookmark, redirect interno residual), la redirigimos a su propia pantalla
  // en /dashboard/empresa/perfil. El redirect tiene que vivir en un effect —
  // llamar router.replace durante el render dispara el warning de React
  // "Cannot update a component while rendering a different one".
  useEffect(() => {
    if (isCompany) router.replace("/dashboard/empresa/perfil");
  }, [isCompany, router]);

  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [nameEditing, setNameEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [lastNameDraft, setLastNameDraft] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [toast, setToast] = useState<{
    type: "ok" | "err";
    msg: string;
  } | null>(null);

  const showToast = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    window.setTimeout(() => setToast(null), 3500);
  };

  const loadProfile = async () => {
    const res = await fetchWithRefresh("/api/perfil");
    if (!res.ok) return null;
    const data: ProfileData = await res.json();
    setProfile(data);
    return data;
  };

  const loadSuggestions = async () => {
    try {
      const res = await fetchWithRefresh("/api/perfil/skill-suggestions");
      if (!res.ok) return;
      const data = await res.json();
      setSuggestions(data.suggestions ?? []);
    } catch {
      // silencioso
    }
  };

  useEffect(() => {
    loadProfile().finally(() => setLoading(false));
    loadSuggestions();
  }, []);

  // Soporte de deep-link `/perfil#cv` desde el sidebar y el dashboard:
  // al terminar de cargar, si el hash apunta a una sección, hace scroll
  // suave a ella. Sin esto, el botón "Cargar el CV" parece "no hacer nada"
  // porque la card de upload queda fuera del viewport en pantallas chicas.
  useEffect(() => {
    if (loading) return;
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [loading]);

  const savePartial = async (
    patch: Partial<{
      name: string;
      lastName: string;
      phone: string;
      studentProfile: Partial<NonNullable<ProfileData["studentProfile"]>>;
    }>,
  ) => {
    if (!profile) return;
    const body = {
      name: patch.name ?? profile.name,
      lastName: patch.lastName ?? profile.lastName ?? "",
      phone: patch.phone ?? profile.phone ?? undefined,
      studentProfile: patch.studentProfile,
    };
    const res = await fetchWithRefresh("/api/perfil", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "Error al guardar.");
    }
    const updated = await res.json();
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            name: updated.name ?? prev.name,
            lastName: updated.lastName ?? prev.lastName,
            phone: updated.phone ?? prev.phone,
            studentProfile: updated.studentProfile ?? prev.studentProfile,
          }
        : prev,
    );
    if (patch.name !== undefined) {
      await update({ name: updated.name });
    }
    showToast("ok", "Guardado");
  };

  const handleAvatar = async (file: File) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      showToast("err", "Solo JPG, PNG o WebP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast("err", "Máximo 2 MB.");
      return;
    }
    const form = new FormData();
    form.append("avatar", file);
    const res = await fetchWithRefresh("/api/perfil/avatar", {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showToast("err", err.error ?? "Error al subir la imagen.");
      return;
    }
    const { url } = await res.json();
    setProfile((prev) => (prev ? { ...prev, image: url } : prev));
    await update({ image: url });
    showToast("ok", "Foto actualizada");
  };

  const handleCVUpload = async (file: File) => {
    const form = new FormData();
    form.append("cv", file);
    const res = await fetchWithRefresh("/api/matching/upload-cv", {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "Error al procesar el CV.");
    }
    await loadProfile();
    await loadSuggestions();
    // Avisa al layout para que la tarjeta "Tu CV" del sidebar se actualice
    // sin recargar la página (el effect del layout solo corre al montar).
    window.dispatchEvent(new Event("practix:cv-updated"));
    showToast("ok", "CV procesado");
  };

  const handleCVDelete = async () => {
    const res = await fetchWithRefresh("/api/matching/upload-cv", {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "Error al eliminar el CV.");
    }
    await loadProfile();
    setSuggestions([]);
    window.dispatchEvent(new Event("practix:cv-updated"));
    showToast("ok", "CV eliminado");
  };

  const startEditName = () => {
    if (!profile) return;
    setNameDraft(profile.name ?? "");
    setLastNameDraft(profile.lastName ?? "");
    setNameEditing(true);
  };

  const saveName = async () => {
    setNameSaving(true);
    try {
      await savePartial({
        name: nameDraft.trim(),
        lastName: lastNameDraft.trim(),
      });
      setNameEditing(false);
    } catch (err) {
      showToast(
        "err",
        err instanceof Error ? err.message : "Error al guardar.",
      );
    } finally {
      setNameSaving(false);
    }
  };

  // Fuente única (cv-progress.ts) compartida con el dashboard estudiante.
  const completeness = useMemo(() => computeCompleteness(profile), [profile]);
  const cvPct = useMemo(() => computeCvProgress(profile), [profile]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-accent/15 border-t-accent animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  // Mientras el effect arriba dispara el router.replace, devolvemos null para
  // no pintar nada del shell de estudiante a la empresa.
  if (isCompany) return null;

  const sp = profile.studentProfile;

  return (
    <div className="px-4 sm:px-6 md:px-8 py-5 md:py-6 max-w-[1300px] mx-auto w-full">
      <PerfilHero
        name={profile.name}
        lastName={profile.lastName}
        image={profile.image}
        university={sp?.university}
        career={sp?.career}
        semester={sp?.semester}
        city={null}
        cvPct={cvPct}
        hasCv={!!sp?.cvUrl}
        onPickAvatar={handleAvatar}
      />

      {/* Two-column grid: main + sidebar. Single column on mobile. */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3.5 items-start">
        {/* Main column */}
        <div className="flex flex-col gap-3.5 min-w-0">
          <Block
            title="Datos personales"
            editing={nameEditing}
            onEdit={startEditName}
            onCancel={() => setNameEditing(false)}
            onSave={saveName}
            saving={nameSaving}
          >
            {nameEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="perfil-nombre"
                    className="block text-[10.5px] font-extrabold text-subtle tracking-[0.6px] uppercase mb-1.5"
                  >
                    Nombre
                  </label>
                  <input
                    id="perfil-nombre"
                    name="given-name"
                    type="text"
                    autoComplete="given-name"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    maxLength={80}
                    className="w-full px-3 py-2.5 border border-border rounded-[10px] text-[13.5px] text-text bg-bg font-[inherit] outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div>
                  <label
                    htmlFor="perfil-apellido"
                    className="block text-[10.5px] font-extrabold text-subtle tracking-[0.6px] uppercase mb-1.5"
                  >
                    Apellido
                  </label>
                  <input
                    id="perfil-apellido"
                    name="family-name"
                    type="text"
                    autoComplete="family-name"
                    value={lastNameDraft}
                    onChange={(e) => setLastNameDraft(e.target.value)}
                    maxLength={80}
                    className="w-full px-3 py-2.5 border border-border rounded-[10px] text-[13.5px] text-text bg-bg font-[inherit] outline-none focus:border-accent transition-colors"
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1 text-[13.5px]">
                <span className="text-text font-semibold">
                  {[profile.name, profile.lastName].filter(Boolean).join(" ") ||
                    "Sin nombre"}
                </span>
                <span className="text-muted text-[12.5px]">
                  {profile.email}
                </span>
              </div>
            )}
          </Block>

          <AboutBlock
            bio={sp?.bio ?? null}
            onSave={async (bio) => {
              try {
                await savePartial({ studentProfile: { bio } });
              } catch (err) {
                showToast(
                  "err",
                  err instanceof Error ? err.message : "Error al guardar.",
                );
                throw err;
              }
            }}
          />

          <EducationBlock
            university={sp?.university ?? null}
            career={sp?.career ?? null}
            semester={sp?.semester ?? null}
            onSave={async (data) => {
              try {
                await savePartial({ studentProfile: data });
              } catch (err) {
                showToast(
                  "err",
                  err instanceof Error ? err.message : "Error al guardar.",
                );
                throw err;
              }
            }}
          />

          <SkillsBlock
            skills={sp?.skills ?? []}
            suggestions={suggestions}
            onSave={async (skills) => {
              try {
                await savePartial({ studentProfile: { skills } });
                await loadSuggestions();
              } catch (err) {
                showToast(
                  "err",
                  err instanceof Error ? err.message : "Error al guardar.",
                );
                throw err;
              }
            }}
          />
        </div>

        {/* Sidebar — sticky on lg+ (top-8: el scroll vive en <main>, ya no hay que descontar el topbar) */}
        <aside className="flex flex-col gap-3.5 lg:sticky lg:top-8">
          <div id="cv" className="scroll-mt-24">
            <CVUploadCard
              cvUrl={sp?.cvUrl ?? null}
              cvPct={cvPct}
              onUpload={handleCVUpload}
              onDelete={handleCVDelete}
            />
          </div>
          <CompletenessCard items={completeness} />
          <ContactCard
            email={profile.email}
            phone={profile.phone}
            onSavePhone={async (phone) => {
              try {
                await savePartial({ phone });
              } catch (err) {
                showToast(
                  "err",
                  err instanceof Error ? err.message : "Error al guardar.",
                );
                throw err;
              }
            }}
          />
          <MyRightsCard />
        </aside>
      </div>

      {/* Toast notification */}
      {toast && (
        <div
          className={[
            "fixed bottom-6 left-1/2 -translate-x-1/2 px-[18px] py-2.5 text-white text-[13px] font-bold rounded-xl shadow-[0_12px_28px_-8px_rgba(0,0,0,.25)] z-[200]",
            toast.type === "ok" ? "bg-green" : "bg-rose",
          ].join(" ")}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
