"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/review", label: "Due today" },
  { href: "/progress", label: "Progress" },
  { href: "/calendar", label: "Calendar" },
  { href: "/decks/new", label: "New deck" },
];

export function MobileNav({ authSlot }: { authSlot: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>
      {open && (
        <div className="absolute inset-x-0 top-14 z-50 border-b bg-background shadow-md">
          <nav className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-1 border-t pt-2">{authSlot}</div>
          </nav>
        </div>
      )}
    </>
  );
}
