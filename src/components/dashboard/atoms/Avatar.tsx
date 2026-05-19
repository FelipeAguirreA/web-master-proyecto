import type { CSSProperties } from "react";

type AvatarProps = {
  ini: string;
  size?: number;
  /** Color inicial del gradient. Por defecto usa `--color-accent-lo` del @theme. */
  c1?: string;
  /** Color final del gradient. Por defecto usa `--color-accent` del @theme. */
  c2?: string;
  /** URL de la foto. Si está, se muestra `<img>` con object-cover y caemos a las iniciales sobre gradient como fallback (cuando es null/undefined). */
  src?: string | null;
  alt?: string;
};

export function Avatar({ ini, size = 36, c1, c2, src, alt }: AvatarProps) {
  const cssVars = {
    "--avatar-size": `${size}px`,
    "--avatar-c1": c1 ?? "var(--color-accent-lo)",
    "--avatar-c2": c2 ?? "var(--color-accent)",
  } as CSSProperties;

  return (
    <div
      className={[
        "rounded-full flex items-center justify-center text-white font-extrabold flex-shrink-0 overflow-hidden tracking-tight",
        "w-[var(--avatar-size)] h-[var(--avatar-size)]",
        size > 40 ? "text-[14px]" : "text-[12px]",
        src
          ? "bg-transparent"
          : "[background:linear-gradient(135deg,var(--avatar-c1),var(--avatar-c2))]",
      ].join(" ")}
      style={cssVars}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt ?? ini}
          width={size}
          height={size}
          // no-referrer evita el warning CORB cuando viene de Google profile pics.
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover block"
        />
      ) : (
        ini
      )}
    </div>
  );
}
