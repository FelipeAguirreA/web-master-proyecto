"use client";

import { useRef } from "react";
import { D } from "../dashboard/tokens";
import { Icon } from "../dashboard/Icon";
import { Avatar } from "../dashboard/atoms/Avatar";

type Props = {
  name: string;
  lastName?: string | null;
  image?: string | null;
  university?: string | null;
  career?: string | null;
  semester?: number | null;
  city?: string | null;
  cvPct: number;
  hasCv: boolean;
  onPickAvatar: (file: File) => void;
  onCvDownload?: () => void;
};

export function PerfilHero({
  name,
  lastName,
  image,
  university,
  career,
  semester,
  city,
  cvPct,
  hasCv,
  onPickAvatar,
  onCvDownload,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const initial = (name || "U").charAt(0).toUpperCase();
  const fullName = [name, lastName].filter(Boolean).join(" ");
  const headline =
    career && semester
      ? `Estudiante de ${career} · ${semester}° semestre`
      : career
        ? `Estudiante de ${career}`
        : "Estudiante";

  return (
    <section
      style={{
        background: D.dark,
        color: "#fff",
        borderRadius: 22,
        padding: "26px 28px",
        marginBottom: 14,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -80,
          right: -50,
          width: 340,
          height: 340,
          background: `radial-gradient(circle, ${D.accent}40, transparent 65%)`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle at 1px 1px,rgba(255,255,255,.04) 1px,transparent 0)",
          backgroundSize: "22px 22px",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          gap: 22,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div style={{ position: "relative", flexShrink: 0 }}>
          <Avatar
            ini={initial}
            size={88}
            c1={D.accentLo}
            c2={D.accent}
            src={image}
            alt={fullName}
          />
          <button
            type="button"
            title="Cambiar foto"
            onClick={() => fileRef.current?.click()}
            style={{
              position: "absolute",
              bottom: -2,
              right: -2,
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: D.surface,
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 10px rgba(0,0,0,.25)",
            }}
          >
            <Icon name="plus" size={14} color={D.text} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onPickAvatar(file);
              e.target.value = "";
            }}
            style={{ display: "none" }}
          />
        </div>

        <div style={{ flex: 1, minWidth: 220 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
              flexWrap: "wrap",
            }}
          >
            {university && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: D.accentHi,
                  background: "rgba(255,154,106,.18)",
                  padding: "2px 8px",
                  borderRadius: 5,
                  letterSpacing: 0.5,
                }}
              >
                {university}
              </span>
            )}
            {city && (
              <span
                style={{
                  fontSize: 11.5,
                  color: "rgba(255,255,255,.55)",
                }}
              >
                {city}
              </span>
            )}
          </div>
          <h1
            style={{
              fontSize: "clamp(1.5rem,2.6vw,1.9rem)",
              fontWeight: 800,
              letterSpacing: -1,
              lineHeight: 1.1,
              marginBottom: 5,
            }}
          >
            {fullName || "Tu nombre"}
          </h1>
          <p
            style={{
              fontSize: 13.5,
              color: "rgba(255,255,255,.7)",
              marginBottom: 14,
            }}
          >
            {headline}
            {university && (
              <>
                {" "}
                · <b style={{ color: "#fff" }}>{university}</b>
              </>
            )}
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <StatPill k="CV" v={`${cvPct}%`} sub="Completo" />
            <StatPill
              k="Estado"
              v={hasCv ? "Activo" : "Sin CV"}
              sub={hasCv ? "Recibiendo matches" : "Subí tu CV"}
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            minWidth: 160,
          }}
        >
          {onCvDownload && hasCv && (
            <button
              type="button"
              onClick={onCvDownload}
              style={{
                padding: "10px 16px",
                background: "rgba(255,255,255,.08)",
                border: "1px solid rgba(255,255,255,.14)",
                color: "#fff",
                borderRadius: 11,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Descargar CV
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function StatPill({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div
      style={{
        padding: "10px 14px",
        background: "rgba(255,255,255,.06)",
        border: "1px solid rgba(255,255,255,.1)",
        borderRadius: 12,
        minWidth: 110,
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: 0.5,
          color: "rgba(255,255,255,.55)",
          textTransform: "uppercase",
        }}
      >
        {k}
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 900,
          letterSpacing: -0.6,
          color: "#fff",
          marginTop: 2,
        }}
      >
        {v}
      </div>
      {sub && (
        <div
          style={{
            fontSize: 10.5,
            color: D.accentHi,
            fontWeight: 700,
            marginTop: 1,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
