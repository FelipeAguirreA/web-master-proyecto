"use client";

import { Suspense, useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";

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

// Premium input base
const INPUT_BASE =
  "w-full rounded-xl px-4 py-3 text-[14px] bg-[#FAFAF8] border border-transparent hover:border-black/[0.05] focus:outline-none focus:border-[#FF6A3D]/40 focus:bg-white focus:shadow-[0_0_0_4px_rgba(255,106,61,0.08)] transition-all placeholder:text-[#9B9891] text-[#0A0909]";

const INPUT_ERROR =
  "w-full rounded-xl px-4 py-3 text-[14px] bg-[#FFF0ED] border border-[#FF6A3D]/30 focus:outline-none focus:border-[#FF6A3D] focus:shadow-[0_0_0_4px_rgba(255,106,61,0.08)] transition-all placeholder:text-[#9B9891] text-[#0A0909]";

const LABEL_CLS =
  "block text-[11px] font-semibold tracking-[0.08em] uppercase text-[#6D6A63] mb-2";

function inputCls(hasError?: boolean) {
  return hasError ? INPUT_ERROR : INPUT_BASE;
}

// ── Google SVG ────────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
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
  );
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
        <label className={LABEL_CLS}>Correo electrónico</label>
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
        <label className={LABEL_CLS}>Contraseña</label>
        <div className="relative">
          <input
            type={showPass ? "text" : "password"}
            value={form.password}
            onChange={(e) =>
              setForm((f) => ({ ...f, password: e.target.value }))
            }
            placeholder="••••••••"
            required
            className={`${inputCls()} pr-11`}
          />
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9B9891] hover:text-[#4A4843] transition-colors"
            aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPass ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
        <Link
          href="/forgot-password"
          className="text-[12px] font-medium text-[#FF6A3D] hover:text-[#E85A2D] mt-2 inline-block transition-colors"
        >
          Olvidé mi contraseña
        </Link>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-[#FFF0ED] border border-[#FF6A3D]/20 text-[#C74A1E] text-[12.5px] px-3 py-2.5 rounded-lg leading-[1.4]">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#FF6A3D]" />
          {error}
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
          {loading ? "Ingresando…" : "Iniciar sesión"}
        </span>
        {!loading && (
          <span className="relative text-[11px] transition-transform group-hover:translate-x-0.5">
            →
          </span>
        )}
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
            const f = issue.path[0] as keyof RegErrors;
            if (f) fieldErrors[f] = issue.message;
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
    "bg-[#FF6565]",
    "bg-[#FFA15F]",
    "bg-[#FFBD2E]",
    "bg-[#1A8F3C]",
  ];
  const strengthLabelColors = [
    "text-[#FF6565]",
    "text-[#FF8A3D]",
    "text-[#C89000]",
    "text-[#1A8F3C]",
  ];
  const strengthLabels = ["Débil", "Regular", "Buena", "Fuerte"];
  const strength = passwordStrength();

  const fi = (key: keyof RegErrors) => inputCls(!!errors[key]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={LABEL_CLS}>Nombre *</label>
          <input
            type="text"
            value={form.name}
            onChange={setField("name")}
            placeholder="Juan"
            className={fi("name")}
          />
          {errors.name && (
            <p className="text-[11.5px] text-[#C74A1E] mt-1">{errors.name}</p>
          )}
        </div>
        <div>
          <label className={LABEL_CLS}>Apellido *</label>
          <input
            type="text"
            value={form.lastName}
            onChange={setField("lastName")}
            placeholder="Pérez"
            className={fi("lastName")}
          />
          {errors.lastName && (
            <p className="text-[11.5px] text-[#C74A1E] mt-1">
              {errors.lastName}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className={LABEL_CLS}>Nombre de la empresa *</label>
        <input
          type="text"
          value={form.companyName}
          onChange={setField("companyName")}
          placeholder="Empresa S.A."
          className={fi("companyName")}
        />
        {errors.companyName && (
          <p className="text-[11.5px] text-[#C74A1E] mt-1">
            {errors.companyName}
          </p>
        )}
      </div>

      <div>
        <label className={LABEL_CLS}>RUT / DNI de la empresa *</label>
        <div className="inline-flex rounded-xl bg-black/[0.03] p-1 mb-2.5">
          <button
            type="button"
            onClick={() => {
              setDocType("rut");
              setForm((f) => ({ ...f, empresaRut: "" }));
            }}
            className={`px-3.5 py-1.5 text-[12.5px] font-semibold rounded-lg transition-all ${
              docType === "rut"
                ? "bg-white text-[#0A0909] shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                : "text-[#6D6A63] hover:text-[#0A0909]"
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
            className={`px-3.5 py-1.5 text-[12.5px] font-semibold rounded-lg transition-all ${
              docType === "passport"
                ? "bg-white text-[#0A0909] shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                : "text-[#6D6A63] hover:text-[#0A0909]"
            }`}
          >
            Extranjera
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
          className={fi("empresaRut")}
        />
        {errors.empresaRut && (
          <p className="text-[11.5px] text-[#C74A1E] mt-1">
            {errors.empresaRut}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={LABEL_CLS}>Industria</label>
          <input
            type="text"
            value={form.industry}
            onChange={setField("industry")}
            placeholder="Tecnología…"
            className={fi("industry")}
          />
        </div>
        <div>
          <label className={LABEL_CLS}>Sitio web</label>
          <input
            type="url"
            value={form.website}
            onChange={setField("website")}
            placeholder="https://empresa.cl"
            className={fi("website")}
          />
        </div>
      </div>

      <div>
        <label className={LABEL_CLS}>Teléfono *</label>
        <input
          type="tel"
          value={form.phone}
          onChange={setField("phone")}
          placeholder="+56 9 1234 5678"
          className={fi("phone")}
        />
        {errors.phone && (
          <p className="text-[11.5px] text-[#C74A1E] mt-1">{errors.phone}</p>
        )}
      </div>

      <div>
        <label className={LABEL_CLS}>Correo corporativo *</label>
        <input
          type="email"
          value={form.email}
          onChange={setField("email")}
          placeholder="nombre@empresa.cl"
          className={fi("email")}
        />
        {errors.email && (
          <p className="text-[11.5px] text-[#C74A1E] mt-1">{errors.email}</p>
        )}
        <label className="flex items-center gap-2 mt-2.5 cursor-pointer group">
          <input
            type="checkbox"
            checked={allowGeneric}
            onChange={(e) => {
              setAllowGeneric(e.target.checked);
              setErrors((e2) => ({ ...e2, email: undefined }));
            }}
            className="w-3.5 h-3.5 rounded border-[#9B9891] text-[#FF6A3D] focus:ring-[#FF6A3D]/30 focus:ring-offset-0"
          />
          <span className="text-[12px] text-[#6D6A63] group-hover:text-[#4A4843] transition-colors">
            Mi empresa usa Gmail, Outlook u otro servicio genérico
          </span>
        </label>
      </div>

      <div>
        <label className={LABEL_CLS}>Contraseña *</label>
        <div className="relative">
          <input
            type={showPass ? "text" : "password"}
            value={form.password}
            onChange={setField("password")}
            placeholder="••••••••"
            className={`${fi("password")} pr-11`}
          />
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9B9891] hover:text-[#4A4843] transition-colors"
          >
            {showPass ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
        {form.password && (
          <div className="mt-2.5">
            <div className="flex gap-1 mb-1.5">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${i < strength ? strengthColors[strength - 1] : "bg-[#F4F3EF]"}`}
                />
              ))}
            </div>
            {strength > 0 && (
              <p className="text-[11.5px] text-[#6D6A63]">
                Contraseña:{" "}
                <span
                  className={`font-semibold ${strengthLabelColors[strength - 1]}`}
                >
                  {strengthLabels[strength - 1]}
                </span>
              </p>
            )}
          </div>
        )}
        {errors.password && (
          <p className="text-[11.5px] text-[#C74A1E] mt-1">{errors.password}</p>
        )}
      </div>

      <div>
        <label className={LABEL_CLS}>Confirmar contraseña *</label>
        <div className="relative">
          <input
            type={showConfirm ? "text" : "password"}
            value={form.confirmPassword}
            onChange={setField("confirmPassword")}
            placeholder="••••••••"
            className={`${fi("confirmPassword")} pr-11`}
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9B9891] hover:text-[#4A4843] transition-colors"
          >
            {showConfirm ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-[11.5px] text-[#C74A1E] mt-1">
            {errors.confirmPassword}
          </p>
        )}
      </div>

      {serverError && (
        <div className="flex items-start gap-2 bg-[#FFF0ED] border border-[#FF6A3D]/20 text-[#C74A1E] text-[12.5px] px-3 py-2.5 rounded-lg leading-[1.4]">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#FF6A3D]" />
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
          {loading ? "Registrando empresa…" : "Crear cuenta empresa"}
        </span>
        {!loading && (
          <span className="relative text-[11px] transition-transform group-hover:translate-x-0.5">
            →
          </span>
        )}
      </button>
      <p className="text-[11.5px] text-[#9B9891] text-center leading-[1.5]">
        Al registrarte, tu cuenta queda en revisión hasta ser aprobada por el
        equipo de PractiX.
      </p>
    </form>
  );
}

// ── Éxito de registro ─────────────────────────────────────────────────────────
function RegistroExitoso({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="text-center py-2">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#E7F8EA] to-[#C5E8C7] border border-[#1A8F3C]/15 mb-5">
        <CheckCircle2 className="w-7 h-7 text-[#1A8F3C]" />
      </div>
      <h2 className="text-[20px] font-semibold tracking-[-0.015em] text-[#0A0909] mb-2">
        Empresa registrada
      </h2>
      <p className="text-[13.5px] text-[#6D6A63] leading-[1.55] mb-6 max-w-[320px] mx-auto">
        Tu cuenta fue creada. El equipo de PractiX revisa la solicitud y te
        notifica por correo cuando queda aprobada.
      </p>
      <button
        onClick={onLogin}
        className="group w-full inline-flex items-center justify-center gap-1.5 bg-[#0A0909] text-white font-semibold py-3.5 rounded-xl text-[14px] hover:bg-[#1D1B18] transition-all shadow-[0_1px_2px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.15)]"
      >
        Ir al login
        <span className="text-[11px] transition-transform group-hover:translate-x-0.5">
          →
        </span>
      </button>
    </div>
  );
}

// ── Contenido principal ───────────────────────────────────────────────────────
function LoginContent() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "student";
  const [activeRole, setActiveRole] = useState<"student" | "company">(
    role === "company" ? "company" : "student",
  );
  const [tab, setTab] = useState<"login" | "register">("login");
  const [registered, setRegistered] = useState(false);

  const callbackUrl = "/dashboard";
  const isCompany = activeRole === "company";

  return (
    <div
      className="relative min-h-screen bg-[#FAFAF8] text-[#0A0909] antialiased overflow-x-hidden flex flex-col items-center justify-center px-4 pt-16 pb-10 sm:py-12"
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

      {/* Volver al home */}
      <Link
        href="/"
        className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#6D6A63] hover:text-[#0A0909] transition-colors group"
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
        {isCompany
          ? tab === "register"
            ? "Creá tu cuenta empresa"
            : "Acceso empresas"
          : "Bienvenido de vuelta"}
      </p>

      {/* Card */}
      <div className="relative z-10 bg-white rounded-[20px] sm:rounded-[24px] border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_50px_-20px_rgba(20,15,10,0.15)] p-5 sm:p-7 w-full max-w-[440px]">
        {/* Toggle Estudiante / Empresa */}
        <div className="flex bg-black/[0.03] rounded-xl p-1 mb-6">
          <button
            onClick={() => setActiveRole("student")}
            className={`flex-1 py-2 text-[12.5px] font-semibold rounded-lg transition-all ${
              !isCompany
                ? "bg-white text-[#0A0909] shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                : "text-[#6D6A63] hover:text-[#0A0909]"
            }`}
          >
            Soy estudiante
          </button>
          <button
            onClick={() => setActiveRole("company")}
            className={`flex-1 py-2 text-[12.5px] font-semibold rounded-lg transition-all ${
              isCompany
                ? "bg-white text-[#0A0909] shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                : "text-[#6D6A63] hover:text-[#0A0909]"
            }`}
          >
            Soy empresa
          </button>
        </div>

        {!isCompany ? (
          /* Estudiante: solo Google OAuth */
          <div className="flex flex-col gap-4">
            <button
              onClick={() => signIn("google", { callbackUrl })}
              className="group w-full inline-flex items-center justify-center gap-3 bg-white border border-black/[0.08] rounded-xl py-3.5 text-[14px] font-semibold text-[#0A0909] hover:border-black/[0.15] hover:shadow-[0_4px_16px_-4px_rgba(20,15,10,0.08)] transition-all cursor-pointer"
            >
              <GoogleIcon />
              Continuar con Google
              <span className="text-[11px] text-[#9B9891] transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </button>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-black/[0.06]" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-[11px] font-semibold tracking-[0.08em] uppercase text-[#9B9891]">
                  solo google
                </span>
              </div>
            </div>

            {/* Nota informativa premium */}
            <div className="relative bg-gradient-to-br from-[#FFF8F2] to-[#FFECD9] rounded-xl p-4 border border-[#FF6A3D]/10 overflow-hidden">
              <div
                aria-hidden
                className="absolute -top-6 -right-6 w-16 h-16 bg-[#FF6A3D]/10 rounded-full blur-xl"
              />
              <div className="relative flex items-start gap-3">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white shadow-[0_2px_6px_-1px_rgba(255,106,61,0.25)]">
                  <svg
                    className="w-3.5 h-3.5 text-[#FF6A3D]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                </span>
                <div>
                  <p className="text-[12.5px] font-semibold text-[#0A0909] leading-tight">
                    Los estudiantes usan Google
                  </p>
                  <p className="text-[11.5px] text-[#6D6A63] mt-1 leading-[1.5]">
                    Entrás con tu cuenta de la universidad o personal, sin
                    passwords que acordarse.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-center text-[12px] text-[#6D6A63] mt-1">
              ¿Representás una empresa?{" "}
              <button
                type="button"
                onClick={() => setActiveRole("company")}
                className="text-[#FF6A3D] font-semibold hover:text-[#E85A2D] transition-colors"
              >
                Acceder como empresa
              </button>
            </p>
          </div>
        ) : (
          /* Empresa: email+contraseña con tabs login/registro */
          <>
            {registered ? (
              <RegistroExitoso onLogin={() => setRegistered(false)} />
            ) : (
              <>
                <div className="flex bg-black/[0.03] rounded-xl p-1 mb-6">
                  <button
                    type="button"
                    onClick={() => setTab("login")}
                    className={`flex-1 py-2 text-[12.5px] font-semibold rounded-lg transition-all ${
                      tab === "login"
                        ? "bg-white text-[#0A0909] shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                        : "text-[#6D6A63] hover:text-[#0A0909]"
                    }`}
                  >
                    Iniciar sesión
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("register")}
                    className={`flex-1 py-2 text-[12.5px] font-semibold rounded-lg transition-all ${
                      tab === "register"
                        ? "bg-white text-[#0A0909] shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                        : "text-[#6D6A63] hover:text-[#0A0909]"
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
          </>
        )}
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
          Ayuda
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
