"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
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
import { EditorSheet } from "./EditorSheet";

/*
 * Where a link goes: a page every shop has, one of the shop's categories, or an address the
 * merchant types.
 *
 * What is stored is the path without a language in front ("/categories/men/shirts"), because
 * the storefront puts the shopper's own language there when it draws the link. A typed
 * address is checked by the same rules the API uses, so the sheet cannot hand back something
 * a save would turn down, and a path that already names a language is turned down here: the
 * storefront would put a second one in front of it.
 */

export function LinkPicker({
  open,
  pages,
  value,
  onPick,
  onClose,
}: {
  open: boolean;
  /** The pages this shop can be linked to now. */
  pages: readonly LinkPage[];
  value: string;
  onPick: (link: string) => void;
  onClose: () => void;
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
    <EditorSheet open={open} title={t("linkTitle")} hint={t("linkHint")} tall onClose={onClose}>
      <div className="shrink-0 px-4 pt-3">
        <div role="tablist" aria-label={t("linkTitle")} className="grid grid-cols-4 gap-1 rounded-md bg-muted p-0.5">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cn(
                "h-10 rounded text-sm font-medium transition-colors md:h-9",
                tab === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === "pages" ? (
          <ul className="space-y-2">
            {pages.map((page) => (
              <li key={page.path}>
                <PickRow label={t(page.key)} picked={value === page.path} onPick={() => onPick(page.path)} />
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
        <div className="shrink-0 border-t border-border p-4">
          <Button type="button" variant="outline" className="h-11 w-full md:h-10" onClick={() => onPick("")}>
            {t("linkClear")}
          </Button>
        </div>
      ) : null}
    </EditorSheet>
  );
}

function PickRow({
  label,
  note,
  picked,
  onPick,
}: {
  label: string;
  /** A line under the name: a policy not written yet. */
  note?: string;
  picked: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-current={picked ? "true" : undefined}
      className={cn(
        "flex min-h-12 w-full items-center gap-3 rounded-card border px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
        picked ? "border-foreground bg-accent" : "border-border",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-foreground">{label}</span>
        {note ? <span className="block text-xs text-muted-foreground">{note}</span> : null}
      </span>
      {picked ? <Check className="size-4 shrink-0 text-foreground" aria-hidden /> : null}
    </button>
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

  if (categories.isPending) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        {t("linkCategoriesLoading")}
      </p>
    );
  }
  if (categories.isError) {
    return <p className="text-sm text-destructive">{t("linkCategoriesFailed")}</p>;
  }
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("linkCategoriesEmpty")}</p>;
  }
  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.value}>
            <PickRow label={row.label} picked={value === row.path} onPick={() => onPick(row.path)} />
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">{t("linkRenameNote")}</p>
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

  if (policies.isPending) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        {t("linkPoliciesLoading")}
      </p>
    );
  }
  if (policies.isError) {
    return <p className="text-sm text-destructive">{t("linkPoliciesFailed")}</p>;
  }
  const rows = policies.data ?? [];
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("linkPoliciesEmpty")}</p>;
  }
  return (
    <ul className="space-y-2">
      {rows.map((policy) => (
        <li key={policy.public_id}>
          <PickRow
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
    <div className="space-y-3">
      <FormField label={t("linkTabWeb")} htmlFor="theme-link-web" hint={t("linkWebHint")} error={error ?? undefined}>
        <Input
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
      </FormField>
      <Button type="button" className="h-11 w-full md:h-10" disabled={typed.trim() === ""} onClick={use}>
        {t("linkUse")}
      </Button>
    </div>
  );
}
