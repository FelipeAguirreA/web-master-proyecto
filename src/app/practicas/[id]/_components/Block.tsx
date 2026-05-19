import type { ReactNode } from "react";

interface BlockProps {
  title: string;
  sub?: string;
  children: ReactNode;
}

export function Block({ title, sub, children }: BlockProps) {
  return (
    <section className="bg-surface border border-border rounded-[18px] px-[26px] py-[22px]">
      <header className="mb-[14px]">
        <h2 className="text-[16px] font-extrabold text-text tracking-[-0.4px]">
          {title}
        </h2>
        {sub && <p className="text-[12.5px] text-muted mt-[3px]">{sub}</p>}
      </header>
      {children}
    </section>
  );
}
