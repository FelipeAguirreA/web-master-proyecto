"use client";

import { useState, type ReactNode } from "react";
import { A } from "./tokens";

type Props = {
  label: string;
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
  const borderColor = error ? A.rose : focus ? A.accent : "transparent";
  const focusShadow = error
    ? `0 0 0 4px ${A.rose}1c`
    : focus
      ? `0 0 0 4px ${A.accent}1c`
      : "none";

  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: A.text,
          letterSpacing: 0.1,
        }}
      >
        {label}
        {required && " *"}
      </span>
      <div style={{ position: "relative" }}>
        {icon && (
          <span
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              color: A.subtle,
              display: "flex",
              pointerEvents: "none",
            }}
          >
            {icon}
          </span>
        )}
        <input
          type={isPw ? (show ? "text" : "password") : type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            width: "100%",
            padding: `13px ${isPw ? 80 : 14}px 13px ${icon ? 40 : 14}px`,
            background: focus ? A.surface : "rgba(0,0,0,.025)",
            border: `1.5px solid ${borderColor}`,
            borderRadius: 11,
            fontSize: 14,
            color: A.text,
            fontWeight: 500,
            boxShadow: focusShadow,
            transition: "all .15s",
            outline: "none",
            fontFamily: "inherit",
          }}
        />
        {isPw && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 700,
              color: A.muted,
              padding: "4px 8px",
              borderRadius: 6,
            }}
          >
            {show ? "Ocultar" : "Mostrar"}
          </button>
        )}
      </div>
      {error ? (
        <span
          style={{
            fontSize: 11,
            color: A.rose,
            lineHeight: 1.4,
            fontWeight: 600,
          }}
        >
          {error}
        </span>
      ) : hint ? (
        <span
          style={{
            fontSize: 11,
            color: A.subtle,
            lineHeight: 1.4,
          }}
        >
          {hint}
        </span>
      ) : null}
    </label>
  );
}
