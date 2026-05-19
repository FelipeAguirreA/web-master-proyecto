import type { Company } from "./types";
import { pickInitials } from "./utils";

interface Props {
  company: Pick<Company, "companyName" | "logo">;
  size: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: { outer: "w-[34px] h-[34px] rounded-[9px] text-[12px]" },
  md: { outer: "w-[44px] h-[44px] rounded-[11px] text-[14px]" },
  lg: { outer: "w-[54px] h-[54px] rounded-[13px] text-[17px]" },
};

export function CompanyLogo({ company, size }: Props) {
  const cls = sizeMap[size];
  return (
    <span
      className={[
        cls.outer,
        "bg-gradient-to-br from-dark to-accent text-white",
        "flex items-center justify-center font-black shrink-0 overflow-hidden",
        cls.outer,
      ].join(" ")}
    >
      {company.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={company.logo}
          alt={company.companyName}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover block"
        />
      ) : (
        pickInitials(company.companyName)
      )}
    </span>
  );
}
