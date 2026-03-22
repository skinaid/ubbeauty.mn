import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  padded?: boolean;
  stack?: boolean;
};

export function Card({ padded = false, stack = false, className = "", children, ...rest }: CardProps) {
  const mods = ["ui-card", padded && "ui-card--padded", stack && "ui-card--stack", className].filter(Boolean).join(" ");
  return (
    <div className={mods} {...rest}>
      {children}
    </div>
  );
}
