"use client";

import Link from "next/link";
import { Menu, Search, CircleUserRound } from "lucide-react";
import { useSearchModal } from "@/context/SearchModalContext";
import { Button } from "@/components/ui/button";
import NotificationDropdown from "@/components/NotificationDropdown";

interface MobileNavBarProps {
  onMenuClick: () => void;
}

export default function MobileNavBar({ onMenuClick }: MobileNavBarProps) {
  const { setOpen: setSearchOpen } = useSearchModal();

  return (
    <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background px-4 md:hidden">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Open menu"
        onClick={onMenuClick}
        className="-ml-2 px-0"
      >
        <Menu className="size-5" />
      </Button>
      <div className="flex items-center gap-1 -mr-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Search"
          onClick={() => setSearchOpen(true)}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <Search className="size-5" />
        </Button>
        <NotificationDropdown />
        <Link href="/account">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Account"
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <CircleUserRound className="size-5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
