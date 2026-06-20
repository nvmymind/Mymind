"use client";

type Props = {
  empathized: boolean;
  onClick: () => void;
  disabled?: boolean;
  size?: "sm" | "md";
};

export function EmpathyButton({ empathized, onClick, disabled, size = "md" }: Props) {
  const cls =
    size === "sm"
      ? "rounded-full px-3 py-1 text-xs"
      : "rounded-full px-4 py-2 text-sm";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${cls} border transition ${
        empathized
          ? "border-[var(--accent)] bg-[var(--accent)] text-white"
          : "border-[var(--border)] bg-transparent text-[var(--foreground)] hover:border-[var(--accent)]"
      } disabled:opacity-50`}
    >
      {empathized ? "❤️ 공감 취소" : "♡ 공감"}
    </button>
  );
}
