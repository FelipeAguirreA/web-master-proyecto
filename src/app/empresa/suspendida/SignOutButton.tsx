"use client";

import { logout } from "@/lib/client/logout";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => logout()}
      className="min-h-[44px] w-full sm:w-auto px-5 rounded-[10px] border border-border bg-surface text-text text-[14px] font-semibold cursor-pointer transition-colors hover:bg-bg"
    >
      Cerrar sesión
    </button>
  );
}
