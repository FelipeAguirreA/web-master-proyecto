"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";

const GRADIENTS = [
  "from-[#FF6A3D] to-[#C2410C]",
  "from-[#F59E0B] to-[#B45309]",
  "from-[#10B981] to-[#047857]",
  "from-[#3B82F6] to-[#1D4ED8]",
  "from-[#8B5CF6] to-[#6D28D9]",
  "from-[#0A0909] to-[#2a2722]",
  "from-[#F97316] to-[#9A3412]",
];

function gradientFromName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return GRADIENTS[hash % GRADIENTS.length];
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join("");
}

type Props = {
  name: string;
  image?: string | null;
  isCompany?: boolean;
  size?: number;
  className?: string;
};

export default function InboxAvatar({
  name,
  image,
  isCompany = false,
  size = 40,
  className = "",
}: Props) {
  const [broken, setBroken] = useState(false);
  const showImg = image && !broken;
  const gradient = isCompany
    ? "from-[#2a2722] to-[#0A0909]"
    : gradientFromName(name);

  return (
    <div
      className={`flex items-center justify-center rounded-full overflow-hidden text-white font-bold shadow-sm bg-gradient-to-br ${gradient} ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(11, Math.round(size * 0.38)),
      }} /* dynamic: size prop drives px dimensions and scaled fontSize — no Tailwind equivalent */
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={name}
          onError={() => setBroken(true)}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
      ) : isCompany ? (
        <Building2
          style={{
            width: size * 0.5,
            height: size * 0.5,
          }} /* dynamic: icon scales with size prop */
          strokeWidth={2.2}
        />
      ) : (
        initials(name)
      )}
    </div>
  );
}
