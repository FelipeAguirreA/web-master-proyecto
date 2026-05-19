import Link from "next/link";
import { Icon } from "../Icon";

type SectionHeadProps = {
  title: string;
  sub?: string;
  action?: { label: string; href: string };
};

export function SectionHead({ title, sub, action }: SectionHeadProps) {
  return (
    <div className="flex items-end justify-between gap-3.5 mb-3.5 flex-wrap">
      <div>
        <h2 className="text-[18px] font-extrabold text-text tracking-[-0.6px] leading-[1.2]">
          {title}
        </h2>
        {sub && <p className="text-[12.5px] text-muted mt-[3px]">{sub}</p>}
      </div>
      {action && (
        <Link
          href={action.href}
          className="text-[12.5px] font-bold text-accent inline-flex items-center gap-1 no-underline"
        >
          {action.label} <Icon name="arr" size={13} color="currentColor" />
        </Link>
      )}
    </div>
  );
}
