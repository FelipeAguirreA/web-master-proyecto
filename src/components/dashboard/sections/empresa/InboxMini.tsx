import Link from "next/link";
import { Avatar } from "@/components/dashboard/atoms/Avatar";
import { avatarColors, initialsFor, formatRelative } from "./utils";
import type { Conversation } from "./types";

type InboxMiniProps = {
  conversations: Conversation[];
  loading: boolean;
};

export function InboxMini({ conversations, loading }: InboxMiniProps) {
  return (
    <section
      className="rounded-[18px] p-[18px] sm:p-5 relative overflow-hidden text-white"
      /* El gradiente navy usa dos valores de color de diseño que no tienen token.
         dark = var(--color-dark) del @theme (OK), #1B2C56 es el segundo stop del
         gradiente — no hay token para "navy-2", se hardcodea con comentario. */
      style={{
        background: "linear-gradient(135deg, var(--color-dark), #1B2C56)",
      }}
    >
      {/* Glow decorativo */}
      <div
        aria-hidden
        className="absolute -top-10 -right-10 w-40 h-40 pointer-events-none
                   [background:radial-gradient(circle,color-mix(in_srgb,var(--color-accent)_19%,transparent)_0%,transparent_60%)]"
      />

      <header className="flex justify-between items-center mb-2.5 relative">
        <h2 className="text-[14.5px] font-extrabold tracking-[-0.3px]">
          Mensajes
        </h2>
        <Link
          href="/dashboard/empresa/inbox"
          className="text-accent-hi text-[11.5px] font-bold inline-flex items-center gap-1 no-underline"
        >
          Inbox →
        </Link>
      </header>

      {loading ? (
        <p className="text-[12px] text-white/60">Cargando…</p>
      ) : conversations.length === 0 ? (
        <p className="text-[12px] text-white/70 leading-relaxed">
          Cuando alguno de tus postulantes te escriba va a aparecer acá.
        </p>
      ) : (
        <div className="flex flex-col gap-0.5 relative">
          {conversations.map((c) => {
            const name = c.student?.name ?? "Sin nombre";
            const [c1, c2] = avatarColors(name);
            const ini = initialsFor(name);
            const unread = (c.unreadCount ?? 0) > 0;
            const when = c.lastMessage
              ? formatRelative(c.lastMessage.createdAt)
              : "";

            return (
              <Link
                key={c.id}
                href={`/dashboard/empresa/inbox?c=${c.id}`}
                className="flex gap-2.5 px-2 py-[9px] rounded-[9px] items-center no-underline transition-colors duration-150 hover:bg-white/[0.06]"
              >
                <Avatar
                  size={32}
                  ini={ini}
                  c1={c1}
                  c2={c2}
                  src={c.student?.image}
                  alt={name}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-1.5">
                    <span
                      className={[
                        "text-[12.5px] text-white whitespace-nowrap overflow-hidden text-ellipsis min-w-0",
                        unread ? "font-extrabold" : "font-semibold",
                      ].join(" ")}
                    >
                      {name}
                    </span>
                    <span
                      className={[
                        "text-[10.5px] whitespace-nowrap flex-shrink-0",
                        unread
                          ? "text-accent-hi font-extrabold"
                          : "text-white/50 font-medium",
                      ].join(" ")}
                    >
                      {when}
                    </span>
                  </div>
                  <p
                    className={[
                      "text-[11.5px] whitespace-nowrap overflow-hidden text-ellipsis mt-0.5",
                      unread
                        ? "text-white/85 font-semibold"
                        : "text-white/55 font-medium",
                    ].join(" ")}
                  >
                    {c.lastMessage?.content ?? "Sin mensajes aún"}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
