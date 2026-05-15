import { D } from "../tokens";

type AvatarProps = {
  ini: string;
  size?: number;
  c1?: string;
  c2?: string;
  // URL de la foto. Si está, renderizamos <img> con object-cover y caemos a
  // las iniciales sobre gradient como fallback (cuando es null/undefined).
  src?: string | null;
  alt?: string;
};

export function Avatar({
  ini,
  size = 36,
  c1 = D.accentLo,
  c2 = D.accent,
  src,
  alt,
}: AvatarProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: src ? "transparent" : `linear-gradient(135deg,${c1},${c2})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 800,
        fontSize: size > 40 ? 14 : 12,
        letterSpacing: -0.3,
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt ?? ini}
          width={size}
          height={size}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : (
        ini
      )}
    </div>
  );
}
