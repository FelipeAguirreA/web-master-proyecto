"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { fetchWithRefresh } from "@/lib/client/fetch-with-refresh";
import { E } from "@/components/dashboard/palettes";
import { Icon } from "@/components/dashboard/Icon";
import MyRightsCard from "@/components/MyRightsCard";

type CompanyStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

type Internship = {
  id: string;
  title: string;
  area: string;
  modality: "REMOTE" | "ONSITE" | "HYBRID";
  duration: string;
  isActive: boolean;
};

type CompanyProfile = {
  id: string;
  companyName: string;
  empresaRut: string | null;
  industry: string | null;
  website: string | null;
  logo: string | null;
  description: string | null;
  companyStatus: CompanyStatus;
  createdAt: string;
  updatedAt: string;
  internships?: Internship[];
};

type UserMe = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  image: string | null;
  companyProfile: CompanyProfile | null;
};

const MODALITY_LABEL: Record<Internship["modality"], string> = {
  REMOTE: "Remoto",
  ONSITE: "Presencial",
  HYBRID: "Híbrido",
};

function pickInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "PX"
  );
}

function deriveTagline(description: string | null): string {
  if (!description) return "";
  const firstLine = description
    .split("\n")
    .map((l) => l.trim())
    .find(Boolean);
  if (!firstLine) return "";
  return firstLine.length > 140 ? firstLine.slice(0, 137) + "…" : firstLine;
}

function EditModal({
  initial,
  onClose,
  onSave,
  saving,
  error,
}: {
  initial: CompanyProfile;
  onClose: () => void;
  onSave: (values: {
    companyName: string;
    industry: string;
    website: string;
    description: string;
  }) => void;
  saving: boolean;
  error: string | null;
}) {
  const [companyName, setCompanyName] = useState(initial.companyName);
  const [industry, setIndustry] = useState(initial.industry ?? "");
  const [website, setWebsite] = useState(initial.website ?? "");
  const [description, setDescription] = useState(initial.description ?? "");

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(11,27,63,.55)",
          zIndex: 70,
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-perfil-empresa-title"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: "min(560px, 94vw)",
          maxHeight: "90vh",
          background: E.surface,
          borderRadius: 16,
          zIndex: 71,
          padding: "22px 24px",
          boxShadow: "0 24px 64px rgba(11,27,63,.24)",
          overflow: "auto",
        }}
      >
        <h3
          id="edit-perfil-empresa-title"
          style={{
            fontSize: 17,
            fontWeight: 800,
            color: E.text,
            letterSpacing: -0.3,
            margin: 0,
          }}
        >
          Editar perfil de empresa
        </h3>
        <p
          style={{
            fontSize: 13,
            color: E.muted,
            marginTop: 6,
            lineHeight: 1.5,
          }}
        >
          Esta información es lo que ven los estudiantes cuando entran a tu
          perfil.
        </p>

        <div
          style={{
            marginTop: 18,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <Field
            label="Nombre de la empresa *"
            value={companyName}
            onChange={setCompanyName}
            placeholder="Ej: Lumen Retail"
            disabled={saving}
          />
          <Field
            label="Industria"
            value={industry}
            onChange={setIndustry}
            placeholder="Ej: Retail · Omnicanal"
            disabled={saving}
          />
          <Field
            label="Sitio web"
            value={website}
            onChange={setWebsite}
            placeholder="https://tu-empresa.cl"
            disabled={saving}
            type="url"
          />
          <Textarea
            label="Sobre nosotros"
            value={description}
            onChange={setDescription}
            placeholder="Cuéntale al mundo qué hace tu empresa, cómo trabajan los practicantes, qué cultura tienen…"
            disabled={saving}
            maxLength={1000}
          />
        </div>

        {error && (
          <p
            style={{
              marginTop: 12,
              padding: "10px 12px",
              background: E.roseBg,
              color: E.rose,
              borderRadius: 8,
              fontSize: 13,
              border: `1px solid ${E.rose}33`,
            }}
          >
            {error}
          </p>
        )}

        <div
          style={{
            marginTop: 18,
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              padding: "10px 14px",
              background: E.surface,
              border: `1px solid ${E.border}`,
              color: E.text,
              borderRadius: 9,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() =>
              onSave({
                companyName: companyName.trim(),
                industry: industry.trim(),
                website: website.trim(),
                description: description.trim(),
              })
            }
            disabled={saving || companyName.trim().length < 2}
            style={{
              padding: "10px 14px",
              background: `linear-gradient(135deg,${E.accent},${E.accentHi})`,
              color: "#fff",
              border: "none",
              borderRadius: 9,
              fontSize: 12.5,
              fontWeight: 800,
              cursor: "pointer",
              opacity: saving || companyName.trim().length < 2 ? 0.6 : 1,
            }}
          >
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  type,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: E.subtle,
          letterSpacing: 0.4,
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <input
        type={type ?? "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          padding: "10px 12px",
          border: `1px solid ${E.border}`,
          borderRadius: 9,
          fontSize: 13.5,
          color: E.text,
          fontFamily: "inherit",
          background: E.bg,
          outline: "none",
        }}
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
}) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: E.subtle,
          letterSpacing: 0.4,
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) =>
          maxLength
            ? onChange(e.target.value.slice(0, maxLength))
            : onChange(e.target.value)
        }
        placeholder={placeholder}
        disabled={disabled}
        rows={5}
        style={{
          padding: "10px 12px",
          border: `1px solid ${E.border}`,
          borderRadius: 9,
          fontSize: 13.5,
          color: E.text,
          fontFamily: "inherit",
          background: E.bg,
          outline: "none",
          resize: "vertical",
        }}
      />
      {maxLength && (
        <span
          style={{
            fontSize: 11,
            color: E.subtle,
            alignSelf: "flex-end",
          }}
        >
          {value.length} / {maxLength}
        </span>
      )}
    </label>
  );
}

function Block({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: E.surface,
        border: `1px solid ${E.border}`,
        borderRadius: 18,
        padding: "20px 22px",
      }}
    >
      <header style={{ marginBottom: 14 }}>
        <h2
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: E.text,
            letterSpacing: -0.3,
            margin: 0,
          }}
        >
          {title}
        </h2>
        {sub && (
          <p
            style={{
              fontSize: 11.5,
              color: E.subtle,
              marginTop: 3,
              margin: 0,
            }}
          >
            {sub}
          </p>
        )}
      </header>
      {children}
    </section>
  );
}

export default function PerfilEmpresaPage() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

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

  const tagline = useMemo(
    () => deriveTagline(profile?.description ?? null),
    [profile?.description],
  );

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
            border: `2px solid ${E.accent}25`,
            borderTopColor: E.accent,
            borderRadius: "50%",
            animation: "spin .9s linear infinite",
          }}
        />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!profile) {
    return (
      <div
        style={{
          padding: "40px 28px",
          textAlign: "center",
          color: E.subtle,
        }}
      >
        No se pudo cargar el perfil de tu empresa.
      </div>
    );
  }

  const verified = profile.companyStatus === "APPROVED";
  const activeInternships = internships.filter((i) => i.isActive);
  const initials = pickInitials(profile.companyName);

  return (
    <main
      style={{
        padding: "24px 28px",
        maxWidth: 1180,
        margin: "0 auto",
        width: "100%",
        color: E.text,
      }}
    >
      {/* HERO */}
      <section
        style={{
          background: E.dark,
          color: "#fff",
          borderRadius: 22,
          padding: "26px 28px",
          marginBottom: 18,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -100,
            right: -50,
            width: 380,
            height: 380,
            background: `radial-gradient(circle, ${E.accent}40, transparent 65%)`,
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle at 1px 1px,rgba(255,255,255,.05) 1px,transparent 0)",
            backgroundSize: "22px 22px",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            gap: 22,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: 18,
                background: profile.logo
                  ? "transparent"
                  : `linear-gradient(135deg,#1E3A8A,${E.accent})`,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: 28,
                letterSpacing: -0.8,
                boxShadow: "0 8px 24px rgba(0,0,0,.3)",
                overflow: "hidden",
              }}
            >
              {profile.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.logo}
                  alt={profile.companyName}
                  width={88}
                  height={88}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : (
                initials
              )}
            </div>
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={logoUploading}
              title="Cambiar logo"
              aria-label="Cambiar logo"
              style={{
                position: "absolute",
                bottom: -4,
                right: -4,
                width: 28,
                height: 28,
                borderRadius: 8,
                background: E.surface,
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 10px rgba(0,0,0,.25)",
                opacity: logoUploading ? 0.6 : 1,
              }}
            >
              <Icon name="plus" size={13} color={E.text} />
            </button>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleLogoUpload(f);
                e.currentTarget.value = "";
              }}
            />
          </div>

          <div style={{ flex: 1, minWidth: 240 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 6,
                flexWrap: "wrap",
              }}
            >
              {verified && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 10.5,
                    fontWeight: 800,
                    color: E.accentHi,
                    background: "rgba(74,120,255,.18)",
                    padding: "2px 9px",
                    borderRadius: 5,
                    letterSpacing: 0.4,
                    textTransform: "uppercase",
                  }}
                >
                  <Icon
                    name="check"
                    size={11}
                    color={E.accentHi}
                    strokeWidth={3}
                  />
                  Verificada
                </span>
              )}
              {profile.industry && (
                <span style={{ fontSize: 11, color: "rgba(255,255,255,.55)" }}>
                  · {profile.industry}
                </span>
              )}
            </div>
            <h1
              style={{
                fontSize: "clamp(1.6rem,2.8vw,2.1rem)",
                fontWeight: 800,
                letterSpacing: -1.2,
                lineHeight: 1.05,
                marginBottom: 8,
                margin: 0,
              }}
            >
              {profile.companyName}
            </h1>
            {tagline && (
              <p
                style={{
                  fontSize: 14,
                  color: "rgba(255,255,255,.7)",
                  maxWidth: 560,
                  lineHeight: 1.55,
                  marginTop: 8,
                  marginBottom: 14,
                }}
              >
                {tagline}
              </p>
            )}
            <div
              style={{
                display: "flex",
                gap: 14,
                flexWrap: "wrap",
                fontSize: 11.5,
                color: "rgba(255,255,255,.6)",
                marginTop: tagline ? 0 : 14,
              }}
            >
              {profile.website && (
                <a
                  href={
                    profile.website.startsWith("http")
                      ? profile.website
                      : `https://${profile.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    color: "rgba(255,255,255,.85)",
                    textDecoration: "none",
                  }}
                >
                  <Icon name="search" size={13} color="rgba(255,255,255,.5)" />
                  {profile.website.replace(/^https?:\/\//, "")}
                </a>
              )}
              {profile.empresaRut && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <Icon name="doc" size={13} color="rgba(255,255,255,.5)" />
                  RUT {profile.empresaRut}
                </span>
              )}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              minWidth: 170,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setSaveError(null);
                setEditing(true);
              }}
              style={{
                padding: "10px 16px",
                background: "rgba(255,255,255,.08)",
                border: "1px solid rgba(255,255,255,.14)",
                color: "#fff",
                borderRadius: 11,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Editar perfil
            </button>
          </div>
        </div>

        {logoError && (
          <p
            role="alert"
            style={{
              position: "relative",
              marginTop: 14,
              fontSize: 12.5,
              color: E.rose,
              background: "rgba(255,255,255,.08)",
              padding: "8px 12px",
              borderRadius: 8,
            }}
          >
            {logoError}
          </p>
        )}
      </section>

      {/* BODY */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: 18,
          alignItems: "flex-start",
        }}
        className="perfil-empresa-grid"
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
            minWidth: 0,
          }}
        >
          <Block title="Sobre nosotros">
            {profile.description ? (
              <p
                style={{
                  fontSize: 13.5,
                  color: E.muted,
                  lineHeight: 1.7,
                  margin: 0,
                  whiteSpace: "pre-wrap",
                }}
              >
                {profile.description}
              </p>
            ) : (
              <p
                style={{
                  fontSize: 13,
                  color: E.subtle,
                  fontStyle: "italic",
                  margin: 0,
                }}
              >
                Todavía no tenés una descripción. Hacé click en{" "}
                <strong>Editar perfil</strong> y cuéntale a los estudiantes qué
                hace tu empresa.
              </p>
            )}
          </Block>

          <Block
            title="Mis prácticas publicadas"
            sub={
              activeInternships.length === 1
                ? "1 oferta activa"
                : `${activeInternships.length} ofertas activas`
            }
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {activeInternships.length === 0 && (
                <p
                  style={{
                    fontSize: 13,
                    color: E.subtle,
                    fontStyle: "italic",
                    margin: 0,
                  }}
                >
                  No tenés prácticas activas todavía.
                </p>
              )}
              {activeInternships.map((p) => (
                <Link
                  key={p.id}
                  href={`/dashboard/empresa/ats/${p.id}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 14px",
                    background: "rgba(15,23,42,.025)",
                    borderRadius: 11,
                    borderLeft: `3px solid ${E.accent}`,
                    textDecoration: "none",
                    transition: "background .15s",
                  }}
                  onMouseEnter={(ev) => {
                    ev.currentTarget.style.background = E.accentBg;
                  }}
                  onMouseLeave={(ev) => {
                    ev.currentTarget.style.background = "rgba(15,23,42,.025)";
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13.5,
                        fontWeight: 800,
                        color: E.text,
                        lineHeight: 1.3,
                      }}
                    >
                      {p.title}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        fontSize: 11,
                        color: E.subtle,
                        flexWrap: "wrap",
                        marginTop: 3,
                      }}
                    >
                      <span>{p.area}</span>
                      <span>· {MODALITY_LABEL[p.modality]}</span>
                      <span>· {p.duration}</span>
                    </div>
                  </div>
                  <span />
                  <Icon
                    name="arr"
                    size={14}
                    color={E.subtle}
                    strokeWidth={2.2}
                  />
                </Link>
              ))}
              <Link
                href="/dashboard/empresa"
                style={{
                  marginTop: 6,
                  padding: "10px",
                  background: "transparent",
                  border: `1.5px dashed ${E.border}`,
                  color: E.muted,
                  borderRadius: 10,
                  fontSize: 12.5,
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  textDecoration: "none",
                }}
              >
                Publicar prácticas desde el dashboard →
              </Link>
            </div>
          </Block>
        </div>

        <aside
          style={{
            position: "sticky",
            top: 80,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
          className="perfil-empresa-rail"
        >
          <Block title="Datos de la empresa">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 9,
                fontSize: 12.5,
              }}
            >
              {[
                { l: "Razón social", v: profile.companyName },
                { l: "RUT / Tax ID", v: profile.empresaRut || "—" },
                { l: "Industria", v: profile.industry || "—" },
                {
                  l: "Estado",
                  v: verified
                    ? "Aprobada"
                    : profile.companyStatus === "PENDING"
                      ? "En revisión"
                      : profile.companyStatus === "REJECTED"
                        ? "Rechazada"
                        : "Suspendida",
                },
              ].map((f) => (
                <div
                  key={f.l}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <span style={{ color: E.subtle, fontWeight: 600 }}>
                    {f.l}
                  </span>
                  <span
                    style={{
                      color: E.text,
                      fontWeight: 700,
                      textAlign: "right",
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={f.v}
                  >
                    {f.v}
                  </span>
                </div>
              ))}
            </div>
            {profile.website && (
              <>
                <hr
                  style={{
                    border: "none",
                    borderTop: `1px solid ${E.border}`,
                    margin: "14px 0 12px",
                  }}
                />
                <a
                  href={
                    profile.website.startsWith("http")
                      ? profile.website
                      : `https://${profile.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "7px 11px",
                    background: "rgba(15,23,42,.025)",
                    borderRadius: 8,
                    fontSize: 12,
                    textDecoration: "none",
                  }}
                >
                  <span style={{ fontWeight: 700, color: E.text }}>Web</span>
                  <span style={{ color: E.subtle }}>
                    {profile.website.replace(/^https?:\/\//, "")}
                  </span>
                </a>
              </>
            )}
          </Block>
          <MyRightsCard />
        </aside>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          :global(.perfil-empresa-grid) {
            grid-template-columns: 1fr !important;
          }
          :global(.perfil-empresa-rail) {
            position: static !important;
          }
        }
      `}</style>

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
