import type { ReactNode } from "react";
import type { AdminCategoryTreeNode } from "@/types";

/** Flat list for `<select>`: indented labels by depth. */
export function flattenCategoryOptions(
  nodes: AdminCategoryTreeNode[],
  prefix = ""
): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  for (const n of nodes) {
    out.push({ value: n.public_id, label: `${prefix}${n.name}` });
    if (n.children?.length) {
      out.push(...flattenCategoryOptions(n.children, `${prefix}— `));
    }
  }
  return out;
}

/**
 * Flat list for rich Combobox dropdowns: each row carries a `labelDisplay`
 * rendering tree connectors (├─, └─, │) so nested categories show a clear
 * parent/child relationship. `label` stays the clean category name so
 * typeahead filtering matches what users actually type.
 */
export function flattenCategoryOptionsRich(
  nodes: AdminCategoryTreeNode[]
): { value: string; label: string; labelDisplay: ReactNode }[] {
  const out: { value: string; label: string; labelDisplay: ReactNode }[] = [];

  function walk(items: AdminCategoryTreeNode[], ancestorHasNext: boolean[]) {
    items.forEach((node, i) => {
      const isLast = i === items.length - 1;
      const depth = ancestorHasNext.length;
      out.push({
        value: node.public_id,
        label: node.name,
        labelDisplay: (
          <CategoryTreeLabel
            name={node.name}
            depth={depth}
            isLast={isLast}
            ancestorHasNext={ancestorHasNext}
          />
        ),
      });
      if (node.children?.length) {
        walk(node.children, [...ancestorHasNext, !isLast]);
      }
    });
  }

  walk(nodes, []);
  return out;
}

function CategoryTreeLabel({
  name,
  depth,
  isLast,
  ancestorHasNext,
}: {
  name: string;
  depth: number;
  isLast: boolean;
  ancestorHasNext: boolean[];
}) {
  // Negative -my-1.5 cancels the ComboboxItem row's py-1.5 so the absolutely
  // positioned tree lines extend through the row padding and visually connect
  // with the lines on the adjacent rows above and below.
  return (
    <span className="-my-1.5 flex items-stretch text-xs font-medium">
      {ancestorHasNext.map((hasNext, idx) => (
        <span key={idx} aria-hidden className="relative w-3 shrink-0">
          {hasNext ? (
            <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-muted-foreground/40" />
          ) : null}
        </span>
      ))}
      {depth > 0 ? (
        <span aria-hidden className="relative w-3 shrink-0">
          <span className="absolute left-1/2 top-0 h-1/2 w-px -translate-x-1/2 bg-muted-foreground/40" />
          {!isLast ? (
            <span className="absolute left-1/2 top-1/2 bottom-0 w-px -translate-x-1/2 bg-muted-foreground/40" />
          ) : null}
          <span className="absolute left-1/2 top-1/2 right-0 h-px -translate-y-1/2 bg-muted-foreground/40" />
        </span>
      ) : null}
      <span className="my-1.5 ml-1.5 self-center">{name}</span>
    </span>
  );
}

export function collectDescendantPublicIds(node: AdminCategoryTreeNode): Set<string> {
  const s = new Set<string>([node.public_id]);
  for (const ch of node.children ?? []) {
    for (const id of collectDescendantPublicIds(ch)) {
      s.add(id);
    }
  }
  return s;
}

export function findCategoryNode(
  nodes: AdminCategoryTreeNode[],
  publicId: string
): AdminCategoryTreeNode | null {
  for (const n of nodes) {
    if (n.public_id === publicId) {
      return n;
    }
    const hit = findCategoryNode(n.children ?? [], publicId);
    if (hit) {
      return hit;
    }
  }
  return null;
}
