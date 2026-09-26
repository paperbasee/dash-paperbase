"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";

import { STORE_SOCIAL_LINK_KEYS, type StoreSocialLinkKey } from "@/lib/storeSocialLinks";

import { KitField, KitGroup, KitInput, KitNote } from "../kit";
import { SocialMark } from "../SocialMark";

/** Each box's own words: its name, what to type, and an example of it. */
const BOX_WORDS: Record<StoreSocialLinkKey, { label: string; help: string; example: string }> = {
  facebook: { label: "socialLinkFacebook", help: "socialLinkFacebookHelp", example: "facebook.com/yourshop" },
  instagram: { label: "socialLinkInstagram", help: "socialLinkInstagramHelp", example: "@yourshop" },
  whatsapp: { label: "socialLinkWhatsapp", help: "socialLinkWhatsappHelp", example: "01712-345678" },
  tiktok: { label: "socialLinkTiktok", help: "socialLinkTiktokHelp", example: "@yourshop" },
};

/**
 * The shop's links, in the footer's Social links place (owner, 2026-09-26: the social links move
 * from Settings "to the theme editor"). A box per platform, with its logo; the footer draws them,
 * and the home page's Sign-up band sends shoppers to the one the merchant chose.
 *
 * **A shop setting, not the theme's**: saved on the shop by Save to store, with the rest -- never
 * the moment it is typed -- and not part of the draft, so the preview shows a link once it is
 * saved. The note under the boxes says so, as every such place must (`store-setting-slots.ts`).
 */
export function SocialLinksFields({
  values,
  onChange,
}: {
  values: Record<StoreSocialLinkKey, string>;
  onChange: (key: StoreSocialLinkKey, value: string) => void;
}) {
  const t = useTranslations("themeEditor.slots");
  const base = useId();

  return (
    <KitGroup title={t("socialLinksTitle")}>
      {STORE_SOCIAL_LINK_KEYS.map((key) => {
        const words = BOX_WORDS[key];
        const id = `${base}-${key}`;
        return (
          <KitField
            key={key}
            htmlFor={id}
            label={
              <span className="inline-flex items-center gap-2">
                <SocialMark platform={key} />
                {t(words.label)}
              </span>
            }
            help={t(words.help)}
          >
            <KitInput
              id={id}
              value={values[key]}
              onChange={(event) => onChange(key, event.target.value)}
              placeholder={words.example}
              maxLength={500}
              autoComplete="off"
              spellCheck={false}
            />
          </KitField>
        );
      })}
      <KitNote>{t("socialLinksSaved")}</KitNote>
    </KitGroup>
  );
}
