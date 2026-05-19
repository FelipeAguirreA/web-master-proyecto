import Link from "next/link";

// Variante chica del footer: solo copyright + "Hecho con ♥ en Chile".
// Pensado para páginas donde el footer grande (con columnas de navegación)
// distrae del contenido — legal, errores, flujos de auth.
export function LandingFooterMini() {
  return (
    <footer className="bg-surface border-t border-border py-5 px-4 sm:px-6 md:px-8">
      <div className="max-w-[1100px] mx-auto flex justify-between items-center flex-wrap gap-[10px]">
        <p className="text-[12.5px] text-subtle m-0">
          © {new Date().getFullYear()} PractiX · Todos los derechos reservados
        </p>
        <p className="text-[12.5px] text-subtle m-0">
          Hecho con <span className="text-accent">♥</span> en Chile
        </p>
      </div>
    </footer>
  );
}

const COLS = [
  {
    title: "Producto",
    links: [
      { label: "Cómo funciona", href: "#como-funciona" },
      { label: "Para estudiantes", href: "/login?role=student" },
      { label: "Para empresas", href: "/login?role=company" },
      { label: "ATS", href: "#producto" },
    ],
  },
  {
    title: "Recursos",
    links: [
      { label: "Prácticas", href: "/practicas" },
      { label: "FAQ", href: "#faq" },
      { label: "Ayuda", href: "mailto:soporte@practix.cl" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacidad", href: "/privacidad" },
      { label: "Términos", href: "/terminos" },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="bg-surface border-t border-border pt-14 pb-8 px-4 sm:px-6 md:px-8">
      <div className="max-w-[1100px] mx-auto">
        {/* grid: brand col full-width on mobile, then 2-col, then 4-col */}
        <div className="grid grid-cols-2 md:grid-cols-[1.8fr_1fr_1fr_1fr] gap-10 mb-11">
          {/* brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-[9px] mb-4">
              <span className="w-[30px] h-[30px] rounded-lg bg-[linear-gradient(135deg,var(--color-accent),var(--color-accent-hi))] flex items-center justify-center font-extrabold text-sm text-white">
                P
              </span>
              <span className="font-bold text-base text-text tracking-[-0.4px]">
                PractiX
              </span>
            </div>
            <p className="text-[13.5px] text-muted leading-[1.65] max-w-[280px]">
              Matching semántico para prácticas profesionales. Sin filtros
              arbitrarios. Solo afinidad real entre tu perfil y la práctica.
            </p>
          </div>
          {COLS.map((col) => (
            <div key={col.title}>
              <div className="text-[10.5px] font-bold tracking-[1px] uppercase text-subtle mb-4">
                {col.title}
              </div>
              {col.links.map((l) => (
                <div key={l.label} className="mb-[11px]">
                  <Link
                    href={l.href}
                    className="practix-footer-link text-[13.5px] text-muted transition-colors duration-200"
                  >
                    {l.label}
                  </Link>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="border-t border-border pt-6 flex justify-between items-center flex-wrap gap-[10px]">
          <p className="text-[12.5px] text-subtle">
            © {new Date().getFullYear()} PractiX · Todos los derechos reservados
          </p>
          <p className="text-[12.5px] text-subtle">
            Hecho con <span className="text-accent">♥</span> en Chile
          </p>
        </div>
      </div>
      <style>{`
        .practix-footer-link:hover { color: var(--color-accent) !important; }
      `}</style>
    </footer>
  );
}
