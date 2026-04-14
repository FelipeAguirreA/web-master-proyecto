"use client";

import { Suspense, useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";

// ── Utilidades ─────────────────────────────────────────────────────────────────
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

function formatRUT(value: string): string {
  const limpio = value.replace(/[^0-9kK]/g, "").toUpperCase();
  if (limpio.length === 0) return "";
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  const conPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return cuerpo.length > 0 ? `${conPuntos}-${dv}` : dv;
}

const BLOCKED_DOMAINS = [
  "gmail.com",
  "hotmail.com",
  "yahoo.com",
  "outlook.com",
  "live.com",
  "icloud.com",
];

function isCorporateEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain ? !BLOCKED_DOMAINS.includes(domain) : false;
}

// ── Input helper ──────────────────────────────────────────────────────────────
function inputCls(hasError?: boolean) {
  return `w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-colors ${
    hasError
      ? "border-red-400 bg-red-50 focus:border-red-500"
      : "border-gray-200 focus:border-brand-400"
  }`;
}

// ── Login Empresa ─────────────────────────────────────────────────────────────
function EmpresaLogin() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signIn("empresa-credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        setError("Correo o contraseña incorrectos");
      } else {
        router.push("/dashboard/empresa");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Correo corporativo
        </label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="nombre@empresa.cl"
          required
          className={inputCls()}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Contraseña
        </label>
        <div className="relative">
          <input
            type={showPass ? "text" : "password"}
            value={form.password}
            onChange={(e) =>
              setForm((f) => ({ ...f, password: e.target.value }))
            }
            placeholder="••••••••"
            required
            className={`${inputCls()} pr-10`}
          />
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPass ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand-600 text-white py-3 rounded-xl font-semibold hover:bg-brand-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? "Ingresando..." : "Ingresar"}
      </button>
    </form>
  );
}

// ── Registro Empresa ──────────────────────────────────────────────────────────
type RegErrors = Partial<
  Record<
    | "name"
    | "lastName"
    | "phone"
    | "companyName"
    | "empresaRut"
    | "industry"
    | "website"
    | "email"
    | "password"
    | "confirmPassword",
    string
  >
>;

function EmpresaRegister({ onSuccess }: { onSuccess: () => void }) {
  const [docType, setDocType] = useState<"rut" | "passport">("rut");
  const [allowGeneric, setAllowGeneric] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<RegErrors>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    lastName: "",
    phone: "",
    companyName: "",
    empresaRut: "",
    industry: "",
    website: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const setField =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      setErrors((errs) => ({ ...errs, [key]: undefined }));
    };

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val =
      docType === "rut"
        ? formatRUT(e.target.value)
        : e.target.value.toUpperCase();
    setForm((f) => ({ ...f, empresaRut: val }));
    setErrors((errs) => ({ ...errs, empresaRut: undefined }));
  };

  const validate = (): RegErrors => {
    const errs: RegErrors = {};

    if (!form.name.trim() || form.name.trim().length < 2)
      errs.name = "Mínimo 2 caracteres";
    if (!form.lastName.trim() || form.lastName.trim().length < 2)
      errs.lastName = "Mínimo 2 caracteres";
    if (!form.phone.trim()) errs.phone = "El teléfono es obligatorio";
    if (!form.companyName.trim() || form.companyName.trim().length < 2)
      errs.companyName = "Mínimo 2 caracteres";
    if (!form.empresaRut.trim()) {
      errs.empresaRut =
        docType === "rut"
          ? "El RUT de la empresa es obligatorio"
          : "El DNI es obligatorio";
    } else if (docType === "rut" && !validarRUT(form.empresaRut)) {
      errs.empresaRut = "RUT inválido. Verificá el dígito verificador";
    } else if (
      docType === "passport" &&
      !/^[A-Z0-9]{6,20}$/i.test(form.empresaRut.trim())
    ) {
      errs.empresaRut = "DNI inválido (6–20 caracteres alfanuméricos)";
    }
    if (!form.email) {
      errs.email = "El correo es obligatorio";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Correo electrónico inválido";
    } else if (!allowGeneric && !isCorporateEmail(form.email)) {
      errs.email =
        "Usá un correo corporativo, o marcá la casilla si tu empresa usa un servicio genérico";
    }
    if (!form.password) {
      errs.password = "La contraseña es obligatoria";
    } else if (form.password.length < 8) {
      errs.password = "Mínimo 8 caracteres";
    } else if (!/[A-Z]/.test(form.password)) {
      errs.password = "Debe incluir al menos una mayúscula";
    } else if (!/[a-z]/.test(form.password)) {
      errs.password = "Debe incluir al menos una minúscula";
    } else if (!/[0-9]/.test(form.password)) {
      errs.password = "Debe incluir al menos un número";
    } else if (!/[^A-Za-z0-9]/.test(form.password)) {
      errs.password = "Debe incluir al menos un símbolo";
    }
    if (!form.confirmPassword) {
      errs.confirmPassword = "Confirmá tu contraseña";
    } else if (form.password !== form.confirmPassword) {
      errs.confirmPassword = "Las contraseñas no coinciden";
    }

    return errs;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError("");
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/empresa/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          documentType: docType,
          allowGenericEmail: allowGeneric,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.details) {
          const fieldErrors: RegErrors = {};
          for (const issue of data.details as Array<{
            path: string[];
            message: string;
          }>) {
            const field = issue.path[0] as keyof RegErrors;
            if (field) fieldErrors[field] = issue.message;
          }
          if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors);
            return;
          }
        }
        setServerError(data.error ?? "Error al registrar. Intentá de nuevo.");
        return;
      }

      onSuccess();
    } catch {
      setServerError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = () => {
    const p = form.password;
    if (!p) return 0;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  };

  const strengthColors = [
    "bg-red-400",
    "bg-orange-400",
    "bg-yellow-400",
    "bg-green-400",
  ];
  const strengthLabels = ["Débil", "Regular", "Buena", "Fuerte"];
  const strength = passwordStrength();

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Nombre y Apellido */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={setField("name")}
            placeholder="Juan"
            className={inputCls(!!errors.name)}
          />
          {errors.name && (
            <p className="text-xs text-red-600 mt-1">{errors.name}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Apellido <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.lastName}
            onChange={setField("lastName")}
            placeholder="Pérez"
            className={inputCls(!!errors.lastName)}
          />
          {errors.lastName && (
            <p className="text-xs text-red-600 mt-1">{errors.lastName}</p>
          )}
        </div>
      </div>

      {/* Nombre empresa */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nombre de la empresa <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.companyName}
          onChange={setField("companyName")}
          placeholder="Empresa S.A."
          className={inputCls(!!errors.companyName)}
        />
        {errors.companyName && (
          <p className="text-xs text-red-600 mt-1">{errors.companyName}</p>
        )}
      </div>

      {/* RUT Empresa */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          RUT / DNI de la empresa <span className="text-red-500">*</span>
        </label>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-2 w-fit">
          <button
            type="button"
            onClick={() => {
              setDocType("rut");
              setForm((f) => ({ ...f, empresaRut: "" }));
            }}
            className={`px-4 py-1.5 text-sm font-medium transition-colors ${
              docType === "rut"
                ? "bg-brand-600 text-white"
                : "bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            RUT Chile
          </button>
          <button
            type="button"
            onClick={() => {
              setDocType("passport");
              setForm((f) => ({ ...f, empresaRut: "" }));
            }}
            className={`px-4 py-1.5 text-sm font-medium border-l border-gray-200 transition-colors ${
              docType === "passport"
                ? "bg-brand-600 text-white"
                : "bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            Empresa extranjera
          </button>
        </div>
        <input
          type="text"
          value={form.empresaRut}
          onChange={handleRutChange}
          placeholder={
            docType === "rut" ? "76.123.456-7" : "DNI o registro mercantil"
          }
          maxLength={docType === "rut" ? 12 : 30}
          className={inputCls(!!errors.empresaRut)}
        />
        {errors.empresaRut ? (
          <p className="text-xs text-red-600 mt-1">{errors.empresaRut}</p>
        ) : (
          <p className="text-xs text-gray-400 mt-1">
            {docType === "rut"
              ? "RUT de la empresa (ej: 76.123.456-7)"
              : "Número de registro de empresa extranjera"}
          </p>
        )}
      </div>

      {/* Industria y Sitio web */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Industria
          </label>
          <input
            type="text"
            value={form.industry}
            onChange={setField("industry")}
            placeholder="Tecnología, Fintech..."
            className={inputCls(!!errors.industry)}
          />
          {errors.industry && (
            <p className="text-xs text-red-600 mt-1">{errors.industry}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sitio web
          </label>
          <input
            type="url"
            value={form.website}
            onChange={setField("website")}
            placeholder="https://empresa.cl"
            className={inputCls(!!errors.website)}
          />
          {errors.website && (
            <p className="text-xs text-red-600 mt-1">{errors.website}</p>
          )}
        </div>
      </div>

      {/* Teléfono */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Teléfono de contacto <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          value={form.phone}
          onChange={setField("phone")}
          placeholder="+56 9 1234 5678"
          className={inputCls(!!errors.phone)}
        />
        {errors.phone && (
          <p className="text-xs text-red-600 mt-1">{errors.phone}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Correo corporativo <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          value={form.email}
          onChange={setField("email")}
          placeholder="nombre@empresa.cl"
          className={inputCls(!!errors.email)}
        />
        {errors.email ? (
          <p className="text-xs text-red-600 mt-1">{errors.email}</p>
        ) : (
          <p className="text-xs text-gray-400 mt-1">
            Se recomienda usar un correo corporativo
          </p>
        )}
        <label className="flex items-center gap-2 mt-2 cursor-pointer">
          <input
            type="checkbox"
            checked={allowGeneric}
            onChange={(e) => {
              setAllowGeneric(e.target.checked);
              setErrors((errs) => ({ ...errs, email: undefined }));
            }}
            className="rounded border-gray-300 text-brand-600"
          />
          <span className="text-xs text-gray-500">
            Mi empresa usa un servicio de correo genérico (Gmail, Outlook, etc.)
          </span>
        </label>
      </div>

      {/* Contraseña */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Contraseña <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type={showPass ? "text" : "password"}
            value={form.password}
            onChange={setField("password")}
            placeholder="••••••••"
            className={`${inputCls(!!errors.password)} pr-10`}
          />
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPass ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
        {form.password && (
          <div className="mt-2">
            <div className="flex gap-1 mb-1">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    i < strength ? strengthColors[strength - 1] : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
            {strength > 0 && (
              <p className="text-xs text-gray-500">
                Contraseña:{" "}
                <span
                  className={`font-medium ${strength >= 3 ? "text-green-600" : strength === 2 ? "text-yellow-600" : "text-red-600"}`}
                >
                  {strengthLabels[strength - 1]}
                </span>
              </p>
            )}
          </div>
        )}
        {errors.password && (
          <p className="text-xs text-red-600 mt-1">{errors.password}</p>
        )}
      </div>

      {/* Confirmar contraseña */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Confirmar contraseña <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type={showConfirm ? "text" : "password"}
            value={form.confirmPassword}
            onChange={setField("confirmPassword")}
            placeholder="••••••••"
            className={`${inputCls(!!errors.confirmPassword)} pr-10`}
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showConfirm ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-xs text-red-600 mt-1">{errors.confirmPassword}</p>
        )}
      </div>

      {serverError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {serverError}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand-600 text-white py-3 rounded-xl font-semibold hover:bg-brand-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? "Registrando empresa..." : "Crear cuenta empresa"}
      </button>

      <p className="text-xs text-gray-400 text-center">
        Al registrarte, tu cuenta quedará en revisión hasta ser aprobada por el
        equipo de PractiX.
      </p>
    </form>
  );
}

// ── Éxito de registro ─────────────────────────────────────────────────────────
function RegistroExitoso({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="text-center py-4">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="w-8 h-8 text-green-600" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        ¡Empresa registrada!
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Tu cuenta fue creada exitosamente. El equipo de PractiX revisará tu
        solicitud y te notificará por correo cuando sea aprobada.
      </p>
      <button
        onClick={onLogin}
        className="w-full bg-brand-600 text-white py-3 rounded-xl font-semibold hover:bg-brand-700 transition-colors"
      >
        Ir al login
      </button>
    </div>
  );
}

// ── Contenido principal ───────────────────────────────────────────────────────
function LoginContent() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "student";
  const isCompany = role === "company";

  const [tab, setTab] = useState<"login" | "register">("login");
  const [registered, setRegistered] = useState(false);

  const callbackUrl = "/dashboard";

  // Estudiante y Admin: Google OAuth
  if (!isCompany) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <Link href="/" className="font-bold text-2xl tracking-tight mb-8">
          <span className="text-brand-700">Practi</span>
          <span className="text-accent-500">X</span>
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Bienvenido
            </h1>
            <p className="text-sm text-gray-500">
              Encontrá la práctica ideal para tu perfil con IA
            </p>
          </div>

          <button
            onClick={() => signIn("google", { callbackUrl })}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continuar con Google
          </button>

          <p className="text-xs text-gray-400 text-center mt-4">
            Al continuar aceptás nuestros términos de uso y política de
            privacidad.
          </p>
        </div>

        <div className="mt-6 text-sm text-gray-500">
          ¿Sos empresa?{" "}
          <Link
            href="/login?role=company"
            className="text-brand-600 hover:underline"
          >
            Ingresá aquí
          </Link>
        </div>
      </div>
    );
  }

  // Empresa: email + contraseña con tabs
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="font-bold text-2xl tracking-tight mb-8">
        <span className="text-brand-700">Practi</span>
        <span className="text-accent-500">X</span>
      </Link>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Portal Empresas
          </h1>
          <p className="text-sm text-gray-500">
            Gestioná tus prácticas y encontrá los mejores candidatos
          </p>
        </div>

        {registered ? (
          <RegistroExitoso onLogin={() => setRegistered(false)} />
        ) : (
          <>
            {/* Tabs */}
            <div className="flex rounded-xl border border-gray-200 overflow-hidden mb-6">
              <button
                type="button"
                onClick={() => setTab("login")}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  tab === "login"
                    ? "bg-brand-600 text-white"
                    : "bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                onClick={() => setTab("register")}
                className={`flex-1 py-2.5 text-sm font-medium border-l border-gray-200 transition-colors ${
                  tab === "register"
                    ? "bg-brand-600 text-white"
                    : "bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                Crear cuenta
              </button>
            </div>

            {tab === "login" ? (
              <EmpresaLogin />
            ) : (
              <EmpresaRegister onSuccess={() => setRegistered(true)} />
            )}
          </>
        )}
      </div>

      <div className="mt-6 text-sm text-gray-500">
        ¿Sos estudiante?{" "}
        <Link
          href="/login?role=student"
          className="text-brand-600 hover:underline"
        >
          Ingresá aquí
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
