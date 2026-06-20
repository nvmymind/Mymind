"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/home", label: "홈", icon: "🏠" },
  { href: "/search", label: "검색", icon: "🔍" },
  { href: "/words/new", label: "등록", icon: "➕" },
];

export function AppNav() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <nav className="fixed bottom-0 left-1/2 z-50 flex w-full max-w-lg -translate-x-1/2 border-t border-[var(--border)] bg-[var(--background)]">
      {links.map((link) => {
        const active = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-3 text-xs ${
              active ? "text-[var(--accent)]" : "text-[var(--muted)]"
            }`}
          >
            <span className="text-lg">{link.icon}</span>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
