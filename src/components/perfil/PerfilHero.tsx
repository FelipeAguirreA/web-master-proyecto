"use client";

import { useRef } from "react";
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
    <section className="bg-dark text-white rounded-[22px] px-5 py-6 sm:px-7 sm:py-7 mb-3.5 relative overflow-hidden">
      {/* Decorative radial glow — dynamic accent color kept as CSS var */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: -80,
          right: -50,
          width: 340,
          height: 340,
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--color-accent) 25%, transparent), transparent 65%)",
        }}
      />
      {/* Dot grid texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px,rgba(255,255,255,.04) 1px,transparent 0)",
          backgroundSize: "22px 22px",
        }}
      />

      {/* Content */}
      <div className="relative flex gap-5 sm:gap-[22px] items-start flex-wrap">
        {/* Avatar + upload button */}
        <div className="relative shrink-0">
          <Avatar
            ini={initial}
            size={88}
            c1="var(--color-accent-lo)"
            c2="var(--color-accent)"
            src={image}
            alt={fullName}
          />
          <button
            type="button"
            title="Cambiar foto"
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-surface border-none cursor-pointer flex items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,.25)]"
          >
            <Icon name="plus" size={14} color="var(--color-text)" />
          </button>
          <input
            ref={fileRef}
            id="perfil-avatar-upload"
            name="avatar"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="Subir foto de perfil"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onPickAvatar(file);
              e.target.value = "";
            }}
            className="hidden"
          />
        </div>

        {/* Name / headline / stats */}
        <div className="flex-1 min-w-[220px]">
          {/* Badges row */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {university && (
              <span
                className="text-[11px] font-extrabold tracking-[0.5px] px-2 py-[2px] rounded-[5px]"
                style={{
                  color: "var(--color-accent-hi)",
                  background: "rgba(255,154,106,.18)",
                }}
              >
                {university}
              </span>
            )}
            {city && (
              <span className="text-[11.5px] text-white/55">{city}</span>
            )}
          </div>

          {/* Name */}
          <h1 className="text-[clamp(1.5rem,2.6vw,1.9rem)] font-extrabold tracking-[-1px] leading-[1.1] mb-[5px]">
            {fullName || "Tu nombre"}
          </h1>

          {/* Headline */}
          <p className="text-[13.5px] text-white/70 mb-3.5">
            {headline}
            {university && (
              <>
                {" "}
                · <b className="text-white">{university}</b>
              </>
            )}
          </p>

          {/* Stat pills */}
          <div className="flex gap-2.5 flex-wrap">
            <StatPill k="CV" v={`${cvPct}%`} sub="Completo" />
            <StatPill
              k="Estado"
              v={hasCv ? "Activo" : "Sin CV"}
              sub={hasCv ? "Recibiendo matches" : "Subí tu CV"}
            />
          </div>
        </div>

        {/* Optional action column */}
        {onCvDownload && hasCv && (
          <div className="flex flex-col gap-2 min-w-[160px]">
            <button
              type="button"
              onClick={onCvDownload}
              className="px-4 py-2.5 bg-white/[0.08] border border-white/[0.14] text-white rounded-[11px] text-[13px] font-bold cursor-pointer min-h-[44px]"
            >
              Descargar CV
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function StatPill({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div className="px-3.5 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl min-w-[110px]">
      <div className="text-[10.5px] font-bold tracking-[0.5px] text-white/55 uppercase">
        {k}
      </div>
      <div className="text-xl font-black tracking-[-0.6px] text-white mt-0.5">
        {v}
      </div>
      {sub && (
        <div className="text-[10.5px] font-bold text-accent-hi mt-[1px]">
          {sub}
        </div>
      )}
    </div>
  );
}
