"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Folder, Globe, Layers, Minus, SlidersHorizontal } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { notify } from "@/notifications";
import { useCategoriesQuery } from "@/hooks/useCategoriesQuery";
import { useSetMemberCategories } from "@/lib/team/hooks";
import type { TeamMember } from "@/lib/team/api";
import type { AdminCategoryTreeNode } from "@/types";

type Row = { public_id: string; name: string; depth: number };

/** Flatten the tree (for rendering) + map each node to its descendants (for ticking). */
function analyze(nodes: AdminCategoryTreeNode[]) {
  const rows: Row[] = [];
  const descendants = new Map<string, string[]>();

  const collectDesc = (n: AdminCategoryTreeNode): string[] => {
    const out: string[] = [];
    for (const c of n.children ?? []) {
      out.push(c.public_id, ...collectDesc(c));
    }
    return out;
  };

  const walk = (list: AdminCategoryTreeNode[], depth: number) => {
    for (const n of list) {
      rows.push({ public_id: n.public_id, name: n.name, depth });
      descendants.set(n.public_id, collectDesc(n));
      walk(n.children ?? [], depth + 1);
    }
  };
  walk(nodes, 0);
  return { rows, descendants };
}

export function MemberCategoryScopeDialog({
  member,
  open,
  onOpenChange,
}: {
  member: TeamMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: tree = [], isLoading } = useCategoriesQuery();
  const save = useSetMemberCategories();
  const { rows, descendants } = useMemo(() => analyze(tree), [tree]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [seededFor, setSeededFor] = useState<string | null>(null);

  // Seed from the member's saved scope verbatim — the stored set is already the
  // exact set of categories they see (ticking a department records its whole
  // branch, minus anything carved out), so it must NOT be re-expanded here.
  // Seeds once per open (guarded by seededFor) so a background category refetch
  // can't wipe the user's in-progress ticks.
  useEffect(() => {
    if (!open || !member) {
      if (seededFor !== null) setSeededFor(null);
      return;
    }
    if (seededFor === member.public_id) return;
    setSelected(new Set(member.allowed_category_public_ids));
    setSeededFor(member.public_id);
  }, [open, member, seededFor]);

  if (!member) return null;

  const limited = selected.size > 0;

  // Ticking a node ticks its whole subtree; unticking a node unticks just that
  // subtree — ancestors stay selected, so you can carve one subcategory out of an
  // otherwise-granted department without dropping the rest of it.
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      const subtree = [id, ...(descendants.get(id) ?? [])];
      if (next.has(id)) {
        for (const d of subtree) next.delete(d);
      } else {
        for (const d of subtree) next.add(d);
      }
      return next;
    });

  async function handleSave() {
    if (!member) return;
    try {
      await save.mutateAsync({
        membershipPublicId: member.public_id,
        categoryPublicIds: [...selected],
      });
      notify.success(
        selected.size === 0
          ? "Full access — this member sees every category."
          : "Category access updated."
      );
      onOpenChange(false);
    } catch (err) {
      notify.error(err);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        <DialogHeader className="space-y-1.5 border-b border-border px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <Layers className="size-4" />
            </span>
            Category access
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            Limit{" "}
            <span className="font-medium text-foreground">
              {member.user.full_name || member.user.email}
            </span>{" "}
            to specific departments — they&apos;ll only see products and orders in the
            categories you tick. Ticking a category also ticks everything beneath it;
            untick any subcategory to carve it out. Tick nothing for full access.
          </DialogDescription>
        </DialogHeader>

        {/* Access summary + quick actions */}
        <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-5 py-2.5">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
              limited
                ? "bg-primary/10 text-primary"
                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            )}
          >
            {limited ? (
              <>
                <SlidersHorizontal className="size-3.5" />
                Limited to {selected.size} categor{selected.size === 1 ? "y" : "ies"}
              </>
            ) : (
              <>
                <Globe className="size-3.5" />
                Full access
              </>
            )}
          </span>
          {limited && (
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="max-h-72 overflow-y-auto px-2 py-2">
          {isLoading ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Loading categories…
            </p>
          ) : rows.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No categories yet.
            </p>
          ) : (
            rows.map((row) => {
              const on = selected.has(row.public_id);
              const partial =
                !on && (descendants.get(row.public_id) ?? []).some((d) => selected.has(d));
              return (
                <button
                  key={row.public_id}
                  type="button"
                  onClick={() => toggle(row.public_id)}
                  style={{ paddingLeft: `${12 + row.depth * 18}px` }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md py-2 pr-3 text-left text-sm transition-colors",
                    on
                      ? "bg-primary/10 text-foreground"
                      : partial
                        ? "bg-primary/[0.04] text-foreground"
                        : "hover:bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "grid size-4 shrink-0 place-items-center rounded border transition-colors",
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : partial
                          ? "border-primary/70 text-primary"
                          : "border-border"
                    )}
                  >
                    {on ? (
                      <Check className="size-3" strokeWidth={3} />
                    ) : partial ? (
                      <Minus className="size-3" strokeWidth={3} />
                    ) : null}
                  </span>
                  <Folder
                    className={cn(
                      "size-4 shrink-0",
                      on || partial ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <span className="truncate">{row.name}</span>
                </button>
              );
            })
          )}
        </div>

        <DialogFooter className="border-t border-border px-5 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save access"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
