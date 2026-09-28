"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { SocialMark } from "@/components/SocialMark";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  ACCOUNT_EXAMPLES,
  SOCIAL_PLATFORMS,
  type SocialAccount,
  type SocialPlatform,
} from "@/lib/storeSocialLinks";

/**
 * An account the API refused on the last save because it names nothing on its platform
 * (`social_links.parse_accounts`, `social_account_unreadable`). This screen cannot send an empty,
 * a repeated or an unknown one, so that is the only refusal a row can be given.
 */
export type AccountProblem = { platform: SocialPlatform };

/**
 * The shop's social accounts, in Settings -> Store Info -> Identity: the one place they are typed
 * (owner, 2026-09-29). The merchant adds the platforms they use, in the order the footer and the
 * Contact page show them; each box takes a link, a name or -- for WhatsApp -- a number, and the
 * API decides on save whether it names an account.
 */
export function IdentityAccounts({
  accounts,
  onChange,
  problem,
}: {
  accounts: SocialAccount[];
  onChange: (next: SocialAccount[]) => void;
  problem: AccountProblem | null;
}) {
  const t = useTranslations("settings.identity");
  const unused = SOCIAL_PLATFORMS.filter((platform) => !accounts.some((one) => one.platform === platform));

  const set = (index: number, account: string) =>
    onChange(accounts.map((one, i) => (i === index ? { ...one, account } : one)));
  const move = (index: number, by: -1 | 1) => {
    const next = [...accounts];
    [next[index], next[index + by]] = [next[index + by], next[index]];
    onChange(next);
  };
  const remove = (index: number) => onChange(accounts.filter((_, i) => i !== index));
  const add = (platform: SocialPlatform) => onChange([...accounts, { platform, account: "" }]);

  return (
    <div className="flex flex-col gap-3">
      <div className="space-y-1">
        <h4 className="text-sm font-medium text-foreground">{t("accountsTitle")}</h4>
        <p className="text-xs text-muted-foreground">{t("accountsHint")}</p>
      </div>

      {accounts.length === 0 ? (
        <p className="rounded-card border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          {t("accountsEmpty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {accounts.map((one, index) => {
            const name = t(`platforms.${one.platform}`);
            const id = `identity-account-${one.platform}`;
            const refused = problem?.platform === one.platform;
            return (
              <li key={one.platform} className="flex flex-col gap-1">
                {/* On a phone the name has a line of its own; the box and its buttons share the next. */}
                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor={id} className="flex w-full items-center gap-2 text-sm text-foreground sm:w-32 sm:shrink-0">
                    <SocialMark platform={one.platform} />
                    <span className="truncate">{name}</span>
                  </label>
                  <Input
                    id={id}
                    value={one.account}
                    onChange={(event) => set(index, event.target.value)}
                    placeholder={ACCOUNT_EXAMPLES[one.platform]}
                    aria-invalid={refused || undefined}
                    aria-describedby={refused ? `${id}-problem` : undefined}
                    className="min-w-0 flex-1"
                  />
                  <div className="flex shrink-0 items-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label={t("moveUp", { platform: name })}
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => move(index, 1)}
                      disabled={index === accounts.length - 1}
                      aria-label={t("moveDown", { platform: name })}
                    >
                      <ArrowDown className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      aria-label={t("remove", { platform: name })}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                </div>
                {refused ? (
                  <p id={`${id}-problem`} role="alert" className="text-xs text-destructive sm:pl-34">
                    {one.platform === "whatsapp" ? t("unreadableWhatsapp") : t("unreadable", { platform: name })}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {unused.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" className="w-fit gap-2">
              <Plus className="size-4" />
              {t("add")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {unused.map((platform) => (
              <DropdownMenuItem key={platform} onSelect={() => add(platform)} className="gap-2">
                <SocialMark platform={platform} />
                {t(`platforms.${platform}`)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
