"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { useCategoriesQuery } from "@/hooks/useCategoriesQuery";
import { policyPath, usePoliciesQuery } from "@/hooks/usePoliciesQuery";
import { flattenCategoryOptions } from "@/lib/category-tree";
import {
  categoryLinks,
  languageInPath,
  linkTab,
  type LinkPage,
  type LinkTab,
} from "@/lib/theme-editor/link-targets";
import { checkLink } from "@/lib/theme-editor/validate";
import { cn } from "@/lib/utils";
import { KitBar, KitField, KitInput, KitNote, KitPickRow, KitTabs } from "./kit";
import { HELP, PRIMARY, SECONDARY } from "./kit/styles";

/*
 * Where a link goes: a page every shop has, one of the shop's categories, or an address the
 * merchant types.
 *
 * What is stored is the path without a language in front ("/categories/men/shirts"), because
 * the storefront puts the shopper's own language there when it draws the link. A typed
 * address is checked by the same rules the API uses, so the sheet cannot hand back something
 * a save would turn down, and a path that already names a language is turned down here: the
 * storefront would put a second one in front of it.
 *
 * Only the body: the side panel frames every picker in one `EditorSheet` (2026-09-26). This
 * one used to frame itself as well, inside the panel's frame, and two sheets opened on top of
 * each other.
 */

export function LinkPicker({
  open,
  pages,
  value,
  onPick,
}: {
  open: boolean;
  /** The pages this shop can be linked to now. */
  pages: readonly LinkPage[];
  value: string;
  onPick: (link: string) => void;
}) {
  const t = useTranslations("themeEditor");
  const [tab, setTab] = useState<LinkTab>("pages");

  // Each opening starts on the tab the link in the field was made on, whatever the last one
  // opened on: the sheet is one component for the whole session.
  useEffect(() => {
    if (open) setTab(linkTab(value));
  }, [open, value]);

  const TABS: { key: LinkTab; label: string }[] = [
    { key: "pages", label: t("linkTabPages") },
    { key: "categories", label: t("linkTabCategories") },
    { key: "policies", label: t("linkTabPolicies") },
    { key: "web", label: t("linkTabWeb") },
  ];

  return (
    <>
      <div className="shrink-0 px-5 pb-1 pt-1">
        <KitTabs label={t("linkTitle")} tabs={TABS} value={tab} onChange={setTab} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {tab === "pages" ? (
          <ul className="flex flex-col gap-0.5">
            {pages.map((page) => (
              <li key={page.path}>
                <KitPickRow label={t(page.key)} picked={value === page.path} onPick={() => onPick(page.path)} />
              </li>
            ))}
          </ul>
        ) : tab === "categories" ? (
          <CategoryTab value={value} onPick={onPick} />
        ) : tab === "policies" ? (
          <PolicyTab value={value} onPick={onPick} />
        ) : (
          <WebTab value={linkTab(value) === "web" ? value : ""} onPick={onPick} />
        )}
      </div>

      {value ? (
        <KitBar>
          <button type="button" className={cn(SECONDARY, "w-full")} onClick={() => onPick("")}>
            {t("linkClear")}
          </button>
        </KitBar>
      ) : null}
    </>
  );
}

/** A tab that is still loading: said in words, not a blank. */
function Waiting({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="flex items-center gap-2 px-2 py-3 text-[13px] text-muted-foreground">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {children}
    </p>
  );
}

/** The shop's own categories, in tree order. A category switched off has no page to link to. */
function CategoryTab({ value, onPick }: { value: string; onPick: (link: string) => void }) {
  const t = useTranslations("themeEditor");
  const categories = useCategoriesQuery();
  const rows = useMemo(() => {
    const tree = categories.data ?? [];
    const links = categoryLinks(tree);
    return flattenCategoryOptions(tree)
      .map((row) => ({ ...row, path: links.get(row.value)?.path }))
      .filter((row): row is typeof row & { path: string } => row.path !== undefined);
  }, [categories.data]);

  if (categories.isPending) return <Waiting>{t("linkCategoriesLoading")}</Waiting>;
  if (categories.isError) return <KitNote role="alert">{t("linkCategoriesFailed")}</KitNote>;
  if (rows.length === 0) return <KitNote>{t("linkCategoriesEmpty")}</KitNote>;
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-0.5">
        {rows.map((row) => (
          <li key={row.value}>
            <KitPickRow label={row.label} picked={value === row.path} onPick={() => onPick(row.path)} />
          </li>
        ))}
      </ul>
      <p className={cn(HELP, "px-2")}>{t("linkRenameNote")}</p>
    </div>
  );
}

/**
 * The shop's own policies (2026-09-25), written in Settings -> Policies. One not written yet
 * can still be picked -- a merchant building the footer before the words -- and says it will
 * not show on the shop until it is.
 */
function PolicyTab({ value, onPick }: { value: string; onPick: (link: string) => void }) {
  const t = useTranslations("themeEditor");
  const policies = usePoliciesQuery();

  if (policies.isPending) return <Waiting>{t("linkPoliciesLoading")}</Waiting>;
  if (policies.isError) return <KitNote role="alert">{t("linkPoliciesFailed")}</KitNote>;
  const rows = policies.data ?? [];
  if (rows.length === 0) return <KitNote>{t("linkPoliciesEmpty")}</KitNote>;
  return (
    <ul className="flex flex-col gap-0.5">
      {rows.map((policy) => (
        <li key={policy.public_id}>
          <KitPickRow
            label={policy.title}
            note={policy.is_written ? undefined : t("linkPolicyNotWritten")}
            picked={value === policyPath(policy)}
            onPick={() => onPick(policyPath(policy))}
          />
        </li>
      ))}
    </ul>
  );
}

/** Anything else: a full address, an email or a phone link, checked before it is handed back. */
function WebTab({ value, onPick }: { value: string; onPick: (link: string) => void }) {
  const t = useTranslations("themeEditor");
  const [typed, setTyped] = useState(value);
  const [error, setError] = useState<string | null>(null);

  // The field holds the link of the setting the sheet was opened for, not the one before it.
  useEffect(() => {
    setTyped(value);
    setError(null);
  }, [value]);

  function use() {
    // The trimmed address is what is stored, so it is what is checked: the two languages
    // trim slightly different characters (see validate.ts).
    const link = typed.trim();
    const refused = checkLink(link);
    if (refused) {
      setError(t(refused.key, refused.params));
      return;
    }
    if (languageInPath(link)) {
      setError(t("linkWebLanguage"));
      return;
    }
    onPick(link);
  }

  return (
    <div className="flex flex-col gap-4 px-2 pt-1">
      <KitField label={t("linkTabWeb")} htmlFor="theme-link-web" help={t("linkWebHint")} error={error ?? undefined}>
        <KitInput
          id="theme-link-web"
          type="text"
          inputMode="url"
          placeholder="https://"
          value={typed}
          aria-invalid={error !== null}
          onChange={(event) => {
            setTyped(event.target.value);
            setError(null);
          }}
        />
      </KitField>
      <button type="button" className={cn(PRIMARY, "w-full")} disabled={typed.trim() === ""} onClick={use}>
        {t("linkUse")}
      </button>
    </div>
  );
}
