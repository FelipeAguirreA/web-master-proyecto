"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { D, type Palette } from "./palettes";
import { Icon } from "./Icon";
import { Avatar } from "./atoms/Avatar";
import { useNotifications } from "@/hooks/useNotifications";

type Props = {
  userName: string;
  userEmail: string;
  userImage?: string | null;
  isAdmin?: boolean;
  onMenu: () => void;
  showLogo?: boolean;
  palette?: Palette;
};

export function DashboardTopbar({
  userName,
  userEmail,
  userImage,
  isAdmin = false,
  onMenu,
  showLogo = false,
  palette,
}: Props) {
  const p = palette ?? D;
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [searchFocus, setSearchFocus] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount: notifCount,
    markAllRead,
    deleteNotification,
  } = useNotifications();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      )
        setDropdownOpen(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node))
        setBellOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const initial = (userName || "U").charAt(0).toUpperCase();

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: `${p.bg}EE`,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: `1px solid ${p.border}`,
        padding: "12px 24px",
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <button
        type="button"
        onClick={onMenu}
        className="practix-topbar-menu"
        style={{
          display: "none",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 6,
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-label="Abrir menú"
      >
        <Icon name="menu" size={20} color={p.text} />
      </button>

      {showLogo && (
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            marginRight: 18,
            textDecoration: "none",
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: `linear-gradient(135deg,${p.accent},${p.accentHi})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 13,
              color: "#fff",
            }}
          >
            P
          </div>
          <span
            className="practix-topbar-logoname"
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: p.text,
              letterSpacing: -0.4,
            }}
          >
            PractiX
          </span>
        </Link>
      )}

      <div
        className="practix-topbar-search"
        style={{
          flex: 1,
          maxWidth: 440,
          position: "relative",
        }}
      >
        <span
          style={{
            position: "absolute",
            left: 14,
            top: "50%",
            transform: "translateY(-50%)",
            color: p.subtle,
            display: "flex",
            pointerEvents: "none",
          }}
        >
          <Icon name="search" size={15} color={p.subtle} />
        </span>
        <input
          type="text"
          placeholder="Busca prácticas, empresas o habilidades…"
          onFocus={() => setSearchFocus(true)}
          onBlur={() => setSearchFocus(false)}
          style={{
            width: "100%",
            background: searchFocus ? p.surface : "rgba(0,0,0,.035)",
            border: `1px solid ${searchFocus ? p.borderHi : "transparent"}`,
            borderRadius: 12,
            padding: "10px 14px 10px 38px",
            fontSize: 13.5,
            color: p.text,
            fontFamily: "inherit",
            outline: "none",
            boxShadow: searchFocus ? `0 0 0 4px ${p.accent}14` : "none",
            transition: "all .15s",
          }}
        />
        <kbd
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 10,
            color: p.subtle,
            background: p.surface,
            border: `1px solid ${p.border}`,
            padding: "2px 6px",
            borderRadius: 5,
            fontFamily: "inherit",
            fontWeight: 600,
            pointerEvents: "none",
          }}
        >
          ⌘K
        </kbd>
      </div>

      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {isAdmin && (
          <Link
            href="/admin/empresas"
            className="practix-topbar-admin"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11.5,
              fontWeight: 700,
              color: "#fff",
              background: p.text,
              padding: "6px 12px",
              borderRadius: 30,
              textDecoration: "none",
              marginRight: 4,
            }}
          >
            Admin
          </Link>
        )}

        <div ref={bellRef} style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => {
              setBellOpen((v) => !v);
              if (!bellOpen && notifCount > 0) markAllRead();
            }}
            style={{
              position: "relative",
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            className="practix-topbar-bell"
            aria-label="Notificaciones"
          >
            <Icon name="bell" size={18} color={p.muted} />
            {notifCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: 8,
                  right: 9,
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: p.accent,
                  border: `2px solid ${p.surface}`,
                  boxSizing: "content-box",
                }}
              />
            )}
          </button>

          {bellOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                width: 320,
                maxWidth: "min(90vw,320px)",
                background: p.surface,
                borderRadius: 16,
                boxShadow: "0 16px 48px -12px rgba(20,15,10,0.18)",
                border: `1px solid ${p.border}`,
                overflow: "hidden",
                zIndex: 50,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderBottom: `1px solid ${p.border}`,
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: p.text,
                      letterSpacing: -0.1,
                    }}
                  >
                    Notificaciones
                  </p>
                  <p
                    style={{
                      fontSize: 10,
                      color: p.subtle,
                      marginTop: 2,
                    }}
                  >
                    {notifications.length} en total
                  </p>
                </div>
                {notifications.some((n) => !n.read) && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    style={{
                      fontSize: 10.5,
                      color: p.accent,
                      fontWeight: 700,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Marcar leídas
                  </button>
                )}
              </div>
              <div
                style={{
                  maxHeight: "min(60dvh,360px)",
                  overflowY: "auto",
                }}
              >
                {notifications.length === 0 ? (
                  <div
                    style={{
                      padding: "40px 16px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        background: p.bg,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 10,
                      }}
                    >
                      <Icon name="bell" size={20} color={p.faint} />
                    </div>
                    <p
                      style={{
                        fontSize: 12.5,
                        color: p.muted,
                        fontWeight: 500,
                      }}
                    >
                      Sin notificaciones por ahora
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: p.subtle,
                        marginTop: 4,
                      }}
                    >
                      Te avisamos acá cuando pase algo.
                    </p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const ic =
                      n.type === "APPLICATION_ACCEPTED"
                        ? "🎉"
                        : n.type === "APPLICATION_REJECTED"
                          ? "❌"
                          : "👀";
                    return (
                      <div
                        key={n.id}
                        style={{
                          display: "flex",
                          gap: 10,
                          padding: "12px 14px",
                          background: n.read ? p.surface : "#FFF7F2",
                          borderBottom: `1px solid ${p.border}`,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            flexShrink: 0,
                            marginTop: 2,
                          }}
                        >
                          {ic}
                        </span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: p.text,
                              lineHeight: 1.3,
                            }}
                          >
                            {n.title}
                          </p>
                          <p
                            style={{
                              fontSize: 11,
                              color: p.muted,
                              marginTop: 2,
                              lineHeight: 1.4,
                            }}
                          >
                            {n.body}
                          </p>
                          <p
                            style={{
                              fontSize: 10,
                              color: p.subtle,
                              marginTop: 4,
                            }}
                          >
                            {new Intl.DateTimeFormat("es-CL", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            }).format(new Date(n.createdAt))}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(n.id);
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: p.subtle,
                            padding: 4,
                            alignSelf: "flex-start",
                          }}
                          aria-label="Eliminar"
                        >
                          <Icon name="x" size={12} color={p.subtle} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div ref={dropdownRef} style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setDropdownOpen((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 10px 4px 4px",
              borderRadius: 30,
              border: `1px solid ${p.border}`,
              background: p.surface,
              cursor: "pointer",
            }}
            aria-label="Menú usuario"
          >
            {userImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={userImage}
                alt={userName}
                width={28}
                height={28}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <Avatar ini={initial} size={28} />
            )}
            <span
              className="practix-topbar-name"
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: p.text,
              }}
            >
              {userName.split(" ")[0]}
            </span>
          </button>

          {dropdownOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                width: 224,
                background: p.surface,
                borderRadius: 16,
                border: `1px solid ${p.border}`,
                boxShadow: "0 16px 48px -12px rgba(20,15,10,0.18)",
                overflow: "hidden",
                zIndex: 50,
              }}
            >
              <div
                style={{
                  padding: "14px 16px",
                  borderBottom: `1px solid ${p.border}`,
                }}
              >
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: p.text,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {userName}
                </p>
                <p
                  style={{
                    fontSize: 11.5,
                    color: p.muted,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    marginTop: 2,
                  }}
                >
                  {userEmail}
                </p>
              </div>
              <Link
                href="/perfil"
                onClick={() => setDropdownOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 16px",
                  fontSize: 13,
                  color: p.muted,
                  textDecoration: "none",
                }}
              >
                <Icon name="user" size={14} color={p.subtle} />
                Editar perfil
              </Link>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 16px",
                  fontSize: 13,
                  color: "#C2410C",
                  background: "none",
                  border: "none",
                  width: "100%",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <Icon name="x" size={14} color="#C2410C" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width:900px) {
          .practix-topbar-menu { display: inline-flex !important; }
          .practix-topbar-name { display: none !important; }
        }
        @media (max-width:600px) {
          .practix-topbar-search { display: none !important; }
        }
      `}</style>
    </header>
  );
}
