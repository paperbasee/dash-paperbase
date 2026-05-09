"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { MessageCircle } from "lucide-react";
import { useNotifications } from "@/context/NotificationContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toLocaleDigits } from "@/lib/locale-digits";

export default function NotificationDropdown() {
  const { unreadCount } = useNotifications();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("notification");

  const handleClick = () => {
    router.push("/notifications-feed");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={t("aria")}
      className="relative shrink-0 text-muted-foreground hover:text-foreground"
      onClick={handleClick}
    >
      <MessageCircle className="size-5" />
      {unreadCount > 0 && (
        <Badge className="absolute -right-1 -top-1 min-w-[1.25rem] justify-center px-1 text-[0.65rem] leading-none">
          {toLocaleDigits(String(unreadCount), locale)}
        </Badge>
      )}
    </Button>
  );
}


