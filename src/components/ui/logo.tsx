import type { CSSProperties } from "react";

type Props = {
  size?: "sm" | "md" | "lg";
  style?: CSSProperties;
};

const sizes = {
  sm: { fontSize: "1.1rem", letterSpacing: "-0.02em" },
  md: { fontSize: "1.4rem", letterSpacing: "-0.025em" },
  lg: { fontSize: "1.8rem", letterSpacing: "-0.03em" },
};

export function Logo({ size = "md", style }: Props) {
  const s = sizes[size];
  return (
    <span
      style={{
        fontFamily: "var(--font-inter, Inter, sans-serif)",
        fontSize: s.fontSize,
        fontWeight: 600,
        letterSpacing: s.letterSpacing,
        color: "#ec4899",
        lineHeight: 1,
        userSelect: "none",
        ...style,
      }}
    >
      UB beauty
    </span>
  );
}
