"use client";

type Props = {
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
};

export function SubmitButton({
  children,
  loading = false,
  disabled = false,
}: Props) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="relative mt-1.5 flex min-h-[44px] w-full items-center justify-center overflow-hidden rounded-xl border-none bg-gradient-to-br from-text to-[#222] px-[18px] py-3.5 text-sm font-bold text-white shadow-[0_10px_28px_-10px_var(--color-text),0_4px_10px_var(--color-accent)] transition-all disabled:cursor-not-allowed disabled:opacity-70"
    >
      {/* shimmer */}
      <span
        aria-hidden
        className="absolute inset-0 animate-[auth-shimmer_3s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/[0.18] to-transparent"
      />
      <span className="relative">{loading ? "Procesando…" : children}</span>
    </button>
  );
}
