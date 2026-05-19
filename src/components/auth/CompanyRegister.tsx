"use client";

import { useState } from "react";
import Link from "next/link";
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

  /* ── RUT input classes (reuses AuthField pattern) ── */
  const rutInputCls = [
    "h-11 w-full rounded-[11px] border-[1.5px] pl-10 pr-3.5 text-sm font-medium text-text outline-none transition-all",
    fieldErrors.empresaRut
      ? "border-rose bg-rose-bg/40 shadow-[0_0_0_4px_var(--color-rose)/0.11]"
      : rutFocus
        ? "border-accent bg-surface shadow-[0_0_0_4px_var(--color-accent)/0.11]"
        : "border-transparent bg-dark/[0.025]",
  ].join(" ");

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      {/* Nombre + Apellido — 2 cols en sm, 1 en mobile */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <AuthField
          label="Nombre"
          name="given-name"
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
          name="family-name"
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
        name="organization"
        placeholder="Empresa S.A."
        icon={<AuthIcon name="bld" />}
        autoComplete="organization"
        value={companyName}
        onChange={setCompanyName}
        required
        error={fieldErrors.companyName}
      />

      {/* RUT / DNI section */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[12px] font-bold tracking-[0.1px] text-text">
          RUT / DNI de la empresa *
        </span>
        <div className="flex flex-wrap gap-2">
          {/* Doc kind toggle */}
          <div className="inline-flex shrink-0 gap-0.5 rounded-[10px] bg-dark/[0.04] p-0.5">
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
                  className={`min-h-[36px] rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                    active
                      ? "bg-surface text-text shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
                      : "bg-transparent text-muted"
                  }`}
                >
                  {o.l}
                </button>
              );
            })}
          </div>

          {/* RUT input */}
          <div className="relative min-w-[180px] flex-1">
            <span className="pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 text-subtle">
              <AuthIcon name="id" />
            </span>
            <input
              id="empresa-rut"
              name="empresa-rut"
              type="text"
              placeholder={
                docKind === "rut" ? "76.123.456-7" : "EIN / VAT / Tax ID"
              }
              value={empresaRut}
              onChange={(e) => setEmpresaRut(e.target.value)}
              onFocus={() => setRutFocus(true)}
              onBlur={() => setRutFocus(false)}
              aria-invalid={!!fieldErrors.empresaRut}
              className={rutInputCls}
            />
          </div>
        </div>
        {fieldErrors.empresaRut && (
          <span className="text-[11px] font-semibold leading-[1.4] text-rose">
            {fieldErrors.empresaRut}
          </span>
        )}
      </div>

      {/* Industria + Sitio web — 2 cols en sm */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <AuthSelect
          label="Industria"
          name="industry"
          icon={<AuthIcon name="fact" />}
          options={INDUSTRY_OPTIONS}
          value={industry}
          onChange={setIndustry}
          placeholder="Industria…"
        />
        <AuthField
          label="Sitio web"
          name="url"
          placeholder="https://empresa.cl"
          icon={<AuthIcon name="glb" />}
          autoComplete="url"
          value={website}
          onChange={setWebsite}
          error={fieldErrors.website}
        />
      </div>

      <AuthField
        label="Teléfono"
        name="tel"
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
        name="email"
        type="email"
        placeholder="nombre@empresa.cl"
        icon={<AuthIcon name="mail" />}
        autoComplete="email"
        value={email}
        onChange={setEmail}
        required
        error={fieldErrors.email}
      />

      {/* Checkbox: email genérico */}
      <label
        className={`-mt-1 flex cursor-pointer items-start gap-2 rounded-[11px] border p-3 transition-all ${
          allowGenericEmail
            ? "border-accent-bdr bg-accent-bg"
            : "border-transparent bg-dark/[0.025]"
        }`}
      >
        <input
          type="checkbox"
          checked={allowGenericEmail}
          onChange={(e) => setAllowGenericEmail(e.target.checked)}
          className="mt-0.5 h-[15px] w-[15px] shrink-0 accent-accent"
        />
        <span className="text-[12.5px] font-medium leading-relaxed text-text">
          Mi empresa usa Gmail, Outlook u otro servicio genérico
        </span>
      </label>

      {/* Contraseñas — 2 cols en sm */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <AuthField
          label="Contraseña"
          name="new-password"
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
          name="confirm-password"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          required
          error={fieldErrors.confirmPassword}
        />
      </div>

      {/* Checkbox: términos */}
      <label className="mt-0.5 flex cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
          className="mt-0.5 h-[15px] w-[15px] shrink-0 accent-accent"
        />
        <span className="text-xs leading-relaxed text-muted">
          Acepto la{" "}
          <Link
            href="/privacidad"
            className="font-bold text-accent no-underline hover:opacity-75"
          >
            Política de Privacidad
          </Link>{" "}
          y los{" "}
          <Link
            href="/terminos"
            className="font-bold text-accent no-underline hover:opacity-75"
          >
            Términos de Uso
          </Link>{" "}
          de PractiX en nombre de la empresa que represento.
        </span>
      </label>

      {submitError && (
        <div
          role="alert"
          className="rounded-[11px] border border-rose/[0.15] bg-rose-bg px-3 py-2.5 text-[12.5px] font-semibold leading-relaxed text-rose"
        >
          {submitError}
        </div>
      )}

      <SubmitButton loading={loading}>Crear cuenta empresa</SubmitButton>

      <p className="-mt-0.5 text-center text-[11.5px] leading-relaxed text-subtle">
        Al registrarte, tu cuenta queda{" "}
        <b className="text-muted">en revisión</b> hasta ser aprobada por el
        equipo de PractiX.
      </p>
    </form>
  );
}
