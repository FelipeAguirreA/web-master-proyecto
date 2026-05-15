"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { D, type Palette } from "./palettes";
import { Icon } from "./Icon";
import { Avatar } from "./atoms/Avatar";
import { useNotifications } from "@/hooks/useNotifications";
import { fetchWithRefresh } from "@/lib/client/fetch-with-refresh";

type SearchKind = "owned" | "applied";

type SearchItem = {
  kind: SearchKind;
  id: string;
  internshipId: string;
  title: string;
  subtitle: string | null;
  href: string;
  status?: string | null;
};

const MODALITY_LABEL: Record<string, string> = {
  REMOTE: "Remoto",
  ONSITE: "Presencial",
  HYBRID: "Híbrido",
};

const APPLICATION_STATUS_LABEL: Record<string, string> = {
  PENDING: "En revisión",
  REVIEWED: "Vista por la empresa",
  ACCEPTED: "Aceptada",
  REJECTED: "No avanzó",
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function matchesQuery(item: SearchItem, q: string): boolean {
  if (!q) return true;
  const needle = normalize(q);
  return (
    normalize(item.title).includes(needle) ||
    (item.subtitle != null && normalize(item.subtitle).includes(needle))
  );
}

type Props = {
  userName: string;
  userEmail: string;
  userImage?: string | null;
  isAdmin?: boolean;
  role?: "STUDENT" | "COMPANY";
  onMenu: () => void;
  showLogo?: boolean;
  palette?: Palette;
};

export function DashboardTopbar({
  userName,
  userEmail,
  userImage,
  isAdmin = false,
  role = "STUDENT",
  onMenu,
  showLogo = false,
  palette,
}: Props) {
  // El perfil del estudiante vive en /perfil (unificado con datos académicos +
  // CV). El perfil de la empresa es /dashboard/empresa/perfil con su propio
  // shell (logo, descripción, prácticas publicadas).
  const perfilHref =
    role === "COMPANY" ? "/dashboard/empresa/perfil" : "/perfil";
  const p = palette ?? D;
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchItems, setSearchItems] = useState<SearchItem[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Marca el role para el que ya cargamos datos. Permite invalidar el cache
  // si el role cambia (ej. logout + login con otro rol) y evitar refetch en
  // cada apertura del dropdown si ya tenemos resultados.
  const loadedForRoleRef = useRef<string | null>(null);

  const searchPlaceholder =
    role === "COMPANY"
      ? "Buscar entre tus prácticas publicadas…"
      : "Buscar entre tus postulaciones…";

  // Carga la fuente de datos del search la primera vez que se abre, o cuando
  // cambia el role. Cacheamos en estado para no pegarle a la API en cada
  // apertura del dropdown. Sólo `searchOpen` y `role` van en deps: agregar
  // `searchLoading`/`searchItems` causaba un loop donde el `setSearchLoading`
  // re-disparaba el effect, el cleanup mataba el primer run via `cancelled`,
  // y el `setSearchLoading(false)` final quedaba atrapado tras el guard del
  // cleanup → el dropdown se quedaba en "Cargando…" indefinidamente.
  useEffect(() => {
    if (!searchOpen) return;
    if (loadedForRoleRef.current === role) return;

    let cancelled = false;
    (async () => {
      setSearchLoading(true);
      setSearchError(null);
      try {
        if (role === "COMPANY") {
          const res = await fetchWithRefresh("/api/company/internships");
          if (!res.ok) throw new Error("fetch_failed");
          const data = (await res.json()) as {
            internships: Array<{
              id: string;
              title: string;
              area: string;
              modality: string;
              isActive: boolean;
            }>;
          };
          if (cancelled) return;
          const items: SearchItem[] = data.internships.map((i) => ({
            kind: "owned",
            id: i.id,
            internshipId: i.id,
            title: i.title,
            subtitle: [
              i.area,
              MODALITY_LABEL[i.modality] ?? i.modality,
              i.isActive ? null : "Inactiva",
            ]
              .filter(Boolean)
              .join(" · "),
            href: `/dashboard/empresa/ats/${i.id}`,
          }));
          setSearchItems(items);
          loadedForRoleRef.current = role;
        } else {
          const res = await fetchWithRefresh("/api/applications/my");
          if (!res.ok) throw new Error("fetch_failed");
          const data = (await res.json()) as Array<{
            id: string;
            status: string;
            internship: {
              id: string;
              title: string;
              area: string;
              modality: string;
            };
          }>;
          if (cancelled) return;
          const items: SearchItem[] = data.map((a) => ({
            kind: "applied",
            id: a.id,
            internshipId: a.internship.id,
            title: a.internship.title,
            subtitle: [
              a.internship.area,
              MODALITY_LABEL[a.internship.modality] ?? a.internship.modality,
            ]
              .filter(Boolean)
              .join(" · "),
            status: a.status,
            href: `/practicas/${a.internship.id}`,
          }));
          setSearchItems(items);
          loadedForRoleRef.current = role;
        }
      } catch {
        if (!cancelled) setSearchError("No pudimos cargar los resultados.");
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchOpen, role]);

  // Click fuera del buscador → cerrar el dropdown (mantiene el query escrito).
  useEffect(() => {
    if (!searchOpen) return;
    function onDown(ev: MouseEvent) {
      const node = searchContainerRef.current;
      if (node && !node.contains(ev.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [searchOpen]);

  const filteredResults = useMemo(() => {
    if (!searchItems) return [];
    const q = query.trim();
    if (!q) return searchItems;
    return searchItems.filter((i) => matchesQuery(i, q));
  }, [searchItems, query]);

  // El buscador funcional sólo vive en las home del dashboard (/dashboard/
  // estudiante y /dashboard/empresa). En las pantallas internas (ATS, inbox,
  // calendar, perfil, etc.) ocultamos el input para no dar la falsa impresión
  // de que busca cualquier cosa.
  const pathname = usePathname() ?? "";
  const showSearch =
    pathname === "/dashboard/estudiante" || pathname === "/dashboard/empresa";

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

      {showSearch && (
        <div
          ref={searchContainerRef}
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
              top: 19,
              color: p.subtle,
              display: "flex",
              pointerEvents: "none",
              zIndex: 1,
            }}
          >
            <Icon name="search" size={15} color={p.subtle} />
          </span>
          <input
            ref={searchInputRef}
            type="text"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setSearchOpen(false);
                searchInputRef.current?.blur();
              }
            }}
            style={{
              width: "100%",
              background: searchOpen ? p.surface : "rgba(0,0,0,.035)",
              border: `1px solid ${searchOpen ? p.borderHi : "transparent"}`,
              borderRadius: 12,
              padding: "10px 14px 10px 38px",
              fontSize: 13.5,
              color: p.text,
              fontFamily: "inherit",
              outline: "none",
              boxShadow: searchOpen ? `0 0 0 4px ${p.accent}14` : "none",
              transition: "all .15s",
            }}
          />

          {searchOpen && (
            <div
              role="listbox"
              aria-label="Resultados de búsqueda"
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                right: 0,
                background: p.surface,
                border: `1px solid ${p.border}`,
                borderRadius: 12,
                boxShadow: "0 14px 32px -10px rgba(0,0,0,.18)",
                // Alto fijo con scroll interno. El min(380, viewport - 96)
                // evita que el dropdown se salga de pantalla en notebooks
                // chicos (donde 380 px sería casi medio viewport).
                maxHeight: "min(380px, calc(100vh - 96px))",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                zIndex: 50,
              }}
            >
              {/* Cuerpo scrollable: lista crece hasta `maxHeight` del padre,
                  después scroll interno. overscrollBehavior: contain evita
                  que el scroll del dropdown se propague al body. */}
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: "auto",
                  overscrollBehavior: "contain",
                }}
              >
                {searchLoading && (
                  <div
                    style={{
                      padding: "14px 16px",
                      fontSize: 12.5,
                      color: p.subtle,
                    }}
                  >
                    Cargando…
                  </div>
                )}
                {!searchLoading && searchError && (
                  <div
                    style={{
                      padding: "14px 16px",
                      fontSize: 12.5,
                      color: p.rose,
                    }}
                  >
                    {searchError}
                  </div>
                )}
                {!searchLoading &&
                  !searchError &&
                  filteredResults.length === 0 && (
                    <div
                      style={{
                        padding: "16px",
                        fontSize: 12.5,
                        color: p.subtle,
                        lineHeight: 1.5,
                      }}
                    >
                      {searchItems && searchItems.length === 0
                        ? role === "COMPANY"
                          ? "Todavía no publicaste ninguna práctica."
                          : "Todavía no te postulaste a ninguna práctica."
                        : `Sin resultados para "${query}".`}
                    </div>
                  )}
                {!searchLoading &&
                  !searchError &&
                  filteredResults.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => {
                        setSearchOpen(false);
                        setQuery("");
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 14px",
                        textDecoration: "none",
                        borderBottom: `1px solid ${p.border}`,
                        transition: "background .15s",
                      }}
                      onMouseEnter={(ev) => {
                        ev.currentTarget.style.background = p.accentBg;
                      }}
                      onMouseLeave={(ev) => {
                        ev.currentTarget.style.background = "transparent";
                      }}
                    >
                      <span
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 7,
                          background: p.accentBg,
                          color: p.accent,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Icon name="briefc" size={13} color={p.accent} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: p.text,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.title}
                        </div>
                        {item.subtitle && (
                          <div
                            style={{
                              fontSize: 11,
                              color: p.subtle,
                              marginTop: 2,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {item.subtitle}
                          </div>
                        )}
                      </div>
                      {item.kind === "applied" && item.status && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            color: p.muted,
                            background: "rgba(15,23,42,.05)",
                            padding: "3px 8px",
                            borderRadius: 5,
                            letterSpacing: 0.3,
                            textTransform: "uppercase",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {APPLICATION_STATUS_LABEL[item.status] ?? item.status}
                        </span>
                      )}
                    </Link>
                  ))}
              </div>
              {/* Footer fijo abajo del dropdown: contador para que se entienda
                  que hay más resultados arriba/abajo del scroll. */}
              {!searchLoading && !searchError && filteredResults.length > 0 && (
                <div
                  style={{
                    flexShrink: 0,
                    padding: "8px 14px",
                    borderTop: `1px solid ${p.border}`,
                    background: "rgba(15,23,42,.025)",
                    fontSize: 11,
                    color: p.subtle,
                    fontWeight: 600,
                  }}
                >
                  {filteredResults.length === 1
                    ? "1 resultado"
                    : `${filteredResults.length} resultados`}
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
            onClick={() => setBellOpen((v) => !v)}
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
            aria-label={
              notifCount > 0
                ? `Notificaciones (${notifCount} sin leer)`
                : "Notificaciones"
            }
          >
            <Icon name="bell" size={18} color={p.muted} />
            {notifCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  minWidth: 13,
                  height: 13,
                  padding: "0 3px",
                  borderRadius: 7,
                  background: p.accent,
                  color: "#fff",
                  fontSize: 9,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `1.5px solid ${p.surface}`,
                  boxSizing: "content-box",
                  lineHeight: 1,
                  letterSpacing: 0,
                }}
              >
                {notifCount > 9 ? "9+" : notifCount}
              </span>
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
                          : n.type === "NEW_APPLICATION"
                            ? "📨"
                            : n.type === "NEW_MESSAGE"
                              ? "💬"
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
            <Avatar ini={initial} size={28} src={userImage} alt={userName} />
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
                href={perfilHref}
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
