"use client";

import { useRef } from "react";
import { CirclePlus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { DeferredNavLink } from "@/components/navigation/DeferredNavLink";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { APP_CONFIG } from "@/config/apps";
import { quickCreateItems } from "@/config/quick-create";
import { usePermissions } from "@/context/PermissionsContext";
import { useCanShowApp } from "@/hooks/useCanShowApp";

/**
 * The sidebar's Add new button (owner, 2026-10-03, in the look of uselayouts' "create-menu"): a
 * pill under the shop's name that opens a menu of the quick ways to add something
 * (config/quick-create.ts). In a collapsed sidebar it is a round + whose menu opens beside it.
 * The shared dropdown gives it a real menu's manners -- arrow keys, Esc, a click outside, focus
 * back -- and draws it above the sidebar, so nothing clips it.
 */
export function QuickCreateMenu({
  collapsed,
  onNavigate,
  className,
}: {
  collapsed: boolean;
  /** The mobile drawer closes once an item is picked. */
  onNavigate?: () => void;
  /** Its place in the sidebar; nothing at all is drawn for someone who can add nothing. */
  className?: string;
}) {
  const t = useTranslations("sidebar");
  const canShowApp = useCanShowApp();
  const { has } = usePermissions();
  const items = quickCreateItems(canShowApp, has);
  // Picking an item leaves for its page: focus stays where it lands, not on the button. Closing
  // with Esc or a click outside still gives the button its focus back.
  const picked = useRef(false);
  if (items.length === 0) return null;

  return (
    <div className={className}>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          {collapsed ? (
            <button type="button" aria-label={t("addNew")} className={`${TRIGGER} size-9 justify-center`}>
              <Plus className="size-4" aria-hidden />
            </button>
          ) : (
            <button type="button" className={`${TRIGGER} h-9 w-fit gap-1.5 pl-3.5 pr-4 text-sm font-medium`}>
              <CirclePlus className="size-4" aria-hidden />
              {t("addNew")}
            </button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          // Under the pill, beside the round + when collapsed -- never over the button: the menu
          // opens on press, and a press released over an item would pick it.
          side={collapsed ? "right" : "bottom"}
          align="start"
          sideOffset={collapsed ? 8 : 6}
          // z-[80]: above the phone's sidebar drawer (z-[70]), as the sidebar's user menu is.
          className="z-[80] flex min-w-48 flex-col gap-0.5 rounded-card p-1"
          onCloseAutoFocus={(event) => {
            if (picked.current) event.preventDefault();
            picked.current = false;
          }}
        >
          {items.map((item) => {
            const Icon = APP_CONFIG[item.appId].icon;
            return (
              <DropdownMenuItem
                key={item.id}
                asChild
                className="cursor-pointer rounded-ui bg-muted py-2 pl-2.5 pr-3 text-foreground focus:bg-accent"
                onSelect={() => {
                  picked.current = true;
                }}
              >
                <DeferredNavLink href={item.href} onNavigate={onNavigate}>
                  <Icon className="size-4" aria-hidden />
                  <span className="whitespace-nowrap">{t(`addNew_${item.id}` as never)}</span>
                </DeferredNavLink>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

const TRIGGER =
  "flex shrink-0 items-center rounded-full bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
