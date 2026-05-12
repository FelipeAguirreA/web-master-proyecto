import { D } from "../tokens";

type AvatarProps = {
  ini: string;
  size?: number;
  c1?: string;
  c2?: string;
};

export function Avatar({
  ini,
  size = 36,
  c1 = D.accentLo,
  c2 = D.accent,
}: AvatarProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `linear-gradient(135deg,${c1},${c2})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 800,
        fontSize: size > 40 ? 14 : 12,
        letterSpacing: -0.3,
        flexShrink: 0,
      }}
    >
      {ini}
    </div>
  );
}
