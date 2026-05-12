type IconName =
  | "home"
  | "search"
  | "flag"
  | "chat"
  | "cal"
  | "user"
  | "bell"
  | "set"
  | "arr"
  | "plus"
  | "menu"
  | "check"
  | "star"
  | "spark"
  | "doc"
  | "pin"
  | "clock"
  | "briefc"
  | "video"
  | "x"
  | "cv"
  | "send"
  | "heart"
  | "grid"
  | "list"
  | "dense";

type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export function Icon({
  name,
  size = 18,
  color = "currentColor",
  strokeWidth = 1.8,
}: IconProps) {
  const p = {
    fill: "none",
    stroke: color,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const v = { width: size, height: size, viewBox: "0 0 24 24" };

  switch (name) {
    case "home":
      return (
        <svg {...v}>
          <path {...p} d="M3 11l9-8 9 8M5 10v10h14V10" />
        </svg>
      );
    case "search":
      return (
        <svg {...v}>
          <circle cx="11" cy="11" r="7" {...p} />
          <path {...p} d="M21 21l-4.3-4.3" />
        </svg>
      );
    case "flag":
      return (
        <svg {...v}>
          <path {...p} d="M4 21V4h14l-2 4 2 4H4" />
        </svg>
      );
    case "chat":
      return (
        <svg {...v}>
          <path
            {...p}
            d="M21 12a8 8 0 11-3.5-6.6L21 4l-1.4 3.6A8 8 0 0121 12z"
          />
        </svg>
      );
    case "cal":
      return (
        <svg {...v}>
          <rect x="3" y="5" width="18" height="16" rx="2" {...p} />
          <path {...p} d="M8 3v4M16 3v4M3 10h18" />
        </svg>
      );
    case "user":
      return (
        <svg {...v}>
          <circle cx="12" cy="8" r="4" {...p} />
          <path {...p} d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
        </svg>
      );
    case "bell":
      return (
        <svg {...v}>
          <path {...p} d="M6 8a6 6 0 0112 0c0 7 3 8 3 8H3s3-1 3-8" />
          <path {...p} d="M10 21a2 2 0 004 0" />
        </svg>
      );
    case "set":
      return (
        <svg {...v}>
          <circle cx="12" cy="12" r="3" {...p} />
          <path
            {...p}
            d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82L4.21 5.2a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33 1.65 1.65 0 001-1.51V1a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V7a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"
          />
        </svg>
      );
    case "arr":
      return (
        <svg {...v}>
          <path {...p} d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      );
    case "plus":
      return (
        <svg {...v}>
          <path {...p} d="M12 5v14M5 12h14" />
        </svg>
      );
    case "menu":
      return (
        <svg {...v}>
          <path {...p} d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      );
    case "check":
      return (
        <svg {...v}>
          <path {...p} d="M20 6L9 17l-5-5" />
        </svg>
      );
    case "star":
      return (
        <svg {...v}>
          <path
            d="M12 2l3 6.5 7 1-5 5 1.2 7L12 18l-6.2 3.5L7 14.5l-5-5 7-1z"
            fill={color}
          />
        </svg>
      );
    case "spark":
      return (
        <svg {...v}>
          <path
            {...p}
            d="M12 3v3M12 18v3M5 12H2M22 12h-3M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2"
          />
          <circle cx="12" cy="12" r="3" {...p} />
        </svg>
      );
    case "doc":
      return (
        <svg {...v}>
          <path
            {...p}
            d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
          />
          <path {...p} d="M14 2v6h6M8 13h8M8 17h5" />
        </svg>
      );
    case "pin":
      return (
        <svg {...v}>
          <path {...p} d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
          <circle cx="12" cy="10" r="3" {...p} />
        </svg>
      );
    case "clock":
      return (
        <svg {...v}>
          <circle cx="12" cy="12" r="9" {...p} />
          <path {...p} d="M12 7v5l3 2" />
        </svg>
      );
    case "briefc":
      return (
        <svg {...v}>
          <rect x="2" y="7" width="20" height="14" rx="2" {...p} />
          <path {...p} d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
        </svg>
      );
    case "video":
      return (
        <svg {...v}>
          <rect x="2" y="6" width="14" height="12" rx="2" {...p} />
          <path {...p} d="M22 8l-6 4 6 4z" />
        </svg>
      );
    case "x":
      return (
        <svg {...v}>
          <path {...p} d="M18 6L6 18M6 6l12 12" />
        </svg>
      );
    case "cv":
      return (
        <svg {...v}>
          <rect x="4" y="3" width="16" height="18" rx="2" {...p} />
          <circle cx="12" cy="9" r="2.4" {...p} />
          <path {...p} d="M7 17c1.2-2.4 3-3.4 5-3.4s3.8 1 5 3.4" />
        </svg>
      );
    case "send":
      return (
        <svg {...v}>
          <path {...p} d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
        </svg>
      );
    case "heart":
      return (
        <svg {...v}>
          <path
            {...p}
            d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 000-7.6z"
          />
        </svg>
      );
    case "grid":
      return (
        <svg {...v}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" {...p} />
          <rect x="14" y="3" width="7" height="7" rx="1.5" {...p} />
          <rect x="3" y="14" width="7" height="7" rx="1.5" {...p} />
          <rect x="14" y="14" width="7" height="7" rx="1.5" {...p} />
        </svg>
      );
    case "list":
      return (
        <svg {...v}>
          <path {...p} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
      );
    case "dense":
      return (
        <svg {...v}>
          <path {...p} d="M3 6h18M3 10h18M3 14h18M3 18h18" />
        </svg>
      );
  }
}
