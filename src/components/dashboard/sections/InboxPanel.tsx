import Link from "next/link";
import { Icon } from "../Icon";
import { CoLogo } from "../atoms/CoLogo";

export type InboxMessage = {
  id: string;
  co: string;
  logo: string;
  logoUrl?: string | null;
  logoBg: string;
  logoFg: string;
  sender?: string | null;
  preview: string;
  when: string;
  unread: boolean;
};

export function InboxPanel({
  messages,
  inboxHref,
}: {
  messages: InboxMessage[];
  inboxHref: string;
}) {
  const unreadCount = messages.filter((m) => m.unread).length;

  return (
    <section className="bg-[#1F1A16] text-white rounded-[18px] overflow-hidden relative border border-white/[.06]">
      {/* Glow decorativo — accent translúcido */}
      <div className="absolute -top-10 -right-[30px] w-[180px] h-[180px] pointer-events-none blur-[24px] [background:radial-gradient(circle,color-mix(in_srgb,var(--color-accent)_16%,transparent)_0%,transparent_65%)]" />

      <header className="relative px-[18px] pt-4 pb-3 border-b border-white/[.08] flex items-center justify-between">
        <div className="flex items-center gap-[9px] min-w-0">
          <span className="w-[30px] h-[30px] rounded-[9px] bg-white/[.08] border border-white/[.12] flex items-center justify-center shrink-0">
            <Icon name="chat" size={15} color="var(--color-accent-hi)" />
          </span>
          <h3 className="text-[15px] font-extrabold text-white tracking-[-0.3px]">
            Mensajes
          </h3>
          {unreadCount > 0 && (
            <span className="bg-accent text-white text-[10px] font-extrabold py-0.5 px-[7px] rounded-[10px] shrink-0 shadow-[0_4px_10px_color-mix(in_srgb,var(--color-accent)_33%,transparent)]">
              {unreadCount} nuevo{unreadCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <Link
          href={inboxHref}
          className="text-[11.5px] font-bold text-accent-hi no-underline shrink-0"
        >
          Inbox
        </Link>
      </header>

      {messages.length === 0 ? (
        <div className="relative px-[18px] py-8 text-center">
          <div className="w-11 h-11 rounded-[14px] bg-white/5 border border-white/[.08] inline-flex items-center justify-center mb-2.5">
            <Icon name="chat" size={20} color="rgba(255,255,255,.5)" />
          </div>
          <p className="text-[12.5px] text-white/75 font-medium">
            Sin mensajes por ahora
          </p>
          <p className="text-[11px] text-white/45 mt-1 leading-[1.5]">
            Cuando una empresa te escriba, lo vas a ver acá.
          </p>
        </div>
      ) : (
        <div className="relative">
          {messages.map((m, i) => (
            <Link
              key={m.id}
              href={inboxHref}
              className={[
                "flex gap-[11px] px-[18px] py-[13px] relative transition-colors duration-150 no-underline hover:bg-white/[.04]",
                i < messages.length - 1 ? "border-b border-white/[.06]" : "",
              ].join(" ")}
            >
              {/* Unread dot */}
              {m.unread && (
                <span className="absolute left-2 top-1/2 -translate-y-1/2 w-[5px] h-[5px] rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)]" />
              )}
              <CoLogo
                logo={m.logo}
                logoUrl={m.logoUrl}
                logoBg={m.logoBg}
                logoFg={m.logoFg}
                size={36}
              />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between gap-2 mb-[3px]">
                  <span
                    className={[
                      "text-[12.5px] text-white truncate min-w-0",
                      m.unread ? "font-bold" : "font-semibold",
                    ].join(" ")}
                  >
                    {m.co}
                  </span>
                  <span className="text-[10.5px] text-white/45 shrink-0">
                    {m.when}
                  </span>
                </div>
                {m.sender && (
                  <p className="text-[11.5px] text-white/50 font-medium mb-[3px]">
                    {m.sender}
                  </p>
                )}
                <p
                  className={[
                    "text-[12.5px] leading-[1.45] line-clamp-2",
                    m.unread ? "text-white/92" : "text-white/65",
                  ].join(" ")}
                >
                  {m.preview}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
