import {
  FacebookLogoIcon,
  InstagramLogoIcon,
  LinkedinLogoIcon,
  MessengerLogoIcon,
  PinterestLogoIcon,
  SnapchatLogoIcon,
  TelegramLogoIcon,
  ThreadsLogoIcon,
  TiktokLogoIcon,
  WhatsappLogoIcon,
  XLogoIcon,
  YoutubeLogoIcon,
  type Icon,
} from "@phosphor-icons/react";

import type { SignupTarget } from "@/lib/storeSocialLinks";
import { cn } from "@/lib/utils";

/**
 * A platform's logo, Phosphor's (owner, 2026-09-26: "include the icons of each from phosphor") --
 * the same drawings, in the same regular weight, as the shop's footer, Contact page and Sign-up
 * button (`icon.liquid`, `<platform>-logo`). Shared by Settings -> Store Info -> Identity, where
 * the accounts are typed, and the theme editor, where the places that show them are chosen.
 */
const MARKS: Record<SignupTarget, Icon> = {
  whatsapp: WhatsappLogoIcon,
  messenger: MessengerLogoIcon,
  facebook: FacebookLogoIcon,
  instagram: InstagramLogoIcon,
  tiktok: TiktokLogoIcon,
  youtube: YoutubeLogoIcon,
  telegram: TelegramLogoIcon,
  x: XLogoIcon,
  linkedin: LinkedinLogoIcon,
  pinterest: PinterestLogoIcon,
  threads: ThreadsLogoIcon,
  snapchat: SnapchatLogoIcon,
};

export function SocialMark({ platform, className }: { platform: SignupTarget; className?: string }) {
  const Mark = MARKS[platform];
  return <Mark aria-hidden className={cn("size-[18px] shrink-0", className)} />;
}
