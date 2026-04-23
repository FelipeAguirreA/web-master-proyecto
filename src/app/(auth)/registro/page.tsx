"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, ArrowLeft } from "lucide-react";

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
type FormFields = "name" | "lastName" | "document" | "phone";

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
  "block text-[11px] font-semibold tracking-[0.08em] uppercase text-[#6D6A63] mb-2";

function inputCls(hasError?: boolean) {
  return hasError
    ? "w-full rounded-xl px-4 py-3 text-[14px] bg-[#FFF0ED] border border-[#FF6A3D]/30 focus:outline-none focus:border-[#FF6A3D] focus:shadow-[0_0_0_4px_rgba(255,106,61,0.08)] transition-all placeholder:text-[#9B9891] text-[#0A0909]"
    : "w-full rounded-xl px-4 py-3 text-[14px] bg-[#FAFAF8] border border-transparent hover:border-black/[0.05] focus:outline-none focus:border-[#FF6A3D]/40 focus:bg-white focus:shadow-[0_0_0_4px_rgba(255,106,61,0.08)] transition-all placeholder:text-[#9B9891] text-[#0A0909]";
}

export default function RegistroPage() {
  const { data: session, update } = useSession();
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    lastName: "",
    document: "",
    phone: "",
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
      errs.document = "RUT inválido. Verificá el dígito verificador";
    } else if (docType === "passport" && !validarPasaporte(form.document)) {
      errs.document = "Ingresá entre 6 y 20 caracteres alfanuméricos";
    }
    if (!form.phone.trim()) {
      errs.phone = "El teléfono es obligatorio";
    } else if (!validarTelefono(form.phone)) {
      errs.phone = "Ingresá solo dígitos (7–15 caracteres)";
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
        }),
      });

      let data: { error?: string } = {};
      try {
        data = await res.json();
      } catch {
        /* non-JSON */
      }

      if (!res.ok) {
        const msg = data.error ?? "Error al guardar. Intentá de nuevo.";
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
        "No se pudo conectar con el servidor. Verificá tu conexión.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen bg-[#FAFAF8] text-[#0A0909] antialiased overflow-x-hidden flex flex-col items-center justify-center px-4 py-12"
      style={{ fontFamily: "var(--font-onest), ui-sans-serif, system-ui" }}
    >
      {/* Ambient mesh */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute top-[-15%] left-[-10%] w-[55%] h-[50%] rounded-full opacity-55"
          style={{
            background:
              "radial-gradient(closest-side, rgba(255,166,122,0.45), rgba(255,166,122,0) 70%)",
            filter: "blur(40px)",
          }}
        />
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[50%] rounded-full opacity-50"
          style={{
            background:
              "radial-gradient(closest-side, rgba(255,210,180,0.5), rgba(255,210,180,0) 70%)",
            filter: "blur(50px)",
          }}
        />
      </div>

      {/* Volver al inicio */}
      <Link
        href="/"
        className="absolute top-6 left-6 z-20 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#6D6A63] hover:text-[#0A0909] transition-colors group"
      >
        <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
        Volver al inicio
      </Link>

      {/* Logo */}
      <Link href="/" className="relative z-10 flex items-center gap-2 mb-2">
        <span className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-[#FF6A3D] to-[#FF9B6A] shadow-[0_4px_12px_-2px_rgba(255,106,61,0.5),inset_0_1px_0_rgba(255,255,255,0.4)]">
          <span className="text-white font-bold text-[17px] leading-none tracking-tight">
            P
          </span>
        </span>
        <span className="text-[19px] font-semibold tracking-[-0.015em] text-[#0A0909]">
          PractiX
        </span>
      </Link>
      <p className="relative z-10 text-[13px] text-[#6D6A63] mb-8">
        Completá tu perfil para activar tu cuenta
      </p>

      {/* Step indicator */}
      <div className="relative z-10 flex items-center gap-0 mb-8">
        {STEPS.map((step, i) => {
          const isActive = i === ACTIVE_STEP;
          const isDone = i < ACTIVE_STEP;
          return (
            <div key={step} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`relative w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold transition-all ${
                    isActive
                      ? "bg-gradient-to-br from-[#FF6A3D] to-[#FF8A52] text-white shadow-[0_4px_12px_-2px_rgba(255,106,61,0.45),inset_0_1px_0_rgba(255,255,255,0.3)]"
                      : isDone
                        ? "bg-[#0A0909] text-white"
                        : "bg-white border border-black/[0.08] text-[#9B9891]"
                  }`}
                >
                  {isDone ? "✓" : i + 1}
                </div>
                <span
                  className={`text-[10px] font-semibold tracking-[0.08em] uppercase mt-1.5 ${
                    isActive
                      ? "text-[#FF6A3D]"
                      : isDone
                        ? "text-[#0A0909]"
                        : "text-[#9B9891]"
                  }`}
                >
                  {step}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-14 h-px mx-2 mb-5 ${isDone ? "bg-[#0A0909]/30" : "bg-black/[0.08]"}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Card */}
      <div className="relative z-10 bg-white rounded-[20px] sm:rounded-[24px] border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_50px_-20px_rgba(20,15,10,0.15)] p-5 sm:p-7 w-full max-w-[440px]">
        <div className="mb-6">
          <h1 className="text-[22px] font-semibold tracking-[-0.015em] text-[#0A0909]">
            Completá tu perfil
          </h1>
          <p className="text-[13px] text-[#6D6A63] mt-1 leading-[1.5]">
            Solo necesitamos estos datos una vez para activar tu cuenta.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Nombre + Apellido */}
          <div>
            <label className={LABEL_CLS}>Nombre completo</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  value={form.name}
                  onChange={handleChange("name")}
                  placeholder="Alex"
                  className={inputCls(!!errors.name)}
                />
                {errors.name && (
                  <p className="text-[11.5px] text-[#C74A1E] mt-1">
                    {errors.name}
                  </p>
                )}
              </div>
              <div>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={handleChange("lastName")}
                  placeholder="Martínez"
                  className={inputCls(!!errors.lastName)}
                />
                {errors.lastName && (
                  <p className="text-[11.5px] text-[#C74A1E] mt-1">
                    {errors.lastName}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Rol + documento */}
          <div>
            <label className={LABEL_CLS}>Tipo de documento</label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => handleDocTypeChange("rut")}
                className={`relative flex flex-col items-center gap-1.5 py-3.5 rounded-xl border transition-all ${
                  docType === "rut"
                    ? "border-[#FF6A3D]/40 bg-gradient-to-br from-[#FFF8F2] to-[#FFECD9] text-[#0A0909]"
                    : "border-black/[0.06] bg-white text-[#6D6A63] hover:border-black/[0.12]"
                }`}
              >
                <span className="text-[22px] leading-none">🇨🇱</span>
                <span className="text-[12.5px] font-semibold">RUT Chile</span>
              </button>
              <button
                type="button"
                onClick={() => handleDocTypeChange("passport")}
                className={`relative flex flex-col items-center gap-1.5 py-3.5 rounded-xl border transition-all ${
                  docType === "passport"
                    ? "border-[#FF6A3D]/40 bg-gradient-to-br from-[#FFF8F2] to-[#FFECD9] text-[#0A0909]"
                    : "border-black/[0.06] bg-white text-[#6D6A63] hover:border-black/[0.12]"
                }`}
              >
                <span className="text-[22px] leading-none">🌐</span>
                <span className="text-[12.5px] font-semibold">Extranjero</span>
              </button>
            </div>
            <input
              type="text"
              value={form.document}
              onChange={handleDocumentChange}
              placeholder={docType === "rut" ? "12.345.678-9" : "AB123456"}
              maxLength={docType === "rut" ? 12 : 20}
              className={inputCls(!!errors.document)}
            />
            {errors.document ? (
              <p className="text-[11.5px] text-[#C74A1E] mt-1">
                {errors.document}
              </p>
            ) : (
              <p className="text-[11.5px] text-[#9B9891] mt-1.5 leading-[1.45]">
                {docType === "rut"
                  ? "Formato: 12.345.678-9"
                  : "Pasaporte o documento (6–20 caracteres)"}
              </p>
            )}
          </div>

          {/* Teléfono */}
          <div>
            <label className={LABEL_CLS}>Teléfono</label>
            <div
              className={`flex rounded-xl overflow-hidden border transition-all ${
                errors.phone
                  ? "border-[#FF6A3D]/30 bg-[#FFF0ED]"
                  : "border-transparent bg-[#FAFAF8] hover:border-black/[0.05] focus-within:border-[#FF6A3D]/40 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(255,106,61,0.08)]"
              }`}
            >
              <select
                value={country.code}
                onChange={handleCountryChange}
                className={`pl-3 pr-2 py-3 text-[13px] cursor-pointer focus:outline-none border-r transition-colors ${
                  errors.phone
                    ? "border-[#FF6A3D]/20 bg-transparent text-[#0A0909]"
                    : "border-black/[0.06] bg-transparent text-[#0A0909]"
                }`}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.dialCode}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                value={form.phone}
                onChange={handleChange("phone")}
                placeholder="912345678"
                className="flex-1 px-4 py-3 text-[14px] bg-transparent focus:outline-none placeholder:text-[#9B9891] text-[#0A0909]"
              />
            </div>
            {errors.phone && (
              <p className="text-[11.5px] text-[#C74A1E] mt-1">
                {errors.phone}
              </p>
            )}
          </div>

          {serverError && (
            <div className="bg-[#FFF0ED] border border-[#FF6A3D]/20 text-[#C74A1E] text-[12.5px] px-3 py-2.5 rounded-lg leading-[1.4]">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full inline-flex items-center justify-center gap-1.5 bg-gradient-to-br from-[#FF6A3D] to-[#FF8A52] text-white font-semibold py-3.5 rounded-xl text-[14px] shadow-[0_4px_16px_-4px_rgba(255,106,61,0.55),inset_0_1px_0_rgba(255,255,255,0.3)] hover:shadow-[0_8px_24px_-6px_rgba(255,106,61,0.7),inset_0_1px_0_rgba(255,255,255,0.3)] transition-all disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
          >
            <span
              aria-hidden
              className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
            />
            <span className="relative">
              {loading ? "Guardando…" : "Continuar"}
            </span>
            {!loading && (
              <span className="relative text-[11px] transition-transform group-hover:translate-x-0.5">
                →
              </span>
            )}
          </button>

          <p className="text-center text-[12.5px] text-[#6D6A63]">
            ¿Ya tenés una cuenta?{" "}
            <Link
              href="/login"
              className="text-[#FF6A3D] font-semibold hover:text-[#E85A2D] transition-colors"
            >
              Iniciar sesión
            </Link>
          </p>
        </form>
      </div>

      {/* PractiX Insight — warm card */}
      <div className="relative z-10 mt-5 w-full max-w-[440px]">
        <div className="relative bg-gradient-to-br from-[#FFF8F2] to-[#FFECD9] rounded-2xl p-4 border border-[#FF6A3D]/10 overflow-hidden">
          <div
            aria-hidden
            className="absolute -top-6 -right-6 w-20 h-20 bg-[#FF6A3D]/12 rounded-full blur-xl"
          />
          <div className="relative flex items-start gap-3">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white shadow-[0_2px_8px_-1px_rgba(255,106,61,0.3)]">
              <Sparkles className="w-4 h-4 text-[#FF6A3D]" />
            </span>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#FF6A3D] mb-1">
                PractiX Insight
              </p>
              <p className="text-[12px] text-[#4A4843] leading-[1.55]">
                Completá tu perfil para que nuestra IA te recomiende prácticas
                que se ajusten a tus habilidades en menos de 24 horas.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 mt-8 text-[11.5px] text-[#6D6A63] text-center">
        © {new Date().getFullYear()} PractiX ·{" "}
        <Link href="#" className="hover:text-[#0A0909] transition-colors">
          Privacidad
        </Link>{" "}
        ·{" "}
        <Link href="#" className="hover:text-[#0A0909] transition-colors">
          Términos
        </Link>{" "}
        ·{" "}
        <Link href="#" className="hover:text-[#0A0909] transition-colors">
          Contacto
        </Link>
      </div>
    </div>
  );
}
