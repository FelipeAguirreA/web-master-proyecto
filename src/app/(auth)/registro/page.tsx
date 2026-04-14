"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles } from "lucide-react";

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

  const inputCls = (field: FormFields) =>
    `w-full border rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors ${
      errors[field]
        ? "border-red-300 bg-red-50 focus:border-red-400"
        : "border-gray-200 bg-gray-50 focus:border-brand-400 focus:bg-white"
    }`;

  return (
    <div className="min-h-screen bg-[#eeeef8] flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Decoraciones de fondo */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-brand-100/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-accent-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Logo */}
      <Link
        href="/"
        className="font-black text-3xl tracking-tighter mb-1 relative"
      >
        <span className="text-brand-700">Practi</span>
        <span className="text-accent-500">X</span>
      </Link>
      <p className="text-sm text-gray-400 mb-8 relative">
        Intelligence for Professional Growth
      </p>

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8 relative">
        {STEPS.map((step, i) => (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black transition-all ${
                  i === 0
                    ? "bg-gray-300 text-gray-500"
                    : i === 1
                      ? "bg-brand-600 text-white shadow-lg shadow-brand-600/25"
                      : "bg-gray-100 text-gray-300"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`text-[10px] font-black uppercase tracking-widest mt-1.5 ${
                  i === 1 ? "text-brand-600" : "text-gray-300"
                }`}
              >
                {step}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`w-16 h-px mx-2 mb-5 ${i === 0 ? "bg-gray-200" : "bg-gray-200"}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md relative">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
            Completá tu perfil
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Solo necesitamos estos datos una vez para activar tu cuenta.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Nombre + Apellido */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
              Nombre completo
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  value={form.name}
                  onChange={handleChange("name")}
                  placeholder="Ej. Alex"
                  className={inputCls("name")}
                />
                {errors.name && (
                  <p className="text-xs text-red-600 mt-1">{errors.name}</p>
                )}
              </div>
              <div>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={handleChange("lastName")}
                  placeholder="Ej. Martínez"
                  className={inputCls("lastName")}
                />
                {errors.lastName && (
                  <p className="text-xs text-red-600 mt-1">{errors.lastName}</p>
                )}
              </div>
            </div>
          </div>

          {/* Documento de identidad */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
              Seleccioná tu rol
            </label>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                type="button"
                onClick={() => handleDocTypeChange("rut")}
                className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all ${
                  docType === "rut"
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-gray-200 text-gray-400 hover:border-gray-300"
                }`}
              >
                <span className="text-2xl">🎓</span>
                <span className="text-sm font-bold">Soy Estudiante</span>
              </button>
              <button
                type="button"
                onClick={() => handleDocTypeChange("passport")}
                className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all ${
                  docType === "passport"
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-gray-200 text-gray-400 hover:border-gray-300"
                }`}
              >
                <span className="text-2xl">🏢</span>
                <span className="text-sm font-bold">Soy Empresa</span>
              </button>
            </div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
              Documento de identidad
            </label>
            <input
              type="text"
              value={form.document}
              onChange={handleDocumentChange}
              placeholder={docType === "rut" ? "12.345.678-9" : "AB123456"}
              maxLength={docType === "rut" ? 12 : 20}
              className={inputCls("document")}
            />
            {errors.document ? (
              <p className="text-xs text-red-600 mt-1">{errors.document}</p>
            ) : (
              <p className="text-xs text-gray-400 mt-1">
                {docType === "rut"
                  ? "Formato: 12.345.678-9"
                  : "Número de pasaporte o documento (6–20 caracteres)"}
              </p>
            )}
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
              Teléfono
            </label>
            <div
              className={`flex rounded-xl border overflow-hidden transition-colors ${errors.phone ? "border-red-300" : "border-gray-200"}`}
            >
              <select
                value={country.code}
                onChange={handleCountryChange}
                className={`pl-3 pr-2 py-3 text-sm cursor-pointer focus:outline-none border-r transition-colors ${errors.phone ? "bg-red-50 border-red-300" : "bg-gray-50 border-gray-200"}`}
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
                className={`flex-1 px-4 py-3 text-sm focus:outline-none ${errors.phone ? "bg-red-50" : "bg-white"}`}
              />
            </div>
            {errors.phone && (
              <p className="text-xs text-red-600 mt-1">{errors.phone}</p>
            )}
          </div>

          {serverError && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 text-white py-3.5 rounded-xl font-bold hover:bg-brand-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              "Guardando..."
            ) : (
              <>
                Continuar <span className="text-brand-200">→</span>
              </>
            )}
          </button>

          <p className="text-center text-sm text-gray-400">
            ¿Ya tenés una cuenta?{" "}
            <Link
              href="/login"
              className="text-brand-600 font-bold hover:underline"
            >
              Iniciar sesión
            </Link>
          </p>
        </form>
      </div>

      {/* PractiX Insight */}
      <div className="mt-6 w-full max-w-md bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex gap-3 relative">
        <div className="w-8 h-8 rounded-xl bg-amber-200 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-amber-700" />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-amber-700 mb-1">
            PractiX Insight
          </p>
          <p className="text-xs text-amber-700 leading-relaxed">
            Completá tu perfil para que nuestra IA pueda recomendarte prácticas
            que se ajusten a tus habilidades únicas en menos de 24 horas.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-xs text-gray-400 text-center">
        © {new Date().getFullYear()} PractiX ·{" "}
        <Link href="#" className="hover:underline">
          Privacidad
        </Link>{" "}
        ·{" "}
        <Link href="#" className="hover:underline">
          Términos
        </Link>{" "}
        ·{" "}
        <Link href="#" className="hover:underline">
          Contacto
        </Link>
      </div>
    </div>
  );
}
