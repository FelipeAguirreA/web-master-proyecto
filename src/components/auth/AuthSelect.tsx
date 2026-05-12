"use client";

import { useState, type ReactNode } from "react";
import { A } from "./tokens";

type Option = { value: string; label: string };

type Props = {
  label: string;
  icon?: ReactNode;
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  placeholder?: string;
};

export function AuthSelect({
  label,
  icon,
  options,
  value,
  onChange,
  hint,
  placeholder,
}: Props) {
  const [focus, setFocus] = useState(false);
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
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            width: "100%",
            appearance: "none",
            padding: `13px 36px 13px ${icon ? 40 : 14}px`,
            background: focus ? A.surface : "rgba(0,0,0,.025)",
            border: `1.5px solid ${focus ? A.accent : "transparent"}`,
            borderRadius: 11,
            fontSize: 14,
            color: value ? A.text : A.subtle,
            fontWeight: 500,
            boxShadow: focus ? `0 0 0 4px ${A.accent}1c` : "none",
            transition: "all .15s",
            outline: "none",
            fontFamily: "inherit",
            cursor: "pointer",
          }}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span
          style={{
            position: "absolute",
            right: 14,
            top: "50%",
            transform: "translateY(-50%)",
            color: A.subtle,
            pointerEvents: "none",
            fontSize: 11,
          }}
        >
          ▾
        </span>
      </div>
      {hint && (
        <span
          style={{
            fontSize: 11,
            color: A.subtle,
            lineHeight: 1.4,
          }}
        >
          {hint}
        </span>
      )}
    </label>
  );
}
