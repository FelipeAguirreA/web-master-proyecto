import { A } from "./tokens";

type IconName =
  | "user"
  | "mail"
  | "lock"
  | "bld"
  | "id"
  | "glb"
  | "ph"
  | "fact"
  | "cap"
  | "spark"
  | "check";

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export function AuthIcon({
  name,
  size = 16,
  color = A.subtle,
  strokeWidth = 1.8,
}: Props) {
  const p = {
    width: size,
    height: size,
    fill: "none" as const,
    stroke: color,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
  };
  switch (name) {
    case "user":
      return (
        <svg {...p}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c1-3.5 4-5 7-5s6 1.5 7 5" />
        </svg>
      );
    case "mail":
      return (
        <svg {...p}>
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      );
    case "lock":
      return (
        <svg {...p}>
          <rect x="4" y="11" width="16" height="9" rx="2.5" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
      );
    case "bld":
      return (
        <svg {...p}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01M9 16h.01M15 16h.01" />
        </svg>
      );
    case "id":
      return (
        <svg {...p}>
          <rect x="3" y="6" width="18" height="13" rx="2" />
          <path d="M7 11h4M7 14h6M15 10h3M15 13h3" />
        </svg>
      );
    case "glb":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c3 3.5 3 14 0 18M12 3c-3 3.5-3 14 0 18" />
        </svg>
      );
    case "ph":
      return (
        <svg {...p}>
          <path d="M4 5a2 2 0 0 1 2-2h2l2 5-2 1a11 11 0 0 0 6 6l1-2 5 2v2a2 2 0 0 1-2 2A16 16 0 0 1 4 5z" />
        </svg>
      );
    case "fact":
      return (
        <svg {...p}>
          <path d="M4 20V10l5 3V10l5 3V8l6-4v16z" />
          <path d="M4 20h16" />
        </svg>
      );
    case "cap":
      return (
        <svg {...p}>
          <path d="m2 9 10-5 10 5-10 5-10-5Zm4 2v5c3 2.5 9 2.5 12 0v-5" />
        </svg>
      );
    case "spark":
      return (
        <svg {...p}>
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
        </svg>
      );
    case "check":
      return (
        <svg {...p}>
          <path d="m5 12 5 5 9-11" />
        </svg>
      );
  }
}

export function GoogleSvg({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}
