import type { ReactNode } from "react";
import { D } from "../tokens";

type TagProps = {
  children: ReactNode;
  color?: string;
  bg?: string;
  strong?: boolean;
};

export function Tag({
  children,
  color = D.muted,
  bg = "rgba(0,0,0,.04)",
  strong = false,
}: TagProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: 11,
        fontWeight: strong ? 700 : 600,
        color,
        background: bg,
        padding: "4px 9px",
        borderRadius: 7,
        letterSpacing: 0.1,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}
