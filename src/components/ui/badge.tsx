import type { HTMLAttributes } from "react";

export type BadgeVariant = "neutral" | "success" | "warning" | "danger" | "info";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export function Badge({ variant = "neutral", className = "", children, ...rest }: BadgeProps) {
  return (
    <span className={["ui-badge", `ui-badge--${variant}`, className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </span>
  );
}
