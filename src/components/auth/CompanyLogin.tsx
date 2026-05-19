"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { AuthField } from "./AuthField";
import { AuthIcon } from "./AuthIcon";
import { SubmitButton } from "./SubmitButton";

type Props = {
  callbackUrl: string;
};

export function CompanyLogin({ callbackUrl }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Completa email y contraseña.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await signIn("empresa-credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        setError("Email o contraseña incorrectos.");
      } else if (res?.ok) {
        window.location.href = callbackUrl;
      } else {
        setError("No pudimos iniciar sesión. Intenta de nuevo.");
      }
    } catch {
      setError("Error de red. Verifica tu conexión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
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
      />
      <AuthField
        label="Contraseña"
        name="password"
        type="password"
        placeholder="••••••••"
        icon={<AuthIcon name="lock" />}
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
        required
      />

      <div className="mt-0.5 flex items-center justify-between gap-2.5">
        <label className="flex cursor-pointer items-center gap-1.5">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-[15px] w-[15px] accent-accent"
          />
          <span className="text-[12.5px] font-semibold text-muted">
            Recuérdame
          </span>
        </label>
        <Link
          href="/forgot-password"
          className="text-[12.5px] font-bold text-accent no-underline transition-opacity hover:opacity-75"
        >
          ¿Olvidaste tu clave?
        </Link>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-[11px] border border-rose/[0.15] bg-rose-bg px-3 py-2.5 text-[12.5px] font-semibold leading-relaxed text-rose"
        >
          {error}
        </div>
      )}

      <SubmitButton loading={loading}>Entrar a mi empresa</SubmitButton>
    </form>
  );
}
