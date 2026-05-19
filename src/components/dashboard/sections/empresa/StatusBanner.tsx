import { Icon } from "@/components/dashboard/Icon";

type StatusBannerProps = {
  tone: "amber" | "rose";
  title: string;
  body: string;
  icon: "alert" | "x";
};

export function StatusBanner({ tone, title, body, icon }: StatusBannerProps) {
  const isAmber = tone === "amber";
  return (
    <div
      className={[
        "flex gap-3 items-start",
        "rounded-[14px] px-4 py-3 mb-[14px]",
        "border",
        isAmber ? "bg-amber-bg border-amber/20" : "bg-rose-bg border-rose/20",
      ].join(" ")}
    >
      <span
        className={[
          "w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0",
          isAmber ? "bg-amber" : "bg-rose",
        ].join(" ")}
      >
        <Icon name={icon === "alert" ? "flag" : "x"} size={15} color="#fff" />
      </span>
      <div>
        <p className="text-[13.5px] font-extrabold text-text">{title}</p>
        <p className="text-[12.5px] text-muted mt-0.5">{body}</p>
      </div>
    </div>
  );
}
