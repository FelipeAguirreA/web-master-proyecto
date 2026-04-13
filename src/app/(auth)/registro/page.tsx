"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

// ── Componente ────────────────────────────────────────────────────────────────
type FormFields = "name" | "lastName" | "document" | "phone";

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

  const inputClass = (field: FormFields) =>
    `w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-colors ${
      errors[field]
        ? "border-red-400 bg-red-50 focus:border-red-500"
        : "border-gray-200 focus:border-brand-400"
    }`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <Link href="/" className="font-bold text-2xl tracking-tight mb-8">
        <span className="text-brand-700">Practi</span>
        <span className="text-accent-500">X</span>
      </Link>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Completá tu perfil
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Solo necesitamos estos datos una vez para activar tu cuenta.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Nombre + Apellido */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={handleChange("name")}
                placeholder="Juan"
                className={inputClass("name")}
              />
              {errors.name && (
                <p className="text-xs text-red-600 mt-1">{errors.name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Apellidos <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.lastName}
                onChange={handleChange("lastName")}
                placeholder="Pérez García"
                className={inputClass("lastName")}
              />
              {errors.lastName && (
                <p className="text-xs text-red-600 mt-1">{errors.lastName}</p>
              )}
            </div>
          </div>

          {/* Documento de identidad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Documento de identidad <span className="text-red-500">*</span>
            </label>

            {/* Toggle RUT / Pasaporte */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-2 w-fit">
              <button
                type="button"
                onClick={() => handleDocTypeChange("rut")}
                className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                  docType === "rut"
                    ? "bg-brand-600 text-white"
                    : "bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                RUT
              </button>
              <button
                type="button"
                onClick={() => handleDocTypeChange("passport")}
                className={`px-4 py-1.5 text-sm font-medium transition-colors border-l border-gray-200 ${
                  docType === "passport"
                    ? "bg-brand-600 text-white"
                    : "bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                Pasaporte / DNI
              </button>
            </div>

            <input
              type="text"
              value={form.document}
              onChange={handleDocumentChange}
              placeholder={docType === "rut" ? "12.345.678-9" : "AB123456"}
              maxLength={docType === "rut" ? 12 : 20}
              className={inputClass("document")}
            />
            {errors.document ? (
              <p className="text-xs text-red-600 mt-1">{errors.document}</p>
            ) : (
              <p className="text-xs text-gray-400 mt-1">
                {docType === "rut"
                  ? "Formato: 12.345.678-9"
                  : "Número de pasaporte o documento nacional (6–20 caracteres)"}
              </p>
            )}
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono <span className="text-red-500">*</span>
            </label>
            <div
              className={`flex rounded-lg border overflow-hidden transition-colors ${
                errors.phone ? "border-red-400" : "border-gray-200"
              }`}
            >
              <select
                value={country.code}
                onChange={handleCountryChange}
                className={`pl-3 pr-2 py-2.5 text-sm cursor-pointer focus:outline-none border-r transition-colors ${
                  errors.phone
                    ? "bg-red-50 border-red-400 text-gray-700"
                    : "bg-gray-50 border-gray-200 text-gray-700"
                }`}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.dialCode})
                  </option>
                ))}
              </select>
              <input
                type="tel"
                value={form.phone}
                onChange={handleChange("phone")}
                placeholder="912345678"
                className={`flex-1 px-3 py-2.5 text-sm focus:outline-none ${
                  errors.phone ? "bg-red-50" : "bg-white"
                }`}
              />
            </div>
            {errors.phone && (
              <p className="text-xs text-red-600 mt-1">{errors.phone}</p>
            )}
          </div>

          {serverError && (
            <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 text-white py-3 rounded-xl font-semibold hover:bg-brand-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Guardando..." : "Continuar al dashboard →"}
          </button>
        </form>
      </div>
    </div>
  );
}
