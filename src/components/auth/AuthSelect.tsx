"use client";

import { useState, type ReactNode } from "react";

type Option = { value: string; label: string };

type Props = {
  label: string;
  /** `name` del select — necesario para a11y y autofill. */
  name: string;
  icon?: ReactNode;
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  placeholder?: string;
};

export function AuthSelect({
  label,
  name,
  icon,
  options,
  value,
  onChange,
  hint,
  placeholder,
}: Props) {
  const [focus, setFocus] = useState(false);
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[12px] font-bold tracking-[0.1px] text-text">
        {label}
      </span>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 text-subtle">
            {icon}
          </span>
        )}
        <select
          id={name}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          className={`h-11 w-full appearance-none rounded-[11px] border-[1.5px] pr-9 text-sm font-medium text-text outline-none transition-all ${
            icon ? "pl-10" : "pl-3.5"
          } ${
            focus
              ? "border-accent bg-surface shadow-[0_0_0_4px_var(--color-accent)/0.11]"
              : "border-transparent bg-dark/[0.025]"
          } ${!value ? "text-subtle" : ""}`}
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
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] text-subtle">
          ▾
        </span>
      </div>
      {hint && (
        <span className="text-[11px] leading-[1.4] text-subtle">{hint}</span>
      )}
    </label>
  );
}
