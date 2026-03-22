import type { HTMLAttributes, ReactNode } from "react";

export type AlertVariant = "danger" | "warning" | "success" | "info";

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  variant: AlertVariant;
  children: ReactNode;
};

export function Alert({ variant, children, className = "", ...rest }: AlertProps) {
  const role = variant === "danger" || variant === "warning" ? "alert" : undefined;
  const cls = ["ui-alert", `ui-alert--${variant}`, className].filter(Boolean).join(" ");
  return (
    <div role={role} className={cls} {...rest}>
      {children}
    </div>
  );
}
