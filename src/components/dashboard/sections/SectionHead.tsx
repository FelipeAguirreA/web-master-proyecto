import Link from "next/link";
import { D } from "../tokens";
import { Icon } from "../Icon";

type SectionHeadProps = {
  title: string;
  sub?: string;
  action?: { label: string; href: string };
};

export function SectionHead({ title, sub, action }: SectionHeadProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 14,
        marginBottom: 14,
        flexWrap: "wrap",
      }}
    >
      <div>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: D.text,
            letterSpacing: -0.6,
            lineHeight: 1.2,
          }}
        >
          {title}
        </h2>
        {sub && (
          <p
            style={{
              fontSize: 12.5,
              color: D.muted,
              marginTop: 3,
            }}
          >
            {sub}
          </p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          style={{
            fontSize: 12.5,
            fontWeight: 700,
            color: D.accent,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            textDecoration: "none",
          }}
        >
          {action.label} <Icon name="arr" size={13} color={D.accent} />
        </Link>
      )}
    </div>
  );
}
