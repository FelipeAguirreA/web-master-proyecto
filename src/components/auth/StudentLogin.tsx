"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { A } from "./tokens";
import { GoogleButton } from "./GoogleButton";

type Props = {
  callbackUrl: string;
};

export function StudentLogin({ callbackUrl }: Props) {
  const [loading, setLoading] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <GoogleButton
        disabled={loading}
        onClick={() => {
          setLoading(true);
          signIn("google", { callbackUrl });
        }}
      />

      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "flex-start",
          padding: "10px 12px",
          background: A.accentBg,
          border: `1px solid ${A.accentBdr}`,
          borderRadius: 11,
        }}
      >
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: A.accent,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontSize: 11,
            fontWeight: 800,
            marginTop: 1,
          }}
        >
          i
        </span>
        <p
          style={{
            fontSize: 11.5,
            color: A.text,
            lineHeight: 1.5,
          }}
        >
          Los estudiantes ingresan con su cuenta de Google (Gmail o correo
          universitario vinculado). Sin contraseñas que acordarse.
        </p>
      </div>
    </div>
  );
}
