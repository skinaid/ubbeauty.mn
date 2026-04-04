"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type SidebarNavItem = {
  href: string;
  label: string;
  icon?: string;
  accent?: boolean;
};

export function SidebarNav({ items }: { items: SidebarNavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="app-shell__nav" data-sidebar-nav="true">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            data-sidebar-nav-item={item.href}
            data-sidebar-nav-label={item.label}
            className={[
              item.accent ? "app-shell__nav-link--accent" : "",
              isActive ? "app-shell__nav-link--active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {item.icon ? <span aria-hidden>{item.icon}</span> : null}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
