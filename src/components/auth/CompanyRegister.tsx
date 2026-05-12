"use client";

import { useState } from "react";
import Link from "next/link";
import { A } from "./tokens";
import { AuthField } from "./AuthField";
import { AuthSelect } from "./AuthSelect";
import { AuthIcon } from "./AuthIcon";
import { SubmitButton } from "./SubmitButton";

const INDUSTRY_OPTIONS = [
  { value: "Tecnología", label: "Tecnología" },
  { value: "Retail", label: "Retail" },
  { value: "Banca y finanzas", label: "Banca y finanzas" },
  { value: "Consumo masivo", label: "Consumo masivo" },
  { value: "Salud", label: "Salud" },
  { value: "Educación", label: "Educación" },
  { value: "Logística", label: "Logística" },
  { value: "Energía", label: "Energía" },
  { value: "Consultoría", label: "Consultoría" },
  { value: "Otra", label: "Otra" },
];

type Props = {
  onSuccess: () => void;
};

type DocKind = "rut" | "passport";

export function CompanyRegister({ onSuccess }: Props) {
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [docKind, setDocKind] = useState<DocKind>("rut");
  const [empresaRut, setEmpresaRut] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [allowGenericEmail, setAllowGenericEmail] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rutFocus, setRutFocus] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setFieldErrors({});

    if (!acceptedTerms) {
      setSubmitError(
        "Tienes que aceptar la Política de Privacidad y los Términos para continuar.",
      );
      return;
    }
    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: "Las contraseñas no coinciden" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/empresa/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          lastName: lastName.trim(),
          companyName: companyName.trim(),
          documentType: docKind,
          empresaRut: empresaRut.trim(),
          industry: industry || undefined,
          website: website.trim() || undefined,
          phone: phone.trim(),
          email: email.trim(),
          password,
          confirmPassword,
          allowGenericEmail,
          acceptedTerms: true,
        }),
      });

      if (res.status === 201 || res.status === 200) {
        onSuccess();
        return;
      }

      if (res.status === 409) {
        setFieldErrors({ email: "Este correo ya está registrado" });
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (res.status === 400 && Array.isArray(data.details)) {
        const next: Record<string, string> = {};
        for (const issue of data.details) {
          const path = issue.path?.[0];
          if (typeof path === "string" && !next[path]) {
            next[path] = issue.message;
          }
        }
        setFieldErrors(next);
        if (Object.keys(next).length === 0) {
          setSubmitError(
            data.error ?? "Datos inválidos. Revisa el formulario.",
          );
        }
        return;
      }

      setSubmitError(data.error ?? "Error al crear la cuenta.");
    } catch {
      setSubmitError("Error de red. Verifica tu conexión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: 14 }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        <AuthField
          label="Nombre"
          placeholder="Juan"
          icon={<AuthIcon name="user" />}
          autoComplete="given-name"
          value={name}
          onChange={setName}
          required
          error={fieldErrors.name}
        />
        <AuthField
          label="Apellido"
          placeholder="Pérez"
          autoComplete="family-name"
          value={lastName}
          onChange={setLastName}
          required
          error={fieldErrors.lastName}
        />
      </div>

      <AuthField
        label="Nombre de la empresa"
        placeholder="Empresa S.A."
        icon={<AuthIcon name="bld" />}
        value={companyName}
        onChange={setCompanyName}
        required
        error={fieldErrors.companyName}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: A.text,
          }}
        >
          RUT / DNI de la empresa *
        </span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div
            style={{
              display: "inline-flex",
              background: "rgba(0,0,0,.04)",
              padding: 3,
              borderRadius: 10,
              gap: 2,
              flexShrink: 0,
            }}
          >
            {[
              { v: "rut" as const, l: "RUT Chile" },
              { v: "passport" as const, l: "Extranjera" },
            ].map((o) => {
              const active = docKind === o.v;
              return (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setDocKind(o.v)}
                  style={{
                    padding: "8px 13px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    background: active ? A.surface : "transparent",
                    color: active ? A.text : A.muted,
                    boxShadow: active ? "0 1px 4px rgba(0,0,0,.06)" : "none",
                    transition: "all .15s",
                  }}
                >
                  {o.l}
                </button>
              );
            })}
          </div>
          <div style={{ flex: 1, minWidth: 180, position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: A.subtle,
                display: "flex",
                pointerEvents: "none",
              }}
            >
              <AuthIcon name="id" />
            </span>
            <input
              type="text"
              placeholder={
                docKind === "rut" ? "76.123.456-7" : "EIN / VAT / Tax ID"
              }
              value={empresaRut}
              onChange={(e) => setEmpresaRut(e.target.value)}
              onFocus={() => setRutFocus(true)}
              onBlur={() => setRutFocus(false)}
              style={{
                width: "100%",
                padding: "13px 14px 13px 40px",
                background: rutFocus ? A.surface : "rgba(0,0,0,.025)",
                border: `1.5px solid ${
                  fieldErrors.empresaRut
                    ? A.rose
                    : rutFocus
                      ? A.accent
                      : "transparent"
                }`,
                borderRadius: 11,
                fontSize: 14,
                color: A.text,
                fontWeight: 500,
                boxShadow: rutFocus ? `0 0 0 4px ${A.accent}1c` : "none",
                transition: "all .15s",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
          </div>
        </div>
        {fieldErrors.empresaRut && (
          <span
            style={{
              fontSize: 11,
              color: A.rose,
              fontWeight: 600,
              lineHeight: 1.4,
            }}
          >
            {fieldErrors.empresaRut}
          </span>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        <AuthSelect
          label="Industria"
          icon={<AuthIcon name="fact" />}
          options={INDUSTRY_OPTIONS}
          value={industry}
          onChange={setIndustry}
          placeholder="Industria…"
        />
        <AuthField
          label="Sitio web"
          placeholder="https://empresa.cl"
          icon={<AuthIcon name="glb" />}
          value={website}
          onChange={setWebsite}
          error={fieldErrors.website}
        />
      </div>

      <AuthField
        label="Teléfono"
        type="tel"
        placeholder="+56 9 1234 5678"
        icon={<AuthIcon name="ph" />}
        autoComplete="tel"
        value={phone}
        onChange={setPhone}
        required
        error={fieldErrors.phone}
      />

      <AuthField
        label="Correo corporativo"
        type="email"
        placeholder="nombre@empresa.cl"
        icon={<AuthIcon name="mail" />}
        autoComplete="email"
        value={email}
        onChange={setEmail}
        required
        error={fieldErrors.email}
      />

      <label
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          cursor: "pointer",
          padding: "10px 12px",
          background: allowGenericEmail ? A.accentBg : "rgba(0,0,0,.025)",
          border: `1px solid ${
            allowGenericEmail ? A.accentBdr : "transparent"
          }`,
          borderRadius: 11,
          marginTop: -4,
          transition: "all .15s",
        }}
      >
        <input
          type="checkbox"
          checked={allowGenericEmail}
          onChange={(e) => setAllowGenericEmail(e.target.checked)}
          style={{
            width: 15,
            height: 15,
            marginTop: 2,
            accentColor: A.accent,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 12.5,
            color: A.text,
            lineHeight: 1.5,
            fontWeight: 500,
          }}
        >
          Mi empresa usa Gmail, Outlook u otro servicio genérico
        </span>
      </label>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        <AuthField
          label="Contraseña"
          type="password"
          placeholder="••••••••"
          icon={<AuthIcon name="lock" />}
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          required
          error={fieldErrors.password}
          hint="Mín. 8 caracteres, mayúscula, número y símbolo."
        />
        <AuthField
          label="Confirmar contraseña"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          required
          error={fieldErrors.confirmPassword}
        />
      </div>

      <label
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          cursor: "pointer",
          marginTop: 2,
        }}
      >
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
          style={{
            width: 15,
            height: 15,
            marginTop: 2,
            accentColor: A.accent,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 12,
            color: A.muted,
            lineHeight: 1.5,
          }}
        >
          Acepto la{" "}
          <Link
            href="/privacidad"
            style={{ color: A.accent, fontWeight: 700, textDecoration: "none" }}
          >
            Política de Privacidad
          </Link>{" "}
          y los{" "}
          <Link
            href="/terminos"
            style={{ color: A.accent, fontWeight: 700, textDecoration: "none" }}
          >
            Términos de Uso
          </Link>{" "}
          de PractiX en nombre de la empresa que represento.
        </span>
      </label>

      {submitError && (
        <div
          style={{
            padding: "10px 12px",
            background: A.roseBg,
            border: `1px solid ${A.rose}25`,
            borderRadius: 11,
            fontSize: 12.5,
            color: A.rose,
            fontWeight: 600,
            lineHeight: 1.5,
          }}
        >
          {submitError}
        </div>
      )}

      <SubmitButton loading={loading}>Crear cuenta empresa →</SubmitButton>

      <p
        style={{
          fontSize: 11.5,
          color: A.subtle,
          textAlign: "center",
          lineHeight: 1.5,
          marginTop: -2,
        }}
      >
        Al registrarte, tu cuenta queda{" "}
        <b style={{ color: A.muted }}>en revisión</b> hasta ser aprobada por el
        equipo de PractiX.
      </p>
    </form>
  );
}
