"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, UserPlus, Bell, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Pacientes", icon: Home },
  { href: "/pacientes/nuevo", label: "Nuevo", icon: UserPlus },
  { href: "/alertas", label: "Alertas", icon: Bell },
  { href: "/historias", label: "Historias", icon: FileText }
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur safe-bottom md:hidden">
      <ul className="grid grid-cols-4">
        {items.map((it) => {
          const active = path === it.href || (it.href !== "/" && path.startsWith(it.href));
          const Icon = it.icon;
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                className={cn(
                  "flex flex-col items-center py-2 text-xs gap-1 transition-colors",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "text-primary")} />
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
