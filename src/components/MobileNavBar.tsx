"use client";

import { useTranslations } from "next-intl";
import { Menu, Search } from "lucide-react";
import { useSearchModal } from "@/context/SearchModalContext";
import { Button } from "@/components/ui/button";
import NotificationDropdown from "@/components/NotificationDropdown";
import { cn } from "@/lib/utils";

interface MobileNavBarProps {
  onMenuClick: () => void;
  /** When true, nav bar sticks below the announcement banner (top-16). When false, sticks at top-0. */
  bannerVisible?: boolean;
}

export default function MobileNavBar({ onMenuClick, bannerVisible = false }: MobileNavBarProps) {
  const { setOpen: setSearchOpen } = useSearchModal();
  const tMobile = useTranslations("mobileNav");

  return (
    <div
      className={cn(
        "sticky z-40 flex h-14 items-center justify-between border-b border-border bg-background px-4 md:hidden",
        bannerVisible ? "top-[var(--header-height)]" : "top-0"
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        aria-label={tMobile("openMenu")}
        onClick={onMenuClick}
        className="-ml-2 px-0"
      >
        <Menu className="size-5" />
      </Button>
      <div className="flex items-center gap-1 -mr-2">
        <a
          href="https://docs.paperbase.me"
          target="_blank"
          rel="noopener noreferrer"
        >
        </a>
        <Button
          variant="ghost"
          size="icon"
          aria-label={tMobile("searchAria")}
          onClick={() => setSearchOpen(true)}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <Search className="size-5" />
        </Button>
        <NotificationDropdown />
      </div>
    </div>
  );
}
