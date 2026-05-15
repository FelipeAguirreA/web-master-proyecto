"use client";

import { signOut } from "next-auth/react";
import { E } from "@/components/dashboard/palettes";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      style={{
        appearance: "none",
        border: `1px solid ${E.border}`,
        background: E.surface,
        color: E.text,
        fontSize: 14,
        fontWeight: 600,
        padding: "11px 20px",
        borderRadius: 10,
        cursor: "pointer",
      }}
    >
      Cerrar sesión
    </button>
  );
}
