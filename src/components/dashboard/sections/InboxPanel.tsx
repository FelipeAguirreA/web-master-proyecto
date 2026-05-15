import Link from "next/link";
import { D } from "../tokens";
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
    <section
      style={{
        background: "#1F1A16",
        color: "#fff",
        borderRadius: 18,
        overflow: "hidden",
        position: "relative",
        border: "1px solid rgba(255,255,255,.06)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -40,
          right: -30,
          width: 180,
          height: 180,
          background: `radial-gradient(circle, ${D.accent}28, transparent 65%)`,
          filter: "blur(24px)",
          pointerEvents: "none",
        }}
      />
      <header
        style={{
          position: "relative",
          padding: "16px 18px 12px",
          borderBottom: "1px solid rgba(255,255,255,.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            minWidth: 0,
          }}
        >
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: "rgba(255,255,255,.08)",
              border: "1px solid rgba(255,255,255,.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon name="chat" size={15} color={D.accentHi} />
          </span>
          <h3
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: "#fff",
              letterSpacing: -0.3,
            }}
          >
            Mensajes
          </h3>
          {unreadCount > 0 && (
            <span
              style={{
                background: D.accent,
                color: "#fff",
                fontSize: 10,
                fontWeight: 800,
                padding: "2px 7px",
                borderRadius: 10,
                flexShrink: 0,
                boxShadow: `0 4px 10px ${D.accent}55`,
              }}
            >
              {unreadCount} nuevo{unreadCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <Link
          href={inboxHref}
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            color: D.accentHi,
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          Inbox
        </Link>
      </header>
      {messages.length === 0 ? (
        <div
          style={{
            position: "relative",
            padding: "32px 18px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: "rgba(255,255,255,.05)",
              border: "1px solid rgba(255,255,255,.08)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 10,
            }}
          >
            <Icon name="chat" size={20} color="rgba(255,255,255,.5)" />
          </div>
          <p
            style={{
              fontSize: 12.5,
              color: "rgba(255,255,255,.75)",
              fontWeight: 500,
            }}
          >
            Sin mensajes por ahora
          </p>
          <p
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,.45)",
              marginTop: 4,
              lineHeight: 1.5,
            }}
          >
            Cuando una empresa te escriba, lo vas a ver acá.
          </p>
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          {messages.map((m, i) => (
            <Link
              key={m.id}
              href={inboxHref}
              className="practix-inbox-item"
              style={{
                display: "flex",
                gap: 11,
                padding: "13px 18px",
                borderBottom:
                  i < messages.length - 1
                    ? "1px solid rgba(255,255,255,.06)"
                    : "none",
                position: "relative",
                transition: "background .15s",
                textDecoration: "none",
              }}
            >
              {m.unread && (
                <span
                  style={{
                    position: "absolute",
                    left: 8,
                    top: "50%",
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: D.accent,
                    boxShadow: `0 0 8px ${D.accent}`,
                  }}
                />
              )}
              <CoLogo
                logo={m.logo}
                logoUrl={m.logoUrl}
                logoBg={m.logoBg}
                logoFg={m.logoFg}
                size={36}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    marginBottom: 3,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12.5,
                      fontWeight: m.unread ? 700 : 600,
                      color: "#fff",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      minWidth: 0,
                    }}
                  >
                    {m.co}
                  </span>
                  <span
                    style={{
                      fontSize: 10.5,
                      color: "rgba(255,255,255,.45)",
                      flexShrink: 0,
                    }}
                  >
                    {m.when}
                  </span>
                </div>
                {m.sender && (
                  <p
                    style={{
                      fontSize: 11.5,
                      color: "rgba(255,255,255,.5)",
                      fontWeight: 500,
                      marginBottom: 3,
                    }}
                  >
                    {m.sender}
                  </p>
                )}
                <p
                  style={{
                    fontSize: 12.5,
                    color: m.unread
                      ? "rgba(255,255,255,.92)"
                      : "rgba(255,255,255,.65)",
                    lineHeight: 1.45,
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {m.preview}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
      <style>{`
        .practix-inbox-item:hover { background: rgba(255,255,255,.04); }
      `}</style>
    </section>
  );
}
