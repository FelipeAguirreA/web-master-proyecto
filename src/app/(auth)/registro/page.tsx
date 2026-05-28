"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { logout } from "@/lib/client/logout";

// ── Países ───────────────────────────────────────────────────────────────────
const COUNTRIES = [
  { code: "CL", name: "Chile", dialCode: "+56", flag: "🇨🇱" },
  { code: "AR", name: "Argentina", dialCode: "+54", flag: "🇦🇷" },
  { code: "BO", name: "Bolivia", dialCode: "+591", flag: "🇧🇴" },
  { code: "BR", name: "Brasil", dialCode: "+55", flag: "🇧🇷" },
  { code: "CO", name: "Colombia", dialCode: "+57", flag: "🇨🇴" },
  { code: "CR", name: "Costa Rica", dialCode: "+506", flag: "🇨🇷" },
  { code: "EC", name: "Ecuador", dialCode: "+593", flag: "🇪🇨" },
  { code: "ES", name: "España", dialCode: "+34", flag: "🇪🇸" },
  { code: "MX", name: "México", dialCode: "+52", flag: "🇲🇽" },
  { code: "PA", name: "Panamá", dialCode: "+507", flag: "🇵🇦" },
  { code: "PE", name: "Perú", dialCode: "+51", flag: "🇵🇪" },
  { code: "PY", name: "Paraguay", dialCode: "+595", flag: "🇵🇾" },
  { code: "UY", name: "Uruguay", dialCode: "+598", flag: "🇺🇾" },
  { code: "US", name: "Estados Unidos", dialCode: "+1", flag: "🇺🇸" },
  { code: "VE", name: "Venezuela", dialCode: "+58", flag: "🇻🇪" },
];

type DocType = "rut" | "passport";
type FormFields =
  | "name"
  | "lastName"
  | "document"
  | "phone"
  | "acceptedTerms"
  | "isAdult";

// ── Validaciones ─────────────────────────────────────────────────────────────
function validarRUT(rut: string): boolean {
  const limpio = rut.replace(/[.\s]/g, "").toUpperCase();
  const match = limpio.match(/^(\d{7,8})-?([0-9K])$/);
  if (!match) return false;
  const cuerpo = match[1];
  const dv = match[2];
  let suma = 0;
  let multiplo = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i]) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }
  const resto = 11 - (suma % 11);
  const dvEsperado = resto === 11 ? "0" : resto === 10 ? "K" : String(resto);
  return dv === dvEsperado;
}

function validarPasaporte(val: string): boolean {
  return /^[A-Z0-9]{6,20}$/i.test(val.trim());
}

function validarTelefono(phone: string): boolean {
  return /^\d{7,15}$/.test(phone.replace(/[\s\-\(\)]/g, ""));
}

function formatRUT(value: string): string {
  const limpio = value.replace(/[^0-9kK]/g, "").toUpperCase();
  if (limpio.length === 0) return "";
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  const conPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return cuerpo.length > 0 ? `${conPuntos}-${dv}` : dv;
}

// ── Pasos ─────────────────────────────────────────────────────────────────────
const STEPS = ["Tu cuenta", "Tu perfil", "Listo"];
const ACTIVE_STEP = 1; // index

const LABEL_CLS =
  "block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted mb-2";

function inputCls(hasError?: boolean) {
  return hasError
    ? "w-full rounded-xl border border-rose/30 bg-rose-bg/50 px-4 py-3 text-base text-text placeholder:text-subtle focus:border-rose focus:outline-none focus:shadow-[0_0_0_4px_var(--color-rose)/0.08] sm:text-[14px] transition-all"
    : "w-full rounded-xl border border-transparent bg-bg px-4 py-3 text-base text-text placeholder:text-subtle hover:border-border focus:border-accent/40 focus:bg-surface focus:outline-none focus:shadow-[0_0_0_4px_var(--color-accent)/0.08] sm:text-[14px] transition-all";
}

export default function RegistroPage() {
  const { data: session, update } = useSession();
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    lastName: "",
    document: "",
    phone: "",
    acceptedTerms: false,
    isAdult: false,
  });
  const [docType, setDocType] = useState<DocType>("rut");
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [errors, setErrors] = useState<Partial<Record<FormFields, string>>>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session?.user?.name) {
      const parts = session.user.name.split(" ");
      setForm((prev) => ({
        ...prev,
        name: parts[0] ?? "",
        lastName: parts.slice(1).join(" ") ?? "",
      }));
    }
  }, [session]);

  const validate = (): Partial<Record<FormFields, string>> => {
    const errs: Partial<Record<FormFields, string>> = {};
    if (!form.name.trim() || form.name.trim().length < 2)
      errs.name = "El nombre debe tener al menos 2 caracteres";
    if (!form.lastName.trim() || form.lastName.trim().length < 2)
      errs.lastName = "El apellido debe tener al menos 2 caracteres";
    if (!form.document.trim()) {
      errs.document =
        docType === "rut"
          ? "El RUT es obligatorio"
          : "El número de documento es obligatorio";
    } else if (docType === "rut" && !validarRUT(form.document)) {
      errs.document = "RUT inválido. Verifica el dígito verificador";
    } else if (docType === "passport" && !validarPasaporte(form.document)) {
      errs.document = "Ingresa entre 6 y 20 caracteres alfanuméricos";
    }
    if (!form.phone.trim()) {
      errs.phone = "El teléfono es obligatorio";
    } else if (!validarTelefono(form.phone)) {
      errs.phone = "Ingresa solo dígitos (7–15 caracteres)";
    }
    if (!form.acceptedTerms) {
      errs.acceptedTerms =
        "Debes aceptar la Política de Privacidad y los Términos para continuar";
    }
    if (!form.isAdult) {
      errs.isAdult =
        "Para registrarte declaras tener 18 años o más. Si eres menor, contacta a soporte@practix.cl con tu tutor.";
    }
    return errs;
  };

  const clearError = (field: FormFields) =>
    setErrors((prev) => ({ ...prev, [field]: undefined }));

  const handleDocTypeChange = (type: DocType) => {
    setDocType(type);
    setForm((prev) => ({ ...prev, document: "" }));
    clearError("document");
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val =
      docType === "rut"
        ? formatRUT(e.target.value)
        : e.target.value.toUpperCase();
    setForm((prev) => ({ ...prev, document: val }));
    clearError("document");
  };

  const handleChange =
    (field: FormFields) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      clearError(field);
    };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = COUNTRIES.find((c) => c.code === e.target.value);
    if (selected) {
      setCountry(selected);
      clearError("phone");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/users/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          lastName: form.lastName,
          rut: form.document,
          documentType: docType,
          phone: `${country.dialCode}${form.phone}`,
          acceptedTerms: form.acceptedTerms,
          isAdult: form.isAdult,
        }),
      });

      let data: { error?: string } = {};
      try {
        data = await res.json();
      } catch {
        /* non-JSON */
      }

      if (!res.ok) {
        const msg = data.error ?? "Error al guardar. Intenta de nuevo.";
        if (
          msg.toLowerCase().includes("rut") ||
          msg.toLowerCase().includes("documento")
        ) {
          setErrors({ document: msg });
        } else if (msg.toLowerCase().includes("teléfono")) {
          setErrors({ phone: msg });
        } else {
          setServerError(msg);
        }
        return;
      }

      await update({ registrationCompleted: true });
      router.push("/dashboard/estudiante");
    } catch {
      setServerError(
        "No se pudo conectar con el servidor. Verifica tu conexión.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden bg-bg px-4 py-12 text-text antialiased">
      {/* Ambient mesh */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-[15%] -left-[10%] h-[50%] w-[55%] rounded-full opacity-55 [background:radial-gradient(closest-side,rgba(255,166,122,0.45),rgba(255,166,122,0)_70%)] [filter:blur(40px)]" />
        <div className="absolute -bottom-[10%] -right-[10%] h-[50%] w-[55%] rounded-full opacity-50 [background:radial-gradient(closest-side,rgba(255,210,180,0.5),rgba(255,210,180,0)_70%)] [filter:blur(50px)]" />
      </div>

      {/* Logo */}
      <Link
        href="/"
        className="relative z-10 mb-2 flex items-center gap-2 no-underline"
      >
        <span className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-hi shadow-[0_4px_12px_-2px_var(--color-accent)/0.5,inset_0_1px_0_rgba(255,255,255,0.4)]">
          <span className="text-[17px] font-bold leading-none tracking-tight text-white">
            P
          </span>
        </span>
        <span className="text-[19px] font-semibold tracking-[-0.015em] text-text">
          PractiX
        </span>
      </Link>
      <p className="relative z-10 mb-8 text-[13px] text-muted">
        Completa tu perfil para activar tu cuenta
      </p>

      {/* Step indicator */}
      <div className="relative z-10 mb-8 flex items-center gap-0">
        {STEPS.map((step, i) => {
          const isActive = i === ACTIVE_STEP;
          const isDone = i < ACTIVE_STEP;
          return (
            <div key={step} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`relative flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold transition-all ${
                    isActive
                      ? "bg-gradient-to-br from-accent to-accent-hi text-white shadow-[0_4px_12px_-2px_var(--color-accent)/0.45,inset_0_1px_0_rgba(255,255,255,0.3)]"
                      : isDone
                        ? "bg-text text-white"
                        : "border border-border bg-surface text-subtle"
                  }`}
                >
                  {isDone ? "✓" : i + 1}
                </div>
                <span
                  className={`mt-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                    isActive
                      ? "text-accent"
                      : isDone
                        ? "text-text"
                        : "text-subtle"
                  }`}
                >
                  {step}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`mx-2 mb-5 h-px w-14 ${isDone ? "bg-text/30" : "bg-border"}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-[440px] rounded-[20px] border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_50px_-20px_rgba(20,15,10,0.15)] sm:rounded-[24px] sm:p-7">
        <div className="mb-6">
          <h1 className="text-[22px] font-semibold tracking-[-0.015em] text-text">
            Completa tu perfil
          </h1>
          <p className="mt-1 text-[13px] leading-[1.5] text-muted">
            Solo necesitamos estos datos una vez para activar tu cuenta.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Nombre + Apellido — 2 cols en sm */}
          <div>
            <label htmlFor="register-name" className={LABEL_CLS}>
              Nombre completo
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <input
                  id="register-name"
                  name="name"
                  type="text"
                  autoComplete="given-name"
                  value={form.name}
                  onChange={handleChange("name")}
                  placeholder="Alex"
                  aria-label="Nombre"
                  aria-invalid={!!errors.name}
                  className={inputCls(!!errors.name)}
                />
                {errors.name && (
                  <p className="mt-1 text-[11.5px] text-rose">{errors.name}</p>
                )}
              </div>
              <div>
                <input
                  id="register-lastname"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  value={form.lastName}
                  onChange={handleChange("lastName")}
                  placeholder="Martínez"
                  aria-label="Apellido"
                  aria-invalid={!!errors.lastName}
                  className={inputCls(!!errors.lastName)}
                />
                {errors.lastName && (
                  <p className="mt-1 text-[11.5px] text-rose">
                    {errors.lastName}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Tipo de documento */}
          <div>
            {/* <span> en vez de <label>: etiqueta conceptual sobre un grupo de controles */}
            <span className={LABEL_CLS}>Tipo de documento</span>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDocTypeChange("rut")}
                className={`relative flex min-h-[44px] flex-col items-center gap-1.5 rounded-xl border py-3.5 transition-all ${
                  docType === "rut"
                    ? "border-accent/40 bg-gradient-to-br from-cream to-accent-lo/60 text-text"
                    : "border-border bg-surface text-muted hover:border-border-hi"
                }`}
              >
                <span className="text-[22px] leading-none">🇨🇱</span>
                <span className="text-[12.5px] font-semibold">RUT Chile</span>
              </button>
              <button
                type="button"
                onClick={() => handleDocTypeChange("passport")}
                className={`relative flex min-h-[44px] flex-col items-center gap-1.5 rounded-xl border py-3.5 transition-all ${
                  docType === "passport"
                    ? "border-accent/40 bg-gradient-to-br from-cream to-accent-lo/60 text-text"
                    : "border-border bg-surface text-muted hover:border-border-hi"
                }`}
              >
                <span className="text-[22px] leading-none">🌐</span>
                <span className="text-[12.5px] font-semibold">Extranjero</span>
              </button>
            </div>
            <input
              id="register-document"
              name="document"
              type="text"
              autoComplete="off"
              value={form.document}
              onChange={handleDocumentChange}
              placeholder={docType === "rut" ? "12.345.678-9" : "AB123456"}
              maxLength={docType === "rut" ? 12 : 20}
              aria-label={docType === "rut" ? "RUT" : "Documento de identidad"}
              aria-invalid={!!errors.document}
              className={inputCls(!!errors.document)}
            />
            {errors.document ? (
              <p className="mt-1 text-[11.5px] text-rose">{errors.document}</p>
            ) : (
              <p className="mt-1.5 text-[11.5px] leading-[1.45] text-subtle">
                {docType === "rut"
                  ? "Formato: 12.345.678-9"
                  : "Pasaporte o documento (6–20 caracteres)"}
              </p>
            )}
          </div>

          {/* Teléfono */}
          <div>
            <label htmlFor="register-phone" className={LABEL_CLS}>
              Teléfono
            </label>
            <div
              className={`flex overflow-hidden rounded-xl border transition-all ${
                errors.phone
                  ? "border-rose/30 bg-rose-bg/50"
                  : "border-transparent bg-bg hover:border-border focus-within:border-accent/40 focus-within:bg-surface focus-within:shadow-[0_0_0_4px_var(--color-accent)/0.08]"
              }`}
            >
              <select
                id="register-country"
                name="country"
                value={country.code}
                onChange={handleCountryChange}
                aria-label="Código de país del teléfono"
                className="cursor-pointer border-r border-border bg-transparent py-3 pl-3 pr-2 text-[13px] text-text focus:outline-none"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.dialCode}
                  </option>
                ))}
              </select>
              <input
                id="register-phone"
                name="phone"
                type="tel"
                autoComplete="tel-national"
                value={form.phone}
                onChange={handleChange("phone")}
                placeholder="912345678"
                aria-label="Número de teléfono"
                aria-invalid={!!errors.phone}
                className="h-11 flex-1 bg-transparent px-4 py-3 text-base text-text placeholder:text-subtle focus:outline-none sm:text-[14px]"
              />
            </div>
            {errors.phone && (
              <p className="mt-1 text-[11.5px] text-rose">{errors.phone}</p>
            )}
          </div>

          <div className="space-y-2.5 pt-1">
            <label className="group flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                id="register-is-adult"
                checked={form.isAdult}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, isAdult: e.target.checked }));
                  clearError("isAdult");
                }}
                className="mt-0.5 h-4 w-4 cursor-pointer rounded border-border accent-accent focus:ring-2 focus:ring-accent/20"
              />
              <span className="text-[12.5px] leading-[1.5] text-text">
                Declaro que tengo 18 años o más.
              </span>
            </label>
            {errors.isAdult && (
              <p className="ml-6 -mt-1 text-[11.5px] text-rose">
                {errors.isAdult}
              </p>
            )}

            <label className="group flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                id="register-accept-terms"
                checked={form.acceptedTerms}
                onChange={(e) => {
                  setForm((prev) => ({
                    ...prev,
                    acceptedTerms: e.target.checked,
                  }));
                  clearError("acceptedTerms");
                }}
                className="mt-0.5 h-4 w-4 cursor-pointer rounded border-border accent-accent focus:ring-2 focus:ring-accent/20"
              />
              <span className="text-[12.5px] leading-[1.5] text-text">
                Acepto la{" "}
                <Link
                  href="/privacidad"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-accent hover:underline"
                >
                  Política de Privacidad
                </Link>{" "}
                y los{" "}
                <Link
                  href="/terminos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-accent hover:underline"
                >
                  Términos de Uso
                </Link>{" "}
                de PractiX.
              </span>
            </label>
            {errors.acceptedTerms && (
              <p className="ml-6 -mt-1 text-[11.5px] text-rose">
                {errors.acceptedTerms}
              </p>
            )}
          </div>

          {serverError && (
            <div
              role="alert"
              className="rounded-lg border border-rose/20 bg-rose-bg px-3 py-2.5 text-[12.5px] leading-[1.4] text-rose"
            >
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="group relative flex min-h-[44px] w-full items-center justify-center gap-1.5 overflow-hidden rounded-xl bg-gradient-to-br from-accent to-accent-hi px-4 py-3.5 text-[14px] font-semibold text-white shadow-[0_4px_16px_-4px_var(--color-accent)/0.55,inset_0_1px_0_rgba(255,255,255,0.3)] transition-all hover:shadow-[0_8px_24px_-6px_var(--color-accent)/0.7,inset_0_1px_0_rgba(255,255,255,0.3)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            <span
              aria-hidden
              className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
            />
            <span className="relative">
              {loading ? "Guardando…" : "Continuar"}
            </span>
          </button>

          <p className="text-center text-[12.5px] text-muted">
            ¿No quieres continuar con la creación de tu cuenta?{" "}
            <button
              type="button"
              onClick={() => logout()}
              className="cursor-pointer border-none bg-transparent p-0 font-semibold text-accent no-underline transition-opacity hover:opacity-75"
            >
              Haz clic aquí para salir
            </button>
          </p>
        </form>
      </div>

      {/* PractiX Insight — warm card */}
      <div className="relative z-10 mt-5 w-full max-w-[440px]">
        <div className="relative overflow-hidden rounded-2xl border border-accent-bdr bg-gradient-to-br from-cream to-accent-lo/60 p-4">
          <div
            aria-hidden
            className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-accent/[0.12] blur-xl"
          />
          <div className="relative flex items-start gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-surface shadow-[0_2px_8px_-1px_var(--color-accent)/0.3]">
              <Sparkles className="h-4 w-4 text-accent" />
            </span>
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-accent">
                PractiX Insight
              </p>
              <p className="text-[12px] leading-[1.55] text-text">
                Completa tu perfil para que nuestra IA te recomiende prácticas
                que se ajusten a tus habilidades en menos de 24 horas.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 mt-8 text-center text-[11.5px] text-muted">
        © {new Date().getFullYear()} PractiX ·{" "}
        <Link
          href="/privacidad"
          className="text-muted no-underline transition-colors hover:text-text"
        >
          Privacidad
        </Link>{" "}
        ·{" "}
        <Link
          href="/terminos"
          className="text-muted no-underline transition-colors hover:text-text"
        >
          Términos
        </Link>{" "}
        ·{" "}
        <a
          href="mailto:soporte@practix.cl"
          className="text-muted no-underline transition-colors hover:text-text"
        >
          Contacto
        </a>
      </div>
    </div>
  );
}
