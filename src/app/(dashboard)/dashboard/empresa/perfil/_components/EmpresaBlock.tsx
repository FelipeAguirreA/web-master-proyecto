"use client";

import type { ReactNode } from "react";

type Props = {
  title: string;
  sub?: string;
  children: ReactNode;
};

/**
 * Card contenedora local para empresa/perfil.
 * Distinta de src/components/perfil/Block.tsx (perfil estudiante).
 */
export function EmpresaBlock({ title, sub, children }: Props) {
  return (
    <section className="bg-surface border border-border rounded-[18px] p-4 sm:p-5 md:p-[22px]">
      <header className="mb-3.5">
        <h2 className="text-[15px] font-extrabold text-text tracking-[-0.3px] m-0">
          {title}
        </h2>
        {sub && <p className="text-[11.5px] text-subtle mt-0.5 m-0">{sub}</p>}
      </header>
      {children}
    </section>
  );
}
