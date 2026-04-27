"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Plus, Undo2 } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClickableListItem } from "@/components/ui/clickable-list-item";
import { ClickableText } from "@/components/ui/clickable-text";
import { Input } from "@/components/ui/input";
import type {
  ProductAttributeAdmin,
  ProductAttributeValueAdmin,
  PaginatedResponse,
} from "@/types";
import { useConfirm } from "@/context/ConfirmDialogContext";
import { notify, normalizeError } from "@/notifications";
import { numberTextClass } from "@/lib/number-font";
import { cn } from "@/lib/utils";
import { DashboardTableSkeleton } from "@/components/skeletons/dashboard-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

type AttrForm = { name: string; order: string };
type ValueForm = { value: string; order: string };

const emptyAttr: AttrForm = { name: "", order: "0" };
const emptyValue: ValueForm = { value: "", order: "0" };

export default function ProductAttributesPage() {
  const router = useRouter();
  const locale = useLocale();
  const numClass = numberTextClass(locale);
  const tPages = useTranslations("pages");
  const tCommon = useTranslations("common");
  const confirm = useConfirm();
  const [attributes, setAttributes] = useState<ProductAttributeAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [attrEditing, setAttrEditing] = useState<string | "new" | null>(null);
  const [attrForm, setAttrForm] = useState<AttrForm>(emptyAttr);
  const [attrSaving, setAttrSaving] = useState(false);

  const [valueEditing, setValueEditing] = useState<
    { attributePublicId: string; public_id: string | "new" } | null
  >(null);
  const [valueForm, setValueForm] = useState<ValueForm>(emptyValue);
  const [valueSaving, setValueSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const acc: ProductAttributeAdmin[] = [];
      let page = 1;
      while (true) {
        const { data } = await api.get<PaginatedResponse<ProductAttributeAdmin>>(
          "admin/product-attributes/",
          { params: { page, page_size: 100 } }
        );
        acc.push(...data.results);
        if (!data.next) break;
        page += 1;
      }
      setAttributes(acc);
    } catch {
      setError(tPages("attributesLoadFailed"));
    } finally {
      setLoading(false);
    }
  }, [tPages]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function openAttrNew() {
    setAttrEditing("new");
    setAttrForm(emptyAttr);
  }

  function openAttrEdit(a: ProductAttributeAdmin) {
    setAttrEditing(a.public_id);
    setAttrForm({
      name: a.name,
      order: String(a.order),
    });
  }

  async function saveAttr(e: FormEvent) {
    e.preventDefault();
    setAttrSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: attrForm.name.trim(),
        order: parseInt(attrForm.order, 10) || 0,
      };
      if (attrEditing === "new") {
        await api.post("admin/product-attributes/", payload);
      } else if (typeof attrEditing === "string") {
        await api.patch(`admin/product-attributes/${attrEditing}/`, payload);
      }
      setAttrEditing(null);
      await fetchData();
    } catch (err: unknown) {
      const normalized = normalizeError(err, tPages("attributesSaveFailed"));
      setError(normalized.message);
      notify.error(normalized.message);
    } finally {
      setAttrSaving(false);
    }
  }

  async function deleteAttr(publicId: string, name: string) {
    const ok = await confirm({
      title: tPages("confirmDialogTitleDeleteAttribute"),
      message: tPages("attributesConfirmDeleteAttr", { name }),
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.delete(`admin/product-attributes/${publicId}/`);
      await fetchData();
    } catch {
      setError(tPages("attributesDeleteAttrFailed"));
    }
  }

  function openValueNew(attributePublicId: string) {
    setValueEditing({ attributePublicId, public_id: "new" });
    setValueForm(emptyValue);
  }

  function openValueEdit(attributePublicId: string, v: ProductAttributeValueAdmin) {
    setValueEditing({ attributePublicId, public_id: v.public_id });
    setValueForm({ value: v.value, order: String(v.order) });
  }

  async function saveValue(e: FormEvent) {
    e.preventDefault();
    if (!valueEditing) return;
    setValueSaving(true);
    try {
      const payload = {
        attribute: valueEditing.attributePublicId,
        value: valueForm.value.trim(),
        order: parseInt(valueForm.order, 10) || 0,
      };
      if (valueEditing.public_id === "new") {
        await api.post("admin/product-attribute-values/", payload);
      } else {
        await api.patch(`admin/product-attribute-values/${valueEditing.public_id}/`, payload);
      }
      setValueEditing(null);
      await fetchData();
    } catch (err: unknown) {
      const normalized = normalizeError(err, tPages("attributesSaveFailed"));
      setError(normalized.message);
      notify.error(normalized.message);
    } finally {
      setValueSaving(false);
    }
  }

  async function deleteValue(publicId: string, label: string) {
    const ok = await confirm({
      title: tPages("confirmDialogTitleDeleteAttributeValue"),
      message: tPages("attributesConfirmDeleteValue", { label }),
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.delete(`admin/product-attribute-values/${publicId}/`);
      await fetchData();
    } catch {
      setError(tPages("attributesDeleteValueFailed"));
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Skeleton className="hidden h-8 w-8 rounded-ui md:block" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-52" />
              <Skeleton className="h-4 w-80" />
            </div>
          </div>
          <Skeleton className="h-9 w-40" />
        </div>
        <Skeleton className="hidden h-4 w-96 md:block" />
        <DashboardTableSkeleton columns={4} rows={5} showHeader={false} showFilters={false} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-card bg-muted/80 px-1 py-1 hidden md:block">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label={tPages("goBack")}
              className="flex items-center justify-center rounded-ui p-1 text-muted-foreground hover:bg-muted"
            >
              <Undo2 className="h-4 w-4" />
            </button>
          </div>
          <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground">
            {tPages("attributesTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground md:hidden">
            {tPages("attributesSubtitleBefore")}{" "}
            <ClickableText href="/variants" className="underline-offset-2">
              {tPages("attributesSubtitleLink")}
            </ClickableText>
            {tPages("attributesSubtitleAfter")}
          </p>
          </div>
        </div>
        <Button type="button" size="sm" onClick={openAttrNew} disabled={attrEditing !== null}>
          <Plus className="mr-2 size-4" />
          {tPages("attributesNewAttribute")}
        </Button>
      </header>

      <p className="hidden text-sm text-muted-foreground md:block">
        {tPages("attributesSubtitleBefore")}{" "}
        <ClickableText href="/variants" className="underline-offset-2">
          {tPages("attributesSubtitleLink")}
        </ClickableText>
        {tPages("attributesSubtitleAfter")}
      </p>

      {error ? (
        <p className="rounded-card border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {attrEditing !== null ? (
        <Card className="border-primary/30 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">
              {attrEditing === "new" ? tPages("attributesNewAttribute") : tPages("attributesEditAttribute")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveAttr} className="grid gap-3 sm:max-w-md">
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">{tPages("attributesNameRequired")}</span>
                <Input
                  required
                  className="w-full text-sm"
                  value={attrForm.name}
                  onChange={(e) => setAttrForm({ ...attrForm, name: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">{tPages("attributesNameAutoSlugHint")}</p>
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">{tPages("attributesOrder")}</span>
                <Input
                  type="number"
                  className={cn("w-full text-sm", numClass)}
                  value={attrForm.order}
                  onChange={(e) => setAttrForm({ ...attrForm, order: e.target.value })}
                />
              </label>
              <div className="flex gap-2">
                <Button type="submit" disabled={attrSaving}>
                  {attrSaving ? tCommon("saving") : tCommon("save")}
                </Button>
                <Button type="button" variant="outline" onClick={() => setAttrEditing(null)}>
                  {tCommon("cancel")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-4">
        {attributes.length === 0 ? (
          <p className="rounded-card border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {tPages("attributesEmpty")}
          </p>
        ) : (
          attributes.map((a) => {
            const editingValue =
              valueEditing && valueEditing.attributePublicId === a.public_id ? valueEditing : null;
            return (
            <Card key={a.public_id} className="shadow-sm">
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 pb-2">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base">
                    <ClickableText
                      aria-label={tPages("attributesEditAttributeAria", { name: a.name })}
                      disabled={attrEditing !== null || valueEditing !== null}
                      onClick={() => openAttrEdit(a)}
                      className="max-w-full text-left font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {a.name}
                    </ClickableText>
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {tPages("attributesOrderMeta", { order: a.order })}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto px-1 py-1 text-sm font-medium text-destructive underline decoration-destructive/80 underline-offset-4 transition-none hover:bg-transparent hover:text-destructive disabled:no-underline disabled:opacity-50"
                    disabled={attrEditing !== null || valueEditing !== null}
                    onClick={() => deleteAttr(a.public_id, a.name)}
                  >
                    {tCommon("delete")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {tPages("attributesValuesHeading")}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={valueEditing !== null || attrEditing !== null}
                    onClick={() => openValueNew(a.public_id)}
                  >
                    <Plus className="mr-1 size-3.5" />
                    {tPages("attributesAddValue")}
                  </Button>
                </div>

                {editingValue ? (
                  <form
                    onSubmit={saveValue}
                    className="rounded-card border border-border bg-muted/20 p-3 space-y-2"
                  >
                    <p className="text-sm font-medium">
                      {editingValue.public_id === "new"
                        ? tPages("attributesNewValue")
                        : tPages("attributesEditValue")}
                    </p>
                    <Input
                      required
                      className="w-full text-sm"
                      value={valueForm.value}
                      onChange={(e) => setValueForm({ ...valueForm, value: e.target.value })}
                      placeholder={tPages("attributesValuePlaceholder")}
                    />
                    <Input
                      type="number"
                      className={cn("w-32 text-sm", numClass)}
                      value={valueForm.order}
                      onChange={(e) => setValueForm({ ...valueForm, order: e.target.value })}
                      title={tPages("attributesOrder")}
                    />
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={valueSaving}>
                        {tCommon("save")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setValueEditing(null)}
                      >
                        {tCommon("cancel")}
                      </Button>
                    </div>
                  </form>
                ) : null}

                {a.values.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{tPages("attributesNoValues")}</p>
                ) : (
                  <ul className="divide-y divide-border rounded-card border border-border">
                    {a.values.map((v) => (
                      <ClickableListItem
                        key={v.public_id}
                        className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                        onNavigate={() => openValueEdit(a.public_id, v)}
                        aria-label={tPages("attributesEditValueAria", { label: v.value })}
                        disabled={valueEditing !== null || attrEditing !== null}
                      >
                        <div className="min-w-0 flex-1">
                          <span
                            className={
                              valueEditing !== null || attrEditing !== null
                                ? "text-left opacity-50"
                                : "text-left"
                            }
                          >
                            {v.value}
                          </span>{" "}
                          <span className="text-xs text-muted-foreground">
                            {tPages("attributesValueOrderMeta", { order: v.order })}
                          </span>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto px-1 py-1 text-sm font-medium text-destructive underline decoration-destructive/80 underline-offset-4 transition-none hover:bg-transparent hover:text-destructive disabled:no-underline disabled:opacity-50"
                            aria-label={tPages("attributesDeleteValueAria", { label: v.value })}
                            disabled={valueEditing !== null || attrEditing !== null}
                            onClick={() => deleteValue(v.public_id, v.value)}
                          >
                            {tCommon("delete")}
                          </Button>
                        </div>
                      </ClickableListItem>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          );
          })
        )}
      </div>
    </div>
  );
}
