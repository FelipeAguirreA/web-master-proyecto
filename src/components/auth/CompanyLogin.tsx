"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { A } from "./tokens";
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
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: 14 }}
    >
      <AuthField
        label="Correo corporativo"
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
        type="password"
        placeholder="••••••••"
        icon={<AuthIcon name="lock" />}
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
        required
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          marginTop: 2,
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            style={{
              width: 15,
              height: 15,
              accentColor: A.accent,
            }}
          />
          <span
            style={{
              fontSize: 12.5,
              color: A.muted,
              fontWeight: 600,
            }}
          >
            Recuérdame
          </span>
        </label>
        <Link
          href="/forgot-password"
          style={{
            fontSize: 12.5,
            fontWeight: 700,
            color: A.accent,
            textDecoration: "none",
          }}
        >
          ¿Olvidaste tu clave?
        </Link>
      </div>

      {error && (
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
          {error}
        </div>
      )}

      <SubmitButton loading={loading}>Entrar a mi empresa</SubmitButton>
    </form>
  );
}
