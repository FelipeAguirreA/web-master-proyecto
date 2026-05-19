import type { ReactNode, CSSProperties } from "react";

type TagProps = {
  children: ReactNode;
  /** Override del color del texto. Si se omite, usa `text-muted` del @theme. */
  color?: string;
  /** Override del fondo. Si se omite, usa un gris translúcido (`bg-black/5`). */
  bg?: string;
  /** Variante con peso 700 (en vez de 600). */
  strong?: boolean;
  /** Permite que `whiteSpace` pueda romperse — útil cuando el contenido es largo. */
  wrap?: boolean;
};

export function Tag({
  children,
  color,
  bg,
  strong = false,
  wrap = false,
}: TagProps) {
  const overrides: CSSProperties = {};
  if (color) overrides.color = color;
  if (bg) overrides.background = bg;

  return (
    <span
      className={[
        "inline-flex items-center text-[11px] px-[9px] py-[4px] rounded-[7px] tracking-[0.1px]",
        strong ? "font-bold" : "font-semibold",
        wrap ? "whitespace-normal break-words" : "whitespace-nowrap",
        color ? "" : "text-muted",
        bg ? "" : "bg-black/5",
      ].join(" ")}
      style={Object.keys(overrides).length ? overrides : undefined}
    >
      {children}
    </span>
  );
}
