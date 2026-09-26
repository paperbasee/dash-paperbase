import {
  FacebookLogoIcon,
  InstagramLogoIcon,
  MessengerLogoIcon,
  TiktokLogoIcon,
  WhatsappLogoIcon,
  type Icon,
} from "@phosphor-icons/react";

import type { SignupPlatform } from "@/lib/storeSocialLinks";
import { cn } from "@/lib/utils";

/**
 * A platform's logo, Phosphor's (owner, 2026-09-26: "include the icons of each from phosphor") --
 * the same drawings the shop's footer and Sign-up button carry, in the same regular weight.
 */
const MARKS: Record<SignupPlatform, Icon> = {
  whatsapp: WhatsappLogoIcon,
  messenger: MessengerLogoIcon,
  facebook: FacebookLogoIcon,
  instagram: InstagramLogoIcon,
  tiktok: TiktokLogoIcon,
};

export function SocialMark({ platform, className }: { platform: SignupPlatform; className?: string }) {
  const Mark = MARKS[platform];
  return <Mark aria-hidden className={cn("size-[18px] shrink-0", className)} />;
}
