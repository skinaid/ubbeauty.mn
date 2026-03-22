import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  className?: string;
};

export function PageHeader({ title, description, className = "" }: PageHeaderProps) {
  return (
    <header className={["ui-page-header", className].filter(Boolean).join(" ")}>
      <h1 className="ui-page-header__title">{title}</h1>
      {description ? <p className="ui-page-header__description">{description}</p> : null}
    </header>
  );
}
