import { useSyncExternalStore } from "react";

/**
 * Cookie consent: storage + types compartidos entre el banner y el gate.
 * Persistencia en localStorage por simplicidad — el server no necesita
 * leer el consent (Analytics y Speed Insights corren solo client-side).
 *
 * Si cambia la política de privacidad, bumpear CONSENT_VERSION invalida
 * los consents anteriores y vuelve a mostrar el banner a todos los users.
 */

export const CONSENT_VERSION = "2026-05-07";
export const CONSENT_STORAGE_KEY = "practix-cookie-consent";
export const CONSENT_CHANGE_EVENT = "practix:consent-change";

export interface ConsentState {
  necessary: true;
  analytics: boolean;
  version: string;
  timestamp: string;
}

function parseConsent(raw: string | null): ConsentState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ConsentState>;
    if (parsed.version !== CONSENT_VERSION) return null;
    if (typeof parsed.analytics !== "boolean") return null;
    return {
      necessary: true,
      analytics: parsed.analytics,
      version: CONSENT_VERSION,
      timestamp: parsed.timestamp ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Lee el consent del localStorage. Retorna null si no hay decisión guardada
 * o si la versión almacenada no matchea la actual (consent expirado por
 * cambio de política).
 */
export function readConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  return parseConsent(window.localStorage.getItem(CONSENT_STORAGE_KEY));
}

/**
 * Persiste el consent y notifica a otros componentes en la misma pestaña
 * vía CustomEvent. localStorage 'storage' event solo dispara cross-tab,
 * por eso usamos un evento custom para same-tab.
 */
export function writeConsent(analytics: boolean): ConsentState {
  const state: ConsentState = {
    necessary: true,
    analytics,
    version: CONSENT_VERSION,
    timestamp: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(
      new CustomEvent<ConsentState>(CONSENT_CHANGE_EVENT, { detail: state }),
    );
  }
  return state;
}

// useSyncExternalStore plumbing — leer localStorage como "external store"
// es exactamente para lo que React 18+ proporcionó este hook. Evita el
// anti-pattern de setState dentro de useEffect (regla
// react-hooks/set-state-in-effect).

const NO_CONSENT_SENTINEL = "__NONE__";

function getConsentRawSnapshot(): string {
  if (typeof window === "undefined") return NO_CONSENT_SENTINEL;
  return (
    window.localStorage.getItem(CONSENT_STORAGE_KEY) ?? NO_CONSENT_SENTINEL
  );
}

function getConsentRawServerSnapshot(): string {
  return NO_CONSENT_SENTINEL;
}

function subscribeConsent(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onCustom = () => callback();
  const onStorage = (e: StorageEvent) => {
    if (e.key === CONSENT_STORAGE_KEY) callback();
  };
  window.addEventListener(CONSENT_CHANGE_EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CONSENT_CHANGE_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Hook que expone el consent actual con re-render automático cuando cambia.
 * En SSR retorna null. En client lee de localStorage y reacciona a:
 *   - CustomEvent `practix:consent-change` (mismo tab)
 *   - storage event (otros tabs del mismo dominio)
 */
export function useConsent(): ConsentState | null {
  const raw = useSyncExternalStore(
    subscribeConsent,
    getConsentRawSnapshot,
    getConsentRawServerSnapshot,
  );
  if (raw === NO_CONSENT_SENTINEL) return null;
  return parseConsent(raw);
}
