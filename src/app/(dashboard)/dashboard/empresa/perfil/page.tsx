"use client";

import { useEffect, useMemo, useState } from "react";
import MyRightsCard from "@/components/MyRightsCard";
import { fetchWithRefresh } from "@/lib/client/fetch-with-refresh";

import { EmpresaHero } from "./_components/EmpresaHero";
import { EmpresaAbout } from "./_components/EmpresaAbout";
import { EmpresaPracticas } from "./_components/EmpresaPracticas";
import { EmpresaDatos } from "./_components/EmpresaDatos";
import { EditModal } from "./_components/EditModal";
import { EmpresaPerfilSkeleton } from "./_components/EmpresaPerfilSkeleton";
import { deriveTagline, pickInitials } from "./_components/utils";
import type { CompanyProfile, Internship, UserMe } from "./_components/types";

export default function PerfilEmpresaPage() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  /* ─── Carga inicial ─── */
  const loadAll = async () => {
    try {
      const [meRes, intRes] = await Promise.all([
        fetchWithRefresh("/api/users/me"),
        fetchWithRefresh("/api/company/internships"),
      ]);
      const meData = (await meRes.json()) as UserMe;
      setProfile(meData.companyProfile);

      if (intRes.ok) {
        const intData = (await intRes.json()) as
          | { internships: Internship[] }
          | Internship[];
        const list = Array.isArray(intData) ? intData : intData.internships;
        setInternships(list ?? []);
      } else {
        setInternships([]);
      }
    } catch {
      setProfile(null);
      setInternships([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  /* ─── Derived ─── */
  const tagline = useMemo(
    () => deriveTagline(profile?.description ?? null),
    [profile?.description],
  );

  /* ─── Handlers ─── */
  const handleSave = async (values: {
    companyName: string;
    industry: string;
    website: string;
    description: string;
  }) => {
    setSaving(true);
    setSaveError(null);
    try {
      const payload: Record<string, string> = {
        companyName: values.companyName,
      };
      // El schema acepta solo URL válidas para website. Si está vacío lo
      // omitimos para no fallar la validación.
      if (values.industry) payload.industry = values.industry;
      if (values.website) payload.website = values.website;
      if (values.description) payload.description = values.description;

      const res = await fetchWithRefresh("/api/users/profile/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const issue = body?.details?.[0]?.message;
        setSaveError(
          issue ??
            body?.error ??
            "No se pudo guardar. Revisá los campos e intentá de nuevo.",
        );
        return;
      }

      const updated = (await res.json()) as CompanyProfile;
      setProfile((prev) => (prev ? { ...prev, ...updated } : updated));
      setEditing(false);
    } catch {
      setSaveError("Error de red. Probá de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    setLogoUploading(true);
    setLogoError(null);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const res = await fetchWithRefresh("/api/perfil/avatar", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setLogoError(body?.error ?? "No se pudo subir el logo.");
        return;
      }
      const { url } = (await res.json()) as { url: string };
      setProfile((prev) => (prev ? { ...prev, logo: url } : prev));
    } catch {
      setLogoError("Error de red al subir el logo.");
    } finally {
      setLogoUploading(false);
    }
  };

  /* ─── Estados de carga / error ─── */
  if (loading) return <EmpresaPerfilSkeleton />;

  if (!profile) {
    return (
      <div className="px-4 sm:px-7 py-10 text-center text-subtle">
        No se pudo cargar el perfil de tu empresa.
      </div>
    );
  }

  const verified = profile.companyStatus === "APPROVED";
  const initials = pickInitials(profile.companyName);

  return (
    <main className="px-4 sm:px-6 md:px-8 py-5 sm:py-6 max-w-[1180px] mx-auto w-full text-text">
      {/* HERO */}
      <EmpresaHero
        profile={profile}
        tagline={tagline}
        initials={initials}
        verified={verified}
        logoUploading={logoUploading}
        logoError={logoError}
        onLogoUpload={handleLogoUpload}
        onEdit={() => {
          setSaveError(null);
          setEditing(true);
        }}
      />

      {/* BODY — responsive 1 col → sidebar en lg+ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
        {/* Columna principal */}
        <div className="flex flex-col gap-4 min-w-0">
          <EmpresaAbout description={profile.description} />
          <EmpresaPracticas internships={internships} />
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col gap-3.5 lg:sticky lg:top-8">
          <EmpresaDatos profile={profile} />
          <MyRightsCard />
        </aside>
      </div>

      {/* Modal de edición */}
      {editing && (
        <EditModal
          initial={profile}
          onClose={() => {
            setEditing(false);
            setSaveError(null);
          }}
          onSave={handleSave}
          saving={saving}
          error={saveError}
        />
      )}
    </main>
  );
}
