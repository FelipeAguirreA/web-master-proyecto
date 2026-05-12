"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
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
import { D } from "@/components/dashboard/tokens";

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

const INPUT_STYLE = {
  width: "100%",
  padding: "10px 12px",
  border: `1px solid ${D.border}`,
  borderRadius: 10,
  fontSize: 13.5,
  color: D.text,
  background: D.bg,
  fontFamily: "inherit",
  outline: "none",
} as const;

export default function PerfilPage() {
  const { update } = useSession();
  const [profile, setProfile] = useState<ProfileData | null>(null);
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
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: `2px solid ${D.accent}25`,
            borderTopColor: D.accent,
            borderRadius: "50%",
            animation: "practix-perfil-spin .9s linear infinite",
          }}
        />
        <style>{`@keyframes practix-perfil-spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!profile) return null;

  // Solo STUDENT usa este layout. Si es COMPANY, mostramos un fallback simple.
  if (profile.role !== "STUDENT") {
    return (
      <div
        style={{
          padding: "40px 24px",
          maxWidth: 640,
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: D.text,
            marginBottom: 8,
          }}
        >
          Editar perfil
        </h1>
        <p style={{ fontSize: 13.5, color: D.muted, marginBottom: 20 }}>
          Vista de perfil empresa próximamente.
        </p>
      </div>
    );
  }

  const sp = profile.studentProfile;

  return (
    <div
      className="practix-perfil-root"
      style={{
        padding: "20px 22px",
        maxWidth: 1300,
        margin: "0 auto",
        width: "100%",
      }}
    >
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

      <div
        className="practix-perfil-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: 14,
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            minWidth: 0,
          }}
        >
          <Block
            title="Datos personales"
            editing={nameEditing}
            onEdit={startEditName}
            onCancel={() => setNameEditing(false)}
            onSave={saveName}
            saving={nameSaving}
          >
            {nameEditing ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 10.5,
                      fontWeight: 800,
                      color: D.subtle,
                      letterSpacing: 0.6,
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    maxLength={80}
                    style={INPUT_STYLE}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 10.5,
                      fontWeight: 800,
                      color: D.subtle,
                      letterSpacing: 0.6,
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    Apellido
                  </label>
                  <input
                    type="text"
                    value={lastNameDraft}
                    onChange={(e) => setLastNameDraft(e.target.value)}
                    maxLength={80}
                    style={INPUT_STYLE}
                  />
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  fontSize: 13.5,
                }}
              >
                <span style={{ color: D.text, fontWeight: 600 }}>
                  {[profile.name, profile.lastName].filter(Boolean).join(" ") ||
                    "Sin nombre"}
                </span>
                <span style={{ color: D.muted, fontSize: 12.5 }}>
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

        <aside
          className="practix-perfil-rail"
          style={{
            position: "sticky",
            top: 80,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <CVUploadCard
            cvUrl={sp?.cvUrl ?? null}
            cvPct={cvPct}
            onUpload={handleCVUpload}
            onDelete={handleCVDelete}
          />
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
        </aside>
      </div>

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "10px 18px",
            background: toast.type === "ok" ? D.green : D.rose,
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            borderRadius: 12,
            boxShadow: "0 12px 28px -8px rgba(0,0,0,.25)",
            zIndex: 200,
          }}
        >
          {toast.msg}
        </div>
      )}

      <style>{`
        @media (max-width:1100px) {
          .practix-perfil-grid { grid-template-columns: 1fr !important; }
          .practix-perfil-rail { position: static !important; }
        }
        @media (max-width:600px) {
          .practix-perfil-root { padding: 14px 12px !important; }
        }
      `}</style>
    </div>
  );
}
