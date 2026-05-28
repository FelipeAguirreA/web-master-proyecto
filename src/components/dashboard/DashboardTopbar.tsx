"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { logout } from "@/lib/client/logout";
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
};

export function DashboardTopbar({
  userName,
  userEmail,
  userImage,
  isAdmin = false,
  role = "STUDENT",
  onMenu,
  showLogo = false,
}: Props) {
  // El perfil del estudiante vive en /perfil (unificado con datos académicos +
  // CV). El perfil de la empresa es /dashboard/empresa/perfil con su propio
  // shell (logo, descripción, prácticas publicadas).
  const perfilHref =
    role === "COMPANY" ? "/dashboard/empresa/perfil" : "/perfil";
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
      className="sticky top-0 z-50 border-b border-border px-4 sm:px-6 py-3 flex items-center gap-[14px]"
      style={
        {
          // bg con alpha EE (93%) via CSS var — no hay token para esto
          background: "color-mix(in srgb, var(--color-bg) 93%, transparent)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        } as CSSProperties
      }
    >
      {/* Hamburger menu — visible solo en mobile (md:hidden) */}
      <button
        type="button"
        onClick={onMenu}
        className="md:hidden inline-flex items-center justify-center bg-transparent border-none cursor-pointer p-1.5 text-text"
        aria-label="Abrir menú"
      >
        <Icon name="menu" size={20} color="var(--color-text)" />
      </button>

      {showLogo && (
        <Link
          href="/"
          className="flex items-center gap-[9px] mr-[18px] no-underline"
        >
          <div className="w-[30px] h-[30px] rounded-lg flex items-center justify-center font-[800] text-[13px] text-white [background:linear-gradient(135deg,var(--color-accent),var(--color-accent-hi))]">
            P
          </div>
          <span className="hidden md:inline font-[700] text-[15px] text-text tracking-[-0.4px]">
            PractiX
          </span>
        </Link>
      )}

      {showSearch && (
        <div
          ref={searchContainerRef}
          className="flex-1 max-w-[440px] relative hidden sm:block"
        >
          <span className="absolute left-[14px] top-[19px] text-subtle flex pointer-events-none z-10">
            <Icon name="search" size={15} color="var(--color-subtle)" />
          </span>
          <input
            ref={searchInputRef}
            id="dashboard-search"
            name="dashboard-search"
            type="search"
            role="searchbox"
            aria-label={searchPlaceholder}
            autoComplete="off"
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
            className="w-full rounded-[12px] pl-[38px] pr-[14px] py-[10px] text-[13.5px] text-text font-[inherit] outline-none transition-all duration-150"
            style={
              {
                background: searchOpen
                  ? "var(--color-surface)"
                  : "rgba(0,0,0,.035)",
                border: searchOpen
                  ? "1px solid var(--color-border-hi)"
                  : "1px solid transparent",
                // ring de foco: accent con 8% de alpha — CSS var + color-mix
                boxShadow: searchOpen
                  ? "0 0 0 4px color-mix(in srgb, var(--color-accent) 8%, transparent)"
                  : "none",
              } as CSSProperties
            }
          />

          {searchOpen && (
            <div
              role="listbox"
              aria-label="Resultados de búsqueda"
              className="absolute top-[calc(100%+6px)] left-0 right-0 bg-surface border border-border rounded-[12px] flex flex-col overflow-hidden z-50"
              style={{
                boxShadow: "0 14px 32px -10px rgba(0,0,0,.18)",
                // Alto fijo con scroll interno. El min(380, viewport - 96)
                // evita que el dropdown se salga de pantalla en notebooks
                // chicos (donde 380 px sería casi medio viewport).
                maxHeight: "min(380px, calc(100vh - 96px))",
              }}
            >
              {/* Cuerpo scrollable: lista crece hasta `maxHeight` del padre,
                  después scroll interno. overscrollBehavior: contain evita
                  que el scroll del dropdown se propague al body. */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                {searchLoading && (
                  <div className="px-4 py-[14px] text-[12.5px] text-subtle">
                    Cargando…
                  </div>
                )}
                {!searchLoading && searchError && (
                  <div className="px-4 py-[14px] text-[12.5px] text-rose">
                    {searchError}
                  </div>
                )}
                {!searchLoading &&
                  !searchError &&
                  filteredResults.length === 0 && (
                    <div className="p-4 text-[12.5px] text-subtle leading-[1.5]">
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
                      className="flex items-center gap-[10px] px-[14px] py-[10px] no-underline border-b border-border transition-colors duration-150 hover:bg-accent-bg"
                    >
                      <span className="w-7 h-7 rounded-[7px] bg-accent-bg text-accent inline-flex items-center justify-center shrink-0">
                        <Icon
                          name="briefc"
                          size={13}
                          color="var(--color-accent)"
                        />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-[700] text-text truncate">
                          {item.title}
                        </div>
                        {item.subtitle && (
                          <div className="text-[11px] text-subtle mt-0.5 truncate">
                            {item.subtitle}
                          </div>
                        )}
                      </div>
                      {item.kind === "applied" && item.status && (
                        <span className="text-[10px] font-[800] text-muted bg-black/[0.05] px-2 py-[3px] rounded-[5px] tracking-[0.3px] uppercase whitespace-nowrap">
                          {APPLICATION_STATUS_LABEL[item.status] ?? item.status}
                        </span>
                      )}
                    </Link>
                  ))}
              </div>
              {/* Footer fijo abajo del dropdown: contador para que se entienda
                  que hay más resultados arriba/abajo del scroll. */}
              {!searchLoading && !searchError && filteredResults.length > 0 && (
                <div className="shrink-0 px-[14px] py-2 border-t border-border bg-black/[0.025] text-[11px] text-subtle font-[600]">
                  {filteredResults.length === 1
                    ? "1 resultado"
                    : `${filteredResults.length} resultados`}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="ml-auto flex items-center gap-1.5">
        {isAdmin && (
          <Link
            href="/admin/empresas"
            className="inline-flex items-center gap-1.5 text-[11.5px] font-[700] text-white bg-text px-3 py-[6px] rounded-[30px] no-underline mr-1"
          >
            Admin
          </Link>
        )}

        {/* Bell notification button */}
        <div ref={bellRef} className="relative">
          <button
            type="button"
            onClick={() => setBellOpen((v) => !v)}
            className="relative w-9 h-9 rounded-[10px] bg-transparent border-none cursor-pointer flex items-center justify-center"
            aria-label={
              notifCount > 0
                ? `Notificaciones (${notifCount} sin leer)`
                : "Notificaciones"
            }
          >
            <Icon name="bell" size={18} color="var(--color-muted)" />
            {notifCount > 0 && (
              <span
                className="absolute top-1 right-1 min-w-[13px] h-[13px] px-[3px] rounded-[7px] bg-accent text-white text-[9px] font-[800] flex items-center justify-center leading-none"
                style={{
                  // border solid usa surface para cutout effect
                  border: "1.5px solid var(--color-surface)",
                  boxSizing: "content-box",
                }}
              >
                {notifCount > 9 ? "9+" : notifCount}
              </span>
            )}
          </button>

          {bellOpen && (
            <div
              className="fixed top-[76px] right-3 md:absolute md:top-[calc(100%+8px)] md:right-0 w-[calc(100vw-1.5rem)] max-w-[300px] md:w-80 md:max-w-[320px] bg-surface rounded-[16px] border border-border overflow-hidden z-50"
              style={{ boxShadow: "0 16px 48px -12px rgba(20,15,10,0.18)" }}
            >
              <div className="flex items-center justify-between px-[14px] py-3 border-b border-border">
                <div>
                  <p className="text-[12.5px] font-[700] text-text tracking-[-0.1px]">
                    Notificaciones
                  </p>
                  <p className="text-[10px] text-subtle mt-0.5">
                    {notifications.length} en total
                  </p>
                </div>
                {notifications.some((n) => !n.read) && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="text-[10.5px] text-accent font-[700] bg-transparent border-none cursor-pointer"
                  >
                    Marcar leídas
                  </button>
                )}
              </div>
              <div
                className="overflow-y-auto"
                style={{ maxHeight: "min(60dvh,360px)" }}
              >
                {notifications.length === 0 ? (
                  <div className="px-4 py-[40px] text-center">
                    <div className="w-11 h-11 rounded-[14px] bg-bg inline-flex items-center justify-center mb-[10px]">
                      <Icon name="bell" size={20} color="var(--color-faint)" />
                    </div>
                    <p className="text-[12.5px] text-muted font-[500]">
                      Sin notificaciones por ahora
                    </p>
                    <p className="text-[11px] text-subtle mt-1">
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
                        className="flex gap-[10px] px-[14px] py-3 border-b border-border"
                        style={{
                          // Notif no leída tiene fondo distinto: valor fijo de diseño
                          // no está en paleta (warm cream para marcar sin leer).
                          background: n.read
                            ? "var(--color-surface)"
                            : "#FFF7F2",
                        }}
                      >
                        <span className="text-[13px] shrink-0 mt-0.5">
                          {ic}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-[12px] font-[700] text-text leading-[1.3]">
                            {n.title}
                          </p>
                          <p className="line-clamp-2 break-words text-[11px] text-muted mt-0.5 leading-[1.4]">
                            {n.body}
                          </p>
                          <p className="text-[10px] text-subtle mt-1">
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
                          className="w-6 h-6 flex items-center justify-center self-start shrink-0 bg-transparent border-none cursor-pointer text-subtle"
                          aria-label="Eliminar"
                        >
                          <Icon
                            name="x"
                            size={12}
                            color="var(--color-subtle)"
                          />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* User avatar dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-2 pl-1 pr-[10px] py-1 rounded-[30px] border border-border bg-surface cursor-pointer"
            aria-label="Menú usuario"
          >
            <Avatar ini={initial} size={28} src={userImage} alt={userName} />
            <span className="hidden md:inline text-[12.5px] font-[600] text-text">
              {userName.split(" ")[0]}
            </span>
          </button>

          {dropdownOpen && (
            <div
              className="absolute top-[calc(100%+8px)] right-0 w-[224px] bg-surface rounded-[16px] border border-border overflow-hidden z-50"
              style={{ boxShadow: "0 16px 48px -12px rgba(20,15,10,0.18)" }}
            >
              <div className="px-4 py-[14px] border-b border-border">
                <p className="text-[13px] font-[700] text-text truncate">
                  {userName}
                </p>
                <p className="text-[11.5px] text-muted truncate mt-0.5">
                  {userEmail}
                </p>
              </div>
              <Link
                href={perfilHref}
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-[10px] px-4 py-[10px] text-[13px] text-muted no-underline hover:bg-accent-bg transition-colors duration-150"
              >
                <Icon name="user" size={14} color="var(--color-subtle)" />
                Editar perfil
              </Link>
              <button
                type="button"
                onClick={() => logout()}
                className="flex items-center gap-[10px] px-4 py-[10px] text-[13px] text-[#C2410C] bg-transparent border-none w-full cursor-pointer text-left hover:bg-[#FFF3F0] transition-colors duration-150"
              >
                <Icon name="x" size={14} color="#C2410C" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
