"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { GoogleButton } from "./GoogleButton";

type Props = {
  callbackUrl: string;
};

export function StudentLogin({ callbackUrl }: Props) {
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex flex-col gap-3.5">
      <GoogleButton
        disabled={loading}
        onClick={() => {
          setLoading(true);
          signIn("google", { callbackUrl });
        }}
      />

      <div className="flex gap-2 items-start rounded-[11px] border border-accent-bdr bg-accent-bg p-3">
        <span className="mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-extrabold text-white">
          i
        </span>
        <p className="text-[11.5px] leading-relaxed text-text">
          Los estudiantes ingresan con su cuenta de Google (Gmail o correo
          universitario vinculado). Sin contraseñas que acordarse.
        </p>
      </div>
    </div>
  );
}
