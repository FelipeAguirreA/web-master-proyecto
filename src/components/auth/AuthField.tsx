"use client";

import { useState, type ReactNode } from "react";

type Props = {
  label: string;
  /** `name` del input — necesario para que el browser haga autofill correctamente y para que la advertencia de a11y de Chrome desaparezca. */
  name: string;
  type?: string;
  placeholder?: string;
  icon?: ReactNode;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
  error?: string | null;
};

export function AuthField({
  label,
  name,
  type = "text",
  placeholder,
  icon,
  hint,
  value,
  onChange,
  autoComplete,
  required = false,
  error,
}: Props) {
  const [focus, setFocus] = useState(false);
  const [show, setShow] = useState(false);
  const isPw = type === "password";

  const inputCls = [
    "h-11 w-full rounded-[11px] border-[1.5px] text-sm font-medium text-text outline-none transition-all",
    isPw ? "pr-20" : "pr-3.5",
    icon ? "pl-10" : "pl-3.5",
    error
      ? "border-rose bg-rose-bg/40 shadow-[0_0_0_4px_var(--color-rose)/0.11]"
      : focus
        ? "border-accent bg-surface shadow-[0_0_0_4px_var(--color-accent)/0.11]"
        : "border-transparent bg-dark/[0.025]",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[12px] font-bold tracking-[0.1px] text-text">
        {label}
        {required && " *"}
      </span>

      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 text-subtle">
            {icon}
          </span>
        )}

        <input
          id={name}
          name={name}
          type={isPw ? (show ? "text" : "password") : type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${name}-error` : hint ? `${name}-hint` : undefined
          }
          className={inputCls}
        />

        {isPw && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[11px] font-bold text-muted transition-colors hover:text-text"
          >
            {show ? "Ocultar" : "Mostrar"}
          </button>
        )}
      </div>

      {error ? (
        <span
          id={`${name}-error`}
          className="text-[11px] font-semibold leading-[1.4] text-rose"
        >
          {error}
        </span>
      ) : hint ? (
        <span
          id={`${name}-hint`}
          className="text-[11px] leading-[1.4] text-subtle"
        >
          {hint}
        </span>
      ) : null}
    </label>
  );
}
